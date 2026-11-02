import { Router, type IRouter } from "express";
import { and, desc, eq, inArray, isNotNull, or, sql } from "drizzle-orm";
import { CreateBookingBody, UpdateBookingBody, UpdateBookingParams } from "@workspace/api-zod";
import type { Booking as ApiBooking } from "@workspace/api-zod";
import {
  bookingsTable,
  companionProfilesTable,
  db,
  reviewsTable,
  usersTable,
  walletLedgerTable,
  type Booking,
} from "@workspace/db";
import { currentUser, requireAuth, type AuthedUser } from "../lib/auth";
import { badRequest, forbidden, notFound } from "../lib/errors";
import { awardPoints, notify, POINTS } from "../lib/notify";
import { meetupCode, toBooking } from "../lib/serializers";
import { appendMessage, ensureConnection, partiesFor } from "./connections";

const router: IRouter = Router();
router.use(requireAuth);

async function serializeBookings(viewer: AuthedUser, rows: Booking[]): Promise<ApiBooking[]> {
  const otherIds = rows.map((b) => (b.seekerId === viewer.id ? b.companionId : b.seekerId));
  const ids = rows.map((b) => b.id);
  const [parties, reviewed] = await Promise.all([
    partiesFor(otherIds),
    ids.length
      ? db.select({ bookingId: reviewsTable.bookingId }).from(reviewsTable).where(and(inArray(reviewsTable.bookingId, ids), isNotNull(reviewsTable.bookingId)))
      : Promise.resolve([] as { bookingId: string | null }[]),
  ]);
  const ratedSet = new Set(reviewed.map((r) => r.bookingId));
  return rows.flatMap((b) => {
    const other = parties.get(b.seekerId === viewer.id ? b.companionId : b.seekerId);
    return other ? [toBooking(b, viewer.id, other, ratedSet.has(b.id))] : [];
  });
}

async function loadBookingFor(viewerId: string, id: string): Promise<Booking> {
  const rows = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id)).limit(1);
  const b = rows[0];
  if (!b) throw notFound("Booking");
  if (b.seekerId !== viewerId && b.companionId !== viewerId) throw forbidden();
  return b;
}

router.get("/bookings", async (req, res) => {
  const me = currentUser(req);
  const rows = await db
    .select()
    .from(bookingsTable)
    .where(or(eq(bookingsTable.seekerId, me.id), eq(bookingsTable.companionId, me.id)))
    .orderBy(desc(bookingsTable.createdAt))
    .limit(200);
  res.json(await serializeBookings(me, rows));
});

router.post("/bookings", async (req, res) => {
  const me = currentUser(req);
  const body = CreateBookingBody.parse(req.body);
  if (body.companionId === me.id) throw badRequest("You cannot book yourself");
  const target = await db
    .select({ user: usersTable, profile: companionProfilesTable })
    .from(usersTable)
    .innerJoin(companionProfilesTable, eq(companionProfilesTable.userId, usersTable.id))
    .where(eq(usersTable.id, body.companionId))
    .limit(1);
  const companion = target[0];
  if (!companion || companion.user.role !== "companion") throw notFound("Companion");
  if (body.hours < companion.profile.minBookingHours) {
    throw badRequest(`${companion.user.name} requires a minimum of ${companion.profile.minBookingHours} hours`, "min_hours");
  }
  const dealActive = companion.profile.dealDiscount > 0 && !!companion.profile.dealExpiresAt && companion.profile.dealExpiresAt.getTime() > Date.now();
  const rate = dealActive ? Math.round(companion.profile.rate * (1 - companion.profile.dealDiscount / 100)) : companion.profile.rate;
  const { connection } = await ensureConnection(me.id, companion.user.id);

  const [booking] = await db
    .insert(bookingsTable)
    .values({
      connectionId: connection.id,
      seekerId: me.id,
      companionId: companion.user.id,
      activity: body.activity.trim(),
      dateLabel: body.dateLabel.trim(),
      scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : null,
      hours: body.hours,
      rate,
      status: "pending",
      city: companion.user.city,
      note: body.note?.trim() ?? "",
      meetupCode: meetupCode(),
    })
    .returning();

  await appendMessage(
    connection,
    me.id,
    `📅 Booking request: ${booking.activity} · ${booking.dateLabel} · ${booking.hours}h${booking.note ? `\n"${booking.note}"` : ""}`,
    "system",
  );
  await notify({
    userId: companion.user.id,
    type: "booking",
    title: `${me.name} requested ${booking.activity}`,
    body: `${booking.dateLabel} · ${booking.hours}h · UGX ${(rate * booking.hours).toLocaleString()}`,
    channel: "bookings",
    actionRoute: "/bookings",
    actionLabel: "Review request",
    actorId: me.id,
  });

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recent = await db
    .select({ n: sql<string>`count(*)` })
    .from(bookingsTable)
    .where(and(eq(bookingsTable.seekerId, me.id), sql`${bookingsTable.createdAt} > ${weekAgo}`));
  if (Number(recent[0]?.n ?? 0) === 1) {
    await awardPoints(me.id, POINTS.firstBookingWeek, "first_booking_week", "First booking of the week");
  }

  const [out] = await serializeBookings(me, [booking]);
  res.status(201).json(out);
});

router.patch("/bookings/:bookingId", async (req, res) => {
  const me = currentUser(req);
  const { bookingId } = UpdateBookingParams.parse(req.params);
  const { action } = UpdateBookingBody.parse(req.body);
  const b = await loadBookingFor(me.id, bookingId);
  const isCompanion = b.companionId === me.id;
  const otherId = isCompanion ? b.seekerId : b.companionId;

  const update: Partial<typeof bookingsTable.$inferInsert> = { updatedAt: new Date() };
  let title = "";
  let bodyText = "";
  let systemLine = "";

  switch (action) {
    case "accept":
      if (!isCompanion) throw forbidden("Only the companion can accept");
      if (b.status !== "pending") throw badRequest("Only pending requests can be accepted");
      update.status = "upcoming";
      title = `${me.name} accepted your booking ✅`;
      bodyText = `${b.activity} · ${b.dateLabel} · Meetup code ${b.meetupCode}`;
      systemLine = `✅ Booking accepted · ${b.activity} · ${b.dateLabel}`;
      break;
    case "decline":
      if (!isCompanion) throw forbidden("Only the companion can decline");
      if (b.status !== "pending") throw badRequest("Only pending requests can be declined");
      update.status = "declined";
      title = `${me.name} declined your booking`;
      bodyText = `${b.activity} · ${b.dateLabel}`;
      systemLine = `❌ Booking declined · ${b.activity}`;
      break;
    case "cancel":
      if (b.status !== "pending" && b.status !== "upcoming") throw badRequest("This booking can no longer be cancelled");
      update.status = "cancelled";
      update.safetyActive = false;
      title = `${me.name} cancelled the booking`;
      bodyText = `${b.activity} · ${b.dateLabel}`;
      systemLine = `🚫 Booking cancelled · ${b.activity}`;
      break;
    case "start":
      if (b.status !== "upcoming") throw badRequest("Only confirmed bookings can be started");
      update.status = "active";
      update.safetyActive = true;
      title = `${me.name} started the meetup`;
      bodyText = `${b.activity} is now active · Safety check-in enabled`;
      systemLine = `🌙 Meetup started · code ${b.meetupCode}`;
      break;
    case "complete":
      if (b.status !== "active" && b.status !== "upcoming") throw badRequest("Only active bookings can be completed");
      update.status = "completed";
      update.safetyActive = false;
      update.completedAt = new Date();
      title = `${me.name} marked the meetup complete`;
      bodyText = `Rate your time with ${me.name} to earn loyalty points`;
      systemLine = `🏁 Meetup completed · ${b.activity}`;
      break;
  }

  await db.update(bookingsTable).set(update).where(eq(bookingsTable.id, b.id));

  if (action === "complete") {
    await db
      .update(companionProfilesTable)
      .set({ completedMeetups: sql`${companionProfilesTable.completedMeetups} + 1`, updatedAt: new Date() })
      .where(eq(companionProfilesTable.userId, b.companionId));
    await db.insert(walletLedgerTable).values({
      userId: b.companionId,
      amount: b.rate * b.hours,
      kind: "earning",
      status: "pending",
      reference: `Off-platform · ${b.activity} with code ${b.meetupCode}`,
      bookingId: b.id,
    });
    await awardPoints(b.seekerId, POINTS.completeMeetup, "meetup", `Meetup completed · ${b.activity}`);
    await awardPoints(b.companionId, POINTS.completeMeetup, "meetup", `Meetup completed · ${b.activity}`);
    await notify({
      userId: b.seekerId,
      type: "rating",
      title: "Rate your meetup",
      body: `Share your Chemistry Score for ${b.activity} and earn up to 100 pts`,
      channel: "bookings",
      actionRoute: "/bookings",
      actionLabel: "Rate now",
    });
  }

  if (b.connectionId) {
    const conn = await db.select().from(bookingsTable).where(eq(bookingsTable.id, b.id)).limit(1);
    void conn;
    const connectionRows = await db.query.connectionsTable.findFirst({ where: (t, { eq: e }) => e(t.id, b.connectionId!) });
    if (connectionRows) await appendMessage(connectionRows, me.id, systemLine, "system");
  }
  await notify({
    userId: otherId,
    type: "booking",
    title,
    body: bodyText,
    channel: "bookings",
    actionRoute: "/bookings",
    actionLabel: "View booking",
    actorId: me.id,
  });

  const updated = await loadBookingFor(me.id, b.id);
  const [out] = await serializeBookings(me, [updated]);
  res.json(out);
});

export default router;

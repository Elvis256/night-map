import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { CreateReviewBody } from "@workspace/api-zod";
import type { ReviewResult } from "@workspace/api-zod";
import { bookingsTable, db, reviewsTable, usersTable } from "@workspace/db";
import { currentUser, requireAuth } from "../lib/auth";
import { badRequest, forbidden, notFound } from "../lib/errors";
import { awardPoints, notify, POINTS } from "../lib/notify";
import { toReview } from "../lib/serializers";

const router: IRouter = Router();
router.use(requireAuth);

router.post("/reviews", async (req, res) => {
  const me = currentUser(req);
  const body = CreateReviewBody.parse(req.body);
  if (body.companionId === me.id) throw badRequest("You cannot review yourself");
  const target = await db.select({ id: usersTable.id, role: usersTable.role, name: usersTable.name }).from(usersTable).where(eq(usersTable.id, body.companionId)).limit(1);
  if (!target[0] || target[0].role !== "companion") throw notFound("Companion");

  let bookingId: string | null = null;
  if (body.bookingId) {
    const rows = await db.select().from(bookingsTable).where(eq(bookingsTable.id, body.bookingId)).limit(1);
    const b = rows[0];
    if (!b) throw notFound("Booking");
    if (b.seekerId !== me.id) throw forbidden("Only the client can rate this booking");
    if (b.companionId !== body.companionId) throw badRequest("Booking does not match companion");
    if (b.status !== "completed") throw badRequest("Only completed meetups can be rated");
    const existing = await db.select({ id: reviewsTable.id }).from(reviewsTable).where(and(eq(reviewsTable.bookingId, b.id), eq(reviewsTable.reviewerId, me.id))).limit(1);
    if (existing[0]) throw badRequest("You already rated this meetup", "already_rated");
    bookingId = b.id;
  }

  const text = body.text?.trim() ?? "";
  const [review] = await db
    .insert(reviewsTable)
    .values({
      bookingId,
      reviewerId: me.id,
      companionId: body.companionId,
      personality: body.personality,
      appearance: body.appearance,
      punctuality: body.punctuality,
      service: body.service,
      safety: body.safety,
      text,
    })
    .returning();

  let points = POINTS.reviewBase;
  if (text.length >= 20) points += POINTS.reviewWritten;
  if (bookingId) points += POINTS.reviewLinked;
  await awardPoints(me.id, points, "review", `Chemistry score for ${target[0].name}`);
  await notify({
    userId: body.companionId,
    type: "rating",
    title: `${me.name} rated your time together ⭐`,
    body: `Chemistry score ${((body.personality + body.appearance + body.punctuality + body.service + body.safety) / 5).toFixed(1)} / 5`,
    channel: "bookings",
    actionRoute: `/companion/${body.companionId}`,
    actionLabel: "View profile",
    actorId: me.id,
  });

  const payload: ReviewResult = { review: toReview(review, me.name), pointsEarned: points };
  res.status(201).json(payload);
});

export default router;

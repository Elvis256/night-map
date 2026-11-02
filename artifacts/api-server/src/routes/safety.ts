import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { ReportIncidentBody, SafetyCheckInBody, TriggerPanicBody } from "@workspace/api-zod";
import type { SafetyEvent as ApiSafetyEvent } from "@workspace/api-zod";
import { db, safetyEventsTable, smsOutboxTable, trustedContactsTable, type SafetyEvent } from "@workspace/db";
import { currentUser, requireAuth, type AuthedUser } from "../lib/auth";
import { notifyAdmins } from "../lib/notify";

const router: IRouter = Router();
router.use(requireAuth);

function mapsLink(lat?: number | null, lng?: number | null): string {
  return lat != null && lng != null ? `https://maps.google.com/?q=${lat},${lng}` : "location unavailable";
}

async function queueContactSms(me: AuthedUser, event: SafetyEvent, body: string): Promise<number> {
  const contacts = await db.select().from(trustedContactsTable).where(eq(trustedContactsTable.userId, me.id));
  const phones = new Set(contacts.map((c) => c.phone.trim()).filter(Boolean));
  if (me.trustedContact.trim()) phones.add(me.trustedContact.trim());
  if (phones.size === 0) return 0;
  await db.insert(smsOutboxTable).values([...phones].map((toPhone) => ({ toPhone, body, relatedEventId: event.id })));
  return phones.size;
}

function serialize(e: SafetyEvent, contactsNotified: number): ApiSafetyEvent {
  return {
    id: e.id,
    type: e.type,
    bookingId: e.bookingId,
    lat: e.lat,
    lng: e.lng,
    note: e.note,
    contactsNotified,
    createdAt: e.createdAt.toISOString(),
  };
}

router.post("/safety/panic", async (req, res) => {
  const me = currentUser(req);
  const body = TriggerPanicBody.parse(req.body ?? {});
  const [event] = await db
    .insert(safetyEventsTable)
    .values({ userId: me.id, type: "panic", bookingId: body.bookingId ?? null, lat: body.lat ?? null, lng: body.lng ?? null, note: body.note?.trim() ?? "" })
    .returning();
  const notified = await queueContactSms(
    me,
    event,
    `🚨 NightMap EMERGENCY: ${me.name} triggered a panic alert. Location: ${mapsLink(body.lat, body.lng)}. Please call them now.`,
  );
  await notifyAdmins({
    type: "safety",
    title: `🚨 Panic alert from ${me.name}`,
    body: `${me.phone} · ${me.city} · ${mapsLink(body.lat, body.lng)}`,
    actorId: me.id,
  });
  res.status(201).json(serialize(event, notified));
});

router.post("/safety/checkin", async (req, res) => {
  const me = currentUser(req);
  const body = SafetyCheckInBody.parse(req.body ?? {});
  const [event] = await db
    .insert(safetyEventsTable)
    .values({ userId: me.id, type: "checkin", bookingId: body.bookingId ?? null, lat: body.lat ?? null, lng: body.lng ?? null, note: body.note?.trim() ?? "" })
    .returning();
  const notified = await queueContactSms(
    me,
    event,
    `💙 NightMap check-in: ${me.name} is safe and shared their location: ${mapsLink(body.lat, body.lng)}.`,
  );
  res.status(201).json(serialize(event, notified));
});

router.post("/safety/incidents", async (req, res) => {
  const me = currentUser(req);
  const body = ReportIncidentBody.parse(req.body);
  const [event] = await db
    .insert(safetyEventsTable)
    .values({ userId: me.id, type: "incident", bookingId: body.bookingId ?? null, lat: body.lat ?? null, lng: body.lng ?? null, note: body.description.trim() })
    .returning();
  await notifyAdmins({
    type: "safety",
    title: `Incident report from ${me.name}`,
    body: body.description.trim().slice(0, 200),
    actorId: me.id,
  });
  res.status(201).json(serialize(event, 0));
});

router.get("/safety/events", async (req, res) => {
  const me = currentUser(req);
  const events = await db.select().from(safetyEventsTable).where(eq(safetyEventsTable.userId, me.id)).orderBy(desc(safetyEventsTable.createdAt)).limit(50);
  res.json(events.map((e) => serialize(e, 0)));
});

export default router;

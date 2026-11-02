import { Router, type IRouter } from "express";
import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import {
  AddTrustedContactBody,
  DeletePhotoParams,
  DeleteTrustedContactParams,
  HeartbeatBody,
  PostStoryBody,
  RegisterPushTokenBody,
  UnregisterPushTokenBody,
  UpdateCompanionProfileBody,
  UpdateMeBody,
  UploadPhotoBody,
} from "@workspace/api-zod";
import type { ProfileView, ReferralSummary, ScoreSummary, Story } from "@workspace/api-zod";
import {
  companionProfilesTable,
  db,
  photosTable,
  pointsLedgerTable,
  profileViewsTable,
  pushTokensTable,
  referralsTable,
  savedCompanionsTable,
  storiesTable,
  swipesTable,
  trustedContactsTable,
  usersTable,
} from "@workspace/db";
import { currentUser, loadUserWithProfile, requireAuth } from "../lib/auth";
import { buildCard, cardsFor, loadAggregates, loadCompanionRow, loadViewerContext } from "../lib/companions";
import { forbidden, HttpError, notFound } from "../lib/errors";
import { cityCoords } from "../lib/geo";
import { notify, tierFor } from "../lib/notify";
import { toPhoto, toUser } from "../lib/serializers";
import { removeUpload, saveUpload } from "../lib/storage";
import { touchLoginStreak } from "./auth";

const router: IRouter = Router();
router.use(requireAuth);

async function fullUser(userId: string) {
  const user = await loadUserWithProfile(userId);
  if (!user) throw notFound("User");
  const photos = await db
    .select()
    .from(photosTable)
    .where(eq(photosTable.userId, userId))
    .orderBy(desc(photosTable.isPrimary), photosTable.sortOrder, photosTable.createdAt);
  return toUser(user, user.companionProfile, photos);
}

router.get("/me", async (req, res) => {
  res.json(await fullUser(currentUser(req).id));
});

router.patch("/me", async (req, res) => {
  const me = currentUser(req);
  const body = UpdateMeBody.parse(req.body);
  const update: Partial<typeof usersTable.$inferInsert> = { updatedAt: new Date() };
  if (body.name !== undefined) update.name = body.name.trim();
  if (body.bio !== undefined) update.bio = body.bio.trim();
  if (body.city !== undefined) {
    update.city = body.city.trim() || me.city;
    const coords = cityCoords(update.city);
    if (coords && body.lat === undefined) {
      update.lat = coords.lat;
      update.lng = coords.lng;
    }
  }
  if (body.lat !== undefined) update.lat = body.lat;
  if (body.lng !== undefined) update.lng = body.lng;
  if (body.role !== undefined) update.role = body.role;
  if (body.gender !== undefined) update.gender = body.gender;
  if (body.age !== undefined) update.age = body.age;
  if (body.isLadiesMode !== undefined) update.isLadiesMode = body.isLadiesMode;
  if (body.ghostMode !== undefined) update.ghostMode = body.ghostMode;
  if (body.availableTonight !== undefined) update.availableTonight = body.availableTonight;
  if (body.trustedContact !== undefined) update.trustedContact = body.trustedContact.trim();
  if (body.language !== undefined) update.language = body.language;
  if (body.privacy !== undefined) update.privacy = body.privacy;
  if (body.notificationPrefs !== undefined) update.notificationPrefs = body.notificationPrefs;

  await db.transaction(async (tx) => {
    await tx.update(usersTable).set(update).where(eq(usersTable.id, me.id));
    if (body.role === "companion" && !me.companionProfile) {
      await tx
        .insert(companionProfilesTable)
        .values({ userId: me.id, availabilityStatus: "tonight" })
        .onConflictDoNothing();
    }
    if (body.availableTonight !== undefined && me.companionProfile) {
      await tx
        .update(companionProfilesTable)
        .set({
          availabilityStatus: body.availableTonight ? "tonight" : "offline",
          updatedAt: new Date(),
        })
        .where(eq(companionProfilesTable.userId, me.id));
    }
  });
  res.json(await fullUser(me.id));
});

router.delete("/me", async (req, res) => {
  const me = currentUser(req);
  const photos = await db.select().from(photosTable).where(eq(photosTable.userId, me.id));
  await db.delete(usersTable).where(eq(usersTable.id, me.id));
  await Promise.all(photos.map((p) => removeUpload(p.path, "public")));
  res.status(204).end();
});

router.patch("/me/companion-profile", async (req, res) => {
  const me = currentUser(req);
  const body = UpdateCompanionProfileBody.parse(req.body);
  if (me.role !== "companion") throw forbidden("Switch to companion mode first");
  const update: Partial<typeof companionProfilesTable.$inferInsert> = { updatedAt: new Date() };
  if (body.vibes !== undefined) update.vibes = body.vibes.map((v) => v.trim()).filter(Boolean);
  if (body.menu !== undefined) update.menu = body.menu.map((v) => v.trim()).filter(Boolean);
  if (body.rate !== undefined) update.rate = body.rate;
  if (body.minBookingHours !== undefined) update.minBookingHours = body.minBookingHours;
  if (body.availabilityStatus !== undefined) update.availabilityStatus = body.availabilityStatus;
  if (body.dealDiscount !== undefined) update.dealDiscount = body.dealDiscount;
  if (body.dealActive !== undefined) {
    if (body.dealActive) {
      const end = new Date();
      end.setHours(23, 59, 59, 0);
      if (end.getTime() < Date.now()) end.setDate(end.getDate() + 1);
      update.dealExpiresAt = end;
      if (body.dealDiscount === undefined && (me.companionProfile?.dealDiscount ?? 0) === 0) update.dealDiscount = 20;
    } else {
      update.dealExpiresAt = null;
      update.dealDiscount = 0;
    }
  }
  const wentLive = body.availabilityStatus === "now" && me.companionProfile?.availabilityStatus !== "now";
  await db
    .insert(companionProfilesTable)
    .values({ userId: me.id, ...update })
    .onConflictDoUpdate({ target: companionProfilesTable.userId, set: update });
  await db
    .update(usersTable)
    .set({ availableTonight: body.availabilityStatus ? body.availabilityStatus !== "offline" : me.availableTonight })
    .where(eq(usersTable.id, me.id));

  if (wentLive) {
    const savers = await db
      .select({ userId: savedCompanionsTable.userId })
      .from(savedCompanionsTable)
      .where(eq(savedCompanionsTable.companionId, me.id));
    await Promise.all(
      savers.map((s) =>
        notify({
          userId: s.userId,
          type: "available",
          title: `${me.name} is available now 🌙`,
          body: `Just went live in ${me.city}`,
          channel: "deals",
          actionRoute: `/companion/${me.id}`,
          actionLabel: "Connect",
          actorId: me.id,
        }),
      ),
    );
  }
  res.json(await fullUser(me.id));
});

router.post("/me/presence", async (req, res) => {
  const me = currentUser(req);
  const body = HeartbeatBody.parse(req.body ?? {});
  const update: Partial<typeof usersTable.$inferInsert> = { lastSeenAt: new Date() };
  if (body.lat !== undefined && body.lng !== undefined) {
    update.lat = body.lat;
    update.lng = body.lng;
  }
  if (body.city) update.city = body.city;
  await db.update(usersTable).set(update).where(eq(usersTable.id, me.id));
  await touchLoginStreak(me.id);
  res.status(204).end();
});

router.post("/me/photos", async (req, res) => {
  const me = currentUser(req);
  const body = UploadPhotoBody.parse(req.body);
  const count = await db.select({ n: sql<string>`count(*)` }).from(photosTable).where(eq(photosTable.userId, me.id));
  if (Number(count[0]?.n ?? 0) >= 6) throw new HttpError(400, "Maximum 6 photos", "too_many_photos");
  const stored = await saveUpload(body.dataBase64, { visibility: "public", contentType: body.contentType, kind: "image" });
  const makePrimary = body.isPrimary ?? Number(count[0]?.n ?? 0) === 0;
  const photo = await db.transaction(async (tx) => {
    if (makePrimary) await tx.update(photosTable).set({ isPrimary: false }).where(eq(photosTable.userId, me.id));
    const [row] = await tx
      .insert(photosTable)
      .values({ userId: me.id, path: stored.path, contentType: stored.contentType, isPrimary: makePrimary, sortOrder: Number(count[0]?.n ?? 0) })
      .returning();
    return row;
  });
  res.status(201).json(toPhoto(photo));
});

router.delete("/me/photos/:photoId", async (req, res) => {
  const me = currentUser(req);
  const { photoId } = DeletePhotoParams.parse(req.params);
  const rows = await db.select().from(photosTable).where(and(eq(photosTable.id, photoId), eq(photosTable.userId, me.id))).limit(1);
  const photo = rows[0];
  if (!photo) throw notFound("Photo");
  await db.delete(photosTable).where(eq(photosTable.id, photo.id));
  await removeUpload(photo.path, "public");
  if (photo.isPrimary) {
    const next = await db.select().from(photosTable).where(eq(photosTable.userId, me.id)).orderBy(photosTable.sortOrder).limit(1);
    if (next[0]) await db.update(photosTable).set({ isPrimary: true }).where(eq(photosTable.id, next[0].id));
  }
  res.status(204).end();
});

router.post("/me/push-token", async (req, res) => {
  const me = currentUser(req);
  const body = RegisterPushTokenBody.parse(req.body);
  await db
    .insert(pushTokensTable)
    .values({ userId: me.id, token: body.token, platform: body.platform ?? "unknown" })
    .onConflictDoUpdate({ target: pushTokensTable.token, set: { userId: me.id, platform: body.platform ?? "unknown", lastSeenAt: new Date() } });
  res.status(204).end();
});

router.delete("/me/push-token", async (req, res) => {
  const me = currentUser(req);
  const body = UnregisterPushTokenBody.parse(req.body);
  await db.delete(pushTokensTable).where(and(eq(pushTokensTable.token, body.token), eq(pushTokensTable.userId, me.id)));
  res.status(204).end();
});

router.get("/me/swipes", async (req, res) => {
  const me = currentUser(req);
  const swipes = await db.select().from(swipesTable).where(eq(swipesTable.userId, me.id));
  res.json({
    liked: swipes.filter((s) => s.action === "like").map((s) => s.companionId),
    passed: swipes.filter((s) => s.action === "pass").map((s) => s.companionId),
  });
});

router.get("/me/saved", async (req, res) => {
  const me = currentUser(req);
  const saved = await db.select().from(savedCompanionsTable).where(eq(savedCompanionsTable.userId, me.id)).orderBy(desc(savedCompanionsTable.createdAt));
  const ids = saved.map((s) => s.companionId);
  if (ids.length === 0) {
    res.json([]);
    return;
  }
  const rows = await db
    .select({ user: usersTable, profile: companionProfilesTable })
    .from(usersTable)
    .innerJoin(companionProfilesTable, eq(companionProfilesTable.userId, usersTable.id))
    .where(inArray(usersTable.id, ids));
  const order = new Map(ids.map((id, i) => [id, i]));
  rows.sort((a, b) => (order.get(a.user.id) ?? 0) - (order.get(b.user.id) ?? 0));
  res.json(await cardsFor(rows, me));
});

router.get("/me/profile-views", async (req, res) => {
  const me = currentUser(req);
  const views = await db
    .select({ view: profileViewsTable, viewer: usersTable })
    .from(profileViewsTable)
    .innerJoin(usersTable, eq(usersTable.id, profileViewsTable.viewerId))
    .where(eq(profileViewsTable.viewedId, me.id))
    .orderBy(desc(profileViewsTable.createdAt))
    .limit(30);
  const seen = new Set<string>();
  const out: ProfileView[] = [];
  for (const { view, viewer } of views) {
    if (seen.has(viewer.id)) continue;
    seen.add(viewer.id);
    const hidden = viewer.ghostMode;
    out.push({
      id: view.id,
      hidden,
      viewerId: hidden ? null : viewer.id,
      viewerName: hidden ? "Hidden User" : viewer.name,
      viewerColor: hidden ? "#6b6b8a" : viewer.avatarColor,
      viewedAt: view.createdAt.toISOString(),
    });
  }
  res.json(out);
});

router.post("/me/stories", async (req, res) => {
  const me = currentUser(req);
  const body = PostStoryBody.parse(req.body);
  if (me.role !== "companion") throw forbidden("Only companions can post stories");
  const [story] = await db
    .insert(storiesTable)
    .values({ userId: me.id, text: body.text.trim(), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) })
    .returning();
  const row = await loadCompanionRow(me.id);
  if (!row) throw notFound("Companion profile");
  const [ctx, agg] = await Promise.all([loadViewerContext(me), loadAggregates([me.id])]);
  const payload: Story = {
    id: story.id,
    companion: buildCard(row, ctx, agg),
    text: story.text,
    createdAt: story.createdAt.toISOString(),
    expiresAt: story.expiresAt.toISOString(),
  };
  res.status(201).json(payload);
});

router.get("/me/score", async (req, res) => {
  const me = currentUser(req);
  const [fresh] = await db.select({ points: usersTable.loyaltyPoints, streak: usersTable.loginStreak }).from(usersTable).where(eq(usersTable.id, me.id));
  const activity = await db
    .select()
    .from(pointsLedgerTable)
    .where(eq(pointsLedgerTable.userId, me.id))
    .orderBy(desc(pointsLedgerTable.createdAt))
    .limit(20);
  const points = fresh?.points ?? 0;
  const payload: ScoreSummary = {
    points,
    ...tierFor(points),
    loginStreak: fresh?.streak ?? 0,
    activity: activity.map((a) => ({ id: a.id, points: a.points, reason: a.reason, label: a.label, createdAt: a.createdAt.toISOString() })),
  };
  res.json(payload);
});

router.get("/me/referral", async (req, res) => {
  const me = currentUser(req);
  const invites = await db
    .select({ ref: referralsTable, user: usersTable })
    .from(referralsTable)
    .innerJoin(usersTable, eq(usersTable.id, referralsTable.referredUserId))
    .where(eq(referralsTable.referrerId, me.id))
    .orderBy(desc(referralsTable.createdAt));
  const payload: ReferralSummary = {
    code: me.referralCode,
    link: `https://nightmap.itsolutionsuganda.com/join?ref=${me.referralCode}`,
    inviteCount: invites.length,
    pointsEarned: invites.reduce((s, i) => s + i.ref.pointsAwarded, 0),
    invites: invites.map((i) => ({ name: i.user.name, joinedAt: i.ref.createdAt.toISOString(), pointsAwarded: i.ref.pointsAwarded })),
  };
  res.json(payload);
});

router.get("/me/trusted-contacts", async (req, res) => {
  const me = currentUser(req);
  const rows = await db.select().from(trustedContactsTable).where(eq(trustedContactsTable.userId, me.id)).orderBy(trustedContactsTable.createdAt);
  res.json(rows.map((c) => ({ id: c.id, name: c.name, phone: c.phone, relation: c.relation, createdAt: c.createdAt.toISOString() })));
});

router.post("/me/trusted-contacts", async (req, res) => {
  const me = currentUser(req);
  const body = AddTrustedContactBody.parse(req.body);
  const count = await db.select({ n: sql<string>`count(*)` }).from(trustedContactsTable).where(eq(trustedContactsTable.userId, me.id));
  if (Number(count[0]?.n ?? 0) >= 5) throw new HttpError(400, "Maximum 5 trusted contacts", "too_many_contacts");
  const [c] = await db
    .insert(trustedContactsTable)
    .values({ userId: me.id, name: body.name.trim(), phone: body.phone.trim(), relation: body.relation?.trim() || "Contact" })
    .returning();
  res.status(201).json({ id: c.id, name: c.name, phone: c.phone, relation: c.relation, createdAt: c.createdAt.toISOString() });
});

router.delete("/me/trusted-contacts/:contactId", async (req, res) => {
  const me = currentUser(req);
  const { contactId } = DeleteTrustedContactParams.parse(req.params);
  await db.delete(trustedContactsTable).where(and(eq(trustedContactsTable.id, contactId), eq(trustedContactsTable.userId, me.id)));
  res.status(204).end();
});

export default router;

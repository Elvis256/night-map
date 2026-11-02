import { Router, type IRouter } from "express";
import { and, desc, eq, gt, inArray, ne, sql } from "drizzle-orm";
import {
  GetCompanionParams,
  ListCompanionReviewsParams,
  ListCompanionsQueryParams,
  ListDealsQueryParams,
  ListStoriesQueryParams,
  SwipeCompanionBody,
  SwipeCompanionParams,
  ToggleSaveCompanionParams,
} from "@workspace/api-zod";
import type { CompanionDetail, Story } from "@workspace/api-zod";
import {
  companionProfilesTable,
  db,
  photosTable,
  profileViewsTable,
  reviewsTable,
  savedCompanionsTable,
  storiesTable,
  swipesTable,
  usersTable,
} from "@workspace/db";
import { currentUser, requireAuth } from "../lib/auth";
import { buildCard, loadAggregates, loadCompanionRow, loadViewerContext, visibleCompanionsQuery, type CompanionRow } from "../lib/companions";
import { notFound } from "../lib/errors";
import { hasActiveDeal, toPhoto, toReview } from "../lib/serializers";

const router: IRouter = Router();
router.use(requireAuth);

function origin(q: { lat?: number; lng?: number }) {
  return q.lat !== undefined && q.lng !== undefined ? { lat: q.lat, lng: q.lng } : null;
}

router.get("/companions", async (req, res) => {
  const me = currentUser(req);
  const q = ListCompanionsQueryParams.parse(req.query);
  let rows: CompanionRow[] = await visibleCompanionsQuery();
  rows = rows.filter((r) => r.user.id !== me.id);
  if (q.gender) rows = rows.filter((r) => r.user.gender === q.gender);
  if (q.city) rows = rows.filter((r) => r.user.city.toLowerCase() === q.city!.toLowerCase());
  if (q.status && q.status !== "all") rows = rows.filter((r) => r.profile.availabilityStatus === q.status);
  if (q.verifiedOnly) rows = rows.filter((r) => r.user.verified);
  if (q.maxRate !== undefined) rows = rows.filter((r) => r.profile.rate <= q.maxRate!);
  if (q.category) {
    const cat = q.category.toLowerCase();
    rows = rows.filter(
      (r) => r.profile.menu.some((m) => m.toLowerCase() === cat) || r.profile.vibes.some((v) => v.toLowerCase() === cat),
    );
  }
  const [ctx, agg] = await Promise.all([loadViewerContext(me, origin(q)), loadAggregates(rows.map((r) => r.user.id))]);
  let cards = rows.map((r) => buildCard(r, ctx, agg));
  if (q.excludeSwiped) cards = cards.filter((c) => !ctx.liked.has(c.id) && !ctx.passed.has(c.id));
  if (q.minRating !== undefined && q.minRating > 0) cards = cards.filter((c) => c.rating >= q.minRating!);
  if (q.maxDistance !== undefined) cards = cards.filter((c) => c.distanceKm == null || c.distanceKm <= q.maxDistance!);
  cards.sort((a, b) => {
    if (a.isSpotlight !== b.isSpotlight) return a.isSpotlight ? -1 : 1;
    if (a.online !== b.online) return a.online ? -1 : 1;
    const order = { now: 0, tonight: 1, offline: 2 } as const;
    if (order[a.availabilityStatus] !== order[b.availabilityStatus]) return order[a.availabilityStatus] - order[b.availabilityStatus];
    return (a.distanceKm ?? 999) - (b.distanceKm ?? 999);
  });
  res.json(cards);
});

router.get("/companions/:companionId", async (req, res) => {
  const me = currentUser(req);
  const { companionId } = GetCompanionParams.parse(req.params);
  const row = await loadCompanionRow(companionId);
  if (!row || row.user.role !== "companion") throw notFound("Companion");
  if (row.user.id !== me.id) {
    await db.insert(profileViewsTable).values({ viewerId: me.id, viewedId: row.user.id });
  }
  const [ctx, agg, photos, reviews] = await Promise.all([
    loadViewerContext(me),
    loadAggregates([row.user.id]),
    db.select().from(photosTable).where(eq(photosTable.userId, row.user.id)).orderBy(desc(photosTable.isPrimary), photosTable.sortOrder),
    db
      .select({ review: reviewsTable, reviewer: usersTable })
      .from(reviewsTable)
      .innerJoin(usersTable, eq(usersTable.id, reviewsTable.reviewerId))
      .where(eq(reviewsTable.companionId, row.user.id))
      .orderBy(desc(reviewsTable.createdAt))
      .limit(5),
  ]);
  const detail: CompanionDetail = {
    ...buildCard(row, ctx, agg),
    photos: photos.map(toPhoto),
    recentReviews: reviews.map((r) => toReview(r.review, r.reviewer.name)),
    verificationState: row.user.verificationStatus,
  };
  res.json(detail);
});

router.get("/companions/:companionId/reviews", async (req, res) => {
  const { companionId } = ListCompanionReviewsParams.parse(req.params);
  const reviews = await db
    .select({ review: reviewsTable, reviewer: usersTable })
    .from(reviewsTable)
    .innerJoin(usersTable, eq(usersTable.id, reviewsTable.reviewerId))
    .where(eq(reviewsTable.companionId, companionId))
    .orderBy(desc(reviewsTable.createdAt))
    .limit(50);
  res.json(reviews.map((r) => toReview(r.review, r.reviewer.name)));
});

router.post("/companions/:companionId/swipe", async (req, res) => {
  const me = currentUser(req);
  const { companionId } = SwipeCompanionParams.parse(req.params);
  const body = SwipeCompanionBody.parse(req.body);
  const target = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, companionId)).limit(1);
  if (!target[0]) throw notFound("Companion");
  await db
    .insert(swipesTable)
    .values({ userId: me.id, companionId, action: body.action })
    .onConflictDoUpdate({ target: [swipesTable.userId, swipesTable.companionId], set: { action: body.action, createdAt: new Date() } });
  const swipes = await db.select().from(swipesTable).where(eq(swipesTable.userId, me.id));
  res.json({
    liked: swipes.filter((s) => s.action === "like").map((s) => s.companionId),
    passed: swipes.filter((s) => s.action === "pass").map((s) => s.companionId),
  });
});

router.post("/companions/:companionId/save", async (req, res) => {
  const me = currentUser(req);
  const { companionId } = ToggleSaveCompanionParams.parse(req.params);
  const existing = await db
    .select()
    .from(savedCompanionsTable)
    .where(and(eq(savedCompanionsTable.userId, me.id), eq(savedCompanionsTable.companionId, companionId)))
    .limit(1);
  if (existing[0]) {
    await db.delete(savedCompanionsTable).where(and(eq(savedCompanionsTable.userId, me.id), eq(savedCompanionsTable.companionId, companionId)));
    res.json({ saved: false });
    return;
  }
  const target = await db.select({ privacy: usersTable.privacy }).from(usersTable).where(eq(usersTable.id, companionId)).limit(1);
  if (!target[0]) throw notFound("Companion");
  if (!target[0].privacy.allowSaves) {
    res.json({ saved: false });
    return;
  }
  await db.insert(savedCompanionsTable).values({ userId: me.id, companionId }).onConflictDoNothing();
  res.json({ saved: true });
});

router.get("/deals", async (req, res) => {
  const me = currentUser(req);
  const q = ListDealsQueryParams.parse(req.query);
  let rows: CompanionRow[] = await visibleCompanionsQuery();
  rows = rows.filter((r) => r.user.id !== me.id && hasActiveDeal(r.profile));
  if (q.city) rows = rows.filter((r) => r.user.city.toLowerCase() === q.city!.toLowerCase());
  const [ctx, agg] = await Promise.all([loadViewerContext(me), loadAggregates(rows.map((r) => r.user.id))]);
  const cards = rows.map((r) => buildCard(r, ctx, agg)).sort((a, b) => b.dealDiscount - a.dealDiscount);
  res.json(cards);
});

router.get("/stories", async (req, res) => {
  const me = currentUser(req);
  const q = ListStoriesQueryParams.parse(req.query);
  const stories = await db
    .select({ story: storiesTable, user: usersTable, profile: companionProfilesTable })
    .from(storiesTable)
    .innerJoin(usersTable, eq(usersTable.id, storiesTable.userId))
    .innerJoin(companionProfilesTable, eq(companionProfilesTable.userId, usersTable.id))
    .where(and(gt(storiesTable.expiresAt, new Date()), eq(usersTable.ghostMode, false), ne(usersTable.id, me.id)))
    .orderBy(desc(storiesTable.createdAt))
    .limit(40);
  const filtered = q.city ? stories.filter((s) => s.user.city.toLowerCase() === q.city!.toLowerCase()) : stories;
  const seen = new Set<string>();
  const latest = filtered.filter((s) => (seen.has(s.user.id) ? false : (seen.add(s.user.id), true)));
  const [ctx, agg] = await Promise.all([loadViewerContext(me), loadAggregates(latest.map((s) => s.user.id))]);
  const out: Story[] = latest.map((s) => ({
    id: s.story.id,
    companion: buildCard({ user: s.user, profile: s.profile }, ctx, agg),
    text: s.story.text,
    createdAt: s.story.createdAt.toISOString(),
    expiresAt: s.story.expiresAt.toISOString(),
  }));
  res.json(out);
});

export default router;

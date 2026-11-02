import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import type { CompanionCard } from "@workspace/api-zod";
import {
  bookingsTable,
  companionProfilesTable,
  connectionsTable,
  db,
  photosTable,
  reviewsTable,
  savedCompanionsTable,
  swipesTable,
  usersTable,
  type CompanionProfile,
  type Photo,
  type User,
} from "@workspace/db";
import { cityCoords, haversineKm } from "./geo";
import { hasActiveDeal, isFeatured, isOnline, photoIndexFor } from "./serializers";
import { publicUrl } from "./storage";

export interface CompanionRow {
  user: User;
  profile: CompanionProfile;
}

export interface ViewerContext {
  viewerId: string;
  liked: Set<string>;
  passed: Set<string>;
  saved: Set<string>;
  connections: Map<string, string>;
  origin: { lat: number; lng: number } | null;
}

export interface Aggregates {
  rating: Map<string, { avg: number; count: number }>;
  recentCompleted: Map<string, number>;
  photos: Map<string, Photo>;
}

const NEW_IN_TOWN_DAYS = 14;
const HOT_STREAK_DAYS = 7;
const HOT_STREAK_MIN = 2;

export async function loadViewerContext(
  viewer: User,
  origin?: { lat: number; lng: number } | null,
): Promise<ViewerContext> {
  const [swipes, saved, connections] = await Promise.all([
    db.select().from(swipesTable).where(eq(swipesTable.userId, viewer.id)),
    db.select().from(savedCompanionsTable).where(eq(savedCompanionsTable.userId, viewer.id)),
    db
      .select({ id: connectionsTable.id, seekerId: connectionsTable.seekerId, companionId: connectionsTable.companionId })
      .from(connectionsTable)
      .where(
        sql`${connectionsTable.seekerId} = ${viewer.id} or ${connectionsTable.companionId} = ${viewer.id}`,
      ),
  ]);
  const resolvedOrigin =
    origin ??
    (viewer.lat != null && viewer.lng != null ? { lat: viewer.lat, lng: viewer.lng } : cityCoords(viewer.city));
  return {
    viewerId: viewer.id,
    liked: new Set(swipes.filter((s) => s.action === "like").map((s) => s.companionId)),
    passed: new Set(swipes.filter((s) => s.action === "pass").map((s) => s.companionId)),
    saved: new Set(saved.map((s) => s.companionId)),
    connections: new Map(
      connections.map((c) => [c.seekerId === viewer.id ? c.companionId : c.seekerId, c.id]),
    ),
    origin: resolvedOrigin,
  };
}

export async function loadAggregates(ids: string[]): Promise<Aggregates> {
  const empty: Aggregates = { rating: new Map(), recentCompleted: new Map(), photos: new Map() };
  if (ids.length === 0) return empty;
  const since = new Date(Date.now() - HOT_STREAK_DAYS * 24 * 60 * 60 * 1000);
  const [ratings, completed, photos] = await Promise.all([
    db
      .select({
        companionId: reviewsTable.companionId,
        avg: sql<string>`avg((${reviewsTable.personality} + ${reviewsTable.appearance} + ${reviewsTable.punctuality} + ${reviewsTable.service} + ${reviewsTable.safety}) / 5.0)`,
        count: sql<string>`count(*)`,
      })
      .from(reviewsTable)
      .where(inArray(reviewsTable.companionId, ids))
      .groupBy(reviewsTable.companionId),
    db
      .select({ companionId: bookingsTable.companionId, count: sql<string>`count(*)` })
      .from(bookingsTable)
      .where(
        and(
          inArray(bookingsTable.companionId, ids),
          eq(bookingsTable.status, "completed"),
          gt(bookingsTable.completedAt, since),
        ),
      )
      .groupBy(bookingsTable.companionId),
    db
      .select()
      .from(photosTable)
      .where(inArray(photosTable.userId, ids))
      .orderBy(desc(photosTable.isPrimary), photosTable.sortOrder, photosTable.createdAt),
  ]);
  const photoMap = new Map<string, Photo>();
  for (const p of photos) if (!photoMap.has(p.userId)) photoMap.set(p.userId, p);
  return {
    rating: new Map(
      ratings.map((r) => [r.companionId, { avg: Math.round(Number(r.avg) * 10) / 10, count: Number(r.count) }]),
    ),
    recentCompleted: new Map(completed.map((c) => [c.companionId, Number(c.count)])),
    photos: photoMap,
  };
}

export function trustScoreFor(row: CompanionRow, rating: { avg: number; count: number } | undefined): number {
  let score = 55;
  if (row.user.verified) score += 20;
  score += Math.min(15, Math.floor(row.profile.completedMeetups / 2));
  if (rating && rating.count > 0) {
    if (rating.avg >= 4.8) score += 10;
    else if (rating.avg >= 4.5) score += 7;
    else if (rating.avg >= 4.0) score += 4;
    else if (rating.avg < 3.0) score -= 10;
  }
  return Math.max(0, Math.min(100, score));
}

export function buildCard(row: CompanionRow, ctx: ViewerContext, agg: Aggregates): CompanionCard {
  const { user, profile } = row;
  const rating = agg.rating.get(user.id);
  const companionCoords =
    user.lat != null && user.lng != null ? { lat: user.lat, lng: user.lng } : cityCoords(user.city);
  const distance =
    ctx.origin && companionCoords && user.privacy.showDistance
      ? Math.round(haversineKm(ctx.origin.lat, ctx.origin.lng, companionCoords.lat, companionCoords.lng) * 10) / 10
      : null;
  const photo = agg.photos.get(user.id);
  const dealActive = hasActiveDeal(profile);
  return {
    id: user.id,
    name: user.name,
    age: user.age,
    gender: user.gender,
    city: user.city,
    bio: user.bio,
    avatarColor: user.avatarColor,
    photoUrl: photo ? publicUrl(photo.path) : null,
    photoIndex: photoIndexFor(user),
    verified: user.verified,
    online: user.privacy.showOnline ? isOnline(user, profile) : false,
    lastSeenAt: user.lastSeenAt.toISOString(),
    distanceKm: distance,
    lat: user.privacy.showDistance ? companionCoords?.lat ?? null : null,
    lng: user.privacy.showDistance ? companionCoords?.lng ?? null : null,
    vibes: profile.vibes,
    menu: profile.menu,
    rate: profile.rate,
    minBookingHours: profile.minBookingHours,
    availabilityStatus: profile.availabilityStatus,
    isSpotlight: isFeatured(profile),
    isTonightsDeal: dealActive,
    dealDiscount: dealActive ? profile.dealDiscount : 0,
    isNewInTown: Date.now() - user.createdAt.getTime() < NEW_IN_TOWN_DAYS * 24 * 60 * 60 * 1000,
    isHotStreak: (agg.recentCompleted.get(user.id) ?? 0) >= HOT_STREAK_MIN,
    completedMeetups: profile.completedMeetups,
    responseRate: profile.responseRate,
    trustScore: trustScoreFor(row, rating),
    rating: rating?.avg ?? 0,
    reviewCount: rating?.count ?? 0,
    isLiked: ctx.liked.has(user.id),
    isSaved: ctx.saved.has(user.id),
    connectionId: ctx.connections.get(user.id) ?? null,
  };
}

/** Companions that are discoverable: role companion, not ghosted, not hidden. */
export function visibleCompanionsQuery() {
  return db
    .select({ user: usersTable, profile: companionProfilesTable })
    .from(usersTable)
    .innerJoin(companionProfilesTable, eq(companionProfilesTable.userId, usersTable.id))
    .where(
      and(
        eq(usersTable.role, "companion"),
        eq(usersTable.ghostMode, false),
        sql`coalesce((${usersTable.privacy} ->> 'hideFromSearch')::boolean, false) = false`,
      ),
    );
}

export async function loadCompanionRow(id: string): Promise<CompanionRow | null> {
  const rows = await db
    .select({ user: usersTable, profile: companionProfilesTable })
    .from(usersTable)
    .innerJoin(companionProfilesTable, eq(companionProfilesTable.userId, usersTable.id))
    .where(eq(usersTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function cardsFor(rows: CompanionRow[], viewer: User, origin?: { lat: number; lng: number } | null) {
  const [ctx, agg] = await Promise.all([
    loadViewerContext(viewer, origin),
    loadAggregates(rows.map((r) => r.user.id)),
  ]);
  return rows.map((r) => buildCard(r, ctx, agg));
}

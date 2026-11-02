import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import type { Entitlements, Package, Subscription as ApiSubscription } from "@workspace/api-zod";
import { companionProfilesTable, connectionsTable, db, subscriptionsTable, type CompanionProfile, type Subscription, type User } from "@workspace/db";

export const HIGH_END_RATE = Number(process.env.HIGH_END_RATE_UGX ?? 150000);
export const FREE_SUPER_REQUESTS_PER_DAY = 3;
export const CHECKOUT_ENABLED = false;

export const PACKAGES: Package[] = [
  {
    id: "client-free",
    title: "Free",
    price: 0,
    period: "",
    description: "Explore NightMap before choosing a paid plan.",
    features: ["Browse standard profiles", "Preview the High-End collection", `${FREE_SUPER_REQUESTS_PER_DAY} super requests per day`, "Safety and verification details"],
    audience: "seeker",
    highlighted: false,
  },
  {
    id: "high-end",
    title: "High-End Access",
    price: 20_000,
    period: "/month",
    description: "For clients who want access to premium profiles.",
    features: ["View and contact High-End companions", "Use premium discovery filters", "Save profiles for later"],
    audience: "seeker",
    highlighted: true,
  },
  {
    id: "client-vip",
    title: "NightMap VIP",
    price: 35_000,
    period: "/month",
    description: "High-End Access plus unlimited super requests.",
    features: ["Everything in High-End Access", "Unlimited super requests", "Early access to featured deals"],
    audience: "seeker",
    highlighted: false,
  },
  {
    id: "companion-basic",
    title: "Basic Listing",
    price: 0,
    period: "",
    description: "Start with a free profile and receive client requests.",
    features: ["Standard placement in city results", "Show your rates and availability", "Manage booking requests", "Verification and safety features stay free"],
    audience: "companion",
    highlighted: false,
  },
  {
    id: "companion-featured",
    title: "Featured",
    price: 100_000,
    period: "/week",
    description: "Optional extra visibility for your profile.",
    features: ["Boosted placement in discovery", "Featured label on your profile", "Keep the free listing if you don't upgrade"],
    audience: "companion",
    highlighted: true,
  },
];

export function packageById(id: string): Package | undefined {
  return PACKAGES.find((p) => p.id === id);
}

export function packageDurationDays(pkg: Package): number {
  return pkg.period === "/week" ? 7 : 30;
}

export function isHighEndProfile(profile: Pick<CompanionProfile, "rate">): boolean {
  return profile.rate >= HIGH_END_RATE;
}

export function toSubscription(s: Subscription): ApiSubscription {
  return {
    id: s.id,
    packageId: s.packageId,
    status: s.status,
    amount: s.amount,
    startsAt: s.startsAt?.toISOString() ?? null,
    endsAt: s.endsAt?.toISOString() ?? null,
    note: s.note,
    createdAt: s.createdAt.toISOString(),
  };
}

/** Lazily expires lapsed subscriptions and returns the active one, if any. */
export async function activeSubscription(userId: string): Promise<Subscription | null> {
  const now = new Date();
  await db
    .update(subscriptionsTable)
    .set({ status: "expired", updatedAt: now })
    .where(and(eq(subscriptionsTable.userId, userId), eq(subscriptionsTable.status, "active"), lt(subscriptionsTable.endsAt, now)));
  const rows = await db
    .select()
    .from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.userId, userId), eq(subscriptionsTable.status, "active")))
    .orderBy(desc(subscriptionsTable.endsAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function hasHighEndAccess(user: Pick<User, "id" | "isAdmin" | "role">): Promise<boolean> {
  if (user.isAdmin || user.role === "companion") return true;
  const sub = await activeSubscription(user.id);
  return !!sub && (sub.packageId === "high-end" || sub.packageId === "client-vip");
}

export async function superRequestsUsedToday(userId: string): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const rows = await db
    .select({ n: sql<string>`count(*)` })
    .from(connectionsTable)
    .where(and(eq(connectionsTable.seekerId, userId), eq(connectionsTable.type, "super"), gte(connectionsTable.createdAt, start)));
  return Number(rows[0]?.n ?? 0);
}

export async function entitlementsFor(user: User): Promise<Entitlements> {
  const sub = await activeSubscription(user.id);
  const packageId = sub?.packageId ?? (user.role === "companion" ? "companion-basic" : "client-free");
  const unlimitedSuper = user.isAdmin || packageId === "client-vip";
  const used = unlimitedSuper ? 0 : await superRequestsUsedToday(user.id);
  const pending = await db
    .select()
    .from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.userId, user.id), eq(subscriptionsTable.status, "requested")))
    .orderBy(desc(subscriptionsTable.createdAt))
    .limit(1);
  return {
    activePackageId: packageId,
    activeUntil: sub?.endsAt?.toISOString() ?? null,
    highEndAccess: user.isAdmin || user.role === "companion" || packageId === "high-end" || packageId === "client-vip",
    unlimitedSuperRequests: unlimitedSuper,
    featured: packageId === "companion-featured",
    superRequestsLeftToday: unlimitedSuper ? 999 : Math.max(0, FREE_SUPER_REQUESTS_PER_DAY - used),
    checkoutEnabled: CHECKOUT_ENABLED,
    pendingRequest: pending[0] ? toSubscription(pending[0]) : null,
  };
}

/** Activates a package for a user (admin grant), superseding other active subscriptions. */
export async function grantPackage(userId: string, pkg: Package, days: number, note: string, grantedBy: string): Promise<Subscription> {
  const now = new Date();
  const endsAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return db.transaction(async (tx) => {
    await tx
      .update(subscriptionsTable)
      .set({ status: "cancelled", updatedAt: now })
      .where(and(eq(subscriptionsTable.userId, userId), eq(subscriptionsTable.status, "active")));
    const requested = await tx
      .select()
      .from(subscriptionsTable)
      .where(and(eq(subscriptionsTable.userId, userId), eq(subscriptionsTable.packageId, pkg.id), inArray(subscriptionsTable.status, ["requested"])))
      .limit(1);
    let row: Subscription;
    if (requested[0]) {
      [row] = await tx
        .update(subscriptionsTable)
        .set({ status: "active", amount: pkg.price, startsAt: now, endsAt, note, grantedBy, updatedAt: now })
        .where(eq(subscriptionsTable.id, requested[0].id))
        .returning();
    } else {
      [row] = await tx
        .insert(subscriptionsTable)
        .values({ userId, packageId: pkg.id, status: "active", amount: pkg.price, startsAt: now, endsAt, note, grantedBy })
        .returning();
    }
    if (pkg.id === "companion-featured") {
      await tx.update(companionProfilesTable).set({ featuredUntil: endsAt, updatedAt: now }).where(eq(companionProfilesTable.userId, userId));
    }
    return row;
  });
}

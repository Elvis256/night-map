import { eq, sql } from "drizzle-orm";
import {
  db,
  notificationsTable,
  pointsLedgerTable,
  usersTable,
  type NotificationPrefs,
} from "@workspace/db";

export type NotificationChannel = keyof NotificationPrefs | "system";

interface NotifyInput {
  userId: string;
  type: string;
  title: string;
  body: string;
  channel?: NotificationChannel;
  actionRoute?: string | null;
  actionLabel?: string | null;
  actorId?: string | null;
}

/** Creates an in-app notification, honouring the recipient's preferences. */
export async function notify(input: NotifyInput): Promise<void> {
  const channel = input.channel ?? "system";
  if (channel !== "system") {
    const rows = await db
      .select({ prefs: usersTable.notificationPrefs })
      .from(usersTable)
      .where(eq(usersTable.id, input.userId))
      .limit(1);
    const prefs = rows[0]?.prefs;
    if (prefs && prefs[channel] === false) return;
  }
  await db.insert(notificationsTable).values({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    actionRoute: input.actionRoute ?? null,
    actionLabel: input.actionLabel ?? null,
    actorId: input.actorId ?? null,
  });
}

export async function notifyAdmins(input: Omit<NotifyInput, "userId">): Promise<void> {
  const admins = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.isAdmin, true));
  await Promise.all(admins.map((a) => notify({ ...input, userId: a.id })));
}

export const POINTS = {
  completeMeetup: 100,
  reviewBase: 50,
  reviewWritten: 25,
  reviewLinked: 25,
  referral: 200,
  verified: 150,
  streak7: 50,
  firstBookingWeek: 30,
  joinLounge: 10,
  watchStream: 5,
} as const;

export async function awardPoints(userId: string, points: number, reason: string, label: string): Promise<void> {
  if (points <= 0) return;
  await db.transaction(async (tx) => {
    await tx.insert(pointsLedgerTable).values({ userId, points, reason, label });
    await tx
      .update(usersTable)
      .set({ loyaltyPoints: sql`${usersTable.loyaltyPoints} + ${points}` })
      .where(eq(usersTable.id, userId));
  });
}

export const TIERS = [
  { name: "Bronze", min: 0 },
  { name: "Silver", min: 200 },
  { name: "Gold", min: 500 },
  { name: "Platinum", min: 1000 },
] as const;

export function tierFor(points: number) {
  let current: (typeof TIERS)[number] = TIERS[0];
  for (const t of TIERS) if (points >= t.min) current = t;
  const idx = TIERS.indexOf(current);
  const next = TIERS[idx + 1] ?? null;
  const progress = next ? (points - current.min) / (next.min - current.min) : 1;
  return {
    tier: current.name,
    tierMin: current.min,
    nextTier: next?.name ?? null,
    nextTierMin: next?.min ?? null,
    ptsToNext: next ? next.min - points : 0,
    progress: Math.max(0, Math.min(1, progress)),
  };
}

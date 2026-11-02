import { Router, type IRouter } from "express";
import { and, eq, gt, sql } from "drizzle-orm";
import { LoginBody, RegisterBody } from "@workspace/api-zod";
import {
  companionProfilesTable,
  db,
  photosTable,
  referralsTable,
  usersTable,
} from "@workspace/db";
import {
  createSession,
  generateReferralCode,
  hashPin,
  loadUserWithProfile,
  normalizePhone,
  requireAuth,
  revokeSession,
  verifyPin,
} from "../lib/auth";
import { HttpError } from "../lib/errors";
import { cityCoords } from "../lib/geo";
import { awardPoints, notify, POINTS } from "../lib/notify";
import { toUser } from "../lib/serializers";

const router: IRouter = Router();

const AVATAR_COLORS = ["#c2185b", "#7b1fa2", "#00695c", "#1565c0", "#e65100", "#880e4f", "#1a237e", "#4a148c", "#FF4E62", "#7A3CFF", "#1FBF6B", "#3DA9FF", "#FF8A3D"];
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

async function authPayload(userId: string, token: string) {
  const user = await loadUserWithProfile(userId);
  if (!user) throw new HttpError(500, "User vanished");
  const photos = await db.select().from(photosTable).where(eq(photosTable.userId, userId));
  return { token, user: toUser(user, user.companionProfile, photos) };
}

export async function touchLoginStreak(userId: string): Promise<void> {
  const rows = await db
    .select({ streak: usersTable.loginStreak, lastDay: usersTable.lastLoginDay })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  const row = rows[0];
  if (!row) return;
  const today = new Date().toISOString().slice(0, 10);
  if (row.lastDay === today) return;
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const streak = row.lastDay === yesterday ? row.streak + 1 : 1;
  await db.update(usersTable).set({ loginStreak: streak, lastLoginDay: today }).where(eq(usersTable.id, userId));
  if (streak > 0 && streak % 7 === 0) {
    await awardPoints(userId, POINTS.streak7, "streak", `${streak}-day login streak`);
  }
}

router.post("/auth/register", async (req, res) => {
  const body = RegisterBody.parse(req.body);
  const phone = normalizePhone(body.phone);
  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.phone, phone)).limit(1);
  if (existing[0]) throw new HttpError(409, "An account with this phone already exists. Sign in instead.", "phone_taken");

  let referrerId: string | null = null;
  if (body.referralCode) {
    const ref = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.referralCode, body.referralCode.trim().toUpperCase()))
      .limit(1);
    referrerId = ref[0]?.id ?? null;
  }

  const city = body.city?.trim() || "Kampala";
  const coords = cityCoords(city);
  let referralCode = generateReferralCode();
  for (let i = 0; i < 5; i++) {
    const clash = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.referralCode, referralCode)).limit(1);
    if (!clash[0]) break;
    referralCode = generateReferralCode();
  }

  const gender = body.gender ?? (body.role === "companion" ? "female" : "other");

  const userId = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(usersTable)
      .values({
        phone,
        pinHash: hashPin(body.pin),
        name: body.name.trim(),
        role: body.role,
        gender,
        age: body.age ?? null,
        city,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
        referralCode,
        referredBy: referrerId,
        lastLoginDay: new Date().toISOString().slice(0, 10),
        loginStreak: 1,
      })
      .returning({ id: usersTable.id });
    if (body.role === "companion") {
      await tx.insert(companionProfilesTable).values({ userId: user.id, availabilityStatus: "tonight" });
    }
    if (referrerId) {
      await tx.insert(referralsTable).values({ referrerId, referredUserId: user.id, pointsAwarded: POINTS.referral });
    }
    return user.id;
  });

  if (referrerId) {
    await awardPoints(referrerId, POINTS.referral, "referral", `${body.name.trim()} joined with your code`);
    await notify({
      userId: referrerId,
      type: "referral",
      title: `${body.name.trim()} joined NightMap 🎁`,
      body: `+${POINTS.referral} loyalty points added to your score`,
      actionRoute: "/score",
      actionLabel: "View score",
      actorId: userId,
    });
  }

  const token = await createSession(userId, req.get("user-agent") ?? "");
  res.status(201).json(await authPayload(userId, token));
});

router.post("/auth/login", async (req, res) => {
  const body = LoginBody.parse(req.body);
  const phone = normalizePhone(body.phone);
  const rows = await db.select().from(usersTable).where(eq(usersTable.phone, phone)).limit(1);
  const user = rows[0];
  if (!user) throw new HttpError(401, "No account with this number. Create one first.", "unknown_phone");
  if (user.pinLockedUntil && user.pinLockedUntil.getTime() > Date.now()) {
    const mins = Math.ceil((user.pinLockedUntil.getTime() - Date.now()) / 60000);
    throw new HttpError(423, `Too many attempts. Try again in ${mins} min.`, "locked");
  }
  if (!verifyPin(body.pin, user.pinHash)) {
    const attempts = user.failedPinAttempts + 1;
    const lock = attempts >= MAX_FAILED_ATTEMPTS;
    await db
      .update(usersTable)
      .set({
        failedPinAttempts: lock ? 0 : attempts,
        pinLockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60000) : null,
      })
      .where(eq(usersTable.id, user.id));
    throw new HttpError(
      401,
      lock ? `Too many attempts. Locked for ${LOCK_MINUTES} min.` : "Incorrect PIN. Try again.",
      lock ? "locked" : "bad_pin",
    );
  }
  await db
    .update(usersTable)
    .set({ failedPinAttempts: 0, pinLockedUntil: null, lastSeenAt: sql`now()` })
    .where(and(eq(usersTable.id, user.id), gt(sql`1`, sql`0`)));
  await touchLoginStreak(user.id);
  const token = await createSession(user.id, req.get("user-agent") ?? "");
  res.json(await authPayload(user.id, token));
});

router.post("/auth/logout", requireAuth, async (req, res) => {
  await revokeSession(req);
  res.status(204).end();
});

export default router;

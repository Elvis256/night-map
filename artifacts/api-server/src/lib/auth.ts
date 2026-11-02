import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { and, eq, gt, sql } from "drizzle-orm";
import {
  companionProfilesTable,
  db,
  sessionsTable,
  usersTable,
  type CompanionProfile,
  type User,
} from "@workspace/db";
import { HttpError } from "./errors";

export interface AuthedUser extends User {
  companionProfile: CompanionProfile | null;
}

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 90;
const PRESENCE_TOUCH_MS = 60 * 1000;

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const computed = scryptSync(pin, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return computed.length === expected.length && timingSafeEqual(computed, expected);
}

export function normalizePhone(raw: string): string {
  const trimmed = raw.replace(/[\s\-().]/g, "");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) {
    throw new HttpError(400, "Enter a valid phone number", "invalid_phone");
  }
  return `+${digits}`;
}

export function generateReferralCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "NIGHT-";
  const bytes = randomBytes(4);
  for (let i = 0; i < 4; i++) code += alphabet[bytes[i] % alphabet.length];
  return code;
}

export async function createSession(userId: string, userAgent: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await db.insert(sessionsTable).values({
    token,
    userId,
    userAgent: userAgent.slice(0, 200),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  return token;
}

export async function loadUserWithProfile(userId: string): Promise<AuthedUser | null> {
  const rows = await db
    .select({ user: usersTable, profile: companionProfilesTable })
    .from(usersTable)
    .leftJoin(companionProfilesTable, eq(companionProfilesTable.userId, usersTable.id))
    .where(eq(usersTable.id, userId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { ...row.user, companionProfile: row.profile ?? null };
}

function extractToken(req: Request): string | null {
  const header = req.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
  return null;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req);
  if (!token) throw new HttpError(401, "Sign in required", "unauthenticated");
  const sessions = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.token, token), gt(sessionsTable.expiresAt, new Date())))
    .limit(1);
  const session = sessions[0];
  if (!session) throw new HttpError(401, "Session expired, sign in again", "unauthenticated");
  const user = await loadUserWithProfile(session.userId);
  if (!user) throw new HttpError(401, "Account no longer exists", "unauthenticated");
  req.user = user;
  if (Date.now() - user.lastSeenAt.getTime() > PRESENCE_TOUCH_MS) {
    void db
      .update(usersTable)
      .set({ lastSeenAt: sql`now()` })
      .where(eq(usersTable.id, user.id));
  }
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user?.isAdmin) throw new HttpError(403, "Admin access required", "forbidden");
  next();
}

export function currentUser(req: Request): AuthedUser {
  if (!req.user) throw new HttpError(401, "Sign in required", "unauthenticated");
  return req.user;
}

export async function revokeSession(req: Request): Promise<void> {
  const token = extractToken(req);
  if (!token) return;
  await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
}

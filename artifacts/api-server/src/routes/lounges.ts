import { Router, type IRouter } from "express";
import { and, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { CreateLoungeBody, EndLoungeParams, JoinLoungeParams, LeaveLoungeParams } from "@workspace/api-zod";
import type { Lounge as ApiLounge } from "@workspace/api-zod";
import { db, loungeParticipantsTable, loungesTable, usersTable, type Lounge } from "@workspace/db";
import { currentUser, requireAuth } from "../lib/auth";
import { forbidden, notFound } from "../lib/errors";
import { awardPoints, POINTS } from "../lib/notify";

const router: IRouter = Router();
router.use(requireAuth);

const PARTICIPANT_WINDOW_MS = 3 * 60 * 1000;

async function serialize(viewerId: string, rows: Lounge[]): Promise<ApiLounge[]> {
  const ids = rows.map((l) => l.id);
  const since = new Date(Date.now() - PARTICIPANT_WINDOW_MS);
  const participants = ids.length
    ? await db
        .select({ loungeId: loungeParticipantsTable.loungeId, userId: usersTable.id, name: usersTable.name, color: usersTable.avatarColor })
        .from(loungeParticipantsTable)
        .innerJoin(usersTable, eq(usersTable.id, loungeParticipantsTable.userId))
        .where(and(inArray(loungeParticipantsTable.loungeId, ids), isNull(loungeParticipantsTable.leftAt), gt(loungeParticipantsTable.lastSeenAt, since)))
    : [];
  const byLounge = new Map<string, typeof participants>();
  for (const p of participants) byLounge.set(p.loungeId, [...(byLounge.get(p.loungeId) ?? []), p]);
  return rows.map((l) => {
    const ps = byLounge.get(l.id) ?? [];
    return {
      id: l.id,
      name: l.name,
      city: l.city,
      topic: l.topic,
      description: l.description,
      color: l.color,
      isLive: l.isLive && !l.endedAt,
      isFeatured: l.isFeatured,
      scheduledAt: l.scheduledAt?.toISOString() ?? null,
      listenerCount: ps.length,
      joined: ps.some((p) => p.userId === viewerId),
      isHost: l.hostId === viewerId,
      participants: ps.slice(0, 6).map((p) => ({ initial: p.name[0]?.toUpperCase() ?? "?", color: p.color })),
      createdAt: l.createdAt.toISOString(),
    };
  });
}

async function loadLounge(id: string): Promise<Lounge> {
  const rows = await db.select().from(loungesTable).where(eq(loungesTable.id, id)).limit(1);
  if (!rows[0]) throw notFound("Lounge");
  return rows[0];
}

router.get("/lounges", async (req, res) => {
  const me = currentUser(req);
  const rows = await db.select().from(loungesTable).where(isNull(loungesTable.endedAt)).orderBy(desc(loungesTable.isFeatured), desc(loungesTable.createdAt)).limit(50);
  res.json(await serialize(me.id, rows));
});

router.post("/lounges", async (req, res) => {
  const me = currentUser(req);
  const body = CreateLoungeBody.parse(req.body);
  const [lounge] = await db
    .insert(loungesTable)
    .values({ hostId: me.id, name: body.name.trim(), topic: body.topic.trim(), description: body.description?.trim() ?? "", city: body.city.trim(), color: body.color ?? me.avatarColor })
    .returning();
  await db.insert(loungeParticipantsTable).values({ loungeId: lounge.id, userId: me.id });
  const [out] = await serialize(me.id, [lounge]);
  res.status(201).json(out);
});

router.post("/lounges/:loungeId/join", async (req, res) => {
  const me = currentUser(req);
  const { loungeId } = JoinLoungeParams.parse(req.params);
  const lounge = await loadLounge(loungeId);
  if (lounge.endedAt) throw forbidden("This lounge has ended");
  const existing = await db
    .select()
    .from(loungeParticipantsTable)
    .where(and(eq(loungeParticipantsTable.loungeId, lounge.id), eq(loungeParticipantsTable.userId, me.id)))
    .limit(1);
  if (existing[0]) {
    await db.update(loungeParticipantsTable).set({ lastSeenAt: new Date(), leftAt: null }).where(eq(loungeParticipantsTable.id, existing[0].id));
  } else {
    await db.insert(loungeParticipantsTable).values({ loungeId: lounge.id, userId: me.id });
    await awardPoints(me.id, POINTS.joinLounge, "lounge", `Joined ${lounge.name}`);
  }
  const [out] = await serialize(me.id, [lounge]);
  res.json(out);
});

router.post("/lounges/:loungeId/leave", async (req, res) => {
  const me = currentUser(req);
  const { loungeId } = LeaveLoungeParams.parse(req.params);
  await db.update(loungeParticipantsTable).set({ leftAt: new Date() }).where(and(eq(loungeParticipantsTable.loungeId, loungeId), eq(loungeParticipantsTable.userId, me.id)));
  res.status(204).end();
});

router.post("/lounges/:loungeId/end", async (req, res) => {
  const me = currentUser(req);
  const { loungeId } = EndLoungeParams.parse(req.params);
  const lounge = await loadLounge(loungeId);
  if (lounge.hostId !== me.id && !me.isAdmin) throw forbidden("Only the host can end the lounge");
  const [updated] = await db.update(loungesTable).set({ isLive: false, endedAt: new Date() }).where(eq(loungesTable.id, lounge.id)).returning();
  await db.update(loungeParticipantsTable).set({ leftAt: new Date() }).where(and(eq(loungeParticipantsTable.loungeId, lounge.id), isNull(loungeParticipantsTable.leftAt)));
  const [out] = await serialize(me.id, [updated]);
  res.json(out);
});

export default router;

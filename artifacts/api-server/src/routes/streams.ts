import { Router, type IRouter } from "express";
import { and, asc, desc, eq, gt, isNull, sql } from "drizzle-orm";
import {
  EndStreamParams,
  GetStreamParams,
  JoinStreamParams,
  LeaveStreamParams,
  ListStreamCommentsParams,
  ListStreamCommentsQueryParams,
  PostStreamCommentBody,
  PostStreamCommentParams,
  SendStreamHeartParams,
  StartStreamBody,
} from "@workspace/api-zod";
import type { Stream as ApiStream, StreamComment } from "@workspace/api-zod";
import { db, streamCommentsTable, streamsTable, streamViewersTable, usersTable, type Stream } from "@workspace/db";
import { currentUser, requireAuth } from "../lib/auth";
import { forbidden, notFound } from "../lib/errors";
import { awardPoints, POINTS } from "../lib/notify";
import { partiesFor } from "./connections";

const router: IRouter = Router();
router.use(requireAuth);

const VIEWER_WINDOW_MS = 90 * 1000;

async function viewerCounts(streamIds: string[]): Promise<Map<string, number>> {
  if (streamIds.length === 0) return new Map();
  const since = new Date(Date.now() - VIEWER_WINDOW_MS);
  const rows = await db
    .select({ streamId: streamViewersTable.streamId, n: sql<string>`count(*)` })
    .from(streamViewersTable)
    .where(and(isNull(streamViewersTable.leftAt), gt(streamViewersTable.lastSeenAt, since)))
    .groupBy(streamViewersTable.streamId);
  return new Map(rows.map((r) => [r.streamId, Number(r.n)]));
}

async function serialize(viewerId: string, rows: Stream[]): Promise<ApiStream[]> {
  const [hosts, counts] = await Promise.all([partiesFor(rows.map((s) => s.hostId)), viewerCounts(rows.map((s) => s.id))]);
  return rows.flatMap((s) => {
    const host = hosts.get(s.hostId);
    if (!host) return [];
    return [
      {
        id: s.id,
        host,
        title: s.title,
        description: s.description,
        status: s.status,
        viewerCount: counts.get(s.id) ?? 0,
        heartCount: s.heartCount,
        isHost: s.hostId === viewerId,
        startedAt: s.startedAt.toISOString(),
        endedAt: s.endedAt?.toISOString() ?? null,
      },
    ];
  });
}

async function loadStream(id: string): Promise<Stream> {
  const rows = await db.select().from(streamsTable).where(eq(streamsTable.id, id)).limit(1);
  if (!rows[0]) throw notFound("Stream");
  return rows[0];
}

router.get("/streams", async (req, res) => {
  const me = currentUser(req);
  const rows = await db.select().from(streamsTable).where(eq(streamsTable.status, "live")).orderBy(desc(streamsTable.startedAt)).limit(50);
  res.json(await serialize(me.id, rows));
});

router.post("/streams", async (req, res) => {
  const me = currentUser(req);
  const body = StartStreamBody.parse(req.body);
  if (me.role !== "companion") throw forbidden("Only companions can go live");
  await db.update(streamsTable).set({ status: "ended", endedAt: new Date() }).where(and(eq(streamsTable.hostId, me.id), eq(streamsTable.status, "live")));
  const [stream] = await db.insert(streamsTable).values({ hostId: me.id, title: body.title.trim(), description: body.description?.trim() ?? "" }).returning();
  const [out] = await serialize(me.id, [stream]);
  res.status(201).json(out);
});

router.get("/streams/:streamId", async (req, res) => {
  const me = currentUser(req);
  const { streamId } = GetStreamParams.parse(req.params);
  const [out] = await serialize(me.id, [await loadStream(streamId)]);
  res.json(out);
});

router.post("/streams/:streamId/join", async (req, res) => {
  const me = currentUser(req);
  const { streamId } = JoinStreamParams.parse(req.params);
  const stream = await loadStream(streamId);
  const existing = await db
    .select()
    .from(streamViewersTable)
    .where(and(eq(streamViewersTable.streamId, stream.id), eq(streamViewersTable.userId, me.id)))
    .limit(1);
  if (existing[0]) {
    await db.update(streamViewersTable).set({ lastSeenAt: new Date(), leftAt: null }).where(eq(streamViewersTable.id, existing[0].id));
  } else {
    await db.insert(streamViewersTable).values({ streamId: stream.id, userId: me.id });
    if (stream.hostId !== me.id) await awardPoints(me.id, POINTS.watchStream, "stream", `Watched ${stream.title}`);
  }
  const [out] = await serialize(me.id, [stream]);
  res.json(out);
});

router.post("/streams/:streamId/leave", async (req, res) => {
  const me = currentUser(req);
  const { streamId } = LeaveStreamParams.parse(req.params);
  await db.update(streamViewersTable).set({ leftAt: new Date() }).where(and(eq(streamViewersTable.streamId, streamId), eq(streamViewersTable.userId, me.id)));
  res.status(204).end();
});

router.post("/streams/:streamId/heart", async (req, res) => {
  const me = currentUser(req);
  const { streamId } = SendStreamHeartParams.parse(req.params);
  await loadStream(streamId);
  const [stream] = await db.update(streamsTable).set({ heartCount: sql`${streamsTable.heartCount} + 1` }).where(eq(streamsTable.id, streamId)).returning();
  const [out] = await serialize(me.id, [stream]);
  res.json(out);
});

router.post("/streams/:streamId/end", async (req, res) => {
  const me = currentUser(req);
  const { streamId } = EndStreamParams.parse(req.params);
  const stream = await loadStream(streamId);
  if (stream.hostId !== me.id && !me.isAdmin) throw forbidden("Only the host can end the stream");
  const [updated] = await db.update(streamsTable).set({ status: "ended", endedAt: new Date() }).where(eq(streamsTable.id, stream.id)).returning();
  await db.update(streamViewersTable).set({ leftAt: new Date() }).where(and(eq(streamViewersTable.streamId, stream.id), isNull(streamViewersTable.leftAt)));
  const [out] = await serialize(me.id, [updated]);
  res.json(out);
});

router.get("/streams/:streamId/comments", async (req, res) => {
  const me = currentUser(req);
  const { streamId } = ListStreamCommentsParams.parse(req.params);
  const q = ListStreamCommentsQueryParams.parse(req.query);
  const conditions = [eq(streamCommentsTable.streamId, streamId)];
  if (q.after) {
    const after = new Date(q.after);
    if (!Number.isNaN(after.getTime())) conditions.push(gt(streamCommentsTable.createdAt, after));
  }
  const rows = await db
    .select({ comment: streamCommentsTable, user: usersTable })
    .from(streamCommentsTable)
    .innerJoin(usersTable, eq(usersTable.id, streamCommentsTable.userId))
    .where(and(...conditions))
    .orderBy(asc(streamCommentsTable.createdAt))
    .limit(200);
  const out: StreamComment[] = rows.map((r) => ({
    id: r.comment.id,
    streamId: r.comment.streamId,
    userName: r.user.name,
    userColor: r.user.avatarColor,
    fromMe: r.user.id === me.id,
    text: r.comment.text,
    createdAt: r.comment.createdAt.toISOString(),
  }));
  res.json(out);
});

router.post("/streams/:streamId/comments", async (req, res) => {
  const me = currentUser(req);
  const { streamId } = PostStreamCommentParams.parse(req.params);
  const body = PostStreamCommentBody.parse(req.body);
  const stream = await loadStream(streamId);
  if (stream.status !== "live") throw forbidden("This stream has ended");
  const [c] = await db.insert(streamCommentsTable).values({ streamId: stream.id, userId: me.id, text: body.text.trim() }).returning();
  const out: StreamComment = { id: c.id, streamId: c.streamId, userName: me.name, userColor: me.avatarColor, fromMe: true, text: c.text, createdAt: c.createdAt.toISOString() };
  res.status(201).json(out);
});

export default router;

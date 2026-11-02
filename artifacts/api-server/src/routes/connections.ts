import { Router, type IRouter } from "express";
import { and, asc, desc, eq, gt, inArray, isNull, ne, or, sql } from "drizzle-orm";
import {
  CreateConnectionBody,
  GetConnectionParams,
  ListMessagesParams,
  ListMessagesQueryParams,
  MarkConnectionReadParams,
  RespondToConnectionParams,
  RespondToConnectionBody,
  SendMessageBody,
  SendMessageParams,
} from "@workspace/api-zod";
import type { Connection as ApiConnection, PartySummary } from "@workspace/api-zod";
import {
  companionProfilesTable,
  connectionsTable,
  db,
  messagesTable,
  photosTable,
  usersTable,
  type Connection,
} from "@workspace/db";
import { currentUser, requireAuth, type AuthedUser } from "../lib/auth";
import { badRequest, forbidden, notFound } from "../lib/errors";
import { notify } from "../lib/notify";
import { toConnection, toMessage, toParty } from "../lib/serializers";

const router: IRouter = Router();
router.use(requireAuth);

export async function partiesFor(ids: string[]): Promise<Map<string, PartySummary>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const [users, photos] = await Promise.all([
    db
      .select({ user: usersTable, profile: companionProfilesTable })
      .from(usersTable)
      .leftJoin(companionProfilesTable, eq(companionProfilesTable.userId, usersTable.id))
      .where(inArray(usersTable.id, unique)),
    db.select().from(photosTable).where(and(inArray(photosTable.userId, unique), eq(photosTable.isPrimary, true))),
  ]);
  const photoMap = new Map(photos.map((p) => [p.userId, p]));
  return new Map(users.map((u) => [u.user.id, toParty(u.user, u.profile, photoMap.get(u.user.id))]));
}

async function unreadCounts(viewerId: string, connectionIds: string[]): Promise<Map<string, number>> {
  if (connectionIds.length === 0) return new Map();
  const rows = await db
    .select({ connectionId: messagesTable.connectionId, n: sql<string>`count(*)` })
    .from(messagesTable)
    .where(and(inArray(messagesTable.connectionId, connectionIds), ne(messagesTable.senderId, viewerId), isNull(messagesTable.readAt)))
    .groupBy(messagesTable.connectionId);
  return new Map(rows.map((r) => [r.connectionId, Number(r.n)]));
}

export async function serializeConnections(viewer: AuthedUser, rows: Connection[]): Promise<ApiConnection[]> {
  const otherIds = rows.map((c) => (c.seekerId === viewer.id ? c.companionId : c.seekerId));
  const [parties, unread] = await Promise.all([partiesFor(otherIds), unreadCounts(viewer.id, rows.map((c) => c.id))]);
  return rows.flatMap((c) => {
    const other = parties.get(c.seekerId === viewer.id ? c.companionId : c.seekerId);
    if (!other) return [];
    return [toConnection(c, viewer.id, other, unread.get(c.id) ?? 0)];
  });
}

export async function loadConnectionFor(viewerId: string, connectionId: string): Promise<Connection> {
  const rows = await db.select().from(connectionsTable).where(eq(connectionsTable.id, connectionId)).limit(1);
  const c = rows[0];
  if (!c) throw notFound("Conversation");
  if (c.seekerId !== viewerId && c.companionId !== viewerId) throw forbidden();
  return c;
}

export async function ensureConnection(seekerId: string, companionId: string, type: "standard" | "super" | "paidDm" = "standard") {
  const existing = await db
    .select()
    .from(connectionsTable)
    .where(and(eq(connectionsTable.seekerId, seekerId), eq(connectionsTable.companionId, companionId)))
    .limit(1);
  if (existing[0]) return { connection: existing[0], created: false };
  const [created] = await db.insert(connectionsTable).values({ seekerId, companionId, type }).returning();
  return { connection: created, created: true };
}

export async function appendMessage(
  connection: Connection,
  senderId: string,
  text: string,
  kind: "text" | "voice" | "system" = "text",
) {
  const preview = kind === "voice" ? "🎤 Voice note" : text.slice(0, 120);
  const [message] = await db.transaction(async (tx) => {
    const inserted = await tx.insert(messagesTable).values({ connectionId: connection.id, senderId, kind, text }).returning();
    const update: Partial<typeof connectionsTable.$inferInsert> = { lastMessagePreview: preview, lastMessageAt: new Date() };
    if (senderId === connection.companionId && connection.status === "pending" && kind !== "system") update.status = "accepted";
    await tx.update(connectionsTable).set(update).where(eq(connectionsTable.id, connection.id));
    return inserted;
  });
  return message;
}

router.get("/connections", async (req, res) => {
  const me = currentUser(req);
  const rows = await db
    .select()
    .from(connectionsTable)
    .where(and(or(eq(connectionsTable.seekerId, me.id), eq(connectionsTable.companionId, me.id)), ne(connectionsTable.status, "declined")))
    .orderBy(desc(connectionsTable.lastMessageAt));
  res.json(await serializeConnections(me, rows));
});

router.post("/connections", async (req, res) => {
  const me = currentUser(req);
  const body = CreateConnectionBody.parse(req.body);
  if (body.companionId === me.id) throw badRequest("You cannot connect with yourself");
  const target = await db
    .select({ id: usersTable.id, role: usersTable.role, name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.id, body.companionId))
    .limit(1);
  if (!target[0]) throw notFound("Companion");
  if (target[0].role !== "companion") throw badRequest("You can only connect with companions");
  const { connection, created } = await ensureConnection(me.id, body.companionId, body.type ?? "standard");
  let current = connection;
  if (created) {
    const intro = body.message?.trim() || (body.type === "super" ? "⭐ Super request sent" : "Connection requested");
    await appendMessage(connection, me.id, intro, body.message?.trim() ? "text" : "system");
    await notify({
      userId: body.companionId,
      type: body.type === "super" ? "super" : "connection",
      title: body.type === "super" ? `${me.name} sent you a Super Request ⭐` : `${me.name} wants to connect`,
      body: body.message?.trim() || "Open the conversation to reply",
      channel: "messages",
      actionRoute: `/chat/${connection.id}`,
      actionLabel: "Respond",
      actorId: me.id,
    });
    current = (await db.select().from(connectionsTable).where(eq(connectionsTable.id, connection.id)))[0];
  } else if (body.message?.trim()) {
    await appendMessage(connection, me.id, body.message.trim());
    current = (await db.select().from(connectionsTable).where(eq(connectionsTable.id, connection.id)))[0];
  }
  const [out] = await serializeConnections(me, [current]);
  res.status(created ? 201 : 200).json(out);
});

router.get("/connections/:connectionId", async (req, res) => {
  const me = currentUser(req);
  const { connectionId } = GetConnectionParams.parse(req.params);
  const c = await loadConnectionFor(me.id, connectionId);
  const [out] = await serializeConnections(me, [c]);
  res.json(out);
});

router.patch("/connections/:connectionId", async (req, res) => {
  const me = currentUser(req);
  const { connectionId } = RespondToConnectionParams.parse(req.params);
  const body = RespondToConnectionBody.parse(req.body);
  const c = await loadConnectionFor(me.id, connectionId);
  if (c.companionId !== me.id) throw forbidden("Only the companion can respond");
  await db.update(connectionsTable).set({ status: body.status }).where(eq(connectionsTable.id, c.id));
  await notify({
    userId: c.seekerId,
    type: "connection",
    title: body.status === "accepted" ? `${me.name} accepted your request 💫` : `${me.name} declined your request`,
    body: body.status === "accepted" ? "You can now plan your night together" : "Keep exploring, new companions join every evening",
    channel: "messages",
    actionRoute: body.status === "accepted" ? `/chat/${c.id}` : "/discover",
    actionLabel: body.status === "accepted" ? "Open chat" : "Discover",
    actorId: me.id,
  });
  const updated = await loadConnectionFor(me.id, c.id);
  const [out] = await serializeConnections(me, [updated]);
  res.json(out);
});

router.get("/connections/:connectionId/messages", async (req, res) => {
  const me = currentUser(req);
  const { connectionId } = ListMessagesParams.parse(req.params);
  const q = ListMessagesQueryParams.parse(req.query);
  await loadConnectionFor(me.id, connectionId);
  const conditions = [eq(messagesTable.connectionId, connectionId)];
  if (q.after) {
    const after = new Date(q.after);
    if (!Number.isNaN(after.getTime())) conditions.push(gt(messagesTable.createdAt, after));
  }
  const rows = await db.select().from(messagesTable).where(and(...conditions)).orderBy(asc(messagesTable.createdAt)).limit(500);
  res.json(rows.map((m) => toMessage(m, me.id)));
});

router.post("/connections/:connectionId/messages", async (req, res) => {
  const me = currentUser(req);
  const { connectionId } = SendMessageParams.parse(req.params);
  const body = SendMessageBody.parse(req.body);
  const c = await loadConnectionFor(me.id, connectionId);
  if (c.status === "declined") throw forbidden("This conversation was declined");
  const message = await appendMessage(c, me.id, body.text.trim(), body.kind ?? "text");
  const recipient = c.seekerId === me.id ? c.companionId : c.seekerId;
  await notify({
    userId: recipient,
    type: "message",
    title: `${me.name}`,
    body: body.kind === "voice" ? "🎤 Voice note" : body.text.trim().slice(0, 120),
    channel: "messages",
    actionRoute: `/chat/${c.id}`,
    actionLabel: "Reply",
    actorId: me.id,
  });
  res.status(201).json(toMessage(message, me.id));
});

router.post("/connections/:connectionId/read", async (req, res) => {
  const me = currentUser(req);
  const { connectionId } = MarkConnectionReadParams.parse(req.params);
  await loadConnectionFor(me.id, connectionId);
  await db
    .update(messagesTable)
    .set({ readAt: new Date() })
    .where(and(eq(messagesTable.connectionId, connectionId), ne(messagesTable.senderId, me.id), isNull(messagesTable.readAt)));
  res.status(204).end();
});

export default router;

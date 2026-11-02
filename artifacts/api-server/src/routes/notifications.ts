import { Router, type IRouter } from "express";
import { and, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { MarkNotificationsReadBody } from "@workspace/api-zod";
import { connectionsTable, db, messagesTable, notificationsTable } from "@workspace/db";
import { currentUser, requireAuth } from "../lib/auth";
import { toNotification } from "../lib/serializers";
import { partiesFor } from "./connections";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/notifications", async (req, res) => {
  const me = currentUser(req);
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, me.id))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(100);
  const parties = await partiesFor(rows.flatMap((n) => (n.actorId ? [n.actorId] : [])));
  res.json(rows.map((n) => toNotification(n, n.actorId ? parties.get(n.actorId) ?? null : null)));
});

router.post("/notifications/read", async (req, res) => {
  const me = currentUser(req);
  const body = MarkNotificationsReadBody.parse(req.body ?? {});
  const conditions = [eq(notificationsTable.userId, me.id), eq(notificationsTable.read, false)];
  if (body.ids && body.ids.length > 0) conditions.push(inArray(notificationsTable.id, body.ids));
  await db.update(notificationsTable).set({ read: true }).where(and(...conditions));
  res.status(204).end();
});

router.get("/notifications/unread-count", async (req, res) => {
  const me = currentUser(req);
  const [notifs, messages] = await Promise.all([
    db
      .select({ n: sql<string>`count(*)` })
      .from(notificationsTable)
      .where(and(eq(notificationsTable.userId, me.id), eq(notificationsTable.read, false))),
    db
      .select({ n: sql<string>`count(*)` })
      .from(messagesTable)
      .innerJoin(connectionsTable, eq(connectionsTable.id, messagesTable.connectionId))
      .where(
        and(
          sql`(${connectionsTable.seekerId} = ${me.id} or ${connectionsTable.companionId} = ${me.id})`,
          ne(messagesTable.senderId, me.id),
          isNull(messagesTable.readAt),
        ),
      ),
  ]);
  res.json({ notifications: Number(notifs[0]?.n ?? 0), messages: Number(messages[0]?.n ?? 0) });
});

export default router;

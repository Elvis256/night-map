import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const connectionTypeEnum = pgEnum("connection_type", [
  "standard",
  "super",
  "paidDm",
]);
export const connectionStatusEnum = pgEnum("connection_status", [
  "pending",
  "accepted",
  "declined",
]);

export const connectionsTable = pgTable(
  "connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seekerId: uuid("seeker_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    companionId: uuid("companion_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    type: connectionTypeEnum("type").notNull().default("standard"),
    status: connectionStatusEnum("status").notNull().default("pending"),
    lastMessagePreview: text("last_message_preview").notNull().default(""),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("connections_pair_idx").on(t.seekerId, t.companionId)],
);

export type Connection = typeof connectionsTable.$inferSelect;

export const messageKindEnum = pgEnum("message_kind", ["text", "voice", "system"]);

export const messagesTable = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => connectionsTable.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    kind: messageKindEnum("kind").notNull().default("text"),
    text: text("text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (t) => [index("messages_connection_idx").on(t.connectionId, t.createdAt)],
);

export type Message = typeof messagesTable.$inferSelect;

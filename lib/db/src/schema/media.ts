import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const streamStatusEnum = pgEnum("stream_status", ["live", "ended"]);

export const streamsTable = pgTable(
  "streams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hostId: uuid("host_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: streamStatusEnum("status").notNull().default("live"),
    heartCount: integer("heart_count").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (t) => [index("streams_status_idx").on(t.status, t.startedAt)],
);

export type Stream = typeof streamsTable.$inferSelect;

export const streamViewersTable = pgTable(
  "stream_viewers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    streamId: uuid("stream_id")
      .notNull()
      .references(() => streamsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    leftAt: timestamp("left_at", { withTimezone: true }),
  },
  (t) => [index("stream_viewers_stream_idx").on(t.streamId, t.leftAt)],
);

export const streamCommentsTable = pgTable(
  "stream_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    streamId: uuid("stream_id")
      .notNull()
      .references(() => streamsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("stream_comments_stream_idx").on(t.streamId, t.createdAt)],
);

export const loungesTable = pgTable(
  "lounges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hostId: uuid("host_id").references(() => usersTable.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    city: text("city").notNull(),
    topic: text("topic").notNull(),
    description: text("description").notNull().default(""),
    color: text("color").notNull().default("#FF4E62"),
    isLive: boolean("is_live").notNull().default(true),
    isFeatured: boolean("is_featured").notNull().default(false),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (t) => [index("lounges_live_idx").on(t.isLive, t.city)],
);

export type Lounge = typeof loungesTable.$inferSelect;

export const loungeParticipantsTable = pgTable(
  "lounge_participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    loungeId: uuid("lounge_id")
      .notNull()
      .references(() => loungesTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    leftAt: timestamp("left_at", { withTimezone: true }),
  },
  (t) => [index("lounge_participants_lounge_idx").on(t.loungeId, t.leftAt)],
);

export const outageStatusEnum = pgEnum("outage_status", ["out", "warning", "restored"]);

export const outageReportsTable = pgTable(
  "outage_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterId: uuid("reporter_id").references(() => usersTable.id, { onDelete: "set null" }),
    city: text("city").notNull(),
    area: text("area").notNull(),
    status: outageStatusEnum("status").notNull().default("out"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("outage_reports_city_idx").on(t.city, t.createdAt)],
);

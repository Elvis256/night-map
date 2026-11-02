import {
  doublePrecision,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { bookingsTable } from "./bookings";
import { usersTable } from "./users";

export const trustedContactsTable = pgTable("trusted_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  relation: text("relation").notNull().default("Contact"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TrustedContact = typeof trustedContactsTable.$inferSelect;

export const safetyEventTypeEnum = pgEnum("safety_event_type", [
  "panic",
  "checkin",
  "incident",
  "resolved",
]);

export const safetyEventsTable = pgTable(
  "safety_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    type: safetyEventTypeEnum("type").notNull(),
    bookingId: uuid("booking_id").references(() => bookingsTable.id, { onDelete: "set null" }),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("safety_events_user_idx").on(t.userId, t.createdAt)],
);

export type SafetyEvent = typeof safetyEventsTable.$inferSelect;

export const smsStatusEnum = pgEnum("sms_status", ["queued", "sent", "failed"]);

export const smsOutboxTable = pgTable("sms_outbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  toPhone: text("to_phone").notNull(),
  body: text("body").notNull(),
  status: smsStatusEnum("status").notNull().default("queued"),
  relatedEventId: uuid("related_event_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  error: text("error"),
});

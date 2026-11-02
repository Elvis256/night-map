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
import { connectionsTable } from "./messaging";
import { usersTable } from "./users";

export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "upcoming",
  "active",
  "completed",
  "cancelled",
  "declined",
]);

export const bookingsTable = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    connectionId: uuid("connection_id").references(() => connectionsTable.id, {
      onDelete: "set null",
    }),
    seekerId: uuid("seeker_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    companionId: uuid("companion_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    activity: text("activity").notNull(),
    dateLabel: text("date_label").notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    hours: integer("hours").notNull(),
    rate: integer("rate").notNull(),
    status: bookingStatusEnum("status").notNull().default("pending"),
    city: text("city").notNull(),
    note: text("note").notNull().default(""),
    meetupCode: text("meetup_code").notNull(),
    safetyActive: boolean("safety_active").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("bookings_seeker_idx").on(t.seekerId, t.createdAt),
    index("bookings_companion_idx").on(t.companionId, t.createdAt),
  ],
);

export type Booking = typeof bookingsTable.$inferSelect;

export const reviewsTable = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id").references(() => bookingsTable.id, { onDelete: "set null" }),
    reviewerId: uuid("reviewer_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    companionId: uuid("companion_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    personality: integer("personality").notNull(),
    appearance: integer("appearance").notNull(),
    punctuality: integer("punctuality").notNull(),
    service: integer("service").notNull(),
    safety: integer("safety").notNull(),
    text: text("text").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("reviews_companion_idx").on(t.companionId, t.createdAt)],
);

export type Review = typeof reviewsTable.$inferSelect;

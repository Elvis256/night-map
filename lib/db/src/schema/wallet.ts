import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { bookingsTable } from "./bookings";
import { usersTable } from "./users";

export const walletEntryKindEnum = pgEnum("wallet_entry_kind", [
  "topup",
  "booking_charge",
  "earning",
  "payout",
  "tip",
  "referral_bonus",
  "adjustment",
]);
export const walletEntryStatusEnum = pgEnum("wallet_entry_status", [
  "pending",
  "completed",
  "failed",
]);

export const walletLedgerTable = pgTable(
  "wallet_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    kind: walletEntryKindEnum("kind").notNull(),
    status: walletEntryStatusEnum("status").notNull().default("pending"),
    reference: text("reference").notNull().default(""),
    bookingId: uuid("booking_id").references(() => bookingsTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("wallet_ledger_user_idx").on(t.userId, t.createdAt)],
);

export type WalletEntry = typeof walletLedgerTable.$inferSelect;

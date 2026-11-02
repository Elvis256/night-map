import {
  boolean,
  date,
  doublePrecision,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["seeker", "companion"]);
export const genderEnum = pgEnum("gender", ["female", "male", "other"]);
export const verificationStatusEnum = pgEnum("verification_status", [
  "none",
  "pending",
  "approved",
  "rejected",
]);
export const availabilityStatusEnum = pgEnum("availability_status", [
  "now",
  "tonight",
  "offline",
]);

export interface PrivacyPrefs {
  showDistance: boolean;
  showOnline: boolean;
  allowSaves: boolean;
  hideFromSearch: boolean;
}

export interface NotificationPrefs {
  messages: boolean;
  bookings: boolean;
  deals: boolean;
  live: boolean;
  radio: boolean;
}

export const DEFAULT_PRIVACY: PrivacyPrefs = {
  showDistance: true,
  showOnline: true,
  allowSaves: true,
  hideFromSearch: false,
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  messages: true,
  bookings: true,
  deals: true,
  live: false,
  radio: false,
};

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: text("phone").notNull().unique(),
  pinHash: text("pin_hash").notNull(),
  name: text("name").notNull(),
  bio: text("bio").notNull().default(""),
  role: userRoleEnum("role").notNull().default("seeker"),
  gender: genderEnum("gender").notNull().default("other"),
  age: integer("age"),
  city: text("city").notNull().default("Kampala"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  avatarColor: text("avatar_color").notNull().default("#7A3CFF"),
  isLadiesMode: boolean("is_ladies_mode").notNull().default(false),
  ghostMode: boolean("ghost_mode").notNull().default(false),
  availableTonight: boolean("available_tonight").notNull().default(false),
  verified: boolean("verified").notNull().default(false),
  verificationStatus: verificationStatusEnum("verification_status")
    .notNull()
    .default("none"),
  trustedContact: text("trusted_contact").notNull().default(""),
  language: text("language").notNull().default("English"),
  privacy: jsonb("privacy").$type<PrivacyPrefs>().notNull().default(DEFAULT_PRIVACY),
  notificationPrefs: jsonb("notification_prefs")
    .$type<NotificationPrefs>()
    .notNull()
    .default(DEFAULT_NOTIFICATION_PREFS),
  loyaltyPoints: integer("loyalty_points").notNull().default(0),
  referralCode: text("referral_code").notNull().unique(),
  referredBy: uuid("referred_by"),
  isAdmin: boolean("is_admin").notNull().default(false),
  failedPinAttempts: integer("failed_pin_attempts").notNull().default(0),
  pinLockedUntil: timestamp("pin_locked_until", { withTimezone: true }),
  loginStreak: integer("login_streak").notNull().default(0),
  lastLoginDay: date("last_login_day", { mode: "string" }),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;

export const companionProfilesTable = pgTable("companion_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  vibes: text("vibes").array().notNull().default([]),
  menu: text("menu").array().notNull().default([]),
  rate: integer("rate").notNull().default(100000),
  minBookingHours: integer("min_booking_hours").notNull().default(2),
  availabilityStatus: availabilityStatusEnum("availability_status")
    .notNull()
    .default("offline"),
  featuredUntil: timestamp("featured_until", { withTimezone: true }),
  dealDiscount: integer("deal_discount").notNull().default(0),
  dealExpiresAt: timestamp("deal_expires_at", { withTimezone: true }),
  trustScore: integer("trust_score").notNull().default(70),
  completedMeetups: integer("completed_meetups").notNull().default(0),
  responseRate: integer("response_rate").notNull().default(100),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CompanionProfile = typeof companionProfilesTable.$inferSelect;

export const sessionsTable = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  userAgent: text("user_agent").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const photosTable = pgTable("photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  path: text("path").notNull(),
  contentType: text("content_type").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Photo = typeof photosTable.$inferSelect;

export const verificationRequestStatusEnum = pgEnum("verification_request_status", [
  "pending",
  "approved",
  "rejected",
]);

export const verificationRequestsTable = pgTable("verification_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  idPhotoPath: text("id_photo_path").notNull(),
  selfiePath: text("selfie_path").notNull(),
  videoPath: text("video_path"),
  code: text("code").notNull(),
  status: verificationRequestStatusEnum("status").notNull().default("pending"),
  reviewNote: text("review_note").notNull().default(""),
  reviewedBy: uuid("reviewed_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});

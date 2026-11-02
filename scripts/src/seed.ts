/**
 * Development seed: creates demo companions, seekers, stories, lounges,
 * bookings and reviews so the app has realistic data locally.
 *
 *   pnpm --filter @workspace/scripts run seed
 *
 * Every seeded account signs in with PIN 1234. Phones are +25670000000N.
 * Re-running is safe: existing seeded users are updated, not duplicated.
 */
import { randomBytes, scryptSync } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { eq, sql } from "drizzle-orm";

for (const file of [path.resolve(".env"), path.resolve("..", ".env")]) {
  if (!process.env.DATABASE_URL && existsSync(file)) {
    try {
      process.loadEnvFile(file);
    } catch {
      // ignore
    }
  }
}

const {
  db,
  pool,
  usersTable,
  companionProfilesTable,
  storiesTable,
  loungesTable,
  bookingsTable,
  reviewsTable,
  connectionsTable,
  messagesTable,
  pointsLedgerTable,
  notificationsTable,
} = await import("@workspace/db");

const PIN = "1234";

function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pin, salt, 64).toString("hex")}`;
}

function endOfDay(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 0);
  return d;
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

const KAMPALA = { lat: 0.3136, lng: 32.5811 };

const COMPANIONS = [
  { phone: "+256700000001", name: "Amara", age: 24, gender: "female", color: "#c2185b", vibes: ["Dinner Date", "Events", "Travel"], menu: ["Dinner Date", "City Tour", "Events", "Conversation & Drinks"], bio: "Sophisticated and adventurous. Love great food, rooftop views, and genuine conversation. Available most evenings.", rate: 150000, minHours: 2, status: "now", featured: true, deal: 0, lat: KAMPALA.lat + 0.008, lng: KAMPALA.lng + 0.012, createdDaysAgo: 120, story: "Available tonight from 8pm 🌙" },
  { phone: "+256700000002", name: "Leila", age: 27, gender: "female", color: "#7b1fa2", vibes: ["Nightlife", "Dancing", "VIP Access"], menu: ["Nightclub", "Pool/Swim", "Movie Night", "Conversation & Drinks"], bio: "I know every hidden gem in the city. Let me show you a night you won't forget. Dance all night.", rate: 120000, minHours: 2, status: "now", featured: false, deal: 30, lat: KAMPALA.lat - 0.005, lng: KAMPALA.lng + 0.018, createdDaysAgo: 90, story: "Tonight's deal is live ⚡ 30% off" },
  { phone: "+256700000003", name: "Zara", age: 25, gender: "female", color: "#00695c", vibes: ["Fine Dining", "Art", "Culture"], menu: ["Dinner Date", "City Tour", "Massage", "Conversation & Drinks"], bio: "Art curator by day, nightlife curator by night. Refined taste, zero judgment.", rate: 200000, minHours: 3, status: "now", featured: false, deal: 0, lat: KAMPALA.lat + 0.014, lng: KAMPALA.lng - 0.007, createdDaysAgo: 5, story: "Just went online ✨" },
  { phone: "+256700000004", name: "Nadine", age: 29, gender: "female", color: "#1565c0", vibes: ["Business", "Hotels", "Confidential"], menu: ["Dinner Date", "Nightclub", "City Tour"], bio: "Discreet, professional, and charming. Perfect for business events or private evenings.", rate: 180000, minHours: 2, status: "tonight", featured: false, deal: 0, lat: KAMPALA.lat - 0.011, lng: KAMPALA.lng - 0.009, createdDaysAgo: 60, story: null },
  { phone: "+256700000005", name: "Fatoumata", age: 26, gender: "female", color: "#e65100", vibes: ["Music", "Clubs", "Energy"], menu: ["Nightclub", "Pool/Swim", "Movie Night"], bio: "Life is a party and I know the best ones. Join me for an unforgettable night out.", rate: 100000, minHours: 2, status: "now", featured: false, deal: 25, lat: KAMPALA.lat + 0.003, lng: KAMPALA.lng + 0.022, createdDaysAgo: 200, story: "Club night preparations 🎶" },
  { phone: "+256700000006", name: "Priya", age: 23, gender: "female", color: "#880e4f", vibes: ["Luxury", "Spa Days", "Shopping"], menu: ["Dinner Date", "Massage", "City Tour", "Pool/Swim"], bio: "Your perfect day-to-night companion. From afternoon adventures to evening glamour.", rate: 130000, minHours: 2, status: "offline", featured: false, deal: 0, lat: KAMPALA.lat - 0.018, lng: KAMPALA.lng + 0.004, createdDaysAgo: 3, story: null },
  { phone: "+256700000007", name: "David", age: 31, gender: "male", color: "#1a237e", vibes: ["Dinner Date", "Gentleman", "Events"], menu: ["Dinner Date", "City Tour", "Events", "Conversation & Drinks"], bio: "A true gentleman for the discerning woman. Refined, attentive, and completely discreet.", rate: 120000, minHours: 2, status: "now", featured: false, deal: 0, lat: KAMPALA.lat + 0.011, lng: KAMPALA.lng + 0.005, createdDaysAgo: 80, story: "Available tonight 🌙" },
  { phone: "+256700000008", name: "Marcus", age: 35, gender: "male", color: "#4a148c", vibes: ["Luxury", "Travel", "Adventure"], menu: ["Dinner Date", "City Tour", "Nightclub", "Pool/Swim"], bio: "Cultured, sophisticated, and ready for adventure. Business professional by day.", rate: 140000, minHours: 3, status: "tonight", featured: true, deal: 0, lat: KAMPALA.lat - 0.007, lng: KAMPALA.lng - 0.015, createdDaysAgo: 7, story: null },
  { phone: "+256700000009", name: "Wanjiru", age: 28, gender: "female", color: "#3DA9FF", vibes: ["Travel", "Coffee", "Culture"], menu: ["Dinner Date", "City Tour", "Conversation & Drinks", "Travel Companion"], bio: "Nairobi born and raised. Coffee by day, jazz by night.", rate: 110000, minHours: 2, status: "now", featured: false, deal: 0, lat: -1.2921, lng: 36.8219, createdDaysAgo: 40, story: "Jazz night in Westlands tonight 🎷", city: "Nairobi" },
  { phone: "+256700000010", name: "Neema", age: 26, gender: "female", color: "#1FBF6B", vibes: ["Beach", "Seafood", "Sunsets"], menu: ["Dinner Date", "Pool/Swim", "City Tour"], bio: "Coastal evenings, ocean dining and good conversation.", rate: 95000, minHours: 2, status: "tonight", featured: false, deal: 15, lat: -6.7924, lng: 39.2083, createdDaysAgo: 30, story: null, city: "Dar es Salaam" },
] as const;

const SEEKERS = [
  { phone: "+256700000101", name: "James K.", color: "#3DA9FF" },
  { phone: "+256700000102", name: "Brian M.", color: "#FF8A3D" },
  { phone: "+256700000103", name: "Kevin O.", color: "#7A3CFF" },
  { phone: "+256700000104", name: "Sarah N.", color: "#FF4E62", ladies: true },
] as const;

const LOUNGES = [
  { name: "Kampala After Dark", city: "Kampala", topic: "Weekend Vibes", description: "Talking best spots, tonight's deals, and meet-up plans", color: "#FF4E62", featured: true },
  { name: "Nairobi Nights", city: "Nairobi", topic: "Travel & Meet", description: "City connections, hidden gems, and travel companion stories", color: "#3DA9FF", featured: false },
  { name: "Dar Beach Vibes", city: "Dar es Salaam", topic: "Coastal Evenings", description: "Beach nights, ocean dining, and East African coast culture", color: "#1FBF6B", featured: false },
  { name: "Mbarara Chill", city: "Mbarara", topic: "Southwestern Evenings", description: "Laid-back connections, local spots, and weekend plans", color: "#FF8A3D", featured: false },
  { name: "Matchmaker's Corner", city: "All Cities", topic: "Introductions & Stories", description: "Real connection stories, tips for first meetings, and date ideas", color: "#FF8A3D", featured: false },
  { name: "Safety Circle", city: "All Cities", topic: "Community Safety Talk", description: "Best practices, trusted venues, vetting tips — a safe space", color: "#22c55e", featured: false },
];

async function upsertUser(input: {
  phone: string;
  name: string;
  role: "seeker" | "companion";
  gender: "female" | "male" | "other";
  age?: number;
  color: string;
  city: string;
  lat: number;
  lng: number;
  bio?: string;
  verified?: boolean;
  createdAt?: Date;
  isLadiesMode?: boolean;
  isAdmin?: boolean;
}): Promise<string> {
  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.phone, input.phone)).limit(1);
  const values = {
    name: input.name,
    role: input.role,
    gender: input.gender,
    age: input.age ?? null,
    avatarColor: input.color,
    city: input.city,
    lat: input.lat,
    lng: input.lng,
    bio: input.bio ?? "",
    verified: input.verified ?? false,
    verificationStatus: input.verified ? ("approved" as const) : ("none" as const),
    isLadiesMode: input.isLadiesMode ?? false,
    isAdmin: input.isAdmin ?? false,
    availableTonight: input.role === "companion",
    lastSeenAt: new Date(),
  };
  if (existing[0]) {
    await db.update(usersTable).set(values).where(eq(usersTable.id, existing[0].id));
    return existing[0].id;
  }
  const [row] = await db
    .insert(usersTable)
    .values({
      ...values,
      phone: input.phone,
      pinHash: hashPin(PIN),
      referralCode: `NIGHT-${input.phone.slice(-4)}`,
      createdAt: input.createdAt ?? new Date(),
    })
    .returning({ id: usersTable.id });
  return row.id;
}

async function main() {
  console.log("Seeding NightMap dev data…");

  const companionIds = new Map<string, string>();
  for (const c of COMPANIONS) {
    const city = "city" in c && c.city ? c.city : "Kampala";
    const id = await upsertUser({
      phone: c.phone,
      name: c.name,
      role: "companion",
      gender: c.gender,
      age: c.age,
      color: c.color,
      city,
      lat: c.lat,
      lng: c.lng,
      bio: c.bio,
      verified: true,
      createdAt: daysAgo(c.createdDaysAgo),
    });
    companionIds.set(c.name, id);
    const profile = {
      vibes: [...c.vibes],
      menu: [...c.menu],
      rate: c.rate,
      minBookingHours: c.minHours,
      availabilityStatus: c.status,
      featuredUntil: c.featured ? daysAgo(-7) : null,
      dealDiscount: c.deal,
      dealExpiresAt: c.deal > 0 ? endOfDay() : null,
      updatedAt: new Date(),
    };
    await db
      .insert(companionProfilesTable)
      .values({ userId: id, ...profile })
      .onConflictDoUpdate({ target: companionProfilesTable.userId, set: profile });
    if (c.story) {
      await db.delete(storiesTable).where(eq(storiesTable.userId, id));
      await db.insert(storiesTable).values({ userId: id, text: c.story, expiresAt: new Date(Date.now() + 20 * 60 * 60 * 1000) });
    }
  }

  const seekerIds = new Map<string, string>();
  for (const s of SEEKERS) {
    const id = await upsertUser({
      phone: s.phone,
      name: s.name,
      role: "seeker",
      gender: "ladies" in s && s.ladies ? "female" : "male",
      color: s.color,
      city: "Kampala",
      lat: KAMPALA.lat,
      lng: KAMPALA.lng,
      isLadiesMode: "ladies" in s ? !!s.ladies : false,
    });
    seekerIds.set(s.name, id);
  }

  const adminId = await upsertUser({
    phone: "+256700000999",
    name: "NightMap Admin",
    role: "seeker",
    gender: "other",
    color: "#AAB3C5",
    city: "Kampala",
    lat: KAMPALA.lat,
    lng: KAMPALA.lng,
    isAdmin: true,
    verified: true,
  });

  // Completed bookings + reviews so ratings, hot streaks and meetup counts are real.
  const history: Array<{ seeker: string; companion: string; activity: string; hours: number; daysAgo: number; scores: [number, number, number, number, number]; text: string }> = [
    { seeker: "James K.", companion: "Amara", activity: "Dinner Date", hours: 3, daysAgo: 2, scores: [5, 5, 5, 5, 5], text: "Wonderful evening, great conversation and perfectly on time." },
    { seeker: "Brian M.", companion: "Amara", activity: "Events", hours: 4, daysAgo: 5, scores: [5, 5, 4, 5, 5], text: "Took me to the best rooftop in Kololo. Highly recommended." },
    { seeker: "Kevin O.", companion: "Amara", activity: "City Tour", hours: 3, daysAgo: 12, scores: [5, 4, 5, 5, 5], text: "" },
    { seeker: "James K.", companion: "Leila", activity: "Nightclub", hours: 4, daysAgo: 1, scores: [5, 5, 4, 5, 5], text: "Knows every club in town. Danced all night!" },
    { seeker: "Kevin O.", companion: "Leila", activity: "Pool/Swim", hours: 2, daysAgo: 4, scores: [4, 5, 5, 4, 5], text: "" },
    { seeker: "Brian M.", companion: "Zara", activity: "Dinner Date", hours: 3, daysAgo: 3, scores: [5, 5, 5, 5, 5], text: "Refined taste, zero judgment indeed. Perfect dinner companion." },
    { seeker: "James K.", companion: "Fatoumata", activity: "Nightclub", hours: 3, daysAgo: 6, scores: [5, 5, 5, 5, 5], text: "Life of the party." },
    { seeker: "Kevin O.", companion: "Fatoumata", activity: "Movie Night", hours: 2, daysAgo: 9, scores: [5, 4, 5, 5, 5], text: "" },
    { seeker: "Brian M.", companion: "Nadine", activity: "Dinner Date", hours: 2, daysAgo: 15, scores: [5, 5, 4, 4, 5], text: "Very professional and discreet." },
    { seeker: "Sarah N.", companion: "David", activity: "Dinner Date", hours: 3, daysAgo: 2, scores: [5, 5, 5, 5, 5], text: "A proper gentleman. Attentive and fun." },
    { seeker: "Sarah N.", companion: "Marcus", activity: "City Tour", hours: 3, daysAgo: 20, scores: [4, 5, 4, 5, 5], text: "" },
    { seeker: "James K.", companion: "Wanjiru", activity: "Conversation & Drinks", hours: 2, daysAgo: 8, scores: [5, 5, 5, 5, 5], text: "Best jazz spots in Nairobi." },
  ];

  for (const h of history) {
    const seekerId = seekerIds.get(h.seeker)!;
    const companionId = companionIds.get(h.companion)!;
    const comp = COMPANIONS.find((c) => c.name === h.companion)!;
    const code = `NM-${String(1000 + ((h.seeker.length * 131 + h.companion.length * 17 + h.daysAgo) % 9000))}`;
    const existing = await db.select({ id: bookingsTable.id }).from(bookingsTable).where(eq(bookingsTable.meetupCode, code)).limit(1);
    if (existing[0]) continue;
    const [conn] = await db
      .insert(connectionsTable)
      .values({ seekerId, companionId, status: "accepted", lastMessagePreview: "Thanks for a great night!", lastMessageAt: daysAgo(h.daysAgo) })
      .onConflictDoNothing()
      .returning();
    const connectionId = conn?.id ?? (await db.select({ id: connectionsTable.id }).from(connectionsTable).where(sql`${connectionsTable.seekerId} = ${seekerId} and ${connectionsTable.companionId} = ${companionId}`))[0]?.id ?? null;
    const [booking] = await db
      .insert(bookingsTable)
      .values({
        connectionId,
        seekerId,
        companionId,
        activity: h.activity,
        dateLabel: daysAgo(h.daysAgo).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }),
        scheduledFor: daysAgo(h.daysAgo),
        hours: h.hours,
        rate: comp.rate,
        status: "completed",
        city: "city" in comp && comp.city ? comp.city : "Kampala",
        meetupCode: code,
        createdAt: daysAgo(h.daysAgo + 1),
        updatedAt: daysAgo(h.daysAgo),
        completedAt: daysAgo(h.daysAgo),
      })
      .returning();
    await db.insert(reviewsTable).values({
      bookingId: booking.id,
      reviewerId: seekerId,
      companionId,
      personality: h.scores[0],
      appearance: h.scores[1],
      punctuality: h.scores[2],
      service: h.scores[3],
      safety: h.scores[4],
      text: h.text,
      createdAt: daysAgo(h.daysAgo),
    });
    if (connectionId) {
      await db.insert(messagesTable).values([
        { connectionId, senderId: seekerId, text: `Hi ${h.companion}! Are you free for ${h.activity.toLowerCase()}?`, createdAt: daysAgo(h.daysAgo + 1), readAt: daysAgo(h.daysAgo) },
        { connectionId, senderId: companionId, text: "Yes! I'm available from 8pm. Send the booking and I'll confirm.", createdAt: daysAgo(h.daysAgo + 1), readAt: daysAgo(h.daysAgo) },
        { connectionId, senderId: seekerId, text: "Thanks for a great night!", createdAt: daysAgo(h.daysAgo), readAt: daysAgo(h.daysAgo) },
      ]);
    }
    await db.update(companionProfilesTable).set({ completedMeetups: sql`${companionProfilesTable.completedMeetups} + 1` }).where(eq(companionProfilesTable.userId, companionId));
    await db.insert(pointsLedgerTable).values({ userId: seekerId, points: 100, reason: "meetup", label: `Meetup with ${h.companion} completed`, createdAt: daysAgo(h.daysAgo) });
    await db.insert(pointsLedgerTable).values({ userId: seekerId, points: 50 + (h.text ? 25 : 0) + 25, reason: "review", label: `Chemistry score for ${h.companion}`, createdAt: daysAgo(h.daysAgo) });
    await db.update(usersTable).set({ loyaltyPoints: sql`${usersTable.loyaltyPoints} + ${175 + (h.text ? 25 : 0)}` }).where(eq(usersTable.id, seekerId));
  }

  for (const l of LOUNGES) {
    const existing = await db.select({ id: loungesTable.id }).from(loungesTable).where(eq(loungesTable.name, l.name)).limit(1);
    if (existing[0]) continue;
    await db.insert(loungesTable).values({ hostId: adminId, name: l.name, city: l.city, topic: l.topic, description: l.description, color: l.color, isFeatured: l.featured });
  }

  for (const [, id] of seekerIds) {
    const n = await db.select({ n: sql<string>`count(*)` }).from(notificationsTable).where(eq(notificationsTable.userId, id));
    if (Number(n[0]?.n ?? 0) > 0) continue;
    await db.insert(notificationsTable).values([
      { userId: id, type: "new", title: "3 new companions in Kampala", body: "Zara, Priya and Marcus joined this week", actionRoute: "/discover", actionLabel: "Discover", createdAt: daysAgo(1) },
      { userId: id, type: "deal", title: "Tonight's deals are live ⚡", body: "Leila 30% off · Fatoumata 25% off · Kampala only", actionRoute: "/deals", actionLabel: "View deals" },
    ]);
  }

  console.log(`Seeded ${COMPANIONS.length} companions, ${SEEKERS.length} seekers, 1 admin, ${LOUNGES.length} lounges.`);
  console.log("Sign in with any seeded phone (e.g. +256700000101 for James, +256700000001 for Amara) and PIN 1234.");
  console.log("Admin: +256700000999 / 1234");
}

try {
  await main();
} finally {
  await pool.end();
}

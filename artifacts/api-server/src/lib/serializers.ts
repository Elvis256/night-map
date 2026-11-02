import type {
  Booking as ApiBooking,
  Connection as ApiConnection,
  Message as ApiMessage,
  Notification as ApiNotification,
  PartySummary,
  Photo as ApiPhoto,
  Review as ApiReview,
  User as ApiUser,
} from "@workspace/api-zod";
import type {
  Booking,
  CompanionProfile,
  Connection,
  Message,
  Notification,
  Photo,
  Review,
  User,
} from "@workspace/db";
import { publicUrl } from "./storage";

export const ONLINE_WINDOW_MS = 10 * 60 * 1000;

export function isOnline(user: Pick<User, "lastSeenAt">, profile?: CompanionProfile | null): boolean {
  if (Date.now() - user.lastSeenAt.getTime() < ONLINE_WINDOW_MS) return true;
  return profile?.availabilityStatus === "now";
}

export function isFeatured(profile: CompanionProfile | null | undefined): boolean {
  return !!profile?.featuredUntil && profile.featuredUntil.getTime() > Date.now();
}

export function hasActiveDeal(profile: CompanionProfile | null | undefined): boolean {
  return !!profile && profile.dealDiscount > 0 && !!profile.dealExpiresAt && profile.dealExpiresAt.getTime() > Date.now();
}

export function photoIndexFor(user: Pick<User, "id">): number {
  let h = 0;
  for (const ch of user.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 3;
}

export function toPhoto(p: Photo): ApiPhoto {
  return { id: p.id, url: publicUrl(p.path), isPrimary: p.isPrimary, createdAt: p.createdAt.toISOString() };
}

export function toUser(user: User, profile: CompanionProfile | null, photos: Photo[]): ApiUser {
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    bio: user.bio,
    role: user.role,
    gender: user.gender,
    age: user.age,
    city: user.city,
    lat: user.lat,
    lng: user.lng,
    avatarColor: user.avatarColor,
    isLadiesMode: user.isLadiesMode,
    ghostMode: user.ghostMode,
    availableTonight: user.availableTonight,
    verified: user.verified,
    verificationStatus: user.verificationStatus,
    trustedContact: user.trustedContact,
    language: user.language,
    privacy: user.privacy,
    notificationPrefs: user.notificationPrefs,
    loyaltyPoints: user.loyaltyPoints,
    referralCode: user.referralCode,
    isAdmin: user.isAdmin,
    companionProfile: profile
      ? {
          vibes: profile.vibes,
          menu: profile.menu,
          rate: profile.rate,
          minBookingHours: profile.minBookingHours,
          availabilityStatus: profile.availabilityStatus,
          isFeatured: isFeatured(profile),
          featuredUntil: profile.featuredUntil?.toISOString() ?? null,
          dealDiscount: hasActiveDeal(profile) ? profile.dealDiscount : 0,
          dealExpiresAt: profile.dealExpiresAt?.toISOString() ?? null,
          trustScore: profile.trustScore,
          completedMeetups: profile.completedMeetups,
          responseRate: profile.responseRate,
        }
      : null,
    photos: photos.map(toPhoto),
    createdAt: user.createdAt.toISOString(),
  };
}

export function toParty(
  user: User,
  profile: CompanionProfile | null | undefined,
  primaryPhoto: Photo | null | undefined,
): PartySummary {
  return {
    id: user.id,
    name: user.name,
    avatarColor: user.avatarColor,
    photoUrl: primaryPhoto ? publicUrl(primaryPhoto.path) : null,
    photoIndex: photoIndexFor(user),
    role: user.role,
    city: user.city,
    online: user.privacy.showOnline ? isOnline(user, profile) : false,
    verified: user.verified,
    rate: profile?.rate ?? null,
    availabilityStatus: profile?.availabilityStatus ?? null,
  };
}

export function toConnection(
  c: Connection,
  viewerId: string,
  other: PartySummary,
  unread: number,
): ApiConnection {
  return {
    id: c.id,
    type: c.type,
    status: c.status,
    seekerId: c.seekerId,
    companionId: c.companionId,
    isSeekerSide: c.seekerId === viewerId,
    other,
    lastMessage: c.lastMessagePreview,
    lastMessageAt: c.lastMessageAt.toISOString(),
    unread,
    createdAt: c.createdAt.toISOString(),
  };
}

export function toMessage(m: Message, viewerId: string): ApiMessage {
  return {
    id: m.id,
    connectionId: m.connectionId,
    senderId: m.senderId,
    fromMe: m.senderId === viewerId,
    kind: m.kind,
    text: m.text,
    createdAt: m.createdAt.toISOString(),
    readAt: m.readAt?.toISOString() ?? null,
  };
}

export function toBooking(b: Booking, viewerId: string, other: PartySummary, rated: boolean): ApiBooking {
  return {
    id: b.id,
    connectionId: b.connectionId,
    seekerId: b.seekerId,
    companionId: b.companionId,
    isSeekerSide: b.seekerId === viewerId,
    other,
    activity: b.activity,
    dateLabel: b.dateLabel,
    scheduledFor: b.scheduledFor?.toISOString() ?? null,
    hours: b.hours,
    rate: b.rate,
    total: b.rate * b.hours,
    status: b.status,
    city: b.city,
    note: b.note,
    meetupCode: b.meetupCode,
    safetyActive: b.safetyActive,
    rated,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    completedAt: b.completedAt?.toISOString() ?? null,
  };
}

export function reviewAverage(r: Pick<Review, "personality" | "appearance" | "punctuality" | "service" | "safety">): number {
  return Math.round(((r.personality + r.appearance + r.punctuality + r.service + r.safety) / 5) * 10) / 10;
}

export function toReview(r: Review, reviewerName: string): ApiReview {
  return {
    id: r.id,
    bookingId: r.bookingId,
    companionId: r.companionId,
    reviewerName,
    personality: r.personality,
    appearance: r.appearance,
    punctuality: r.punctuality,
    service: r.service,
    safety: r.safety,
    average: reviewAverage(r),
    text: r.text,
    createdAt: r.createdAt.toISOString(),
  };
}

export function toNotification(n: Notification, actor: PartySummary | null): ApiNotification {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    actionRoute: n.actionRoute,
    actionLabel: n.actionLabel,
    actor,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  };
}

export function meetupCode(): string {
  return `NM-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function initialsName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

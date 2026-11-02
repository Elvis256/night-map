import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  createBooking,
  createConnection,
  deleteMe,
  getGetMeQueryKey,
  getGetMySwipesQueryKey,
  getGetSavedCompanionsQueryKey,
  getGetUnreadCountQueryKey,
  getListBookingsQueryKey,
  getListCompanionsQueryKey,
  getListConnectionsQueryKey,
  getListDealsQueryKey,
  getListMessagesQueryKey,
  getListStoriesQueryKey,
  heartbeat,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  sendMessage as apiSendMessage,
  swipeCompanion,
  toggleSaveCompanion,
  updateBooking,
  updateCompanionProfile as apiUpdateCompanionProfile,
  updateMe,
  useGetMe,
  useGetMySwipes,
  useGetSavedCompanions,
  useGetUnreadCount,
  useListBookings,
  useListCompanions,
  useListConnections,
  useListDeals,
  useListStories,
  type Booking as ApiBooking,
  type BookingActionRequestAction,
  type BookingStatus,
  type CompanionCard,
  type Connection as ApiConnection,
  type ConnectionType,
  type ListCompanionsParams,
  type NotificationPrefs,
  type PartySummary,
  type PrivacyPrefs,
  type RegisterRequest,
  type SwipeSummary,
  type UpdateCompanionProfileRequest,
  type UpdateMeRequest,
  type User as ApiUser,
} from "@workspace/api-client-react";
import { AUTH_TOKEN_KEY, ONBOARDED_KEY, assetUrl, isUnauthorized } from "@/lib/api";
import { nearestCity } from "@/hooks/useLocationCity";
import { registerForPush, unregisterPush } from "@/lib/push";

export type AvailabilityStatus = "now" | "tonight" | "offline";
export type CompanionGender = "female" | "male" | "other";
export type AuthStatus = "loading" | "signedOut" | "signedIn";

export interface Companion {
  id: string;
  name: string;
  age: number | null;
  photoIndex: number;
  photoUrl: string | null;
  vibes: string[];
  menu: string[];
  trustScore: number;
  rating: number;
  reviewCount: number;
  verified: boolean;
  online: boolean;
  city: string;
  distance: number | null;
  bio: string;
  lat: number | null;
  lng: number | null;
  color: string;
  rate: number;
  minBookingHours: number;
  availabilityStatus: AvailabilityStatus;
  isSpotlight: boolean;
  isTonightsDeal: boolean;
  dealDiscount: number;
  isNewInTown: boolean;
  isHotStreak: boolean;
  completedMeetups: number;
  responseRate: number;
  gender: CompanionGender;
  isLiked: boolean;
  isSaved: boolean;
  isHighEnd: boolean;
  locked: boolean;
  connectionId: string | null;
}

export interface Match {
  id: string;
  companion: Companion;
  lastMessage: string;
  lastMessageTime: Date;
  unread: number;
  connectionType: ConnectionType;
  status: "pending" | "accepted" | "declined";
  isSeekerSide: boolean;
}

export interface Message {
  id: string;
  matchId: string;
  text: string;
  fromMe: boolean;
  time: Date;
  kind: "text" | "voice" | "system";
}

export interface AppBooking {
  id: string;
  connectionId: string | null;
  companionId: string;
  otherId: string;
  isSeekerSide: boolean;
  companionName: string;
  companionColor: string;
  companionInitial: string;
  activity: string;
  date: string;
  time: string;
  hours: number;
  rate: number;
  total: number;
  status: BookingStatus;
  city: string;
  bookedAt: string;
  safetyActive: boolean;
  meetupCode: string;
  rated: boolean;
  note: string;
  scheduledFor: Date | null;
  createdAt: Date;
}

export interface AppStory {
  id: string;
  companion: Companion;
  text: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface UserProfile {
  id: string;
  phone: string;
  name: string;
  bio: string;
  isCompanion: boolean;
  isLadiesMode: boolean;
  ghostMode: boolean;
  availableTonight: boolean;
  verified: boolean;
  verificationStatus: "none" | "pending" | "approved" | "rejected";
  city: string;
  trustedContact: string;
  language: string;
  privacy: PrivacyPrefs;
  notificationPrefs: NotificationPrefs;
  loyaltyPoints: number;
  referralCode: string;
  isAdmin: boolean;
  avatarColor: string;
  photoUrl: string | null;
  gender: CompanionGender;
  age: number | null;
  companionProfile: ApiUser["companionProfile"];
  walletBalance: number;
  totalEarnings: number;
  pendingPayout: number;
}

export interface Filters {
  maxDistance: number;
  minRating: number;
  verifiedOnly: boolean;
  status: "all" | "now" | "tonight";
  maxRate: number;
}

export type ProfileUpdate = Partial<
  Pick<
    UserProfile,
    | "name"
    | "bio"
    | "city"
    | "isCompanion"
    | "isLadiesMode"
    | "ghostMode"
    | "availableTonight"
    | "trustedContact"
    | "language"
    | "privacy"
    | "notificationPrefs"
    | "gender"
    | "age"
  >
> & { lat?: number; lng?: number };

export interface RegisterInput {
  phone: string;
  pin: string;
  name: string;
  role: "seeker" | "companion";
  city?: string;
  gender?: CompanionGender;
  age?: number;
  referralCode?: string;
}

export interface BookingInput {
  companionId: string;
  activity: string;
  dateLabel: string;
  hours: number;
  note?: string;
  scheduledFor?: Date | null;
}

export const DEFAULT_FILTERS: Filters = {
  maxDistance: 50,
  minRating: 0,
  verifiedOnly: false,
  status: "all",
  maxRate: 500000,
};

export const DEFAULT_PRIVACY: PrivacyPrefs = { showDistance: true, showOnline: true, allowSaves: true, hideFromSearch: false };
export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = { messages: true, bookings: true, deals: true, live: false, radio: false };

const DEFAULT_PROFILE: UserProfile = {
  id: "",
  phone: "",
  name: "You",
  bio: "",
  isCompanion: false,
  isLadiesMode: false,
  ghostMode: false,
  availableTonight: false,
  verified: false,
  verificationStatus: "none",
  city: "Kampala",
  trustedContact: "",
  language: "English",
  privacy: DEFAULT_PRIVACY,
  notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
  loyaltyPoints: 0,
  referralCode: "",
  isAdmin: false,
  avatarColor: "#7A3CFF",
  photoUrl: null,
  gender: "other",
  age: null,
  companionProfile: null,
  walletBalance: 0,
  totalEarnings: 0,
  pendingPayout: 0,
};

// ───────────────────────── mappers ─────────────────────────

export function toCompanion(c: CompanionCard): Companion {
  return {
    id: c.id,
    name: c.name,
    age: c.age ?? null,
    photoIndex: c.photoIndex,
    photoUrl: assetUrl(c.photoUrl),
    vibes: c.vibes,
    menu: c.menu,
    trustScore: c.trustScore,
    rating: c.rating,
    reviewCount: c.reviewCount,
    verified: c.verified,
    online: c.online,
    city: c.city,
    distance: c.distanceKm ?? null,
    bio: c.bio,
    lat: c.lat ?? null,
    lng: c.lng ?? null,
    color: c.avatarColor,
    rate: c.rate,
    minBookingHours: c.minBookingHours,
    availabilityStatus: c.availabilityStatus,
    isSpotlight: c.isSpotlight,
    isTonightsDeal: c.isTonightsDeal,
    dealDiscount: c.dealDiscount,
    isNewInTown: c.isNewInTown,
    isHotStreak: c.isHotStreak,
    completedMeetups: c.completedMeetups,
    responseRate: c.responseRate,
    gender: c.gender,
    isLiked: c.isLiked,
    isSaved: c.isSaved,
    isHighEnd: c.isHighEnd,
    locked: c.locked,
    connectionId: c.connectionId ?? null,
  };
}

export function partyToCompanion(p: PartySummary): Companion {
  return {
    id: p.id,
    name: p.name,
    age: null,
    photoIndex: p.photoIndex ?? 0,
    photoUrl: assetUrl(p.photoUrl),
    vibes: [],
    menu: [],
    trustScore: 0,
    rating: 0,
    reviewCount: 0,
    verified: p.verified,
    online: p.online,
    city: p.city,
    distance: null,
    bio: "",
    lat: null,
    lng: null,
    color: p.avatarColor,
    rate: p.rate ?? 0,
    minBookingHours: 1,
    availabilityStatus: p.availabilityStatus ?? "offline",
    isSpotlight: false,
    isTonightsDeal: false,
    dealDiscount: 0,
    isNewInTown: false,
    isHotStreak: false,
    completedMeetups: 0,
    responseRate: 0,
    gender: "other",
    isLiked: false,
    isSaved: false,
    isHighEnd: false,
    locked: false,
    connectionId: null,
  };
}

export function toMatch(c: ApiConnection): Match {
  return {
    id: c.id,
    companion: partyToCompanion(c.other),
    lastMessage: c.lastMessage,
    lastMessageTime: new Date(c.lastMessageAt),
    unread: c.unread,
    connectionType: c.type,
    status: c.status,
    isSeekerSide: c.isSeekerSide,
  };
}

export function formatClock(date: Date): string {
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

export function relativeTime(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 172_800_000) return "Yesterday";
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} days ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function toAppBooking(b: ApiBooking): AppBooking {
  const scheduledFor = b.scheduledFor ? new Date(b.scheduledFor) : null;
  const time = scheduledFor
    ? scheduledFor.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : b.status === "pending"
      ? "Awaiting confirmation"
      : b.dateLabel === "Tonight"
        ? "Tonight"
        : "To be confirmed";
  return {
    id: b.id,
    connectionId: b.connectionId ?? null,
    companionId: b.companionId,
    otherId: b.other.id,
    isSeekerSide: b.isSeekerSide,
    companionName: b.other.name,
    companionColor: b.other.avatarColor,
    companionInitial: b.other.name[0]?.toUpperCase() ?? "?",
    activity: b.activity,
    date: b.dateLabel,
    time,
    hours: b.hours,
    rate: b.rate,
    total: b.total,
    status: b.status,
    city: b.city,
    bookedAt: relativeTime(b.createdAt),
    safetyActive: b.safetyActive,
    meetupCode: b.meetupCode,
    rated: b.rated,
    note: b.note,
    scheduledFor,
    createdAt: new Date(b.createdAt),
  };
}

export function toProfile(u: ApiUser | null | undefined): UserProfile {
  if (!u) return DEFAULT_PROFILE;
  const primary = u.photos.find((p) => p.isPrimary) ?? u.photos[0];
  return {
    id: u.id,
    phone: u.phone,
    name: u.name,
    bio: u.bio,
    isCompanion: u.role === "companion",
    isLadiesMode: u.isLadiesMode,
    ghostMode: u.ghostMode,
    availableTonight: u.availableTonight,
    verified: u.verified,
    verificationStatus: u.verificationStatus,
    city: u.city,
    trustedContact: u.trustedContact,
    language: u.language,
    privacy: u.privacy,
    notificationPrefs: u.notificationPrefs,
    loyaltyPoints: u.loyaltyPoints,
    referralCode: u.referralCode,
    isAdmin: u.isAdmin,
    avatarColor: u.avatarColor,
    photoUrl: assetUrl(primary?.url ?? null),
    gender: u.gender,
    age: u.age ?? null,
    companionProfile: u.companionProfile ?? null,
    walletBalance: 0,
    totalEarnings: 0,
    pendingPayout: 0,
  };
}

export function formatUGX(amount: number): string {
  return `UGX ${amount.toLocaleString()}`;
}

// ───────────────────────── context ─────────────────────────

interface AppContextType {
  authStatus: AuthStatus;
  serverError: string | null;
  me: ApiUser | null;
  userProfile: UserProfile;
  signIn: (phone: string, pin: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshMe: () => Promise<void>;

  companions: Companion[];
  companionsLoading: boolean;
  filteredCompanions: (isLadiesMode: boolean) => Companion[];
  refreshCompanions: () => void;
  browseCity: string;
  setBrowseCity: (city: string) => void;
  stories: AppStory[];
  deals: Companion[];

  matches: Match[];
  matchesLoading: boolean;
  addMatch: (companion: Companion, type?: ConnectionType, message?: string) => Promise<Match>;
  sendMessage: (matchId: string, text: string, kind?: "text" | "voice") => Promise<void>;

  bookings: AppBooking[];
  bookingsLoading: boolean;
  addBooking: (input: BookingInput) => Promise<AppBooking>;
  updateBookingStatus: (id: string, action: BookingActionRequestAction) => Promise<void>;

  toggleAvailability: () => Promise<void>;
  updateProfile: (updates: ProfileUpdate) => Promise<void>;
  updateCompanionProfile: (updates: UpdateCompanionProfileRequest) => Promise<void>;

  filters: Filters;
  updateFilters: (updates: Partial<Filters>) => void;
  resetFilters: () => void;

  likedIds: Set<string>;
  passedIds: Set<string>;
  likeCompanion: (id: string) => Promise<void>;
  passCompanion: (id: string) => Promise<void>;
  savedIds: Set<string>;
  savedCompanions: Companion[];
  toggleSaved: (id: string) => Promise<void>;

  userCity: string;
  setUserCity: (city: string) => void;
  coords: { lat: number; lng: number } | null;
  unread: { notifications: number; messages: number };
  invalidate: (keys: ReadonlyArray<readonly unknown[]>) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [userCity, setUserCityState] = useState<string>("");
  const [browseCity, setBrowseCityState] = useState<string>("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const locationRequested = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedFilters] = await Promise.all([
          AsyncStorage.getItem(AUTH_TOKEN_KEY),
          AsyncStorage.getItem("filters"),
        ]);
        if (storedFilters) setFilters({ ...DEFAULT_FILTERS, ...JSON.parse(storedFilters) });
        setToken(storedToken);
      } catch {
        setToken(null);
      }
    })();
  }, []);

  const hasToken = !!token;
  const meQuery = useGetMe({ query: { queryKey: getGetMeQueryKey(), enabled: hasToken, retry: false, staleTime: 30_000 } });

  const clearSession = useCallback(async () => {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    setToken(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    if (meQuery.error && isUnauthorized(meQuery.error)) void clearSession();
  }, [meQuery.error, clearSession]);

  const me = meQuery.data ?? null;
  const authStatus: AuthStatus =
    token === undefined
      ? "loading"
      : !token
        ? "signedOut"
        : me
          ? "signedIn"
          : meQuery.isError
            ? isUnauthorized(meQuery.error)
              ? "signedOut"
              : "signedIn"
            : "loading";
  const signedIn = authStatus === "signedIn" && !!me;
  const serverError = meQuery.isError && !isUnauthorized(meQuery.error) ? "Can't reach NightMap. Showing what we have." : null;

  const userProfile = useMemo(() => toProfile(me), [me]);

  // Resolve the city we browse: explicit choice → profile city.
  const effectiveCity = browseCity || userProfile.city || "Kampala";

  // One-time location fix after sign-in: heartbeat with coordinates + nearest city.
  useEffect(() => {
    if (!signedIn || locationRequested.current) return;
    locationRequested.current = true;
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== "granted") {
          await heartbeat({});
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(next);
        const city = nearestCity(next.lat, next.lng);
        setUserCityState(city);
        await heartbeat({ lat: next.lat, lng: next.lng });
      } catch {
        try {
          await heartbeat({});
        } catch {
          // offline; ignore
        }
      }
    })();
  }, [signedIn]);

  // Register this device for push notifications once per session.
  const pushRegistered = useRef(false);
  useEffect(() => {
    if (!signedIn || pushRegistered.current) return;
    pushRegistered.current = true;
    registerForPush().catch(() => {});
  }, [signedIn]);

  // Presence heartbeat every 2 minutes while signed in.
  useEffect(() => {
    if (!signedIn) return;
    const id = setInterval(() => {
      heartbeat(coords ? { lat: coords.lat, lng: coords.lng } : {}).catch(() => {});
    }, 120_000);
    return () => clearInterval(id);
  }, [signedIn, coords]);

  const companionParams = useMemo<ListCompanionsParams>(
    () => ({
      gender: userProfile.isLadiesMode ? "male" : "female",
      city: effectiveCity,
      status: filters.status,
      verifiedOnly: filters.verifiedOnly || undefined,
      minRating: filters.minRating > 0 ? filters.minRating : undefined,
      maxRate: filters.maxRate < 500000 ? filters.maxRate : undefined,
      maxDistance: filters.maxDistance < 50 ? filters.maxDistance : undefined,
      lat: coords?.lat,
      lng: coords?.lng,
    }),
    [userProfile.isLadiesMode, effectiveCity, filters, coords],
  );

  const companionsQuery = useListCompanions(companionParams, {
    query: {
      queryKey: getListCompanionsQueryKey(companionParams),
      enabled: signedIn,
      refetchInterval: 30_000,
      staleTime: 10_000,
      placeholderData: (prev) => prev,
    },
  });
  const storiesQuery = useListStories(
    { city: effectiveCity },
    { query: { queryKey: getListStoriesQueryKey({ city: effectiveCity }), enabled: signedIn, refetchInterval: 60_000, staleTime: 30_000 } },
  );
  const dealsQuery = useListDeals(
    { city: effectiveCity },
    { query: { queryKey: getListDealsQueryKey({ city: effectiveCity }), enabled: signedIn, refetchInterval: 60_000, staleTime: 30_000 } },
  );
  const connectionsQuery = useListConnections({
    query: { queryKey: getListConnectionsQueryKey(), enabled: signedIn, refetchInterval: 8_000, staleTime: 4_000 },
  });
  const bookingsQuery = useListBookings({
    query: { queryKey: getListBookingsQueryKey(), enabled: signedIn, refetchInterval: 15_000, staleTime: 5_000 },
  });
  const swipesQuery = useGetMySwipes({ query: { queryKey: getGetMySwipesQueryKey(), enabled: signedIn, staleTime: 60_000 } });
  const savedQuery = useGetSavedCompanions({ query: { queryKey: getGetSavedCompanionsQueryKey(), enabled: signedIn, staleTime: 30_000 } });
  const unreadQuery = useGetUnreadCount({ query: { queryKey: getGetUnreadCountQueryKey(), enabled: signedIn, refetchInterval: 10_000 } });

  const companions = useMemo(() => (companionsQuery.data ?? []).map(toCompanion), [companionsQuery.data]);
  const stories = useMemo<AppStory[]>(
    () =>
      (storiesQuery.data ?? []).map((s) => ({
        id: s.id,
        companion: toCompanion(s.companion),
        text: s.text,
        createdAt: new Date(s.createdAt),
        expiresAt: new Date(s.expiresAt),
      })),
    [storiesQuery.data],
  );
  const deals = useMemo(() => (dealsQuery.data ?? []).map(toCompanion), [dealsQuery.data]);
  const matches = useMemo(() => (connectionsQuery.data ?? []).map(toMatch), [connectionsQuery.data]);
  const bookings = useMemo(() => (bookingsQuery.data ?? []).map(toAppBooking), [bookingsQuery.data]);
  const likedIds = useMemo(() => new Set(swipesQuery.data?.liked ?? []), [swipesQuery.data]);
  const passedIds = useMemo(() => new Set(swipesQuery.data?.passed ?? []), [swipesQuery.data]);
  const savedCompanions = useMemo(() => (savedQuery.data ?? []).map(toCompanion), [savedQuery.data]);
  const savedIds = useMemo(() => new Set(savedCompanions.map((c) => c.id)), [savedCompanions]);
  const unread = useMemo(
    () => ({ notifications: unreadQuery.data?.notifications ?? 0, messages: unreadQuery.data?.messages ?? 0 }),
    [unreadQuery.data],
  );

  const invalidate = useCallback(
    (keys: ReadonlyArray<readonly unknown[]>) => {
      for (const key of keys) void queryClient.invalidateQueries({ queryKey: key });
    },
    [queryClient],
  );

  // ── auth ──
  const adoptSession = useCallback(
    async (nextToken: string, user: ApiUser) => {
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, nextToken);
      await AsyncStorage.setItem(ONBOARDED_KEY, "true");
      queryClient.setQueryData(getGetMeQueryKey(), user);
      locationRequested.current = false;
      pushRegistered.current = false;
      setToken(nextToken);
    },
    [queryClient],
  );

  const signIn = useCallback(
    async (phone: string, pin: string) => {
      const res = await apiLogin({ phone, pin });
      await adoptSession(res.token, res.user);
    },
    [adoptSession],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const body: RegisterRequest = {
        phone: input.phone,
        pin: input.pin,
        name: input.name,
        role: input.role,
        city: input.city,
        gender: input.gender,
        age: input.age,
        referralCode: input.referralCode,
      };
      const res = await apiRegister(body);
      await adoptSession(res.token, res.user);
    },
    [adoptSession],
  );

  const signOut = useCallback(async () => {
    await unregisterPush();
    pushRegistered.current = false;
    try {
      await apiLogout();
    } catch {
      // token may already be invalid
    }
    await clearSession();
  }, [clearSession]);

  const deleteAccount = useCallback(async () => {
    await unregisterPush();
    pushRegistered.current = false;
    await deleteMe();
    await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, ONBOARDED_KEY, "filters", "profilePreferences"]);
    setToken(null);
    queryClient.clear();
  }, [queryClient]);

  const refreshMe = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
  }, [queryClient]);

  // ── profile ──
  const updateProfile = useCallback(
    async (updates: ProfileUpdate) => {
      const body: UpdateMeRequest = {};
      if (updates.name !== undefined) body.name = updates.name;
      if (updates.bio !== undefined) body.bio = updates.bio;
      if (updates.city !== undefined) body.city = updates.city;
      if (updates.lat !== undefined) body.lat = updates.lat;
      if (updates.lng !== undefined) body.lng = updates.lng;
      if (updates.isCompanion !== undefined) body.role = updates.isCompanion ? "companion" : "seeker";
      if (updates.gender !== undefined) body.gender = updates.gender;
      if (updates.age !== undefined && updates.age !== null) body.age = updates.age;
      if (updates.isLadiesMode !== undefined) body.isLadiesMode = updates.isLadiesMode;
      if (updates.ghostMode !== undefined) body.ghostMode = updates.ghostMode;
      if (updates.availableTonight !== undefined) body.availableTonight = updates.availableTonight;
      if (updates.trustedContact !== undefined) body.trustedContact = updates.trustedContact;
      if (updates.language !== undefined) body.language = updates.language;
      if (updates.privacy !== undefined) body.privacy = updates.privacy;
      if (updates.notificationPrefs !== undefined) body.notificationPrefs = updates.notificationPrefs;

      const key = getGetMeQueryKey();
      const previous = queryClient.getQueryData<ApiUser>(key);
      if (previous) {
        queryClient.setQueryData<ApiUser>(key, {
          ...previous,
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.bio !== undefined ? { bio: body.bio } : {}),
          ...(body.city !== undefined ? { city: body.city } : {}),
          ...(body.role !== undefined ? { role: body.role } : {}),
          ...(body.gender !== undefined ? { gender: body.gender } : {}),
          ...(body.isLadiesMode !== undefined ? { isLadiesMode: body.isLadiesMode } : {}),
          ...(body.ghostMode !== undefined ? { ghostMode: body.ghostMode } : {}),
          ...(body.availableTonight !== undefined ? { availableTonight: body.availableTonight } : {}),
          ...(body.trustedContact !== undefined ? { trustedContact: body.trustedContact } : {}),
          ...(body.language !== undefined ? { language: body.language } : {}),
          ...(body.privacy !== undefined ? { privacy: body.privacy } : {}),
          ...(body.notificationPrefs !== undefined ? { notificationPrefs: body.notificationPrefs } : {}),
        });
      }
      try {
        const updated = await updateMe(body);
        queryClient.setQueryData(key, updated);
      } catch (err) {
        if (previous) queryClient.setQueryData(key, previous);
        throw err;
      }
    },
    [queryClient],
  );

  const updateCompanionProfile = useCallback(
    async (updates: UpdateCompanionProfileRequest) => {
      const updated = await apiUpdateCompanionProfile(updates);
      queryClient.setQueryData(getGetMeQueryKey(), updated);
      invalidate([getListCompanionsQueryKey(companionParams), getListDealsQueryKey({ city: effectiveCity })]);
    },
    [queryClient, invalidate, companionParams, effectiveCity],
  );

  const toggleAvailability = useCallback(async () => {
    await updateProfile({ availableTonight: !userProfile.availableTonight });
  }, [updateProfile, userProfile.availableTonight]);

  // ── discovery ──
  const filteredCompanions = useCallback((_isLadiesMode: boolean): Companion[] => companions, [companions]);
  const refreshCompanions = useCallback(() => {
    void companionsQuery.refetch();
  }, [companionsQuery]);

  const setBrowseCity = useCallback((city: string) => setBrowseCityState(city), []);
  const setUserCity = useCallback((city: string) => {
    setUserCityState(city);
    setBrowseCityState((prev) => prev || city);
  }, []);

  const applySwipe = useCallback(
    async (id: string, action: "like" | "pass") => {
      const key = getGetMySwipesQueryKey();
      const previous = queryClient.getQueryData<SwipeSummary>(key) ?? { liked: [], passed: [] };
      queryClient.setQueryData<SwipeSummary>(key, {
        liked: action === "like" ? [...new Set([...previous.liked, id])] : previous.liked.filter((x) => x !== id),
        passed: action === "pass" ? [...new Set([...previous.passed, id])] : previous.passed.filter((x) => x !== id),
      });
      try {
        const summary = await swipeCompanion(id, { action });
        queryClient.setQueryData(key, summary);
      } catch (err) {
        queryClient.setQueryData(key, previous);
        throw err;
      }
    },
    [queryClient],
  );

  const likeCompanion = useCallback((id: string) => applySwipe(id, "like"), [applySwipe]);
  const passCompanion = useCallback((id: string) => applySwipe(id, "pass"), [applySwipe]);

  const toggleSaved = useCallback(
    async (id: string) => {
      const key = getGetSavedCompanionsQueryKey();
      const previous = queryClient.getQueryData<CompanionCard[]>(key) ?? [];
      const exists = previous.some((c) => c.id === id);
      const card = companionsQuery.data?.find((c) => c.id === id) ?? dealsQuery.data?.find((c) => c.id === id);
      queryClient.setQueryData<CompanionCard[]>(
        key,
        exists ? previous.filter((c) => c.id !== id) : card ? [card, ...previous] : previous,
      );
      try {
        await toggleSaveCompanion(id);
      } finally {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
    [queryClient, companionsQuery.data, dealsQuery.data],
  );

  // ── connections / chat ──
  const addMatch = useCallback(
    async (companion: Companion, type: ConnectionType = "standard", message?: string) => {
      const connection = await createConnection({ companionId: companion.id, type, message });
      invalidate([getListConnectionsQueryKey(), getListCompanionsQueryKey(companionParams)]);
      return toMatch(connection);
    },
    [invalidate, companionParams],
  );

  const sendMessage = useCallback(
    async (matchId: string, text: string, kind: "text" | "voice" = "text") => {
      await apiSendMessage(matchId, { text, kind });
      invalidate([getListMessagesQueryKey(matchId), getListConnectionsQueryKey()]);
    },
    [invalidate],
  );

  // ── bookings ──
  const addBooking = useCallback(
    async (input: BookingInput) => {
      const booking = await createBooking({
        companionId: input.companionId,
        activity: input.activity,
        dateLabel: input.dateLabel,
        hours: input.hours,
        note: input.note,
        scheduledFor: input.scheduledFor ? input.scheduledFor.toISOString() : undefined,
      });
      invalidate([getListBookingsQueryKey(), getListConnectionsQueryKey(), getListCompanionsQueryKey(companionParams)]);
      return toAppBooking(booking);
    },
    [invalidate, companionParams],
  );

  const updateBookingStatus = useCallback(
    async (id: string, action: BookingActionRequestAction) => {
      await updateBooking(id, { action });
      invalidate([getListBookingsQueryKey(), getListConnectionsQueryKey(), getGetMeQueryKey()]);
    },
    [invalidate],
  );

  // ── filters ──
  const updateFilters = useCallback((updates: Partial<Filters>) => {
    setFilters((prev) => {
      const next = { ...prev, ...updates };
      AsyncStorage.setItem("filters", JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    AsyncStorage.removeItem("filters").catch(() => {});
  }, []);

  const value = useMemo<AppContextType>(
    () => ({
      authStatus,
      serverError,
      me,
      userProfile,
      signIn,
      register,
      signOut,
      deleteAccount,
      refreshMe,
      companions,
      companionsLoading: companionsQuery.isLoading,
      filteredCompanions,
      refreshCompanions,
      browseCity: effectiveCity,
      setBrowseCity,
      stories,
      deals,
      matches,
      matchesLoading: connectionsQuery.isLoading,
      addMatch,
      sendMessage,
      bookings,
      bookingsLoading: bookingsQuery.isLoading,
      addBooking,
      updateBookingStatus,
      toggleAvailability,
      updateProfile,
      updateCompanionProfile,
      filters,
      updateFilters,
      resetFilters,
      likedIds,
      passedIds,
      likeCompanion,
      passCompanion,
      savedIds,
      savedCompanions,
      toggleSaved,
      userCity,
      setUserCity,
      coords,
      unread,
      invalidate,
    }),
    [
      authStatus, serverError, me, userProfile, signIn, register, signOut, deleteAccount, refreshMe,
      companions, companionsQuery.isLoading, filteredCompanions, refreshCompanions, effectiveCity, setBrowseCity,
      stories, deals, matches, connectionsQuery.isLoading, addMatch, sendMessage, bookings, bookingsQuery.isLoading,
      addBooking, updateBookingStatus, toggleAvailability, updateProfile, updateCompanionProfile, filters, updateFilters,
      resetFilters, likedIds, passedIds, likeCompanion, passCompanion, savedIds, savedCompanions, toggleSaved, userCity,
      setUserCity, coords, unread, invalidate,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

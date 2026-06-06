import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type AvailabilityStatus = "now" | "tonight" | "offline";
export type CompanionGender = "female" | "male";

export interface Companion {
  id: string;
  name: string;
  age: number;
  photoIndex: number;
  vibes: string[];
  menu: string[];
  trustScore: number;
  rating: number;
  verified: boolean;
  online: boolean;
  city: string;
  distance: number;
  bio: string;
  lat: number;
  lng: number;
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
}

export interface Match {
  id: string;
  companion: Companion;
  lastMessage: string;
  lastMessageTime: Date;
  unread: number;
  connectionType: "standard" | "super" | "paidDm";
}

export interface Message {
  id: string;
  matchId: string;
  text: string;
  fromMe: boolean;
  time: Date;
}

export interface UserProfile {
  name: string;
  isCompanion: boolean;
  isLadiesMode: boolean;
  ghostMode: boolean;
  availableTonight: boolean;
  verified: boolean;
  city: string;
  trustedContact: string;
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

const BASE_LAT = 0.3136;
const BASE_LNG = 32.5811;

export const COMPANIONS: Companion[] = [
  {
    id: "1",
    name: "Amara",
    age: 24,
    photoIndex: 0,
    vibes: ["Dinner Date", "Events", "Travel"],
    menu: ["Dinner Date", "City Tour", "Events", "Conversation & Drinks"],
    trustScore: 97,
    rating: 4.9,
    verified: true,
    online: true,
    city: "Kampala",
    distance: 1.2,
    bio: "Sophisticated and adventurous. Love great food, rooftop views, and genuine conversation. Available most evenings.",
    lat: BASE_LAT + 0.008,
    lng: BASE_LNG + 0.012,
    color: "#c2185b",
    rate: 150000,
    minBookingHours: 2,
    availabilityStatus: "now",
    isSpotlight: true,
    isTonightsDeal: false,
    dealDiscount: 0,
    isNewInTown: false,
    isHotStreak: true,
    completedMeetups: 47,
    responseRate: 98,
    gender: "female",
  },
  {
    id: "2",
    name: "Leila",
    age: 27,
    photoIndex: 1,
    vibes: ["Nightlife", "Dancing", "VIP Access"],
    menu: ["Nightclub", "Pool/Swim", "Movie Night", "Conversation & Drinks"],
    trustScore: 94,
    rating: 4.8,
    verified: true,
    online: true,
    city: "Kampala",
    distance: 2.1,
    bio: "I know every hidden gem in the city. Let me show you a night you won't forget. Dance all night.",
    lat: BASE_LAT - 0.005,
    lng: BASE_LNG + 0.018,
    color: "#7b1fa2",
    rate: 120000,
    minBookingHours: 2,
    availabilityStatus: "now",
    isSpotlight: false,
    isTonightsDeal: true,
    dealDiscount: 30,
    isNewInTown: false,
    isHotStreak: true,
    completedMeetups: 31,
    responseRate: 94,
    gender: "female",
  },
  {
    id: "3",
    name: "Zara",
    age: 25,
    photoIndex: 2,
    vibes: ["Fine Dining", "Art", "Culture"],
    menu: ["Dinner Date", "City Tour", "Massage", "Conversation & Drinks"],
    trustScore: 98,
    rating: 5.0,
    verified: true,
    online: true,
    city: "Kampala",
    distance: 0.8,
    bio: "Art curator by day, nightlife curator by night. Refined taste, zero judgment.",
    lat: BASE_LAT + 0.014,
    lng: BASE_LNG - 0.007,
    color: "#00695c",
    rate: 200000,
    minBookingHours: 3,
    availabilityStatus: "now",
    isSpotlight: false,
    isTonightsDeal: false,
    dealDiscount: 0,
    isNewInTown: true,
    isHotStreak: false,
    completedMeetups: 12,
    responseRate: 100,
    gender: "female",
  },
  {
    id: "4",
    name: "Nadine",
    age: 29,
    photoIndex: 0,
    vibes: ["Business", "Hotels", "Confidential"],
    menu: ["Dinner Date", "Nightclub", "City Tour"],
    trustScore: 92,
    rating: 4.7,
    verified: true,
    online: false,
    city: "Kampala",
    distance: 3.4,
    bio: "Discreet, professional, and charming. Perfect for business events or private evenings.",
    lat: BASE_LAT - 0.011,
    lng: BASE_LNG - 0.009,
    color: "#1565c0",
    rate: 180000,
    minBookingHours: 2,
    availabilityStatus: "tonight",
    isSpotlight: false,
    isTonightsDeal: false,
    dealDiscount: 0,
    isNewInTown: false,
    isHotStreak: false,
    completedMeetups: 23,
    responseRate: 89,
    gender: "female",
  },
  {
    id: "5",
    name: "Fatoumata",
    age: 26,
    photoIndex: 1,
    vibes: ["Music", "Clubs", "Energy"],
    menu: ["Nightclub", "Pool/Swim", "Movie Night"],
    trustScore: 95,
    rating: 4.9,
    verified: true,
    online: true,
    city: "Kampala",
    distance: 1.7,
    bio: "Life is a party and I know the best ones. Join me for an unforgettable night out.",
    lat: BASE_LAT + 0.003,
    lng: BASE_LNG + 0.022,
    color: "#e65100",
    rate: 100000,
    minBookingHours: 2,
    availabilityStatus: "now",
    isSpotlight: false,
    isTonightsDeal: true,
    dealDiscount: 25,
    isNewInTown: false,
    isHotStreak: false,
    completedMeetups: 65,
    responseRate: 96,
    gender: "female",
  },
  {
    id: "6",
    name: "Priya",
    age: 23,
    photoIndex: 2,
    vibes: ["Luxury", "Spa Days", "Shopping"],
    menu: ["Dinner Date", "Massage", "City Tour", "Pool/Swim"],
    trustScore: 96,
    rating: 4.8,
    verified: true,
    online: false,
    city: "Kampala",
    distance: 4.1,
    bio: "Your perfect day-to-night companion. From afternoon adventures to evening glamour.",
    lat: BASE_LAT - 0.018,
    lng: BASE_LNG + 0.004,
    color: "#880e4f",
    rate: 130000,
    minBookingHours: 2,
    availabilityStatus: "offline",
    isSpotlight: false,
    isTonightsDeal: false,
    dealDiscount: 0,
    isNewInTown: true,
    isHotStreak: false,
    completedMeetups: 8,
    responseRate: 92,
    gender: "female",
  },
  {
    id: "7",
    name: "David",
    age: 31,
    photoIndex: 0,
    vibes: ["Dinner Date", "Gentleman", "Events"],
    menu: ["Dinner Date", "City Tour", "Events", "Conversation & Drinks"],
    trustScore: 93,
    rating: 4.8,
    verified: true,
    online: true,
    city: "Kampala",
    distance: 2.3,
    bio: "A true gentleman for the discerning woman. Refined, attentive, and completely discreet.",
    lat: BASE_LAT + 0.011,
    lng: BASE_LNG + 0.005,
    color: "#1a237e",
    rate: 120000,
    minBookingHours: 2,
    availabilityStatus: "now",
    isSpotlight: false,
    isTonightsDeal: false,
    dealDiscount: 0,
    isNewInTown: false,
    isHotStreak: true,
    completedMeetups: 28,
    responseRate: 95,
    gender: "male",
  },
  {
    id: "8",
    name: "Marcus",
    age: 35,
    photoIndex: 1,
    vibes: ["Luxury", "Travel", "Adventure"],
    menu: ["Dinner Date", "City Tour", "Nightclub", "Pool/Swim"],
    trustScore: 90,
    rating: 4.7,
    verified: true,
    online: true,
    city: "Kampala",
    distance: 1.5,
    bio: "Cultured, sophisticated, and ready for adventure. Business professional by day.",
    lat: BASE_LAT - 0.007,
    lng: BASE_LNG - 0.015,
    color: "#4a148c",
    rate: 140000,
    minBookingHours: 3,
    availabilityStatus: "tonight",
    isSpotlight: true,
    isTonightsDeal: false,
    dealDiscount: 0,
    isNewInTown: true,
    isHotStreak: false,
    completedMeetups: 15,
    responseRate: 88,
    gender: "male",
  },
];

const INITIAL_MESSAGES: Record<string, Message[]> = {};

const DEFAULT_FILTERS: Filters = {
  maxDistance: 20,
  minRating: 0,
  verifiedOnly: false,
  status: "all",
  maxRate: 500000,
};

interface AppContextType {
  companions: Companion[];
  filteredCompanions: (isLadiesMode: boolean) => Companion[];
  matches: Match[];
  messages: Record<string, Message[]>;
  userProfile: UserProfile;
  filters: Filters;
  addMatch: (companion: Companion, type: Match["connectionType"]) => void;
  sendMessage: (matchId: string, text: string) => void;
  toggleAvailability: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  updateFilters: (updates: Partial<Filters>) => void;
  resetFilters: () => void;
  likedIds: Set<string>;
  passedIds: Set<string>;
  likeCompanion: (id: string) => void;
  passCompanion: (id: string) => void;
  walletCredit: (amount: number) => void;
}

const AppContext = createContext<AppContextType | null>(null);

const DEFAULT_PROFILE: UserProfile = {
  name: "You",
  isCompanion: false,
  isLadiesMode: false,
  ghostMode: false,
  availableTonight: false,
  verified: false,
  city: "Kampala",
  trustedContact: "",
  walletBalance: 0,
  totalEarnings: 0,
  pendingPayout: 0,
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [messages, setMessages] =
    useState<Record<string, Message[]>>(INITIAL_MESSAGES);
  const [userProfile, setUserProfile] =
    useState<UserProfile>(DEFAULT_PROFILE);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [passedIds, setPassedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [storedMatches, storedMessages, storedProfile, storedLiked, storedPassed, storedFilters] =
        await Promise.all([
          AsyncStorage.getItem("matches"),
          AsyncStorage.getItem("messages"),
          AsyncStorage.getItem("userProfile"),
          AsyncStorage.getItem("likedIds"),
          AsyncStorage.getItem("passedIds"),
          AsyncStorage.getItem("filters"),
        ]);

      if (storedMatches) {
        const parsed = JSON.parse(storedMatches);
        setMatches(parsed.map((m: Match) => ({ ...m, lastMessageTime: new Date(m.lastMessageTime) })));
      }
      if (storedMessages) {
        const parsed = JSON.parse(storedMessages);
        const restored: Record<string, Message[]> = {};
        for (const key of Object.keys(parsed)) {
          restored[key] = parsed[key].map((msg: Message) => ({ ...msg, time: new Date(msg.time) }));
        }
        setMessages(restored);
      }
      if (storedProfile) setUserProfile(JSON.parse(storedProfile));
      if (storedLiked) setLikedIds(new Set(JSON.parse(storedLiked)));
      if (storedPassed) setPassedIds(new Set(JSON.parse(storedPassed)));
      if (storedFilters) setFilters(JSON.parse(storedFilters));
    } catch (_) {}
  };

  const saveMatches = async (newMatches: Match[]) => {
    await AsyncStorage.setItem("matches", JSON.stringify(newMatches));
  };

  const saveMessages = async (newMessages: Record<string, Message[]>) => {
    await AsyncStorage.setItem("messages", JSON.stringify(newMessages));
  };

  const filteredCompanions = useCallback((isLadiesMode: boolean): Companion[] => {
    return COMPANIONS.filter((c) => {
      if (isLadiesMode && c.gender !== "male") return false;
      if (!isLadiesMode && c.gender !== "female") return false;
      if (c.distance > filters.maxDistance) return false;
      if (c.rating < filters.minRating) return false;
      if (filters.verifiedOnly && !c.verified) return false;
      if (filters.status !== "all" && c.availabilityStatus !== filters.status) return false;
      if (c.rate > filters.maxRate) return false;
      return true;
    });
  }, [filters]);

  const addMatch = useCallback((companion: Companion, type: Match["connectionType"] = "standard") => {
    setMatches((prev) => {
      if (prev.some((m) => m.companion.id === companion.id)) return prev;
      const newMatch: Match = {
        id: Date.now().toString(),
        companion,
        lastMessage: type === "paidDm" ? "Paid DM sent" : "Connection requested",
        lastMessageTime: new Date(),
        unread: 1,
        connectionType: type,
      };
      const updated = [newMatch, ...prev];
      saveMatches(updated);
      return updated;
    });
  }, []);

  const sendMessage = useCallback((matchId: string, text: string) => {
    const msg: Message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      matchId,
      text,
      fromMe: true,
      time: new Date(),
    };
    setMessages((prev) => {
      const updated = { ...prev, [matchId]: [...(prev[matchId] ?? []), msg] };
      saveMessages(updated);
      return updated;
    });
    setMatches((prev) => {
      const updated = prev.map((m) =>
        m.id === matchId
          ? { ...m, lastMessage: text, lastMessageTime: new Date(), unread: 0 }
          : m
      );
      saveMatches(updated);
      return updated;
    });

    setTimeout(() => {
      const replies = [
        "Tonight sounds perfect ✨",
        "I'm available from 9pm",
        "Let's meet at the venue",
        "I'll send you my location",
        "Looking forward to it",
        "My rate is confirmed, see you then",
      ];
      const reply: Message = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        matchId,
        text: replies[Math.floor(Math.random() * replies.length)],
        fromMe: false,
        time: new Date(),
      };
      setMessages((prev) => {
        const updated = { ...prev, [matchId]: [...(prev[matchId] ?? []), reply] };
        saveMessages(updated);
        return updated;
      });
      setMatches((prev) => {
        const updated = prev.map((m) =>
          m.id === matchId
            ? { ...m, lastMessage: reply.text, lastMessageTime: new Date(), unread: 1 }
            : m
        );
        saveMatches(updated);
        return updated;
      });
    }, 1500 + Math.random() * 2000);
  }, []);

  const toggleAvailability = useCallback(() => {
    setUserProfile((prev) => {
      const updated = { ...prev, availableTonight: !prev.availableTonight };
      AsyncStorage.setItem("userProfile", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setUserProfile((prev) => {
      const updated = { ...prev, ...updates };
      AsyncStorage.setItem("userProfile", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateFilters = useCallback((updates: Partial<Filters>) => {
    setFilters((prev) => {
      const updated = { ...prev, ...updates };
      AsyncStorage.setItem("filters", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    AsyncStorage.removeItem("filters");
  }, []);

  const likeCompanion = useCallback((id: string) => {
    setLikedIds((prev) => {
      const updated = new Set(prev);
      updated.add(id);
      AsyncStorage.setItem("likedIds", JSON.stringify([...updated]));
      return updated;
    });
  }, []);

  const passCompanion = useCallback((id: string) => {
    setPassedIds((prev) => {
      const updated = new Set(prev);
      updated.add(id);
      AsyncStorage.setItem("passedIds", JSON.stringify([...updated]));
      return updated;
    });
  }, []);

  const walletCredit = useCallback((amount: number) => {
    setUserProfile((prev) => {
      const updated = {
        ...prev,
        totalEarnings: prev.totalEarnings + amount,
        pendingPayout: prev.pendingPayout + amount,
      };
      AsyncStorage.setItem("userProfile", JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AppContext.Provider
      value={{
        companions: COMPANIONS,
        filteredCompanions,
        matches,
        messages,
        userProfile,
        filters,
        addMatch,
        sendMessage,
        toggleAvailability,
        updateProfile,
        updateFilters,
        resetFilters,
        likedIds,
        passedIds,
        likeCompanion,
        passCompanion,
        walletCredit,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

export function formatUGX(amount: number): string {
  return `UGX ${amount.toLocaleString()}`;
}

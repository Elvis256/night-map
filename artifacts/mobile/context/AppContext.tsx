import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface Companion {
  id: string;
  name: string;
  age: number;
  photoIndex: number;
  vibes: string[];
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
}

export interface Match {
  id: string;
  companion: Companion;
  lastMessage: string;
  lastMessageTime: Date;
  unread: number;
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
  availableTonight: boolean;
  verified: boolean;
  city: string;
}

const KAMPALA_LAT = 0.3136;
const KAMPALA_LNG = 32.5811;

export const COMPANIONS: Companion[] = [
  {
    id: "1",
    name: "Amara",
    age: 24,
    photoIndex: 0,
    vibes: ["Dinner Date", "Events", "Travel"],
    trustScore: 97,
    rating: 4.9,
    verified: true,
    online: true,
    city: "Kampala",
    distance: 1.2,
    bio: "Sophisticated and adventurous. Love great food, rooftop views, and genuine conversation.",
    lat: KAMPALA_LAT + 0.008,
    lng: KAMPALA_LNG + 0.012,
    color: "#c2185b",
  },
  {
    id: "2",
    name: "Leila",
    age: 27,
    photoIndex: 1,
    vibes: ["Nightlife", "Dancing", "VIP Access"],
    trustScore: 94,
    rating: 4.8,
    verified: true,
    online: true,
    city: "Kampala",
    distance: 2.1,
    bio: "I know every hidden gem in the city. Let me show you a night you won't forget.",
    lat: KAMPALA_LAT - 0.005,
    lng: KAMPALA_LNG + 0.018,
    color: "#7b1fa2",
  },
  {
    id: "3",
    name: "Zara",
    age: 25,
    photoIndex: 2,
    vibes: ["Fine Dining", "Art", "Culture"],
    trustScore: 98,
    rating: 5.0,
    verified: true,
    online: true,
    city: "Kampala",
    distance: 0.8,
    bio: "Art curator by day, nightlife curator by night. Refined taste, zero judgment.",
    lat: KAMPALA_LAT + 0.014,
    lng: KAMPALA_LNG - 0.007,
    color: "#00695c",
  },
  {
    id: "4",
    name: "Nadine",
    age: 29,
    photoIndex: 0,
    vibes: ["Business", "Hotels", "Confidential"],
    trustScore: 92,
    rating: 4.7,
    verified: true,
    online: false,
    city: "Kampala",
    distance: 3.4,
    bio: "Discreet, professional, and charming. Perfect for business events or private evenings.",
    lat: KAMPALA_LAT - 0.011,
    lng: KAMPALA_LNG - 0.009,
    color: "#1565c0",
  },
  {
    id: "5",
    name: "Fatoumata",
    age: 26,
    photoIndex: 1,
    vibes: ["Music", "Clubs", "Energy"],
    trustScore: 95,
    rating: 4.9,
    verified: true,
    online: true,
    city: "Kampala",
    distance: 1.7,
    bio: "Life is a party and I know the best ones. Join me for an unforgettable night out.",
    lat: KAMPALA_LAT + 0.003,
    lng: KAMPALA_LNG + 0.022,
    color: "#e65100",
  },
  {
    id: "6",
    name: "Priya",
    age: 23,
    photoIndex: 2,
    vibes: ["Luxury", "Spa Days", "Shopping"],
    trustScore: 96,
    rating: 4.8,
    verified: true,
    online: false,
    city: "Kampala",
    distance: 4.1,
    bio: "Your perfect day-to-night companion. From afternoon adventures to evening glamour.",
    lat: KAMPALA_LAT - 0.018,
    lng: KAMPALA_LNG + 0.004,
    color: "#880e4f",
  },
];

const INITIAL_MESSAGES: Record<string, Message[]> = {};

interface AppContextType {
  companions: Companion[];
  matches: Match[];
  messages: Record<string, Message[]>;
  userProfile: UserProfile;
  addMatch: (companion: Companion) => void;
  sendMessage: (matchId: string, text: string) => void;
  toggleAvailability: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  likedIds: Set<string>;
  passedIds: Set<string>;
  likeCompanion: (id: string) => void;
  passCompanion: (id: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

const DEFAULT_PROFILE: UserProfile = {
  name: "You",
  isCompanion: false,
  availableTonight: false,
  verified: false,
  city: "Kampala",
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [messages, setMessages] =
    useState<Record<string, Message[]>>(INITIAL_MESSAGES);
  const [userProfile, setUserProfile] =
    useState<UserProfile>(DEFAULT_PROFILE);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [passedIds, setPassedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [storedMatches, storedMessages, storedProfile, storedLiked, storedPassed] =
        await Promise.all([
          AsyncStorage.getItem("matches"),
          AsyncStorage.getItem("messages"),
          AsyncStorage.getItem("userProfile"),
          AsyncStorage.getItem("likedIds"),
          AsyncStorage.getItem("passedIds"),
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
    } catch (_) {}
  };

  const saveMatches = async (newMatches: Match[]) => {
    await AsyncStorage.setItem("matches", JSON.stringify(newMatches));
  };

  const saveMessages = async (newMessages: Record<string, Message[]>) => {
    await AsyncStorage.setItem("messages", JSON.stringify(newMessages));
  };

  const addMatch = useCallback((companion: Companion) => {
    setMatches((prev) => {
      if (prev.some((m) => m.companion.id === companion.id)) return prev;
      const newMatch: Match = {
        id: Date.now().toString(),
        companion,
        lastMessage: "Say hello tonight",
        lastMessageTime: new Date(),
        unread: 0,
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
        "Tonight sounds perfect",
        "I'm available from 9pm",
        "Let's meet at the venue",
        "I'll send you my location",
        "Looking forward to it",
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

  const likeCompanion = useCallback((id: string) => {
    setLikedIds((prev) => {
      const updated = new Set(prev);
      updated.add(id);
      AsyncStorage.setItem("likedIds", JSON.stringify([...updated]));
      return updated;
    });
    const companion = COMPANIONS.find((c) => c.id === id);
    if (companion) addMatch(companion);
  }, [addMatch]);

  const passCompanion = useCallback((id: string) => {
    setPassedIds((prev) => {
      const updated = new Set(prev);
      updated.add(id);
      AsyncStorage.setItem("passedIds", JSON.stringify([...updated]));
      return updated;
    });
  }, []);

  return (
    <AppContext.Provider
      value={{
        companions: COMPANIONS,
        matches,
        messages,
        userProfile,
        addMatch,
        sendMessage,
        toggleAvailability,
        updateProfile,
        likedIds,
        passedIds,
        likeCompanion,
        passCompanion,
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

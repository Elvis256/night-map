import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp, COMPANIONS } from "@/context/AppContext";

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Kampala:         { lat:  0.3476, lng: 32.5825 },
  Entebbe:         { lat:  0.0512, lng: 32.4637 },
  Mbarara:         { lat: -0.6073, lng: 30.6573 },
  Gulu:            { lat:  2.7748, lng: 32.2991 },
  Jinja:           { lat:  0.4478, lng: 33.2026 },
  Nairobi:         { lat: -1.2921, lng: 36.8219 },
  "Dar es Salaam": { lat: -6.7924, lng: 39.2083 },
  Dubai:           { lat: 25.2048, lng: 55.2708 },
};

const CITY_REGION: Record<string, string> = {
  Kampala: "Uganda", Entebbe: "Uganda", Mbarara: "Uganda",
  Gulu: "Uganda", Jinja: "Uganda",
  Nairobi: "Kenya",
  "Dar es Salaam": "Tanzania",
  Dubai: "International",
  "All Cities": "All Cities",
};

function haversineDist(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestCity(lat: number, lng: number): string {
  let best = "Kampala";
  let bestDist = Infinity;
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    const dist = haversineDist(lat, lng, coords.lat, coords.lng);
    if (dist < bestDist) { bestDist = dist; best = city; }
  }
  return best;
}

function cityCoord(city: string): { lat: number; lng: number } {
  return CITY_COORDS[city] ?? CITY_COORDS["Kampala"];
}

const LOUNGES = [
  {
    id: "kla1",
    name: "Kampala After Dark",
    city: "Kampala",
    cityLabel: "Kampala 🇺🇬",
    topic: "Weekend Vibes",
    desc: "Talking best spots, tonight's deals, and meet-up plans",
    listeners: 47,
    isLive: true,
    isFeatured: true,
    color: "#FF4E62",
    hostInitials: ["D", "A", "Z"],
    hostColors: ["#7A3CFF", "#FF4E62", "#1FBF6B"],
  },
  {
    id: "nbi1",
    name: "Nairobi Nights",
    city: "Nairobi",
    cityLabel: "Nairobi 🇰🇪",
    topic: "Travel & Meet",
    desc: "City connections, hidden gems, and travel companion stories",
    listeners: 31,
    isLive: true,
    isFeatured: false,
    color: "#3DA9FF",
    hostInitials: ["N", "F"],
    hostColors: ["#FF8A3D", "#7A3CFF"],
  },
  {
    id: "dar1",
    name: "Dar Beach Vibes",
    city: "Dar es Salaam",
    cityLabel: "Dar es Salaam 🇹🇿",
    topic: "Coastal Evenings",
    desc: "Beach nights, ocean dining, and East African coast culture",
    listeners: 22,
    isLive: true,
    isFeatured: false,
    color: "#1FBF6B",
    hostInitials: ["L", "P"],
    hostColors: ["#FF4E62", "#3DA9FF"],
  },
  {
    id: "mba1",
    name: "Mbarara Chill",
    city: "Mbarara",
    cityLabel: "Mbarara 🇺🇬",
    topic: "Southwestern Evenings",
    desc: "Laid-back connections, local spots, and weekend plans",
    listeners: 15,
    isLive: true,
    isFeatured: false,
    color: "#FF8A3D",
    hostInitials: ["T", "B"],
    hostColors: ["#FF4E62", "#1FBF6B"],
  },
  {
    id: "match1",
    name: "Matchmaker's Corner",
    city: "All Cities",
    cityLabel: "All Cities",
    topic: "Introductions & Stories",
    desc: "Real connection stories, tips for first meetings, and date ideas",
    listeners: 68,
    isLive: true,
    isFeatured: false,
    color: "#FF8A3D",
    hostInitials: ["A", "Z", "N", "F"],
    hostColors: ["#7A3CFF", "#FF4E62", "#1FBF6B", "#3DA9FF"],
  },
  {
    id: "travel1",
    name: "Dubai Connections",
    city: "Dubai",
    cityLabel: "Dubai 🇦🇪",
    topic: "EA Diaspora Meetups",
    desc: "East Africans in Dubai — experiences, travel companions, city guide",
    listeners: 19,
    isLive: false,
    isFeatured: false,
    color: "#7A3CFF",
    hostInitials: ["Z", "L"],
    hostColors: ["#FF8A3D", "#FF4E62"],
  },
  {
    id: "safe1",
    name: "Safety Circle",
    city: "All Cities",
    cityLabel: "All Cities",
    topic: "Community Safety Talk",
    desc: "Best practices, trusted venues, vetting tips — a safe space",
    listeners: 14,
    isLive: false,
    isFeatured: false,
    color: "#22c55e",
    hostInitials: ["A"],
    hostColors: ["#1FBF6B"],
  },
];

const LIVE_STREAMERS = [
  { companionId: "1", title: "Morning yoga & chat ☀️", viewers: 234, ppv: 0, isPremium: false },
  { companionId: "3", title: "Get ready with me 💄", viewers: 189, ppv: 5000, isPremium: true },
  { companionId: "5", title: "Club night preparations 🎶", viewers: 312, ppv: 0, isPremium: false },
  { companionId: "2", title: "Q&A — ask me anything ✨", viewers: 97, ppv: 3000, isPremium: true },
];

function PulsingDot({ color }: { color: string }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.5, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <View style={{ width: 10, height: 10, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, transform: [{ scale: pulse }], opacity: 0.5, position: "absolute" }} />
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
    </View>
  );
}

function ListenerAvatars({ initials, colors: avatarColors }: { initials: string[]; colors: string[] }) {
  return (
    <View style={styles.avatarStack}>
      {initials.slice(0, 4).map((init, i) => (
        <View
          key={i}
          style={[
            styles.listenerAvatar,
            { backgroundColor: avatarColors[i % avatarColors.length], marginLeft: i > 0 ? -8 : 0, zIndex: initials.length - i },
          ]}
        >
          <Text style={styles.listenerInitial}>{init}</Text>
        </View>
      ))}
      {initials.length > 4 && (
        <View style={[styles.listenerAvatar, { backgroundColor: "rgba(170,179,197,0.2)", marginLeft: -8 }]}>
          <Text style={[styles.listenerInitial, { fontSize: 9 }]}>+{initials.length - 4}</Text>
        </View>
      )}
    </View>
  );
}

type Lounge = typeof LOUNGES[number];

function FeaturedLounge({ lounge, onJoin, isNearby }: { lounge: Lounge; onJoin: () => void; isNearby: boolean }) {
  const colors = useColors();
  return (
    <View style={[styles.featured, { backgroundColor: colors.card, borderColor: lounge.color }]}>
      <View style={[styles.featuredGlow, { backgroundColor: `${lounge.color}15` }]} />
      <View style={styles.featuredTop}>
        <View style={styles.featuredBadges}>
          <View style={[styles.livePill, { backgroundColor: `${lounge.color}20`, borderColor: `${lounge.color}50` }]}>
            <PulsingDot color={lounge.color} />
            <Text style={[styles.livePillText, { color: lounge.color }]}>LIVE</Text>
          </View>
          <View style={[styles.cityPill, { backgroundColor: colors.muted }]}>
            <Text style={[styles.cityPillText, { color: colors.mutedForeground }]}>{lounge.cityLabel}</Text>
          </View>
          {isNearby && (
            <View style={[styles.nearbyPill, { backgroundColor: "rgba(31,191,107,0.15)", borderColor: "rgba(31,191,107,0.4)" }]}>
              <Ionicons name="location" size={10} color="#1FBF6B" />
              <Text style={[styles.nearbyPillText, { color: "#1FBF6B" }]}>Nearby</Text>
            </View>
          )}
        </View>
        <View style={[styles.featuredListeners, { backgroundColor: "rgba(0,0,0,0.4)" }]}>
          <Ionicons name="headset" size={12} color={colors.mutedForeground} />
          <Text style={[styles.featuredListenersText, { color: colors.mutedForeground }]}>{lounge.listeners}</Text>
        </View>
      </View>

      <Text style={[styles.featuredName, { color: colors.foreground }]}>{lounge.name}</Text>
      <Text style={[styles.featuredTopic, { color: lounge.color }]}>🎙 {lounge.topic}</Text>
      <Text style={[styles.featuredDesc, { color: colors.mutedForeground }]}>{lounge.desc}</Text>

      <View style={styles.featuredBottom}>
        <View style={styles.featuredLeft}>
          <ListenerAvatars initials={lounge.hostInitials} colors={lounge.hostColors} />
          <Text style={[styles.featuredWith, { color: colors.mutedForeground }]}>with {lounge.listeners} listening</Text>
        </View>
        <TouchableOpacity style={[styles.joinBtn, { backgroundColor: lounge.color }]} onPress={onJoin}>
          <Ionicons name="mic" size={14} color="#fff" />
          <Text style={styles.joinBtnText}>Join Live</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function LoungeRow({ lounge, onJoin, isNearby }: { lounge: Lounge; onJoin: () => void; isNearby: boolean }) {
  const colors = useColors();
  return (
    <View style={[styles.loungeRow, { backgroundColor: colors.card, borderColor: isNearby ? `${lounge.color}50` : colors.border }]}>
      <View style={[styles.loungeAccent, { backgroundColor: lounge.color }]} />
      <View style={styles.loungeInfo}>
        <View style={styles.loungeTopRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
            <Text style={[styles.loungeName, { color: colors.foreground }]} numberOfLines={1}>{lounge.name}</Text>
            {isNearby && <Ionicons name="location" size={11} color="#1FBF6B" />}
          </View>
          {lounge.isLive ? (
            <View style={styles.liveSmall}>
              <PulsingDot color={lounge.color} />
              <Text style={[styles.liveSmallText, { color: lounge.color }]}>LIVE</Text>
            </View>
          ) : (
            <Text style={[styles.upcomingText, { color: colors.mutedForeground }]}>Upcoming</Text>
          )}
        </View>
        <Text style={[styles.loungeTopic, { color: colors.accent }]}>🎙 {lounge.topic}</Text>
        <View style={styles.loungeMetaRow}>
          <ListenerAvatars initials={lounge.hostInitials} colors={lounge.hostColors} />
          <Text style={[styles.loungeListeners, { color: colors.mutedForeground }]}>
            {lounge.listeners} listening · {lounge.cityLabel}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[
          styles.joinSmall,
          {
            backgroundColor: lounge.isLive ? `${lounge.color}18` : colors.muted,
            borderColor: lounge.isLive ? `${lounge.color}50` : colors.border,
          },
        ]}
        onPress={onJoin}
      >
        <Ionicons name={lounge.isLive ? "mic" : "notifications-outline"} size={14} color={lounge.isLive ? lounge.color : colors.mutedForeground} />
        <Text style={[styles.joinSmallText, { color: lounge.isLive ? lounge.color : colors.mutedForeground }]}>
          {lounge.isLive ? "Join" : "Remind"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function LiveStreamerCard({ streamer, onWatch }: { streamer: typeof LIVE_STREAMERS[number]; onWatch: () => void }) {
  const colors = useColors();
  const companion = COMPANIONS.find(c => c.id === streamer.companionId);
  if (!companion) return null;
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <TouchableOpacity style={[styles.streamerCard, { backgroundColor: colors.card, borderColor: `${companion.color}60` }]} onPress={onWatch} activeOpacity={0.85}>
      <Animated.View style={[styles.streamerAvatar, { backgroundColor: companion.color, borderColor: "#FF4E62", transform: [{ scale: pulse }] }]}>
        <Text style={styles.streamerInitial}>{companion.name[0]}</Text>
        <View style={styles.streamerLiveBadge}>
          <Text style={styles.streamerLiveBadgeText}>LIVE</Text>
        </View>
      </Animated.View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={[styles.streamerName, { color: colors.foreground }]}>{companion.name}</Text>
          {companion.verified && <Ionicons name="checkmark-circle" size={13} color="#3DA9FF" />}
          {streamer.isPremium && (
            <View style={[styles.ppvBadge, { backgroundColor: "rgba(255,138,61,0.15)", borderColor: "rgba(255,138,61,0.4)" }]}>
              <Text style={[styles.ppvBadgeText, { color: "#FF8A3D" }]}>PPV</Text>
            </View>
          )}
        </View>
        <Text style={[styles.streamerTitle, { color: colors.mutedForeground }]} numberOfLines={1}>{streamer.title}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="eye" size={12} color={colors.mutedForeground} />
            <Text style={[styles.streamerMeta, { color: colors.mutedForeground }]}>{streamer.viewers.toLocaleString()}</Text>
          </View>
          <Text style={[styles.streamerMeta, { color: colors.mutedForeground }]}>·</Text>
          <Text style={[styles.streamerMeta, { color: colors.mutedForeground }]}>{companion.city}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.watchBtn, { backgroundColor: streamer.ppv > 0 ? "rgba(255,138,61,0.15)" : "rgba(255,78,98,0.15)", borderColor: streamer.ppv > 0 ? "rgba(255,138,61,0.5)" : "rgba(255,78,98,0.5)" }]}
        onPress={onWatch}
      >
        <Ionicons name="play" size={12} color={streamer.ppv > 0 ? "#FF8A3D" : "#FF4E62"} />
        <Text style={[styles.watchBtnText, { color: streamer.ppv > 0 ? "#FF8A3D" : "#FF4E62" }]}>
          {streamer.ppv > 0 ? `${(streamer.ppv / 1000).toFixed(0)}k` : "Watch"}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function RadioScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userCity, setUserCity } = useApp();
  const [joined, setJoined] = useState<string | null>(null);
  const [detectedCity, setDetectedCity] = useState<string>(userCity || "");

  useEffect(() => {
    if (userCity) {
      setDetectedCity(userCity);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted" || cancelled) return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled) {
          const city = nearestCity(pos.coords.latitude, pos.coords.longitude);
          setDetectedCity(city);
          setUserCity(city);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [userCity]);

  const sortedLounges = [...LOUNGES].sort((a, b) => {
    if (!detectedCity) return 0;
    const userCoord = cityCoord(detectedCity);
    const cityA = a.city === "All Cities" ? detectedCity : a.city;
    const cityB = b.city === "All Cities" ? detectedCity : b.city;
    const coordA = cityCoord(cityA);
    const coordB = cityCoord(cityB);
    const distA = haversineDist(userCoord.lat, userCoord.lng, coordA.lat, coordA.lng);
    const distB = haversineDist(userCoord.lat, userCoord.lng, coordB.lat, coordB.lng);
    return distA - distB;
  });

  const NEARBY_THRESHOLD_KM = 200;
  const userCoord = detectedCity ? cityCoord(detectedCity) : null;

  function isNearby(lounge: Lounge): boolean {
    if (!userCoord || lounge.city === "All Cities") return false;
    const coord = cityCoord(lounge.city);
    return haversineDist(userCoord.lat, userCoord.lng, coord.lat, coord.lng) < NEARBY_THRESHOLD_KM;
  }

  const nearbyLounges = sortedLounges.filter(l => l.city !== "All Cities" && isNearby(l));
  const otherLounges = sortedLounges.filter(l => !isNearby(l));
  const featured = nearbyLounges[0] ?? sortedLounges[0];

  const handleJoin = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setJoined(id);
  };

  const handleWatch = (companionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/live", params: { mode: "watch", companionId } });
  };

  const totalListeners = LOUNGES.filter(l => l.isLive).reduce((s, l) => s + l.listeners, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>NightMap Radio</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {detectedCity ? `Near ${detectedCity}` : "Anonymous audio lounges by city"}
          </Text>
        </View>
        <View style={[styles.headerLive, { backgroundColor: "rgba(255,78,98,0.12)" }]}>
          <PulsingDot color="#FF4E62" />
          <Text style={[styles.headerLiveText, { color: colors.primary }]}>
            {totalListeners} online
          </Text>
        </View>
      </View>

      {joined && (
        <View style={[styles.nowPlaying, { backgroundColor: `${LOUNGES.find(l => l.id === joined)?.color ?? "#FF4E62"}18`, borderColor: `${LOUNGES.find(l => l.id === joined)?.color ?? "#FF4E62"}40` }]}>
          <Ionicons name="radio" size={16} color={LOUNGES.find(l => l.id === joined)?.color ?? "#FF4E62"} />
          <Text style={[styles.nowPlayingText, { color: LOUNGES.find(l => l.id === joined)?.color ?? "#FF4E62" }]}>
            Now in: {LOUNGES.find(l => l.id === joined)?.name}
          </Text>
          <TouchableOpacity onPress={() => setJoined(null)} style={styles.leaveBtn}>
            <Text style={[styles.leaveBtnText, { color: colors.mutedForeground }]}>Leave</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20 }]}
      >
        {/* ── LIVE STREAMS ──────────────────────────────── */}
        <View style={styles.sectionRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <PulsingDot color="#FF4E62" />
            <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: 0, marginBottom: 0 }]}>LIVE STREAMS</Text>
          </View>
          <TouchableOpacity onPress={() => router.push({ pathname: "/live", params: { mode: "browse" } })}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.streamersList}>
          {LIVE_STREAMERS.map(s => (
            <LiveStreamerCard key={s.companionId} streamer={s} onWatch={() => handleWatch(s.companionId)} />
          ))}
        </View>

        {/* ── NEARBY LOUNGES ───────────────────────────── */}
        {nearbyLounges.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="location" size={13} color="#1FBF6B" />
                <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: 0, marginBottom: 0 }]}>NEARBY</Text>
              </View>
              <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>{detectedCity}</Text>
            </View>
            <FeaturedLounge lounge={featured} onJoin={() => handleJoin(featured.id)} isNearby={true} />
            {nearbyLounges.slice(1).map(lounge => (
              <LoungeRow key={lounge.id} lounge={lounge} onJoin={() => handleJoin(lounge.id)} isNearby={true} />
            ))}
          </>
        )}

        {/* ── OTHER CITIES ─────────────────────────────── */}
        {otherLounges.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="globe-outline" size={13} color={colors.mutedForeground} />
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 0, marginBottom: 0 }]}>
                  {nearbyLounges.length > 0 ? "OTHER CITIES" : "ALL LOUNGES"}
                </Text>
              </View>
            </View>
            {nearbyLounges.length === 0 && (
              <FeaturedLounge lounge={featured} onJoin={() => handleJoin(featured.id)} isNearby={false} />
            )}
            {(nearbyLounges.length > 0 ? otherLounges : otherLounges.slice(1)).map(lounge => (
              <LoungeRow key={lounge.id} lounge={lounge} onJoin={() => handleJoin(lounge.id)} isNearby={false} />
            ))}
          </>
        )}

        {/* ── START YOUR OWN LOUNGE ────────────────────── */}
        <View style={[styles.createCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="add-circle-outline" size={28} color={colors.mutedForeground} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.createTitle, { color: colors.foreground }]}>Start Your Own Lounge</Text>
            <Text style={[styles.createSub, { color: colors.mutedForeground }]}>City-based · Anonymous · Up to 50 listeners</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 20 },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 12 },
  headerLive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  headerLiveText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  nowPlaying: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  nowPlayingText: { fontFamily: "Inter_600SemiBold", fontSize: 13, flex: 1 },
  leaveBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  leaveBtnText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  scroll: { paddingHorizontal: 16, gap: 10 },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 4,
  },
  sectionLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 1,
  },
  sectionSub: { fontFamily: "Inter_400Regular", fontSize: 11 },
  seeAll: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  streamersList: { gap: 8 },
  streamerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  streamerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    position: "relative",
  },
  streamerInitial: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 20 },
  streamerLiveBadge: {
    position: "absolute",
    bottom: -6,
    left: "50%",
    transform: [{ translateX: -16 }],
    backgroundColor: "#FF4E62",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    width: 32,
    alignItems: "center",
  },
  streamerLiveBadgeText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 8 },
  streamerName: { fontFamily: "Inter_700Bold", fontSize: 14 },
  streamerTitle: { fontFamily: "Inter_400Regular", fontSize: 12 },
  streamerMeta: { fontFamily: "Inter_400Regular", fontSize: 11 },
  ppvBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  ppvBadgeText: { fontFamily: "Inter_700Bold", fontSize: 9 },
  watchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  watchBtnText: { fontFamily: "Inter_700Bold", fontSize: 12 },
  nearbyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  nearbyPillText: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
  featured: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 18,
    gap: 8,
    overflow: "hidden",
    position: "relative",
  },
  featuredGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  featuredTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  featuredBadges: { flexDirection: "row", gap: 6, alignItems: "center", flexWrap: "wrap" },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  livePillText: { fontFamily: "Inter_700Bold", fontSize: 11 },
  cityPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  cityPillText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  featuredListeners: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  featuredListenersText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  featuredName: { fontFamily: "Inter_700Bold", fontSize: 22 },
  featuredTopic: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  featuredDesc: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
  featuredBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  featuredLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  featuredWith: { fontFamily: "Inter_400Regular", fontSize: 12 },
  joinBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  joinBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 },
  loungeRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    gap: 12,
    paddingRight: 12,
    paddingVertical: 12,
  },
  loungeAccent: { width: 4, alignSelf: "stretch", borderRadius: 2, marginRight: 4 },
  loungeInfo: { flex: 1, gap: 4 },
  loungeTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  loungeName: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  liveSmall: { flexDirection: "row", alignItems: "center", gap: 4 },
  liveSmallText: { fontFamily: "Inter_700Bold", fontSize: 10 },
  upcomingText: { fontFamily: "Inter_400Regular", fontSize: 11 },
  loungeTopic: { fontFamily: "Inter_500Medium", fontSize: 13 },
  loungeMetaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  loungeListeners: { fontFamily: "Inter_400Regular", fontSize: 11 },
  joinSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  joinSmallText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  avatarStack: { flexDirection: "row", alignItems: "center" },
  listenerAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.3)",
  },
  listenerInitial: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 9 },
  createCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: 16,
    marginTop: 4,
  },
  createTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  createSub: { fontFamily: "Inter_400Regular", fontSize: 12 },
});

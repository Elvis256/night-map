import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
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

const LOUNGES = [
  {
    id: "kla1",
    name: "Kampala After Dark",
    city: "Kampala 🇺🇬",
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
    city: "Nairobi 🇰🇪",
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
    city: "Dar es Salaam 🇹🇿",
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
    id: "match1",
    name: "Matchmaker's Corner",
    city: "All Cities",
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
    city: "Dubai 🇦🇪",
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

function PulsingDot({ color }: { color: string }) {
  const pulse = useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
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

function FeaturedLounge({ lounge, onJoin }: { lounge: Lounge; onJoin: () => void }) {
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
            <Text style={[styles.cityPillText, { color: colors.mutedForeground }]}>{lounge.city}</Text>
          </View>
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

function LoungeRow({ lounge, onJoin }: { lounge: Lounge; onJoin: () => void }) {
  const colors = useColors();
  return (
    <View style={[styles.loungeRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.loungeAccent, { backgroundColor: lounge.color }]} />
      <View style={styles.loungeInfo}>
        <View style={styles.loungeTopRow}>
          <Text style={[styles.loungeName, { color: colors.foreground }]}>{lounge.name}</Text>
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
            {lounge.listeners} listening · {lounge.city}
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

export default function RadioScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [joined, setJoined] = useState<string | null>(null);
  const featured = LOUNGES[0];
  const rest = LOUNGES.slice(1);

  const handleJoin = (id: string, name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setJoined(id);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>NightMap Radio</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Anonymous audio lounges by city</Text>
        </View>
        <View style={[styles.headerLive, { backgroundColor: "rgba(255,78,98,0.12)" }]}>
          <PulsingDot color="#FF4E62" />
          <Text style={[styles.headerLiveText, { color: colors.primary }]}>
            {LOUNGES.filter(l => l.isLive).reduce((s, l) => s + l.listeners, 0)} online
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
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>FEATURED LOUNGE</Text>
        <FeaturedLounge lounge={featured} onJoin={() => handleJoin(featured.id, featured.name)} />

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ALL LOUNGES</Text>
        {rest.map((lounge) => (
          <LoungeRow key={lounge.id} lounge={lounge} onJoin={() => handleJoin(lounge.id, lounge.name)} />
        ))}

        <View style={[styles.createCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="add-circle-outline" size={28} color={colors.mutedForeground} />
          <View>
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
    marginLeft: "auto",
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
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 4,
    marginBottom: 2,
  },
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
  featuredBadges: { flexDirection: "row", gap: 8, alignItems: "center" },
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
  loungeName: { fontFamily: "Inter_600SemiBold", fontSize: 15, flex: 1 },
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

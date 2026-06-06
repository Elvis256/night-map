import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Image,
  Modal,
  Platform,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { COMPANIONS, Companion, useApp } from "@/context/AppContext";
import { TrustBadge } from "@/components/TrustBadge";

const COMPANION_PHOTOS = [
  require("@/assets/images/companion1.png"),
  require("@/assets/images/companion2.png"),
  require("@/assets/images/companion3.png"),
];

const MOODS = [
  { label: "All", icon: "apps-outline" as const, value: null },
  { label: "Dinner", icon: "restaurant-outline" as const, value: "Dinner Date" },
  { label: "Nightclub", icon: "musical-notes-outline" as const, value: "Nightclub" },
  { label: "Chill", icon: "wine-outline" as const, value: "Conversation & Drinks" },
  { label: "City Tour", icon: "map-outline" as const, value: "City Tour" },
  { label: "Massage", icon: "hand-left-outline" as const, value: "Massage" },
  { label: "Pool", icon: "water-outline" as const, value: "Pool/Swim" },
];

const STORY_COMPANIONS = COMPANIONS.filter((c) => c.availabilityStatus !== "offline").slice(0, 7);

const SWIPE_THRESHOLD = 100;

function StoryCircle({ companion, onPress }: { companion: Companion; onPress: () => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity style={styles.storyWrap} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.storyRing, { borderColor: companion.isTonightsDeal ? colors.accent : colors.primary }]}>
        <View style={[styles.storyAvatar, { backgroundColor: companion.color }]}>
          <Text style={styles.storyInitial}>{companion.name[0]}</Text>
        </View>
      </View>
      {companion.availabilityStatus === "now" && (
        <View style={[styles.storyOnline, { backgroundColor: "#22c55e", borderColor: colors.background }]} />
      )}
      <Text style={[styles.storyName, { color: colors.mutedForeground }]} numberOfLines={1}>
        {companion.name}
      </Text>
    </TouchableOpacity>
  );
}

function StoryViewer({ companion, onClose }: { companion: Companion; onClose: () => void }) {
  const colors = useColors();
  const progressAnim = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(progressAnim, { toValue: 1, duration: 5000, useNativeDriver: false }).start(onClose);
    return () => progressAnim.stopAnimation();
  }, []);
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.storyModal}>
        <View style={[styles.storyContent, { backgroundColor: companion.color }]}>
          <View style={styles.storyProgress}>
            <View style={[styles.storyProgressBg, { backgroundColor: "rgba(255,255,255,0.3)" }]} />
            <Animated.View style={[styles.storyProgressFill, { width: progressWidth, backgroundColor: "#fff" }]} />
          </View>
          <View style={styles.storyHeader}>
            <View style={[styles.storyHeaderAvatar, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
              <Text style={styles.storyHeaderInitial}>{companion.name[0]}</Text>
            </View>
            <View>
              <Text style={styles.storyHeaderName}>{companion.name}</Text>
              <Text style={styles.storyHeaderTime}>Active now · {companion.distance} km away</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.storyClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.storyBody}>
            <Text style={styles.storyEmoji}>🌙</Text>
            <Text style={styles.storyText}>Available tonight from 8pm</Text>
            <Text style={styles.storySubtext}>{companion.city} · {companion.rate.toLocaleString()} UGX/hr</Text>
          </View>
          <TouchableOpacity
            style={styles.storyViewProfile}
            onPress={() => { onClose(); router.push(`/companion/${companion.id}`); }}
          >
            <Text style={styles.storyViewProfileText}>View Profile & Connect →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function SwipeCard({ companion, isTop, onSwipe, onView }: {
  companion: Companion; isTop: boolean; onSwipe: (liked: boolean) => void; onView: () => void;
}) {
  const colors = useColors();
  const pan = useRef(new Animated.ValueXY()).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const likeOpacity = useRef(new Animated.Value(0)).current;
  const passOpacity = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        pan.setValue({ x: gesture.dx, y: gesture.dy * 0.3 });
        rotateAnim.setValue(gesture.dx / 20);
        likeOpacity.setValue(Math.max(0, gesture.dx / 80));
        passOpacity.setValue(Math.max(0, -gesture.dx / 80));
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          Animated.timing(pan, { toValue: { x: 600, y: gesture.dy }, duration: 300, useNativeDriver: true }).start(() => onSwipe(true));
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          Animated.timing(pan, { toValue: { x: -600, y: gesture.dy }, duration: 300, useNativeDriver: true }).start(() => onSwipe(false));
        } else {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true, friction: 8 }).start();
          Animated.spring(rotateAnim, { toValue: 0, useNativeDriver: true }).start();
          likeOpacity.setValue(0);
          passOpacity.setValue(0);
        }
      },
    })
  ).current;

  const rotate = rotateAnim.interpolate({ inputRange: [-20, 0, 20], outputRange: ["-12deg", "0deg", "12deg"] });

  if (!isTop) {
    return (
      <View style={[styles.card, styles.backCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.photoPlaceholder, { backgroundColor: companion.color }]}>
          <Text style={styles.initialBig}>{companion.name[0]}</Text>
        </View>
      </View>
    );
  }

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[styles.card, {
        backgroundColor: colors.card, borderColor: colors.border,
        transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }],
      }]}
    >
      <Pressable onPress={onView} style={styles.cardPressable}>
        <Image source={COMPANION_PHOTOS[companion.photoIndex]} style={styles.photo} resizeMode="cover" />
        <View style={styles.photoOverlay} />
        {companion.isTonightsDeal && (
          <View style={[styles.dealTag, { backgroundColor: colors.accent }]}>
            <Ionicons name="flash" size={10} color="#fff" />
            <Text style={styles.dealTagText}>{companion.dealDiscount}% Tonight</Text>
          </View>
        )}
        <Animated.View style={[styles.likeStamp, { opacity: likeOpacity }]}>
          <Text style={styles.likeStampText}>CONNECT</Text>
        </Animated.View>
        <Animated.View style={[styles.passStamp, { opacity: passOpacity }]}>
          <Text style={styles.passStampText}>PASS</Text>
        </Animated.View>
        <View style={styles.cardInfo}>
          <View style={styles.cardNameRow}>
            <Text style={styles.cardName}>{companion.name}, {companion.age}</Text>
            {companion.verified && <Ionicons name="checkmark-circle" size={18} color="#FF4E62" />}
            {companion.isHotStreak && <Ionicons name="flame" size={16} color="#FF8A3D" />}
          </View>
          <View style={styles.cardMeta}>
            <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.7)" />
            <Text style={styles.cardMetaText}>{companion.distance} km · {companion.city}</Text>
          </View>
          <View style={styles.cardVibes}>
            {companion.vibes.map((v) => (
              <View key={v} style={styles.vibeChip}>
                <Text style={styles.vibeChipText}>{v}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.cardBio} numberOfLines={2}>{companion.bio}</Text>
          <View style={styles.cardBottom}>
            <TrustBadge score={companion.trustScore} size="sm" />
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color="#FF8A3D" />
              <Text style={styles.ratingText}>{companion.rating.toFixed(1)}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function DiscoverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { companions, likeCompanion, passCompanion, likedIds, passedIds } = useApp();
  const [mood, setMood] = useState<string | null>(null);
  const [storyCompanion, setStoryCompanion] = useState<Companion | null>(null);

  const filtered = companions.filter((c) => {
    if (likedIds.has(c.id) || passedIds.has(c.id)) return false;
    if (mood && !c.menu.includes(mood) && !c.vibes.includes(mood)) return false;
    return true;
  });

  const [queue, setQueue] = useState<Companion[]>(filtered);

  const handleSwipe = (liked: boolean) => {
    if (queue.length === 0) return;
    const top = queue[0];
    if (liked) likeCompanion(top.id);
    else passCompanion(top.id);
    setQueue((prev) => prev.slice(1));
  };

  const handleMoodChange = (value: string | null) => {
    setMood(value);
    const newFiltered = companions.filter((c) => {
      if (likedIds.has(c.id) || passedIds.has(c.id)) return false;
      if (value && !c.menu.includes(value) && !c.vibes.includes(value)) return false;
      return true;
    });
    setQueue(newFiltered);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Discover</Text>
        <View style={[styles.headerBadge, { backgroundColor: "rgba(255,78,98,0.12)" }]}>
          <View style={[styles.liveIndicator, { backgroundColor: colors.primary }]} />
          <Text style={[styles.headerBadgeText, { color: colors.primary }]}>{companions.filter(c => c.availabilityStatus === "now").length} online</Text>
        </View>
      </View>

      {/* Stories strip */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesRow}>
        {STORY_COMPANIONS.map((c) => (
          <StoryCircle key={c.id} companion={c} onPress={() => setStoryCompanion(c)} />
        ))}
      </ScrollView>

      {/* Mood selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moodsRow}>
        {MOODS.map((m) => (
          <TouchableOpacity
            key={m.label}
            style={[
              styles.moodChip,
              {
                backgroundColor: mood === m.value ? "rgba(255,78,98,0.15)" : colors.card,
                borderColor: mood === m.value ? colors.primary : colors.border,
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleMoodChange(m.value);
            }}
          >
            <Ionicons name={m.icon} size={13} color={mood === m.value ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.moodText, { color: mood === m.value ? colors.primary : colors.mutedForeground }]}>
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Card stack */}
      <View style={styles.cardStack}>
        {queue.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="heart-dislike-outline" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {mood ? `No one for "${MOODS.find(m => m.value === mood)?.label}"` : "You've seen everyone"}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              {mood ? "Try a different mood filter" : "Check back tonight for new companions"}
            </Text>
            {mood && (
              <TouchableOpacity
                style={[styles.resetMood, { backgroundColor: colors.primary }]}
                onPress={() => handleMoodChange(null)}
              >
                <Text style={styles.resetMoodText}>Show All</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            {queue.length > 1 && (
              <SwipeCard key={queue[1].id + "_back"} companion={queue[1]} isTop={false} onSwipe={() => {}} onView={() => {}} />
            )}
            <SwipeCard
              key={queue[0].id}
              companion={queue[0]}
              isTop={true}
              onSwipe={handleSwipe}
              onView={() => router.push(`/companion/${queue[0].id}`)}
            />
          </>
        )}
      </View>

      {/* Action buttons */}
      {queue.length > 0 && (
        <View style={[styles.actions, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 12 }]}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.passBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => handleSwipe(false)}
          >
            <Ionicons name="close" size={26} color="#FF4E62" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.superBtn, { backgroundColor: "rgba(255,138,61,0.15)", borderColor: colors.accent }]}
            onPress={() => router.push(`/companion/${queue[0].id}`)}
          >
            <Ionicons name="star" size={20} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.likeBtn, { backgroundColor: "rgba(255,78,98,0.15)", borderColor: colors.primary }]}
            onPress={() => handleSwipe(true)}
          >
            <Ionicons name="heart" size={26} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {storyCompanion && (
        <StoryViewer companion={storyCompanion} onClose={() => setStoryCompanion(null)} />
      )}
    </View>
  );
}

const CARD_HEIGHT = 360;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 26 },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  liveIndicator: { width: 6, height: 6, borderRadius: 3 },
  headerBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  storiesRow: { paddingHorizontal: 14, paddingBottom: 10, gap: 12 },
  storyWrap: { alignItems: "center", gap: 4, width: 60 },
  storyRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  storyAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  storyInitial: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 18 },
  storyOnline: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
  },
  storyName: { fontFamily: "Inter_400Regular", fontSize: 10, textAlign: "center" },
  storyModal: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" },
  storyContent: {
    width: "90%",
    maxWidth: 380,
    height: 560,
    borderRadius: 24,
    overflow: "hidden",
    padding: 20,
  },
  storyProgress: { height: 3, borderRadius: 2, marginBottom: 16, position: "relative" },
  storyProgressBg: { ...StyleSheet.absoluteFillObject, borderRadius: 2 },
  storyProgressFill: { height: 3, borderRadius: 2, position: "absolute", top: 0, left: 0 },
  storyHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  storyHeaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  storyHeaderInitial: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
  storyHeaderName: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
  storyHeaderTime: { color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular", fontSize: 12 },
  storyClose: { marginLeft: "auto" },
  storyBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  storyEmoji: { fontSize: 52 },
  storyText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 20, textAlign: "center" },
  storySubtext: { color: "rgba(255,255,255,0.75)", fontFamily: "Inter_400Regular", fontSize: 14 },
  storyViewProfile: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  storyViewProfileText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 },
  moodsRow: { paddingHorizontal: 14, paddingBottom: 10, gap: 8 },
  moodChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  moodText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  cardStack: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  card: {
    position: "absolute",
    width: "100%",
    maxWidth: 380,
    height: CARD_HEIGHT,
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  backCard: { transform: [{ scale: 0.94 }, { translateY: 12 }], opacity: 0.8, zIndex: 0 },
  cardPressable: { flex: 1 },
  photoPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  initialBig: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 80, opacity: 0.6 },
  photo: { width: "100%", height: "100%", position: "absolute" },
  photoOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: "60%",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  dealTag: {
    position: "absolute",
    top: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  dealTagText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 11 },
  likeStamp: {
    position: "absolute", top: 28, left: 20, borderWidth: 3, borderColor: "#FF4E62",
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, transform: [{ rotate: "-15deg" }],
  },
  likeStampText: { color: "#FF4E62", fontFamily: "Inter_700Bold", fontSize: 20 },
  passStamp: {
    position: "absolute", top: 28, right: 20, borderWidth: 3, borderColor: "#FF4E62",
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, transform: [{ rotate: "15deg" }],
  },
  passStampText: { color: "#FF4E62", fontFamily: "Inter_700Bold", fontSize: 20 },
  cardInfo: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, gap: 6 },
  cardNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardName: { fontFamily: "Inter_700Bold", fontSize: 22, color: "#fff" },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardMetaText: { color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular", fontSize: 12 },
  cardVibes: { flexDirection: "row", gap: 5, flexWrap: "wrap" },
  vibeChip: {
    backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  vibeChipText: { color: "rgba(255,255,255,0.9)", fontSize: 11, fontFamily: "Inter_500Medium" },
  cardBio: { color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17 },
  cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: { color: "#FF8A3D", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  emptyState: {
    width: "100%", maxWidth: 380, height: CARD_HEIGHT, borderRadius: 24, borderWidth: 1,
    alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 32,
  },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 18, textAlign: "center" },
  emptySubtitle: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", lineHeight: 20 },
  resetMood: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 4 },
  resetMoodText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  actions: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 18, paddingTop: 10,
  },
  actionBtn: { alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  passBtn: { width: 58, height: 58, borderRadius: 29 },
  superBtn: { width: 48, height: 48, borderRadius: 24 },
  likeBtn: { width: 58, height: 58, borderRadius: 29 },
});

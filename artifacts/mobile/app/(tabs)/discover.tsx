import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { useColors } from "@workspace/nightmap-design-system/hooks/use-colors";
import { AppStory, Companion, relativeTime, useApp } from "@/context/AppContext";
import { BookingModal } from "@/components/BookingModal";
import { TrustBadge } from "@workspace/nightmap-design-system/components/native/TrustBadge";

const COMPANION_PHOTOS = [
  require("@/assets/images/companion1.png"),
  require("@/assets/images/companion2.png"),
  require("@/assets/images/companion3.png"),
];

function photoSource(companion: Companion) {
  return companion.photoUrl ? { uri: companion.photoUrl } : COMPANION_PHOTOS[companion.photoIndex % 3];
}

const CATEGORIES = [
  {
    label: "All",
    emoji: "✨",
    value: null,
    color: "#FF4E62",
    bg: "rgba(255,78,98,0.12)",
    border: "rgba(255,78,98,0.35)",
  },
  {
    label: "Dinner",
    emoji: "🍷",
    value: "Dinner Date",
    color: "#FF8A3D",
    bg: "rgba(255,138,61,0.12)",
    border: "rgba(255,138,61,0.35)",
  },
  {
    label: "Nightclub",
    emoji: "🎵",
    value: "Nightclub",
    color: "#7A3CFF",
    bg: "rgba(122,60,255,0.12)",
    border: "rgba(122,60,255,0.35)",
  },
  {
    label: "Chill",
    emoji: "🥂",
    value: "Conversation & Drinks",
    color: "#3DA9FF",
    bg: "rgba(61,169,255,0.12)",
    border: "rgba(61,169,255,0.35)",
  },
  {
    label: "City Tour",
    emoji: "🗺️",
    value: "City Tour",
    color: "#1FBF6B",
    bg: "rgba(31,191,107,0.12)",
    border: "rgba(31,191,107,0.35)",
  },
  {
    label: "Massage",
    emoji: "💆",
    value: "Massage",
    color: "#FF4E62",
    bg: "rgba(255,78,98,0.12)",
    border: "rgba(255,78,98,0.35)",
  },
  {
    label: "Pool",
    emoji: "🏊",
    value: "Pool/Swim",
    color: "#3DA9FF",
    bg: "rgba(61,169,255,0.12)",
    border: "rgba(61,169,255,0.35)",
  },
  {
    label: "Travel",
    emoji: "✈️",
    value: "Travel Companion",
    color: "#FF8A3D",
    bg: "rgba(255,138,61,0.12)",
    border: "rgba(255,138,61,0.35)",
  },
] as const;
type CategoryValue = typeof CATEGORIES[number]["value"];
const SWIPE_THRESHOLD = 100;

function matchesCategory(c: Companion, value: CategoryValue): boolean {
  if (!value) return true;
  return c.menu.includes(value) || c.vibes.includes(value);
}

function StoryCircle({ companion, onPress, isNew }: { companion: Companion; onPress: () => void; isNew?: boolean }) {
  const colors = useColors("dark");
  return (
    <TouchableOpacity style={styles.storyWrap} onPress={onPress} activeOpacity={0.8}>
      {/* Ring + avatar + overlays — all in one relative container */}
      <View style={styles.storyRingWrap}>
        <View
          style={[
            styles.storyRing,
            {
              borderColor: companion.isTonightsDeal ? colors.accent : colors.primary,
              shadowColor: companion.isTonightsDeal ? colors.accent : colors.primary,
            },
          ]}
        >
          <View style={[styles.storyAvatar, { backgroundColor: companion.color }]}>
            <Text style={styles.storyInitial}>{companion.name[0]}</Text>
          </View>
        </View>
        {companion.availabilityStatus === "now" && (
          <View style={[styles.storyOnline, { backgroundColor: "#22c55e", borderColor: colors.background }]} />
        )}
        {isNew && (
          <View style={[styles.newBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}
      </View>
      <Text style={[styles.storyName, { color: colors.mutedForeground }]} numberOfLines={1}>
        {companion.name}
      </Text>
    </TouchableOpacity>
  );
}

function StoryViewer({ story, onClose }: { story: AppStory; onClose: () => void }) {
  const companion = story.companion;
  const progressAnim = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(progressAnim, { toValue: 1, duration: 5000, useNativeDriver: false }).start(({ finished }) => { if (finished) onClose(); });
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
              <Text style={styles.storyHeaderTime}>
                {relativeTime(story.createdAt)}{companion.distance != null ? ` · ${companion.distance} km away` : ` · ${companion.city}`}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.storyClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.storyBody}>
            <Text style={styles.storyEmoji}>🌙</Text>
            <Text style={styles.storyText}>{story.text}</Text>
            <Text style={styles.storySubtext}>{companion.city} · {companion.rate.toLocaleString()} UGX/hr</Text>
            {companion.isTonightsDeal && (
              <View style={styles.storyDealBadge}>
                <Ionicons name="flash" size={13} color="#fff" />
                <Text style={styles.storyDealText}>{companion.dealDiscount}% off tonight only</Text>
              </View>
            )}
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

function CategoryTile({
  cat,
  count,
  active,
  onPress,
}: {
  cat: typeof CATEGORIES[number];
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  const colors = useColors("dark");
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 6 }),
    ]).start();
    onPress();
  };
  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.catTile,
          {
            backgroundColor: active ? cat.bg : colors.card,
            borderColor: active ? cat.border : colors.border,
            shadowColor: active ? cat.color : "transparent",
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        {active && (
          <View style={[styles.catActiveGlow, { backgroundColor: cat.bg }]} />
        )}
        <Text style={styles.catEmoji}>{cat.emoji}</Text>
        <Text style={[styles.catLabel, { color: active ? cat.color : colors.foreground }]}>{cat.label}</Text>
        <View
          style={[
            styles.catCount,
            { backgroundColor: active ? cat.color : colors.muted },
          ]}
        >
          <Text style={[styles.catCountText, { color: active ? "#fff" : colors.mutedForeground }]}>
            {count}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function SwipeCard({ companion, isTop, onSwipe, onView }: {
  companion: Companion; isTop: boolean; onSwipe: (liked: boolean) => void; onView: () => void;
}) {
  const colors = useColors("dark");
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
        <Image source={photoSource(companion)} style={styles.photo} resizeMode="cover" />
        <View style={styles.photoOverlay} />
        {/* Status badges */}
        <View style={styles.cardTopBadges}>
          {companion.isNewInTown && (
            <View style={[styles.cardBadge, { backgroundColor: "#1FBF6B" }]}>
              <Text style={styles.cardBadgeText}>NEW</Text>
            </View>
          )}
          {companion.isHotStreak && (
            <View style={[styles.cardBadge, { backgroundColor: "#FF8A3D" }]}>
              <Ionicons name="flame" size={9} color="#fff" />
              <Text style={styles.cardBadgeText}>HOT</Text>
            </View>
          )}
          {companion.isTonightsDeal && (
            <View style={[styles.cardBadge, { backgroundColor: "#FF4E62" }]}>
              <Ionicons name="flash" size={9} color="#fff" />
              <Text style={styles.cardBadgeText}>{companion.dealDiscount}% OFF</Text>
            </View>
          )}
        </View>
        {/* Price tag */}
        <View style={[styles.priceTag, { backgroundColor: "rgba(0,0,0,0.65)" }]}>
          <Text style={styles.priceTagText}>
            {(companion.rate / 1000).toFixed(0)}k <Text style={styles.priceTagUnit}>UGX/hr</Text>
          </Text>
        </View>
        <Animated.View style={[styles.likeStamp, { opacity: likeOpacity }]}>
          <Ionicons name="heart" size={14} color="#FF4E62" />
          <Text style={styles.likeStampText}>CONNECT</Text>
        </Animated.View>
        <Animated.View style={[styles.passStamp, { opacity: passOpacity }]}>
          <Text style={styles.passStampText}>PASS</Text>
        </Animated.View>
        <View style={styles.cardInfo}>
          <View style={styles.cardNameRow}>
            <Text style={styles.cardName}>{companion.name}{companion.age ? `, ${companion.age}` : ""}</Text>
            {companion.verified && <Ionicons name="checkmark-circle" size={18} color="#FF4E62" />}
          </View>
          <View style={styles.cardMeta}>
            <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.7)" />
            <Text style={styles.cardMetaText}>{companion.distance != null ? `${companion.distance} km · ` : ""}{companion.city}</Text>
            <View style={[styles.availDot, { backgroundColor: companion.availabilityStatus === "now" ? "#22c55e" : companion.availabilityStatus === "tonight" ? "#FF8A3D" : "#6b6b8a" }]} />
            <Text style={styles.availText}>{companion.availabilityStatus === "now" ? "Now" : companion.availabilityStatus === "tonight" ? "Tonight" : "Offline"}</Text>
          </View>
          <View style={styles.cardVibes}>
            {companion.vibes.slice(0, 3).map((v) => (
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
              <Text style={styles.ratingText}>{companion.reviewCount > 0 ? companion.rating.toFixed(1) : "New"}</Text>
              <Text style={styles.meetupCount}>· {companion.completedMeetups} meetups</Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function DiscoverScreen() {
  const colors = useColors("dark");
  const insets = useSafeAreaInsets();
  const { companions, companionsLoading, stories, likeCompanion, passCompanion, likedIds, passedIds } = useApp();
  const [bookingFor, setBookingFor] = useState<Companion | null>(null);
  const [mood, setMood] = useState<CategoryValue>(null);
  const [storyOpen, setStoryOpen] = useState<AppStory | null>(null);
  // Ids swiped during this session are removed immediately so the stack never shows the same card twice.
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const queue = useMemo(
    () => companions.filter((c) => !likedIds.has(c.id) && !passedIds.has(c.id) && !dismissed.has(c.id) && matchesCategory(c, mood)),
    [companions, likedIds, passedIds, dismissed, mood],
  );

  useEffect(() => {
    // Forget local dismissals once the server confirms them.
    setDismissed((prev) => {
      const next = new Set([...prev].filter((id) => !likedIds.has(id) && !passedIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [likedIds, passedIds]);

  const handleSwipe = (liked: boolean) => {
    if (queue.length === 0) return;
    const top = queue[0];
    setDismissed((prev) => new Set(prev).add(top.id));
    (liked ? likeCompanion(top.id) : passCompanion(top.id)).catch(() => {
      setDismissed((prev) => {
        const next = new Set(prev);
        next.delete(top.id);
        return next;
      });
    });
  };

  const getCategoryCount = (value: CategoryValue) =>
    companions.filter((c) => !likedIds.has(c.id) && !passedIds.has(c.id) && matchesCategory(c, value)).length;

  const onlineCount = companions.filter(c => c.availabilityStatus === "now").length;
  const dealsCount = companions.filter(c => c.isTonightsDeal).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Discover</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Swipe to find your company tonight</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.statPill, { backgroundColor: "rgba(34,197,94,0.1)", borderColor: "rgba(34,197,94,0.3)" }]}>
            <View style={[styles.liveDot, { backgroundColor: "#22c55e" }]} />
            <Text style={[styles.statPillText, { color: "#22c55e" }]}>{onlineCount} live</Text>
          </View>
          {dealsCount > 0 && (
            <View style={[styles.statPill, { backgroundColor: "rgba(255,138,61,0.1)", borderColor: "rgba(255,138,61,0.3)" }]}>
              <Ionicons name="flash" size={11} color={colors.accent} />
              <Text style={[styles.statPillText, { color: colors.accent }]}>{dealsCount} deals</Text>
            </View>
          )}
        </View>
      </View>
      {/* Stories strip */}
      {stories.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storiesScroll} contentContainerStyle={styles.storiesRow}>
          {stories.map((s) => (
            <StoryCircle
              key={s.id}
              companion={s.companion}
              onPress={() => setStoryOpen(s)}
              isNew={s.companion.isNewInTown}
            />
          ))}
        </ScrollView>
      )}
      {/* Category tiles */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catsRow}
      >
        {CATEGORIES.map((cat) => (
          <CategoryTile
            key={cat.label}
            cat={cat}
            count={getCategoryCount(cat.value)}
            active={mood === cat.value}
            onPress={() => setMood(cat.value)}
          />
        ))}
      </ScrollView>
      {/* Card stack */}
      <View style={styles.cardStack}>
        {queue.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {companionsLoading && companions.length === 0 ? (
              <>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Finding companions…</Text>
              </>
            ) : (
              <>
                <Text style={styles.emptyEmoji}>🌙</Text>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  {mood ? `No one for this tonight` : companions.length === 0 ? "No companions nearby yet" : "You've seen everyone"}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                  {mood ? "Try a different category or check back later" : "New companions come online every evening"}
                </Text>
                {mood && (
                  <TouchableOpacity
                    style={[styles.resetBtn, { backgroundColor: colors.primary }]}
                    onPress={() => setMood(null)}
                  >
                    <Text style={styles.resetBtnText}>Show All</Text>
                  </TouchableOpacity>
                )}
              </>
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
        <View style={[styles.actions, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 10 }]}>
          <View style={styles.actionWrap}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.passBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => handleSwipe(false)}
            >
              <Ionicons name="close" size={26} color="#FF4E62" />
            </TouchableOpacity>
            <Text style={[styles.actionLabel, { color: colors.mutedForeground }]}>Pass</Text>
          </View>
          <View style={styles.actionWrap}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.superBtn, { backgroundColor: "rgba(255,138,61,0.15)", borderColor: colors.accent }]}
              onPress={() => router.push(`/companion/${queue[0].id}`)}
            >
              <Ionicons name="star" size={20} color={colors.accent} />
            </TouchableOpacity>
            <Text style={[styles.actionLabel, { color: colors.mutedForeground }]}>Profile</Text>
          </View>
          <View style={styles.actionWrap}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.likeBtn, { backgroundColor: "rgba(255,78,98,0.15)", borderColor: colors.primary }]}
              onPress={() => { if (queue[0]) setBookingFor(queue[0]); }}
            >
              <Ionicons name="heart" size={26} color={colors.primary} />
            </TouchableOpacity>
            <Text style={[styles.actionLabel, { color: colors.mutedForeground }]}>Connect</Text>
          </View>
        </View>
      )}
      {storyOpen && (
        <StoryViewer story={storyOpen} onClose={() => setStoryOpen(null)} />
      )}
      <BookingModal
        visible={!!bookingFor}
        companion={bookingFor}
        onClose={() => setBookingFor(null)}
        onBooked={() => {
          if (bookingFor) likeCompanion(bookingFor.id).catch(() => {});
        }}
      />
    </View>
  );
}

const CARD_HEIGHT = 360;

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 26 },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  statPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, borderWidth: 1,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  statPillText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },

  /* Stories */
  storiesScroll: { flexGrow: 0, flexShrink: 0 },
  storiesRow: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8, gap: 14 },
  storyWrap: { alignItems: "center", gap: 5, width: 62 },
  storyRingWrap: { width: 62, height: 62, alignItems: "center", justifyContent: "center", position: "relative" },
  storyRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  storyAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  storyInitial: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 19 },
  storyOnline: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2.5,
  },
  newBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  newBadgeText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 8 },
  storyName: { fontFamily: "Inter_500Medium", fontSize: 10, textAlign: "center" },

  /* Story viewer */
  storyModal: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" },
  storyContent: {
    width: "90%", maxWidth: 380, height: 560, borderRadius: 24, overflow: "hidden", padding: 20,
  },
  storyProgress: { height: 3, borderRadius: 2, marginBottom: 16, position: "relative" },
  storyProgressBg: { ...StyleSheet.absoluteFillObject, borderRadius: 2 },
  storyProgressFill: { height: 3, borderRadius: 2, position: "absolute", top: 0, left: 0 },
  storyHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  storyHeaderAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  storyHeaderInitial: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
  storyHeaderName: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
  storyHeaderTime: { color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular", fontSize: 12 },
  storyClose: { marginLeft: "auto" },
  storyBody: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  storyEmoji: { fontSize: 52 },
  storyText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 20, textAlign: "center" },
  storySubtext: { color: "rgba(255,255,255,0.75)", fontFamily: "Inter_400Regular", fontSize: 14 },
  storyDealBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginTop: 4,
  },
  storyDealText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 13 },
  storyViewProfile: {
    backgroundColor: "rgba(255,255,255,0.2)", paddingVertical: 14, borderRadius: 14, alignItems: "center",
  },
  storyViewProfileText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 },

  /* Category tiles */
  catsRow: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  catTile: {
    width: 76,
    height: 88,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    overflow: "hidden",
    position: "relative",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  catActiveGlow: { ...StyleSheet.absoluteFillObject, opacity: 0.4 },
  catEmoji: { fontSize: 28 },
  catLabel: { fontFamily: "Inter_600SemiBold", fontSize: 11, textAlign: "center" },
  catCount: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 24,
    alignItems: "center",
  },
  catCountText: { fontFamily: "Inter_700Bold", fontSize: 10 },

  /* Card stack */
  cardStack: { height: CARD_HEIGHT + 24, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
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
    position: "absolute", bottom: 0, left: 0, right: 0, height: "65%",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  cardTopBadges: {
    position: "absolute", top: 14, left: 14, flexDirection: "row", gap: 5,
  },
  cardBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
  },
  cardBadgeText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 10 },
  priceTag: {
    position: "absolute", top: 14, right: 14,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10,
  },
  priceTagText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 13 },
  priceTagUnit: { fontFamily: "Inter_400Regular", fontSize: 10, color: "rgba(255,255,255,0.75)" },
  likeStamp: {
    position: "absolute", top: 28, left: 20, borderWidth: 2.5, borderColor: "#FF4E62",
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, transform: [{ rotate: "-15deg" }],
    flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,78,98,0.15)",
  },
  likeStampText: { color: "#FF4E62", fontFamily: "Inter_700Bold", fontSize: 18 },
  passStamp: {
    position: "absolute", top: 28, right: 20, borderWidth: 2.5, borderColor: "#AAB3C5",
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, transform: [{ rotate: "15deg" }],
    backgroundColor: "rgba(170,179,197,0.15)",
  },
  passStampText: { color: "#AAB3C5", fontFamily: "Inter_700Bold", fontSize: 18 },
  cardInfo: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 14, gap: 5 },
  cardNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardName: { fontFamily: "Inter_700Bold", fontSize: 22, color: "#fff" },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardMetaText: { color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular", fontSize: 12 },
  availDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 4 },
  availText: { color: "rgba(255,255,255,0.7)", fontFamily: "Inter_500Medium", fontSize: 11 },
  cardVibes: { flexDirection: "row", gap: 5, flexWrap: "wrap" },
  vibeChip: {
    backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  vibeChipText: { color: "rgba(255,255,255,0.9)", fontSize: 11, fontFamily: "Inter_500Medium" },
  cardBio: { color: "rgba(255,255,255,0.65)", fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17 },
  cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: { color: "#FF8A3D", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  meetupCount: { color: "rgba(255,255,255,0.5)", fontFamily: "Inter_400Regular", fontSize: 11 },

  /* Empty state */
  emptyState: {
    width: "100%", maxWidth: 380, height: CARD_HEIGHT, borderRadius: 24, borderWidth: 1,
    alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 32,
  },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 18, textAlign: "center" },
  emptySubtitle: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", lineHeight: 20 },
  resetBtn: { paddingHorizontal: 24, paddingVertical: 11, borderRadius: 20, marginTop: 6 },
  resetBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },

  /* Action buttons */
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 22, paddingTop: 8 },
  actionWrap: { alignItems: "center", gap: 5 },
  actionBtn: { alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  passBtn: { width: 60, height: 60, borderRadius: 30 },
  superBtn: { width: 50, height: 50, borderRadius: 25 },
  likeBtn: { width: 60, height: 60, borderRadius: 30 },
  actionLabel: { fontFamily: "Inter_500Medium", fontSize: 11 },
});

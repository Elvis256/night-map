import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Image,
  Platform,
  PanResponder,
  Pressable,
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

const SWIPE_THRESHOLD = 100;

function SwipeCard({
  companion,
  isTop,
  onSwipe,
  onView,
}: {
  companion: Companion;
  isTop: boolean;
  onSwipe: (liked: boolean) => void;
  onView: () => void;
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
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }],
        },
      ]}
    >
      <Pressable onPress={onView} style={styles.cardPressable}>
        <Image
          source={COMPANION_PHOTOS[companion.photoIndex]}
          style={styles.photo}
          resizeMode="cover"
        />
        <View style={styles.photoOverlay} />

        <Animated.View style={[styles.likeStamp, { opacity: likeOpacity }]}>
          <Text style={styles.likeStampText}>CONNECT</Text>
        </Animated.View>
        <Animated.View style={[styles.passStamp, { opacity: passOpacity }]}>
          <Text style={styles.passStampText}>PASS</Text>
        </Animated.View>

        <View style={styles.cardInfo}>
          <View style={styles.cardNameRow}>
            <Text style={styles.cardName}>{companion.name}, {companion.age}</Text>
            {companion.verified && (
              <Ionicons name="checkmark-circle" size={18} color="#FF4E62" />
            )}
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
  const [queue, setQueue] = useState<Companion[]>(
    companions.filter((c) => !likedIds.has(c.id) && !passedIds.has(c.id))
  );
  const [showMatch, setShowMatch] = useState<Companion | null>(null);

  const handleSwipe = (liked: boolean) => {
    if (queue.length === 0) return;
    const top = queue[0];
    if (liked) {
      likeCompanion(top.id);
      setShowMatch(top);
      setTimeout(() => setShowMatch(null), 2000);
    } else {
      passCompanion(top.id);
    }
    setQueue((prev) => prev.slice(1));
  };

  const handleLikeButton = () => handleSwipe(true);
  const handlePassButton = () => handleSwipe(false);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Discover</Text>
        <TouchableOpacity style={[styles.filterBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="options-outline" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <View style={styles.cardStack}>
        {queue.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="heart-dislike-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>You've seen everyone</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>Check back tonight for new companions</Text>
          </View>
        ) : (
          <>
            {queue.length > 1 && (
              <SwipeCard
                key={queue[1].id + "_back"}
                companion={queue[1]}
                isTop={false}
                onSwipe={() => {}}
                onView={() => {}}
              />
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

      {showMatch && (
        <View style={[styles.matchBanner, { backgroundColor: colors.primary }]}>
          <Ionicons name="heart" size={18} color="#fff" />
          <Text style={styles.matchBannerText}>Connected with {showMatch.name}</Text>
        </View>
      )}

      {queue.length > 0 && (
        <View style={[styles.actions, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 16 }]}>
          <TouchableOpacity style={[styles.actionBtn, styles.passBtn, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={handlePassButton}>
            <Ionicons name="close" size={28} color="#FF4E62" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.superBtn, { backgroundColor: "rgba(255,138,61,0.15)", borderColor: colors.accent }]} onPress={() => router.push(`/companion/${queue[0].id}`)}>
            <Ionicons name="star" size={22} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.likeBtn, { backgroundColor: "rgba(255,78,98,0.15)", borderColor: colors.primary }]} onPress={handleLikeButton}>
            <Ionicons name="heart" size={28} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const CARD_HEIGHT = 440;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 26 },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  cardStack: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
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
  backCard: {
    transform: [{ scale: 0.94 }, { translateY: 12 }],
    opacity: 0.8,
    zIndex: 0,
  },
  cardPressable: { flex: 1 },
  photoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  initialBig: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 80, opacity: 0.6 },
  photo: { width: "100%", height: "100%", position: "absolute" },
  photoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "60%",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  likeStamp: {
    position: "absolute",
    top: 32,
    left: 24,
    borderWidth: 3,
    borderColor: "#FF4E62",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    transform: [{ rotate: "-15deg" }],
  },
  likeStampText: { color: "#FF4E62", fontFamily: "Inter_700Bold", fontSize: 22 },
  passStamp: {
    position: "absolute",
    top: 32,
    right: 24,
    borderWidth: 3,
    borderColor: "#FF4E62",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    transform: [{ rotate: "15deg" }],
  },
  passStampText: { color: "#FF4E62", fontFamily: "Inter_700Bold", fontSize: 22 },
  cardInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    gap: 8,
  },
  cardNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardName: { fontFamily: "Inter_700Bold", fontSize: 24, color: "#fff" },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardMetaText: { color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular", fontSize: 13 },
  cardVibes: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  vibeChip: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  vibeChipText: { color: "rgba(255,255,255,0.9)", fontSize: 12, fontFamily: "Inter_500Medium" },
  cardBio: { color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: { color: "#FF8A3D", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  emptyState: {
    width: "100%",
    maxWidth: 380,
    height: CARD_HEIGHT,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 20, textAlign: "center" },
  emptySubtitle: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20 },
  matchBanner: {
    position: "absolute",
    top: 120,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 40,
    shadowColor: "#FF4E62",
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 50,
  },
  matchBannerText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingTop: 12,
  },
  actionBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  passBtn: { width: 60, height: 60, borderRadius: 30 },
  superBtn: { width: 50, height: 50, borderRadius: 25 },
  likeBtn: { width: 60, height: 60, borderRadius: 30 },
});

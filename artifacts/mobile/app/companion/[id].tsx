import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getGetCompanionQueryKey, useGetCompanion } from "@workspace/api-client-react";
import { useColors } from "@workspace/nightmap-design-system/hooks/use-colors";
import { formatUGX, relativeTime, toCompanion, useApp } from "@/context/AppContext";
import { TrustBadge } from "@workspace/nightmap-design-system/components/native/TrustBadge";
import { ConnectionModal } from "@/components/ConnectionModal";
import { assetUrl, errorMessage } from "@/lib/api";

const COMPANION_PHOTOS = [
  require("@/assets/images/companion1.png"),
  require("@/assets/images/companion2.png"),
  require("@/assets/images/companion3.png"),
];

const MENU_ICONS: Record<string, string> = {
  "Dinner Date": "restaurant-outline",
  "Nightclub": "musical-notes-outline",
  "Movie Night": "film-outline",
  "Pool/Swim": "water-outline",
  "Massage": "hand-left-outline",
  "Conversation & Drinks": "wine-outline",
  "City Tour": "map-outline",
  "Events": "calendar-outline",
  "Travel Companion": "airplane-outline",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  now: { label: "Available Now", color: "#22c55e" },
  tonight: { label: "Available Tonight", color: "#FF8A3D" },
  offline: { label: "Offline", color: "#6b6b8a" },
};

export default function CompanionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors("dark");
  const insets = useSafeAreaInsets();
  const { likedIds, matches, savedIds, toggleSaved } = useApp();
  const [showConnect, setShowConnect] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);
  const companionId = id ?? "";
  const detailQuery = useGetCompanion(companionId, {
    query: { queryKey: getGetCompanionQueryKey(companionId), enabled: !!companionId, staleTime: 15000 },
  });
  const detail = detailQuery.data;
  const companion = useMemo(() => (detail ? toCompanion(detail) : null), [detail]);

  if (!companion) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <TouchableOpacity style={[styles.backBtn, { top: Platform.OS === "web" ? 67 : insets.top + 8 }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20 }}>
          {detailQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={{ color: colors.foreground }}>
              {detailQuery.isError ? errorMessage(detailQuery.error, "This profile is not available.") : "Not found"}
            </Text>
          )}
        </View>
      </View>
    );
  }

  const isLiked = likedIds.has(companion.id) || companion.isLiked;
  const isSaved = savedIds.has(companion.id);
  const match = matches.find((m) => m.companion.id === companion.id);
  const chatId = match?.id ?? companion.connectionId;
  const status = STATUS_LABELS[companion.availabilityStatus];
  const photos = detail?.photos ?? [];
  const photoSource = photos.length > 0
    ? { uri: assetUrl(photos[Math.min(photoIdx, photos.length - 1)].url) ?? "" }
    : companion.photoUrl
      ? { uri: companion.photoUrl }
      : COMPANION_PHOTOS[companion.photoIndex % 3];
  const reviews = detail?.recentReviews ?? [];

  const handleConnect = () => {
    if (chatId) {
      router.push(`/chat/${chatId}`);
    } else if (companion.locked) {
      Alert.alert(
        "High-End collection",
        `${companion.name} is only available to clients with High-End Access (UGX 20,000/month).`,
        [{ text: "Not now", style: "cancel" }, { text: "See packages", onPress: () => router.push("/vip") }],
      );
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setShowConnect(true);
    }
  };

  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await toggleSaved(companion.id);
    } catch (err) {
      Alert.alert("Something went wrong", errorMessage(err));
    }
  };

  const dealPrice = companion.isTonightsDeal
    ? Math.round(companion.rate * (1 - companion.dealDiscount / 100))
    : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Photo */}
        <View style={styles.photoSection}>
          <Image source={photoSource} style={styles.photo} resizeMode="cover" />
          <View style={styles.photoOverlay} />
          <TouchableOpacity
            style={[styles.backBtn, { top: Platform.OS === "web" ? 67 : insets.top + 8 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          {photos.length > 1 && (
            <View style={styles.photoDots}>
              {photos.map((p, i) => (
                <TouchableOpacity key={p.id} onPress={() => setPhotoIdx(i)} style={[styles.photoDot, { backgroundColor: i === photoIdx ? "#fff" : "rgba(255,255,255,0.4)" }]} />
              ))}
            </View>
          )}
          {companion.isSpotlight && (
            <View style={[styles.spotlightBanner, { backgroundColor: "rgba(255,138,61,0.9)" }]}>
              <Ionicons name="star" size={12} color="#fff" />
              <Text style={styles.spotlightText}>Spotlight</Text>
            </View>
          )}
          <View style={styles.photoInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{companion.name}{companion.age ? `, ${companion.age}` : ""}</Text>
              {companion.verified && <Ionicons name="checkmark-circle" size={22} color="#FF4E62" />}
            </View>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: status.color }]} />
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
              <Text style={styles.locationText}>· {companion.city}{companion.distance != null ? ` · ${companion.distance} km` : ""}</Text>
            </View>
            {/* Badges */}
            <View style={styles.photoBadges}>
              {companion.isHotStreak && (
                <View style={[styles.photoBadge, { backgroundColor: "rgba(255,78,98,0.85)" }]}>
                  <Ionicons name="flame" size={11} color="#fff" />
                  <Text style={styles.photoBadgeText}>Hot Streak</Text>
                </View>
              )}
              {companion.isNewInTown && (
                <View style={[styles.photoBadge, { backgroundColor: "rgba(33,150,243,0.85)" }]}>
                  <Ionicons name="sparkles" size={11} color="#fff" />
                  <Text style={styles.photoBadgeText}>New in Town</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        <View style={[styles.content, { paddingBottom: 110 + (Platform.OS === "web" ? 34 : insets.bottom) }]}>
          {companion.isHighEnd && (
            <View style={[styles.card, { backgroundColor: companion.locked ? "rgba(122,60,255,0.08)" : "rgba(61,169,255,0.08)", borderColor: companion.locked ? "rgba(122,60,255,0.4)" : "rgba(61,169,255,0.4)", flexDirection: "row", alignItems: "center", gap: 10 }]}>
              <Ionicons name={companion.locked ? "lock-closed" : "diamond"} size={18} color={companion.locked ? "#7A3CFF" : "#3DA9FF"} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: colors.foreground, fontSize: 14 }]}>High-End collection</Text>
                <Text style={[styles.bioText, { color: colors.mutedForeground, fontSize: 12 }]}>
                  {companion.locked ? "Connecting and booking need High-End Access. Tap below to see packages." : "You have High-End Access."}
                </Text>
              </View>
            </View>
          )}
          {/* Trust row */}
          <View style={styles.trustRow}>
            <TrustBadge score={companion.trustScore} size="md" />
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#FF8A3D" />
              <Text style={[styles.ratingNum, { color: colors.foreground }]}>
                {companion.reviewCount > 0 ? `${companion.rating.toFixed(1)} (${companion.reviewCount})` : "New"}
              </Text>
            </View>
            <View style={[styles.metaPill, { backgroundColor: colors.muted }]}>
              <Ionicons name="checkmark-done" size={12} color={colors.mutedForeground} />
              <Text style={[styles.metaPillText, { color: colors.mutedForeground }]}>{companion.completedMeetups} meetups</Text>
            </View>
            <View style={[styles.metaPill, { backgroundColor: colors.muted }]}>
              <Ionicons name="flash" size={12} color={colors.mutedForeground} />
              <Text style={[styles.metaPillText, { color: colors.mutedForeground }]}>{companion.responseRate}% reply</Text>
            </View>
          </View>
          {/* Pricing */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: companion.isTonightsDeal ? "#FF8A3D" : colors.border }]}>
            <View style={styles.pricingHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Rate</Text>
              {companion.isTonightsDeal && (
                <View style={[styles.dealBadge, { backgroundColor: "#FF8A3D" }]}>
                  <Ionicons name="flash" size={12} color="#0B0B0F" />
                  <Text style={styles.dealBadgeText}>{companion.dealDiscount}% Tonight Only</Text>
                </View>
              )}
            </View>
            <View style={styles.pricingRow}>
              {companion.isTonightsDeal ? (
                <>
                  <Text style={[styles.priceStrike, { color: colors.mutedForeground }]}>{formatUGX(companion.rate)}</Text>
                  <Text style={[styles.priceDeal, { color: "#FF8A3D" }]}>{formatUGX(dealPrice!)}/hr</Text>
                </>
              ) : (
                <Text style={[styles.price, { color: colors.foreground }]}>{formatUGX(companion.rate)}/hr</Text>
              )}
              <Text style={[styles.minBooking, { color: colors.mutedForeground }]}>
                Minimum {companion.minBookingHours} hour{companion.minBookingHours > 1 ? "s" : ""}
              </Text>
            </View>
            <View style={[styles.escrowNote, { backgroundColor: "rgba(255,138,61,0.08)", borderColor: "rgba(255,138,61,0.2)" }]}>
              <Ionicons name="shield-checkmark" size={12} color={colors.accent} />
              <Text style={[styles.escrowText, { color: colors.mutedForeground }]}>
                Rates are set by the companion and agreed directly. NightMap does not process or hold payments.
              </Text>
            </View>
          </View>
          {/* About */}
          {!!companion.bio && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About</Text>
              <Text style={[styles.bioText, { color: colors.mutedForeground }]}>{companion.bio}</Text>
            </View>
          )}
          {/* The Menu */}
          {companion.menu.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>The Menu</Text>
              <Text style={[styles.menuSubtitle, { color: colors.mutedForeground }]}>Available activities</Text>
              <View style={styles.menuGrid}>
                {companion.menu.map((item) => (
                  <View key={item} style={[styles.menuItem, { backgroundColor: "rgba(255,78,98,0.08)", borderColor: "rgba(255,78,98,0.2)" }]}>
                    <Ionicons name={(MENU_ICONS[item] ?? "ellipse-outline") as never} size={16} color="#FF4E62" />
                    <Text style={[styles.menuItemText, { color: colors.foreground }]}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          {/* Reviews */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Chemistry Scores</Text>
            {reviews.length === 0 ? (
              <Text style={[styles.menuSubtitle, { color: colors.mutedForeground }]}>No reviews yet — be the first after a meetup.</Text>
            ) : (
              reviews.map((r) => (
                <View key={r.id} style={[styles.reviewRow, { borderTopColor: colors.border }]}>
                  <View style={styles.reviewTop}>
                    <Text style={[styles.reviewName, { color: colors.foreground }]}>{r.reviewerName}</Text>
                    <View style={styles.reviewStars}>
                      <Ionicons name="star" size={12} color="#FF8A3D" />
                      <Text style={[styles.reviewAvg, { color: "#FF8A3D" }]}>{r.average.toFixed(1)}</Text>
                    </View>
                    <Text style={[styles.reviewTime, { color: colors.mutedForeground }]}>{relativeTime(r.createdAt)}</Text>
                  </View>
                  {!!r.text && <Text style={[styles.reviewText, { color: colors.mutedForeground }]}>{r.text}</Text>}
                </View>
              ))
            )}
          </View>
          {/* Verification */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Verification</Text>
            {companion.verified ? (
              [
                { icon: "card-outline", label: "Government ID verified" },
                { icon: "camera-outline", label: "Biometric selfie verified" },
                { icon: "videocam-outline", label: "5-second liveness check passed" },
              ].map(({ icon, label }) => (
                <View key={label} style={styles.verRow}>
                  <Ionicons name={icon as never} size={16} color={colors.accent} />
                  <Text style={[styles.verText, { color: colors.foreground }]}>{label}</Text>
                  <Ionicons name="checkmark-circle" size={15} color="#22c55e" />
                </View>
              ))
            ) : (
              <View style={styles.verRow}>
                <Ionicons name="shield-outline" size={16} color={colors.mutedForeground} />
                <Text style={[styles.verText, { color: colors.mutedForeground }]}>
                  {detail?.verificationState === "pending" ? "Verification under review" : "Not yet verified — meet in public places"}
                </Text>
              </View>
            )}
          </View>
          {/* Safety */}
          <View style={[styles.card, { backgroundColor: "rgba(255,78,98,0.05)", borderColor: "rgba(255,78,98,0.15)" }]}>
            <View style={styles.safetyRow}>
              <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.safetyTitle, { color: colors.foreground }]}>Safety Check-In</Text>
                <Text style={[styles.safetyDesc, { color: colors.mutedForeground }]}>
                  Location shared with trusted contact during meetup · Panic button active
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
      {/* Footer */}
      <View style={[styles.footer, {
        borderTopColor: colors.border,
        backgroundColor: colors.background,
        paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 10,
      }]}>
        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          onPress={handleSave}
        >
          <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={20} color={isSaved ? colors.primary : colors.foreground} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryBtn, {
            backgroundColor: chatId ? colors.card : colors.primary,
            borderColor: chatId ? colors.border : colors.primary,
          }]}
          onPress={handleConnect}
        >
          <Ionicons name={chatId ? "chatbubble" : companion.locked ? "lock-closed" : "heart"} size={18} color={chatId ? colors.primary : "#fff"} />
          <Text style={[styles.primaryBtnText, { color: chatId ? colors.primary : "#fff" }]}>
            {chatId ? "Message" : companion.locked ? "Unlock High-End" : isLiked ? "Connect" : "Connect Tonight"}
          </Text>
        </TouchableOpacity>
      </View>
      <ConnectionModal
        companion={companion}
        visible={showConnect}
        onClose={() => setShowConnect(false)}
        onConnected={(matchId) => {
          setShowConnect(false);
          router.push(`/chat/${matchId}`);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  photoDots: {
    position: "absolute", top: 12, left: 0, right: 0,
    flexDirection: "row", justifyContent: "center", gap: 6,
  },
  photoDot: { width: 24, height: 3, borderRadius: 2 },
  reviewRow: { paddingTop: 10, marginTop: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 4 },
  reviewTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  reviewName: { fontFamily: "Inter_600SemiBold", fontSize: 13, flex: 1 },
  reviewStars: { flexDirection: "row", alignItems: "center", gap: 3 },
  reviewAvg: { fontFamily: "Inter_700Bold", fontSize: 12 },
  reviewTime: { fontFamily: "Inter_400Regular", fontSize: 11 },
  reviewText: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
  container: { flex: 1 },
  photoSection: { height: 400, position: "relative" },
  photo: { width: "100%", height: "100%", position: "absolute" },
  photoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "65%",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  backBtn: {
    position: "absolute",
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  spotlightBanner: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  spotlightText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 12 },
  photoInfo: { position: "absolute", bottom: 20, left: 18, right: 18, gap: 6 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 28 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  locationText: { color: "rgba(255,255,255,0.65)", fontFamily: "Inter_400Regular", fontSize: 13 },
  photoBadges: { flexDirection: "row", gap: 6, marginTop: 2 },
  photoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  photoBadgeText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 11 },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  trustRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingNum: { fontFamily: "Inter_700Bold", fontSize: 14 },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  metaPillText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  pricingHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  dealBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  dealBadgeText: { color: "#0B0B0F", fontFamily: "Inter_700Bold", fontSize: 11 },
  pricingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  price: { fontFamily: "Inter_700Bold", fontSize: 22 },
  priceStrike: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    textDecorationLine: "line-through",
  },
  priceDeal: { fontFamily: "Inter_700Bold", fontSize: 22 },
  minBooking: { fontFamily: "Inter_400Regular", fontSize: 13 },
  escrowNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  escrowText: { fontFamily: "Inter_400Regular", fontSize: 12, flex: 1, lineHeight: 16 },
  bioText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21 },
  menuSubtitle: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: -4 },
  menuGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  menuItemText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  verRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  verText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14 },
  safetyRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  safetyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, marginBottom: 3 },
  safetyDesc: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  secondaryBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  primaryBtn: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
  },
  primaryBtnText: { fontFamily: "Inter_700Bold", fontSize: 16 },
});

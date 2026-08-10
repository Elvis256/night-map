import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { COMPANIONS, formatUGX, useApp } from "@/context/AppContext";
import { TrustBadge } from "@/components/TrustBadge";
import { ConnectionModal } from "@/components/ConnectionModal";

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
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  now: { label: "Available Now", color: "#22c55e" },
  tonight: { label: "Available Tonight", color: "#FF8A3D" },
  offline: { label: "Offline", color: "#6b6b8a" },
};

export default function CompanionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { likedIds, matches, savedIds, toggleSaved } = useApp();
  const [showConnect, setShowConnect] = useState(false);

  const companion = COMPANIONS.find((c) => c.id === id);
  if (!companion) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Text style={{ color: colors.foreground, padding: 20 }}>Not found</Text>
      </View>
    );
  }

  const isLiked = likedIds.has(companion.id);
  const isSaved = savedIds.has(companion.id);
  const match = matches.find((m) => m.companion.id === companion.id);
  const status = STATUS_LABELS[companion.availabilityStatus];

  const handleConnect = () => {
    if (match) {
      router.push(`/chat/${match.id}`);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setShowConnect(true);
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
          <Image source={COMPANION_PHOTOS[companion.photoIndex]} style={styles.photo} resizeMode="cover" />
          <View style={styles.photoOverlay} />
          <TouchableOpacity
            style={[styles.backBtn, { top: Platform.OS === "web" ? 67 : insets.top + 8 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          {companion.isSpotlight && (
            <View style={[styles.spotlightBanner, { backgroundColor: "rgba(255,138,61,0.9)" }]}>
              <Ionicons name="star" size={12} color="#fff" />
              <Text style={styles.spotlightText}>Spotlight</Text>
            </View>
          )}

          <View style={styles.photoInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{companion.name}, {companion.age}</Text>
              {companion.verified && <Ionicons name="checkmark-circle" size={22} color="#FF4E62" />}
            </View>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: status.color }]} />
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
              <Text style={styles.locationText}>· {companion.city} · {companion.distance} km</Text>
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
          {/* Trust row */}
          <View style={styles.trustRow}>
            <TrustBadge score={companion.trustScore} size="md" />
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#FF8A3D" />
              <Text style={[styles.ratingNum, { color: colors.foreground }]}>{companion.rating.toFixed(1)}</Text>
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
                Payment held in escrow · released after meetup confirmed
              </Text>
            </View>
          </View>

          {/* About */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About</Text>
            <Text style={[styles.bioText, { color: colors.mutedForeground }]}>{companion.bio}</Text>
          </View>

          {/* The Menu */}
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

          {/* Verification */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Verification</Text>
            {[
              { icon: "card-outline", label: "Government ID verified" },
              { icon: "camera-outline", label: "Biometric selfie verified" },
              { icon: "videocam-outline", label: "5-second liveness check passed" },
            ].map(({ icon, label }) => (
              <View key={label} style={styles.verRow}>
                <Ionicons name={icon as never} size={16} color={colors.accent} />
                <Text style={[styles.verText, { color: colors.foreground }]}>{label}</Text>
                <Ionicons name="checkmark-circle" size={15} color="#22c55e" />
              </View>
            ))}
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
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            toggleSaved(companion.id);
          }}
        >
          <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={20} color={isSaved ? colors.primary : colors.foreground} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryBtn, {
            backgroundColor: isLiked ? colors.card : colors.primary,
            borderColor: isLiked ? colors.border : colors.primary,
          }]}
          onPress={handleConnect}
        >
          <Ionicons name={isLiked ? "chatbubble" : "heart"} size={18} color={isLiked ? colors.primary : "#fff"} />
          <Text style={[styles.primaryBtnText, { color: isLiked ? colors.primary : "#fff" }]}>
            {match ? "Message" : isLiked ? "Reconnect" : "Connect Tonight"}
          </Text>
        </TouchableOpacity>
      </View>

      <ConnectionModal
        companion={companion}
        visible={showConnect}
        onClose={() => setShowConnect(false)}
        onConnected={() => {
          setShowConnect(false);
          const newMatch = matches.find((m) => m.companion.id === companion.id);
          if (newMatch) router.push(`/chat/${newMatch.id}`);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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

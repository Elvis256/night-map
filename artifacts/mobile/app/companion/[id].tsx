import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
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
import { COMPANIONS, useApp } from "@/context/AppContext";
import { TrustBadge } from "@/components/TrustBadge";

const COMPANION_PHOTOS = [
  require("@/assets/images/companion1.png"),
  require("@/assets/images/companion2.png"),
  require("@/assets/images/companion3.png"),
];

export default function CompanionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { likeCompanion, passCompanion, likedIds, matches } = useApp();

  const companion = COMPANIONS.find((c) => c.id === id);
  if (!companion) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Text style={{ color: colors.foreground, padding: 20 }}>Not found</Text>
      </View>
    );
  }

  const isLiked = likedIds.has(companion.id);
  const match = matches.find((m) => m.companion.id === companion.id);

  const handleConnect = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    likeCompanion(companion.id);
  };

  const handleMessage = () => {
    if (match) {
      router.push(`/chat/${match.id}`);
    } else {
      handleConnect();
    }
  };

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }).map((_, i) => (
      <Ionicons
        key={i}
        name={i < Math.round(rating) ? "star" : "star-outline"}
        size={16}
        color={i < Math.round(rating) ? "#f5a623" : colors.mutedForeground}
      />
    ));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.photoSection}>
          <Image source={COMPANION_PHOTOS[companion.photoIndex]} style={styles.photo} resizeMode="cover" />
          <View style={[styles.photoOverlay]} />
          <TouchableOpacity
            style={[styles.backBtn, { top: Platform.OS === "web" ? 67 : insets.top + 8 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          <View style={styles.photoInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{companion.name}, {companion.age}</Text>
              {companion.verified && (
                <Ionicons name="checkmark-circle" size={22} color="#ff2d7e" />
              )}
            </View>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.locationText}>{companion.city} · {companion.distance} km away</Text>
              {companion.online && (
                <View style={styles.onlineChip}>
                  <View style={styles.onlineDotSmall} />
                  <Text style={styles.onlineChipText}>Live</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={[styles.content, { paddingBottom: 120 + (Platform.OS === "web" ? 34 : insets.bottom) }]}>
          <View style={styles.badgeRow}>
            <TrustBadge score={companion.trustScore} size="md" />
            <View style={styles.ratingRow}>
              {renderStars(companion.rating)}
              <Text style={[styles.ratingNum, { color: colors.foreground }]}>{companion.rating.toFixed(1)}</Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About</Text>
            <Text style={[styles.bioText, { color: colors.mutedForeground }]}>{companion.bio}</Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Vibes</Text>
            <View style={styles.vibeGrid}>
              {companion.vibes.map((v) => (
                <View key={v} style={[styles.vibePill, { backgroundColor: "rgba(255,45,126,0.12)", borderColor: "rgba(255,45,126,0.3)" }]}>
                  <Ionicons name="sparkles" size={12} color="#ff2d7e" />
                  <Text style={[styles.vibePillText, { color: "#ff2d7e" }]}>{v}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Verification</Text>
            <View style={styles.verificationItem}>
              <Ionicons name="card-outline" size={18} color={colors.accent} />
              <Text style={[styles.verificationText, { color: colors.foreground }]}>Government ID verified</Text>
              <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
            </View>
            <View style={styles.verificationItem}>
              <Ionicons name="camera-outline" size={18} color={colors.accent} />
              <Text style={[styles.verificationText, { color: colors.foreground }]}>Biometric selfie verified</Text>
              <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
            </View>
            <View style={styles.verificationItem}>
              <Ionicons name="videocam-outline" size={18} color={colors.accent} />
              <Text style={[styles.verificationText, { color: colors.foreground }]}>Liveness check passed</Text>
              <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.footerSecBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        >
          <Ionicons name="bookmark-outline" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.footerPrimaryBtn, { backgroundColor: isLiked ? colors.card : colors.primary, borderColor: isLiked ? colors.border : colors.primary }]}
          onPress={handleMessage}
        >
          <Ionicons name={isLiked ? "chatbubble" : "heart"} size={20} color={isLiked ? colors.primary : "#fff"} />
          <Text style={[styles.footerBtnText, { color: isLiked ? colors.primary : "#fff" }]}>
            {isLiked ? "Message" : "Connect Tonight"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  photoSection: { height: 380, position: "relative" },
  photo: { width: "100%", height: "100%", position: "absolute" },
  photoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "60%",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  backBtn: {
    position: "absolute",
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  photoInfo: { position: "absolute", bottom: 20, left: 20, right: 20, gap: 6 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 28 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  locationText: { color: "rgba(255,255,255,0.75)", fontFamily: "Inter_400Regular", fontSize: 14 },
  onlineChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(34,197,94,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  onlineDotSmall: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#22c55e" },
  onlineChipText: { color: "#22c55e", fontFamily: "Inter_600SemiBold", fontSize: 12 },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  badgeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingNum: { fontFamily: "Inter_700Bold", fontSize: 15, marginLeft: 4 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, marginBottom: 2 },
  bioText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 22 },
  vibeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  vibePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  vibePillText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  verificationItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  verificationText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerSecBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  footerPrimaryBtn: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
  },
  footerBtnText: { fontFamily: "Inter_700Bold", fontSize: 16 },
});

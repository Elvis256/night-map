import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getGetReferralQueryKey, useGetReferral } from "@workspace/api-client-react";
import { useColors } from "@workspace/nightmap-design-system/hooks/use-colors";
import { relativeTime } from "@/context/AppContext";

const HOW_IT_WORKS = [
  { step: "1", icon: "share-outline", color: "#3DA9FF", text: "Share your invite code with friends" },
  { step: "2", icon: "person-add-outline", color: "#FF8A3D", text: "They sign up with your code" },
  { step: "3", icon: "flash-outline", color: "#1FBF6B", text: "You earn +200 pts when they join" },
];

export default function ReferralScreen() {
  const colors  = useColors("dark");
  const insets  = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);
  const copyScale = useRef(new Animated.Value(1)).current;
  const referralQuery = useGetReferral({ query: { queryKey: getGetReferralQueryKey(), staleTime: 30_000 } });
  const data = referralQuery.data;
  const code = data?.code ?? "";
  const link = data?.link ?? "https://nightmap.itsolutionsuganda.com";

  const handleCopy = () => {
    if (!code) return;
    Clipboard.setStringAsync(code).catch(() => {});
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    Animated.sequence([
      Animated.timing(copyScale, { toValue: 1.08, duration: 100, useNativeDriver: true }),
      Animated.spring(copyScale, { toValue: 1, useNativeDriver: true, friction: 5 }),
    ]).start();
    setTimeout(() => setCopied(false), 2000);
  };
  const handleShare = async () => {
    if (!code) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const message = `Join me on NightMap 🌙 East Africa's social companionship platform.\n\nUse my invite code ${code} when you sign up: ${link}`;
    try {
      await Share.share({ title: "Join me on NightMap", message });
    } catch {
      Alert.alert("Share NightMap", message);
    }
  };
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 56 : insets.top + 4, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Invite Friends</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[styles.hero, { borderBottomColor: colors.border }]}>
          <View style={styles.heroGlow} />
          <Text style={styles.heroEmoji}>🎁</Text>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>Refer & Earn</Text>
          <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
            Earn +200 loyalty points every time a friend joins NightMap with your code.
          </Text>
        </View>
        {/* Stats */}
        <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: "#3DA9FF" }]}>{data?.inviteCount ?? 0}</Text>
            <Text style={[styles.statLab, { color: colors.mutedForeground }]}>Friends joined</Text>
          </View>
          <View style={[styles.statDiv, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: "#FF8A3D" }]}>{data?.pointsEarned ?? 0}</Text>
            <Text style={[styles.statLab, { color: colors.mutedForeground }]}>Points earned</Text>
          </View>
        </View>
        {/* Your code */}
        <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>YOUR INVITE CODE</Text>
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <Animated.View style={[styles.codeCard, { backgroundColor: colors.card, borderColor: "#FF8A3D", transform: [{ scale: copyScale }] }]}>
            <View style={styles.codeGlow} />
            <Text style={[styles.codeLabel, { color: colors.mutedForeground }]}>SHARE THIS CODE</Text>
            {referralQuery.isLoading ? (
              <ActivityIndicator color="#FF8A3D" />
            ) : (
              <Text style={[styles.code, { color: "#FF8A3D" }]}>{code || "—"}</Text>
            )}
            <TouchableOpacity
              style={[styles.copyBtn, { backgroundColor: copied ? "#1FBF6B" : "rgba(255,138,61,0.12)", borderColor: copied ? "#1FBF6B" : "#FF8A3D" }]}
              onPress={handleCopy}
              disabled={!code}
            >
              <Ionicons name={copied ? "checkmark" : "copy-outline"} size={15} color={copied ? "#fff" : "#FF8A3D"} />
              <Text style={[styles.copyBtnText, { color: copied ? "#fff" : "#FF8A3D" }]}>
                {copied ? "Copied!" : "Copy code"}
              </Text>
            </TouchableOpacity>
          </Animated.View>
          <TouchableOpacity style={[styles.shareBtn, { backgroundColor: colors.primary, opacity: code ? 1 : 0.6 }]} onPress={handleShare} disabled={!code}>
            <Ionicons name="share-social-outline" size={18} color="#fff" />
            <Text style={styles.shareBtnText}>Share invite link</Text>
          </TouchableOpacity>
        </View>
        {/* How it works */}
        <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>HOW IT WORKS</Text>
        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          {HOW_IT_WORKS.map((step) => (
            <View key={step.step} style={[styles.stepRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.stepNum, { backgroundColor: `${step.color}18`, borderColor: `${step.color}40` }]}>
                <Text style={[styles.stepNumText, { color: step.color }]}>{step.step}</Text>
              </View>
              <View style={[styles.stepIcon, { backgroundColor: `${step.color}12` }]}>
                <Ionicons name={step.icon as never} size={17} color={step.color} />
              </View>
              <Text style={[styles.stepText, { color: colors.foreground }]}>{step.text}</Text>
            </View>
          ))}
        </View>
        {/* Invites */}
        <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>FRIENDS YOU INVITED</Text>
        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          {(data?.invites ?? []).length === 0 ? (
            <Text style={[styles.terms, { color: colors.mutedForeground, paddingHorizontal: 0, marginTop: 0 }]}>
              No one has used your code yet. Share it to start earning.
            </Text>
          ) : (
            data!.invites.map((inv, i) => (
              <View key={`${inv.name}-${i}`} style={[styles.stepRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.stepIcon, { backgroundColor: "rgba(31,191,107,0.12)" }]}>
                  <Text style={{ color: "#1FBF6B", fontFamily: "Inter_700Bold" }}>{inv.name[0]?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepText, { color: colors.foreground }]}>{inv.name}</Text>
                  <Text style={[styles.statLab, { color: colors.mutedForeground }]}>Joined {relativeTime(inv.joinedAt)}</Text>
                </View>
                <Text style={[styles.stepNumText, { color: "#FF8A3D" }]}>+{inv.pointsAwarded}</Text>
              </View>
            ))
          )}
        </View>
        <Text style={[styles.terms, { color: colors.mutedForeground }]}>
          Points are credited automatically when a new account signs up with your code. Rewards are loyalty points, not cash.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 20 },

  hero: {
    alignItems: "center", paddingTop: 24, paddingBottom: 24, paddingHorizontal: 24, gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, position: "relative",
  },
  heroGlow: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,138,61,0.03)" },
  heroEmoji: { fontSize: 52 },
  heroTitle: { fontFamily: "Inter_700Bold", fontSize: 22, textAlign: "center" },
  heroSub: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 22 },

  statsRow: {
    flexDirection: "row", marginHorizontal: 16, marginTop: 16,
    borderRadius: 16, borderWidth: 1, paddingVertical: 14,
  },
  statItem: { flex: 1, alignItems: "center", gap: 3 },
  statVal: { fontFamily: "Inter_700Bold", fontSize: 16 },
  statLab: { fontFamily: "Inter_400Regular", fontSize: 11 },
  statDiv: { width: 1, marginVertical: 4 },

  sectionHeader: {
    fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1,
    paddingHorizontal: 16, marginTop: 20, marginBottom: 10,
  },

  codeCard: {
    borderRadius: 20, borderWidth: 2, padding: 20,
    alignItems: "center", gap: 10, position: "relative", overflow: "hidden",
  },
  codeGlow: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,138,61,0.04)" },
  codeLabel: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.5 },
  code: { fontFamily: "Inter_700Bold", fontSize: 34, letterSpacing: 6 },
  copyBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 18, paddingVertical: 9,
  },
  copyBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },

  shareBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 15, borderRadius: 16,
  },
  shareBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 },

  stepRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14,
  },
  stepNum: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  stepNumText: { fontFamily: "Inter_700Bold", fontSize: 13 },
  stepIcon: { width: 36, height: 36, borderRadius: 9, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  stepText: { fontFamily: "Inter_400Regular", fontSize: 13, flex: 1, lineHeight: 19 },

  refRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  refAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  refInitial: { fontFamily: "Inter_700Bold", fontSize: 14 },
  refName: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  refTime: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
  refPts: { fontFamily: "Inter_700Bold", fontSize: 13 },
  refUgx: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  pendingPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4,
  },
  pendingText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },

  terms: {
    fontFamily: "Inter_400Regular", fontSize: 11,
    textAlign: "center", paddingHorizontal: 24, marginTop: 16, lineHeight: 17,
  },
});

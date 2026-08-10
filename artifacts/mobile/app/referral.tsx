import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
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
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";

const USER_CODE = "NIGHT-K4NJ";
const BONUS_PER_REFERRAL_PTS = 200;
const BONUS_PER_REFERRAL_UGX = 5_000;

const REFERRAL_HISTORY = [
  { id: "r1", name: "Amara D.",    joinedAt: "2 days ago",  status: "active",  ptsEarned: 200, ugxEarned: 5000 },
  { id: "r2", name: "Kevin O.",    joinedAt: "1 week ago",  status: "active",  ptsEarned: 200, ugxEarned: 5000 },
  { id: "r3", name: "Leila M.",    joinedAt: "2 weeks ago", status: "pending", ptsEarned: 0,   ugxEarned: 0    },
];

const HOW_IT_WORKS = [
  { step: "1", icon: "share-outline",         color: "#3DA9FF", text: "Share your unique code or link with friends" },
  { step: "2", icon: "person-add-outline",    color: "#1FBF6B", text: "Your friend signs up and makes their first booking" },
  { step: "3", icon: "gift-outline",          color: "#FF8A3D", text: "You both earn 200 pts + UGX 5,000 wallet credit" },
];

export default function ReferralScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { userProfile } = useApp();
  const [copied, setCopied] = useState(false);
  const copyScale = useRef(new Animated.Value(1)).current;

  const totalPts = REFERRAL_HISTORY.filter(r => r.status === "active").reduce((s, r) => s + r.ptsEarned, 0);
  const totalUgx = REFERRAL_HISTORY.filter(r => r.status === "active").reduce((s, r) => s + r.ugxEarned, 0);
  const activeCount  = REFERRAL_HISTORY.filter(r => r.status === "active").length;
  const pendingCount = REFERRAL_HISTORY.filter(r => r.status === "pending").length;

  const handleCopy = () => {
    Clipboard.setStringAsync(USER_CODE).catch(() => {});
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    Animated.sequence([
      Animated.timing(copyScale, { toValue: 1.08, duration: 100, useNativeDriver: true }),
      Animated.spring(copyScale, { toValue: 1, useNativeDriver: true, friction: 5 }),
    ]).start();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        title: "Join me on NightMap",
        message: `Join me on NightMap with code ${USER_CODE}!\n\nYou'll get UGX 5,000 wallet credit on your first booking.\n\nDownload: nightmap.app`,
      });
    } catch {
      Alert.alert("Share NightMap", `Use my code ${USER_CODE} when signing up.`);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 56 : insets.top + 4, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Refer & Earn</Text>
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
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>Invite Friends, Earn Together</Text>
          <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
            For every friend who joins and books, you both get{"\n"}
            <Text style={{ color: "#1FBF6B", fontFamily: "Inter_700Bold" }}>200 pts</Text>
            {" "}+{" "}
            <Text style={{ color: "#1FBF6B", fontFamily: "Inter_700Bold" }}>UGX 5,000</Text>
            {" "}wallet credit
          </Text>
        </View>

        {/* Stats */}
        <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: "#FF8A3D" }]}>{activeCount}</Text>
            <Text style={[styles.statLab, { color: colors.mutedForeground }]}>Referred</Text>
          </View>
          <View style={[styles.statDiv, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: "#1FBF6B" }]}>+{totalPts}</Text>
            <Text style={[styles.statLab, { color: colors.mutedForeground }]}>Pts Earned</Text>
          </View>
          <View style={[styles.statDiv, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: "#1FBF6B" }]}>UGX {(totalUgx / 1000).toFixed(0)}k</Text>
            <Text style={[styles.statLab, { color: colors.mutedForeground }]}>Wallet Credit</Text>
          </View>
          {pendingCount > 0 && (
            <>
              <View style={[styles.statDiv, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statVal, { color: "#3DA9FF" }]}>{pendingCount}</Text>
                <Text style={[styles.statLab, { color: colors.mutedForeground }]}>Pending</Text>
              </View>
            </>
          )}
        </View>

        {/* Your code */}
        <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>YOUR REFERRAL CODE</Text>
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <Animated.View style={[styles.codeCard, { backgroundColor: colors.card, borderColor: "#FF8A3D", transform: [{ scale: copyScale }] }]}>
            <View style={styles.codeGlow} />
            <Text style={[styles.codeLabel, { color: colors.mutedForeground }]}>SHARE THIS CODE</Text>
            <Text style={[styles.code, { color: "#FF8A3D" }]}>{USER_CODE}</Text>
            <TouchableOpacity
              style={[styles.copyBtn, { backgroundColor: copied ? "#1FBF6B" : "rgba(255,138,61,0.12)", borderColor: copied ? "#1FBF6B" : "#FF8A3D" }]}
              onPress={handleCopy}
            >
              <Ionicons name={copied ? "checkmark" : "copy-outline"} size={15} color={copied ? "#fff" : "#FF8A3D"} />
              <Text style={[styles.copyBtnText, { color: copied ? "#fff" : "#FF8A3D" }]}>
                {copied ? "Copied!" : "Copy Code"}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity style={[styles.shareBtn, { backgroundColor: colors.primary }]} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={18} color="#fff" />
            <Text style={styles.shareBtnText}>Share via WhatsApp / SMS</Text>
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

        {/* Referral history */}
        <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>YOUR REFERRALS</Text>
        <View style={{ paddingHorizontal: 16, gap: 1 }}>
          {REFERRAL_HISTORY.map((ref, i) => (
            <View
              key={ref.id}
              style={[
                styles.refRow,
                { borderBottomColor: colors.border },
                i === 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
              ]}
            >
              <View style={[styles.refAvatar, { backgroundColor: ref.status === "active" ? "rgba(31,191,107,0.15)" : colors.muted }]}>
                <Text style={[styles.refInitial, { color: ref.status === "active" ? "#1FBF6B" : colors.mutedForeground }]}>
                  {ref.name[0]}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.refName, { color: colors.foreground }]}>{ref.name}</Text>
                <Text style={[styles.refTime, { color: colors.mutedForeground }]}>Joined {ref.joinedAt}</Text>
              </View>
              {ref.status === "active" ? (
                <View style={{ alignItems: "flex-end", gap: 2 }}>
                  <Text style={[styles.refPts, { color: "#FF8A3D" }]}>+{ref.ptsEarned} pts</Text>
                  <Text style={[styles.refUgx, { color: "#1FBF6B" }]}>+UGX {(ref.ugxEarned / 1000).toFixed(0)}k</Text>
                </View>
              ) : (
                <View style={[styles.pendingPill, { backgroundColor: "rgba(61,169,255,0.1)", borderColor: "rgba(61,169,255,0.3)" }]}>
                  <Ionicons name="time-outline" size={10} color="#3DA9FF" />
                  <Text style={[styles.pendingText, { color: "#3DA9FF" }]}>Pending</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Terms note */}
        <Text style={[styles.terms, { color: colors.mutedForeground }]}>
          Rewards credited after referred friend completes their first booking · Max 20 referrals/month · Full terms at nightmap.app/referral
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

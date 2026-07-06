import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef } from "react";
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
import { useApp } from "@/context/AppContext";

const TIERS = [
  { name: "Bronze",   min: 0,    max: 199,  color: "#CD7F32", emoji: "🥉" },
  { name: "Silver",   min: 200,  max: 499,  color: "#C0C0C0", emoji: "🥈" },
  { name: "Gold",     min: 500,  max: 999,  color: "#FFC400", emoji: "🥇" },
  { name: "Platinum", min: 1000, max: 9999, color: "#E5E4E2", emoji: "💎" },
];

const EARN_ACTIONS = [
  { icon: "checkmark-circle-outline", color: "#1FBF6B", label: "Complete a meetup",       pts: "+100 pts" },
  { icon: "star-outline",             color: "#FFC400", label: "Leave a Chemistry rating", pts: "+25 pts"  },
  { icon: "people-outline",           color: "#3DA9FF", label: "Refer a friend",           pts: "+200 pts" },
  { icon: "shield-checkmark-outline", color: "#FF4E62", label: "Get verified",             pts: "+150 pts" },
  { icon: "calendar-outline",         color: "#7A3CFF", label: "7-day login streak",       pts: "+50 pts"  },
  { icon: "heart-outline",            color: "#FF8A3D", label: "First booking this week",  pts: "+30 pts"  },
  { icon: "radio-outline",            color: "#1FBF6B", label: "Join a Radio lounge",      pts: "+10 pts"  },
  { icon: "videocam-outline",         color: "#3DA9FF", label: "Watch a live stream",      pts: "+5 pts"   },
];

const RECENT_ACTIVITY = [
  { icon: "checkmark-circle", color: "#1FBF6B", label: "Meetup with Amara completed",   pts: "+100", time: "2 days ago" },
  { icon: "star",             color: "#FFC400", label: "Chemistry score submitted",      pts: "+25",  time: "3 days ago" },
  { icon: "calendar",         color: "#7A3CFF", label: "5-day login streak",             pts: "+30",  time: "5 days ago" },
  { icon: "heart",            color: "#FF8A3D", label: "First booking of the week",      pts: "+30",  time: "1 week ago" },
  { icon: "shield-checkmark", color: "#FF4E62", label: "Profile verification submitted", pts: "+150", time: "2 weeks ago" },
];

const TIER_PERKS: Record<string, string[]> = {
  Bronze:   ["5 connects/day", "Basic profile", "Access to Radio"],
  Silver:   ["15 connects/day", "Verified badge eligibility", "Tonight's Deals access", "Chemistry ratings"],
  Gold:     ["Unlimited connects", "Priority listing", "Early deal access", "VIP badge eligible", "Advanced filters"],
  Platinum: ["Everything in Gold", "0% companion fee", "Dedicated support", "Exclusive Platinum events", "Custom profile theme"],
};

export default function ScoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userProfile } = useApp();
  const score = 340;

  const currentTier  = TIERS.find(t => score >= t.min && score <= t.max)!;
  const nextTier     = TIERS[TIERS.indexOf(currentTier) + 1] ?? null;
  const progress     = nextTier
    ? (score - currentTier.min) / (nextTier.min - currentTier.min)
    : 1;
  const ptsToNext    = nextTier ? nextTier.min - score : 0;

  const barWidth = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(barWidth, { toValue: progress, duration: 900, useNativeDriver: false }).start();
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 56 : insets.top + 4, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>NightMap Score</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Score hero */}
        <View style={[styles.hero, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.heroGlow} />
          <Text style={styles.tierEmoji}>{currentTier.emoji}</Text>
          <Text style={[styles.scoreBig, { color: currentTier.color }]}>{score}</Text>
          <Text style={styles.scorePts}>pts</Text>
          <View style={[styles.tierBadge, { backgroundColor: `${currentTier.color}18`, borderColor: `${currentTier.color}50` }]}>
            <Ionicons name="flash" size={13} color={currentTier.color} />
            <Text style={[styles.tierLabel, { color: currentTier.color }]}>{currentTier.name} Member</Text>
          </View>

          {nextTier && (
            <View style={styles.progressSection}>
              <View style={styles.progressLabels}>
                <Text style={[styles.progLabelLeft, { color: currentTier.color }]}>{currentTier.name}</Text>
                <Text style={[styles.progLabelRight, { color: nextTier.color }]}>{nextTier.name} at {nextTier.min} pts</Text>
              </View>
              <View style={[styles.barBg, { backgroundColor: colors.muted }]}>
                <Animated.View
                  style={[styles.barFill, {
                    backgroundColor: currentTier.color,
                    width: barWidth.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
                  }]}
                />
              </View>
              <Text style={[styles.ptsToNext, { color: colors.mutedForeground }]}>
                {ptsToNext} pts to {nextTier.name} · {Math.round(progress * 100)}% there
              </Text>
            </View>
          )}
        </View>

        {/* Tier comparison */}
        <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>YOUR TIER PERKS</Text>
        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          {(TIER_PERKS[currentTier.name] ?? []).map(perk => (
            <View key={perk} style={[styles.perkRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="checkmark-circle" size={16} color={currentTier.color} />
              <Text style={[styles.perkText, { color: colors.foreground }]}>{perk}</Text>
            </View>
          ))}
          {nextTier && (
            <View style={[styles.unlockNote, { backgroundColor: `${nextTier.color}08`, borderColor: `${nextTier.color}20` }]}>
              <Text style={[styles.unlockEmoji]}>{nextTier.emoji}</Text>
              <Text style={[styles.unlockText, { color: colors.mutedForeground }]}>
                Reach {nextTier.name} to unlock {TIER_PERKS[nextTier.name]?.[TIER_PERKS[nextTier.name].length - 1]}
              </Text>
            </View>
          )}
        </View>

        {/* How to earn */}
        <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>HOW TO EARN POINTS</Text>
        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          {EARN_ACTIONS.map(a => (
            <View key={a.label} style={[styles.earnRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.earnIcon, { backgroundColor: `${a.color}15` }]}>
                <Ionicons name={a.icon as never} size={17} color={a.color} />
              </View>
              <Text style={[styles.earnLabel, { color: colors.foreground }]}>{a.label}</Text>
              <View style={[styles.ptsPill, { backgroundColor: `${a.color}15` }]}>
                <Text style={[styles.ptsText, { color: a.color }]}>{a.pts}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Recent activity */}
        <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>RECENT ACTIVITY</Text>
        <View style={{ paddingHorizontal: 16, gap: 1 }}>
          {RECENT_ACTIVITY.map((act, i) => (
            <View
              key={act.label}
              style={[
                styles.actRow,
                { borderBottomColor: colors.border },
                i === 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
              ]}
            >
              <View style={[styles.actIcon, { backgroundColor: `${act.color}15` }]}>
                <Ionicons name={act.icon as never} size={15} color={act.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actLabel, { color: colors.foreground }]}>{act.label}</Text>
                <Text style={[styles.actTime, { color: colors.mutedForeground }]}>{act.time}</Text>
              </View>
              <Text style={[styles.actPts, { color: act.color }]}>{act.pts}</Text>
            </View>
          ))}
        </View>

        {/* All tiers */}
        <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>ALL TIERS</Text>
        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          {TIERS.map(t => (
            <View
              key={t.name}
              style={[styles.tierRow, {
                backgroundColor: t.name === currentTier.name ? `${t.color}10` : colors.card,
                borderColor: t.name === currentTier.name ? `${t.color}50` : colors.border,
              }]}
            >
              <Text style={styles.tierRowEmoji}>{t.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.tierRowName, { color: t.color }]}>{t.name}</Text>
                <Text style={[styles.tierRowRange, { color: colors.mutedForeground }]}>
                  {t.max < 9999 ? `${t.min}–${t.max} pts` : `${t.min}+ pts`}
                </Text>
              </View>
              {t.name === currentTier.name && (
                <View style={[styles.currentPill, { backgroundColor: `${t.color}20` }]}>
                  <Text style={[styles.currentPillText, { color: t.color }]}>Current</Text>
                </View>
              )}
              {score < t.min && (
                <Text style={[styles.lockedText, { color: colors.mutedForeground }]}>
                  {t.min - score} pts away
                </Text>
              )}
            </View>
          ))}
        </View>
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
    alignItems: "center", paddingVertical: 32, paddingHorizontal: 24, gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, position: "relative",
  },
  heroGlow: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,196,0,0.03)" },
  tierEmoji: { fontSize: 52 },
  scoreBig: { fontFamily: "Inter_700Bold", fontSize: 72, lineHeight: 80 },
  scorePts: { color: "#AAB3C5", fontFamily: "Inter_400Regular", fontSize: 16, marginTop: -8 },
  tierBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 6,
  },
  tierLabel: { fontFamily: "Inter_700Bold", fontSize: 14 },

  progressSection: { width: "100%", gap: 6, marginTop: 8 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between" },
  progLabelLeft: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  progLabelRight: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  barBg: { height: 8, borderRadius: 4, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4 },
  ptsToNext: { fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center" },

  sectionHeader: {
    fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1,
    paddingHorizontal: 16, marginTop: 20, marginBottom: 10,
  },

  perkRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 14, borderWidth: 1, padding: 12,
  },
  perkText: { fontFamily: "Inter_400Regular", fontSize: 14, flex: 1 },
  unlockNote: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 14, borderWidth: 1, padding: 12,
  },
  unlockEmoji: { fontSize: 18 },
  unlockText: { fontFamily: "Inter_400Regular", fontSize: 13, flex: 1 },

  earnRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 12,
  },
  earnIcon: { width: 36, height: 36, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  earnLabel: { fontFamily: "Inter_400Regular", fontSize: 14, flex: 1 },
  ptsPill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  ptsText: { fontFamily: "Inter_700Bold", fontSize: 13 },

  actRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  actLabel: { fontFamily: "Inter_500Medium", fontSize: 13 },
  actTime: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 1 },
  actPts: { fontFamily: "Inter_700Bold", fontSize: 15 },

  tierRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1.5, padding: 14,
  },
  tierRowEmoji: { fontSize: 28 },
  tierRowName: { fontFamily: "Inter_700Bold", fontSize: 15 },
  tierRowRange: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  currentPill: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  currentPillText: { fontFamily: "Inter_700Bold", fontSize: 12 },
  lockedText: { fontFamily: "Inter_400Regular", fontSize: 12 },
});

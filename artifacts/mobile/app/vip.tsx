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
import { useColors } from "@workspace/nightmap-design-system/hooks/use-colors";
import { formatUGX, useApp } from "@/context/AppContext";

const PERKS = [
  { icon: "infinite-outline",        color: "#FF4E62", title: "Unlimited Connects",      desc: "No daily cap on connections" },
  { icon: "trending-up-outline",     color: "#FF8A3D", title: "Priority Listings",        desc: "Your profile shown first in search" },
  { icon: "remove-circle-outline",   color: "#1FBF6B", title: "0% Platform Fee",          desc: "Keep 100% of every booking (companions)" },
  { icon: "eye-off-outline",         color: "#3DA9FF", title: "Incognito Mode",           desc: "Browse profiles without being seen" },
  { icon: "star-outline",            color: "#FFC400", title: "VIP Badge",                desc: "Gold verified badge on your profile" },
  { icon: "flash-outline",           color: "#7A3CFF", title: "Tonight's Deals First",    desc: "Early access before public release" },
  { icon: "shield-checkmark-outline",color: "#1FBF6B", title: "Priority Safety Support",  desc: "Dedicated 24/7 safety response line" },
  { icon: "radio-outline",           color: "#FF4E62", title: "Ad-Free Radio & Live",     desc: "No interruptions during streams" },
];

const PLANS = [
  { id: "monthly", label: "Monthly",    price: 35_000,  per: "/mo",   badge: null,      popular: false },
  { id: "quarter", label: "3 Months",   price: 90_000,  per: "/3mo",  badge: "Save 14%", popular: true  },
  { id: "annual",  label: "Yearly",     price: 300_000, per: "/yr",   badge: "Save 28%", popular: false },
];

export default function VipScreen() {
  const colors = useColors("dark");
  const insets = useSafeAreaInsets();
  const { userProfile, walletCredit } = useApp();
  const [selectedPlan, setSelectedPlan] = useState("quarter");
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);
  const glowAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  const plan = PLANS.find(p => p.id === selectedPlan)!;

  const handleActivate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setActivating(true);
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    ).start();
    setTimeout(() => {
      setActivating(false);
      setActivated(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.spring(successScale, { toValue: 1, useNativeDriver: true, tension: 50, friction: 6 }).start();
    }, 2200);
  };

  if (activated) {
    return (
      <View style={[styles.root, { backgroundColor: "#0B0B0F", paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        <View style={styles.successGlow} />
        <Animated.View style={[styles.successCard, { transform: [{ scale: successScale }] }]}>
          <Text style={styles.successCrown}>👑</Text>
          <Text style={styles.successTitle}>You're VIP!</Text>
          <Text style={styles.successSub}>NightMap VIP is now active on your account.</Text>
          <View style={[styles.successBadge, { backgroundColor: "rgba(255,196,0,0.12)", borderColor: "#FFC400" }]}>
            <Ionicons name="star" size={14} color="#FFC400" />
            <Text style={[styles.successBadgeText, { color: "#FFC400" }]}>Gold VIP Member</Text>
          </View>
          <TouchableOpacity style={styles.successBtn} onPress={() => router.back()} activeOpacity={0.85}>
            <Text style={styles.successBtnText}>Explore NightMap VIP →</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: "#0B0B0F" }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 56 : insets.top + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NightMap VIP</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <Text style={styles.heroEmoji}>👑</Text>
          <Text style={styles.heroTitle}>Go VIP Tonight</Text>
          <Text style={styles.heroSub}>
            Unlock the full NightMap experience — no limits, no fees, always first.
          </Text>

          {userProfile.isCompanion && (
            <View style={styles.companionNote}>
              <Ionicons name="cash-outline" size={16} color="#1FBF6B" />
              <Text style={styles.companionNoteText}>
                VIP companions keep 100% of every booking. Standard is 80%.
              </Text>
            </View>
          )}
        </View>

        {/* Plan selector */}
        <View style={{ paddingHorizontal: 16, gap: 10, marginBottom: 24 }}>
          {PLANS.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.planCard,
                selectedPlan === p.id && styles.planCardActive,
              ]}
              onPress={() => { setSelectedPlan(p.id); Haptics.selectionAsync(); }}
              activeOpacity={0.8}
            >
              {p.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                </View>
              )}
              <View style={styles.planRow}>
                <View style={[styles.planRadio, selectedPlan === p.id && styles.planRadioActive]}>
                  {selectedPlan === p.id && <View style={styles.planRadioInner} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.planLabel, { color: selectedPlan === p.id ? "#FFC400" : "#fff" }]}>{p.label}</Text>
                  <Text style={styles.planSub}>{formatUGX(Math.round(p.price / (p.id === "quarter" ? 3 : p.id === "annual" ? 12 : 1)))}/month</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={[styles.planPrice, { color: selectedPlan === p.id ? "#FFC400" : "#fff" }]}>
                    {formatUGX(p.price)}{p.per}
                  </Text>
                  {p.badge && (
                    <View style={[styles.saveBadge, { backgroundColor: selectedPlan === p.id ? "rgba(255,196,0,0.15)" : "rgba(255,255,255,0.08)" }]}>
                      <Text style={[styles.saveBadgeText, { color: selectedPlan === p.id ? "#FFC400" : "#AAB3C5" }]}>{p.badge}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Perks */}
        <Text style={styles.perksHeader}>WHAT'S INCLUDED</Text>
        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          {PERKS.map(perk => (
            <View key={perk.title} style={styles.perkRow}>
              <View style={[styles.perkIcon, { backgroundColor: `${perk.color}18` }]}>
                <Ionicons name={perk.icon as never} size={18} color={perk.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.perkTitle}>{perk.title}</Text>
                <Text style={styles.perkDesc}>{perk.desc}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={18} color={perk.color} />
            </View>
          ))}
        </View>

        <Text style={styles.footerNote}>
          Cancel anytime · Auto-renews · Secure checkout via NightMap wallet
        </Text>
      </ScrollView>

      {/* Sticky activate button */}
      <View style={[styles.sticky, { paddingBottom: insets.bottom + 16, borderTopColor: "#1A1A2E" }]}>
        <TouchableOpacity
          style={[styles.activateBtn, activating && { opacity: 0.7 }]}
          onPress={handleActivate}
          disabled={activating}
          activeOpacity={0.85}
        >
          <Animated.View style={{ opacity: activating ? glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) : 1, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Ionicons name={activating ? "hourglass-outline" : "flash"} size={20} color="#0B0B0F" />
            <Text style={styles.activateBtnText}>
              {activating ? "Activating…" : `Activate VIP · ${formatUGX(plan.price)}${plan.per}`}
            </Text>
          </Animated.View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 8,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: "#fff" },

  hero: { alignItems: "center", paddingHorizontal: 24, paddingTop: 8, paddingBottom: 28, gap: 10, position: "relative" },
  heroGlow: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,196,0,0.04)" },
  heroEmoji: { fontSize: 60 },
  heroTitle: { fontFamily: "Inter_700Bold", fontSize: 28, color: "#fff", textAlign: "center" },
  heroSub: { fontFamily: "Inter_400Regular", fontSize: 15, color: "#AAB3C5", textAlign: "center", lineHeight: 22 },
  companionNote: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(31,191,107,0.10)", borderColor: "rgba(31,191,107,0.25)", borderWidth: 1,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginTop: 4,
  },
  companionNoteText: { color: "#1FBF6B", fontFamily: "Inter_400Regular", fontSize: 13, flex: 1 },

  planCard: {
    borderRadius: 18, borderWidth: 1.5, borderColor: "#2A3045",
    backgroundColor: "#161923", padding: 16, position: "relative", overflow: "hidden",
  },
  planCardActive: { borderColor: "#FFC400", backgroundColor: "rgba(255,196,0,0.05)" },
  popularBadge: {
    position: "absolute", top: 0, right: 0,
    backgroundColor: "#FFC400", borderBottomLeftRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
  popularBadgeText: { color: "#0B0B0F", fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 0.5 },
  planRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  planRadio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#2A3045",
    alignItems: "center", justifyContent: "center",
  },
  planRadioActive: { borderColor: "#FFC400" },
  planRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFC400" },
  planLabel: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  planSub: { color: "#AAB3C5", fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  planPrice: { fontFamily: "Inter_700Bold", fontSize: 18 },
  saveBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  saveBadgeText: { fontFamily: "Inter_700Bold", fontSize: 11 },

  perksHeader: {
    color: "#AAB3C5", fontFamily: "Inter_700Bold", fontSize: 11,
    letterSpacing: 1, paddingHorizontal: 16, marginBottom: 10,
  },
  perkRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#161923", borderRadius: 14, borderWidth: 1,
    borderColor: "#2A3045", padding: 14,
  },
  perkIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  perkTitle: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  perkDesc: { color: "#AAB3C5", fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },

  footerNote: {
    color: "#3A4460", fontFamily: "Inter_400Regular", fontSize: 12,
    textAlign: "center", paddingHorizontal: 24, marginTop: 20, lineHeight: 18,
  },

  sticky: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingTop: 12, paddingHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth,
    backgroundColor: "#0B0B0F",
  },
  activateBtn: {
    backgroundColor: "#FFC400", borderRadius: 18,
    paddingVertical: 17, alignItems: "center", justifyContent: "center",
  },
  activateBtnText: { color: "#0B0B0F", fontFamily: "Inter_700Bold", fontSize: 17 },

  successGlow: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,196,0,0.06)" },
  successCard: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 32, gap: 14,
  },
  successCrown: { fontSize: 72 },
  successTitle: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 32 },
  successSub: { color: "#AAB3C5", fontFamily: "Inter_400Regular", fontSize: 15, textAlign: "center" },
  successBadge: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 8,
  },
  successBadgeText: { fontFamily: "Inter_700Bold", fontSize: 14 },
  successBtn: {
    backgroundColor: "#FFC400", borderRadius: 16,
    paddingVertical: 15, paddingHorizontal: 32, marginTop: 8,
  },
  successBtnText: { color: "#0B0B0F", fontFamily: "Inter_700Bold", fontSize: 16 },
});

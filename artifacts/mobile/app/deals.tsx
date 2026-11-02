import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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
import { Companion, formatUGX, useApp } from "@/context/AppContext";
import { BookingModal } from "@/components/BookingModal";

function useCountdown(targetHour: number) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date();
      end.setHours(targetHour, 59, 59, 0);
      if (end <= now) end.setDate(end.getDate() + 1);
      setSeconds(Math.floor((end.getTime() - now.getTime()) / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetHour]);
  const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function dealPrice(c: Companion): number {
  return Math.round(c.rate * (1 - c.dealDiscount / 100));
}

function DealCard({ companion, rank, onBook }: { companion: Companion; rank: number; onBook: (c: Companion) => void }) {
  const colors = useColors("dark");
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const discounted = dealPrice(companion);
  const savings = companion.rate - discounted;
  const pulse = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 6 }),
    ]).start();
  };
  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.dealCard, { backgroundColor: colors.card, borderColor: rank === 1 ? "#FF8A3D" : colors.border }]}
        onPress={() => { pulse(); router.push(`/companion/${companion.id}`); }}
        activeOpacity={0.9}
      >
        {rank === 1 && (
          <View style={styles.featuredBanner}>
            <Ionicons name="flash" size={10} color="#0B0B0F" />
            <Text style={styles.featuredBannerText}>FEATURED DEAL</Text>
          </View>
        )}
        {/* Top section */}
        <View style={styles.dealTop}>
          <View style={[styles.dealAvatar, { backgroundColor: companion.color }]}>
            <Text style={styles.dealInitial}>{companion.name[0]}</Text>
            {companion.availabilityStatus === "now" && (
              <View style={[styles.dealOnline, { borderColor: colors.card }]} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.dealNameRow}>
              <Text style={[styles.dealName, { color: colors.foreground }]}>
                {companion.name}{companion.age ? `, ${companion.age}` : ""}
              </Text>
              {companion.verified && (
                <Ionicons name="checkmark-circle" size={14} color="#3DA9FF" />
              )}
            </View>
            <Text style={[styles.dealCity, { color: colors.mutedForeground }]}>
              {companion.city}{companion.distance != null ? ` · ${companion.distance} km` : ""}{companion.reviewCount > 0 ? ` · ★ ${companion.rating.toFixed(1)}` : ""}
            </Text>
          </View>
          {/* Discount badge */}
          <View style={styles.discountBadge}>
            <Text style={styles.discountPct}>{companion.dealDiscount}%</Text>
            <Text style={styles.discountOff}>OFF</Text>
          </View>
        </View>
        {/* Price row */}
        <View style={styles.priceRow}>
          <View>
            <Text style={[styles.priceOld, { color: colors.mutedForeground }]}>
              {formatUGX(companion.rate)}/hr
            </Text>
            <Text style={[styles.priceNew, { color: "#1FBF6B" }]}>
              {formatUGX(discounted)}/hr
            </Text>
          </View>
          <View style={[styles.savingsPill, { backgroundColor: "rgba(31,191,107,0.12)", borderColor: "rgba(31,191,107,0.3)" }]}>
            <Ionicons name="trending-down-outline" size={12} color="#1FBF6B" />
            <Text style={[styles.savingsText, { color: "#1FBF6B" }]}>Save {formatUGX(savings)}/hr</Text>
          </View>
        </View>
        {/* Vibes */}
        <View style={styles.vibesRow}>
          {companion.vibes.slice(0, 3).map(v => (
            <View key={v} style={[styles.vibe, { backgroundColor: colors.muted }]}>
              <Text style={[styles.vibeText, { color: colors.mutedForeground }]}>{v}</Text>
            </View>
          ))}
        </View>
        {/* CTA */}
        <TouchableOpacity
          style={[styles.bookBtn, { backgroundColor: colors.primary }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onBook(companion); }}
          activeOpacity={0.85}
        >
          <Ionicons name="flash" size={15} color="#fff" />
          <Text style={styles.bookBtnText}>Book Deal · {formatUGX(discounted)}/hr</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function DealsScreen() {
  const colors   = useColors("dark");
  const insets   = useSafeAreaInsets();
  const { deals, browseCity } = useApp();
  const [bookingFor, setBookingFor] = useState<Companion | null>(null);
  const countdown = useCountdown(23); // deals expire at midnight
  const flashAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 0.4, duration: 900, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const totalSavings = deals.reduce((sum, c) => sum + (c.rate - dealPrice(c)), 0);
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 56 : insets.top + 4, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Tonight's Deals</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>{deals.length} companion{deals.length === 1 ? "" : "s"} · {browseCity} · Limited time</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>
      {/* Countdown banner */}
      <View style={[styles.countdownBanner, { backgroundColor: "rgba(255,138,61,0.08)", borderColor: "rgba(255,138,61,0.2)" }]}>
        <Animated.View style={{ opacity: flashAnim }}>
          <Ionicons name="flash" size={18} color="#FF8A3D" />
        </Animated.View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.countdownLabel, { color: colors.mutedForeground }]}>DEALS EXPIRE IN</Text>
          <Text style={[styles.countdownTime, { color: "#FF8A3D" }]}>{countdown}</Text>
        </View>
        <View style={[styles.savingsPillLg, { backgroundColor: "rgba(31,191,107,0.12)", borderColor: "rgba(31,191,107,0.3)" }]}>
          <Text style={[styles.savingsPillLabel, { color: colors.mutedForeground }]}>Up to</Text>
          <Text style={[styles.savingsPillVal, { color: "#1FBF6B" }]}>{formatUGX(totalSavings)}</Text>
          <Text style={[styles.savingsPillLabel, { color: colors.mutedForeground }]}>saved /hr</Text>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {deals.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🌙</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No deals tonight in {browseCity}</Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              Check back after 6 PM — companions post their evening deals then
            </Text>
          </View>
        ) : (
          deals.map((c, i) => (
            <DealCard key={c.id} companion={c} rank={i + 1} onBook={setBookingFor} />
          ))
        )}
      </ScrollView>
      <BookingModal visible={!!bookingFor} companion={bookingFor} onClose={() => setBookingFor(null)} />
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
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },

  countdownBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12,
  },
  countdownLabel: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.5 },
  countdownTime: { fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: 2 },
  savingsPillLg: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, alignItems: "center" },
  savingsPillLabel: { fontFamily: "Inter_400Regular", fontSize: 10 },
  savingsPillVal: { fontFamily: "Inter_700Bold", fontSize: 14 },

  scroll: { padding: 16, gap: 14 },

  dealCard: {
    borderRadius: 20, borderWidth: 1.5, padding: 16, gap: 12,
    overflow: "hidden",
  },
  featuredBanner: {
    position: "absolute", top: 0, left: 0, right: 0,
    backgroundColor: "#FF8A3D", flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 5,
  },
  featuredBannerText: { color: "#0B0B0F", fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1 },

  dealTop: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 20 },
  dealAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", position: "relative" },
  dealInitial: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 18 },
  dealOnline: { position: "absolute", bottom: 0, right: 0, width: 13, height: 13, borderRadius: 7, backgroundColor: "#22c55e", borderWidth: 2 },
  dealNameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  dealName: { fontFamily: "Inter_700Bold", fontSize: 16 },
  dealCity: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  discountBadge: {
    backgroundColor: "#FF4E62", borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 6, alignItems: "center",
  },
  discountPct: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 20, lineHeight: 22 },
  discountOff: { color: "rgba(255,255,255,0.8)", fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1 },

  priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  priceOld: { fontFamily: "Inter_400Regular", fontSize: 13, textDecorationLine: "line-through" },
  priceNew: { fontFamily: "Inter_700Bold", fontSize: 22 },
  savingsPill: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 10, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 5 },
  savingsText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },

  vibesRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  vibe: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  vibeText: { fontFamily: "Inter_400Regular", fontSize: 12 },

  extrasRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  extraChip: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  extraText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },

  bookBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 13, borderRadius: 14,
  },
  bookBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 },

  empty: { alignItems: "center", gap: 12, paddingTop: 60 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 20 },
  emptyDesc: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20 },
});

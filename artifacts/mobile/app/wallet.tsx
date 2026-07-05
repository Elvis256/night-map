import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { formatUGX, useApp } from "@/context/AppContext";

const TOPUP_AMOUNTS = [50000, 100000, 200000, 500000];

const MOCK_TRANSACTIONS = [
  { id: "t1",  type: "credit", desc: "Booking with James K.",      amount: 150000, time: "Today, 9:41 PM",    icon: "arrow-down-circle" },
  { id: "t2",  type: "debit",  desc: "Platform fee",               amount: -30000, time: "Today, 9:41 PM",    icon: "remove-circle"     },
  { id: "t3",  type: "credit", desc: "Tip from Brian M.",           amount: 20000,  time: "Today, 7:15 PM",    icon: "heart-circle"      },
  { id: "t4",  type: "credit", desc: "Booking with Kevin O.",       amount: 120000, time: "Yesterday, 11pm",   icon: "arrow-down-circle" },
  { id: "t5",  type: "debit",  desc: "Platform fee",               amount: -24000, time: "Yesterday, 11pm",   icon: "remove-circle"     },
  { id: "t6",  type: "debit",  desc: "Payout to MTN Mobile Money", amount: -200000, time: "Mon, 8 Jul",       icon: "arrow-up-circle"   },
  { id: "t7",  type: "credit", desc: "Booking with Andre T.",       amount: 180000, time: "Mon, 8 Jul",        icon: "arrow-down-circle" },
  { id: "t8",  type: "credit", desc: "Top-up via Airtel Money",    amount: 100000, time: "Sun, 7 Jul",        icon: "wallet"            },
];

const PAYOUT_METHODS = ["MTN Mobile Money", "Airtel Money", "Bank Transfer"];

export default function WalletScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userProfile, walletCredit } = useApp();
  const [selectedTopup, setSelectedTopup] = useState<number | null>(null);
  const [payoutMethod, setPayoutMethod] = useState(0);
  const [tab, setTab] = useState<"wallet" | "earnings">(userProfile.isCompanion ? "earnings" : "wallet");

  const handleTopup = () => {
    if (!selectedTopup) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      "Top-Up Initiated",
      `UGX ${selectedTopup.toLocaleString()} via Mobile Money.\n\nYou'll receive a prompt on your phone to confirm payment.`,
      [{ text: "OK" }]
    );
    setSelectedTopup(null);
  };

  const handlePayout = () => {
    if (userProfile.pendingPayout <= 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      "Payout Requested",
      `UGX ${userProfile.pendingPayout.toLocaleString()} will be sent to ${PAYOUT_METHODS[payoutMethod]} within 24 hours.`,
      [{ text: "Done" }]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 60 : insets.top + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Wallet</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Balance card */}
      <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
        <View style={styles.balanceGlow} />
        <Text style={styles.balanceLabel}>
          {userProfile.isCompanion ? "Pending Payout" : "Wallet Balance"}
        </Text>
        <Text style={styles.balanceAmount}>
          {formatUGX(userProfile.isCompanion ? userProfile.pendingPayout : userProfile.walletBalance)}
        </Text>
        {userProfile.isCompanion && (
          <Text style={styles.balanceSub}>
            Total earned: {formatUGX(userProfile.totalEarnings)}
          </Text>
        )}
        <View style={styles.balanceBadges}>
          <View style={styles.balanceBadge}>
            <Ionicons name="shield-checkmark" size={12} color="rgba(255,255,255,0.8)" />
            <Text style={styles.balanceBadgeText}>Secured</Text>
          </View>
          <View style={styles.balanceBadge}>
            <Ionicons name="flash" size={12} color="rgba(255,255,255,0.8)" />
            <Text style={styles.balanceBadgeText}>Instant transfers</Text>
          </View>
        </View>
      </View>

      {/* Tab bar (for companions) */}
      {userProfile.isCompanion && (
        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          {(["earnings", "wallet"] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabLabel, { color: tab === t ? colors.primary : colors.mutedForeground }]}>
                {t === "earnings" ? "Earnings & Payout" : "Top-Up"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === "web" ? 32 : insets.bottom + 24 }]}
      >
        {/* ── EARNINGS TAB (companions) ─────────────────── */}
        {tab === "earnings" && userProfile.isCompanion && (
          <>
            {/* Payout */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Withdraw Earnings</Text>
              <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>Available: {formatUGX(userProfile.pendingPayout)}</Text>

              <View style={styles.methodRow}>
                {PAYOUT_METHODS.map((m, i) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.methodBtn,
                      {
                        backgroundColor: payoutMethod === i ? "rgba(255,78,98,0.1)" : colors.background,
                        borderColor: payoutMethod === i ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => { setPayoutMethod(i); Haptics.selectionAsync(); }}
                  >
                    <Text style={[styles.methodText, { color: payoutMethod === i ? colors.primary : colors.foreground }]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: userProfile.pendingPayout > 0 ? "#1FBF6B" : colors.muted }]}
                onPress={handlePayout}
              >
                <Ionicons name="arrow-up-circle" size={17} color="#fff" />
                <Text style={styles.primaryBtnText}>
                  {userProfile.pendingPayout > 0
                    ? `Withdraw ${formatUGX(userProfile.pendingPayout)}`
                    : "No pending balance"}
                </Text>
              </TouchableOpacity>

              <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
                Minimum payout: UGX 50,000 · Processed within 24 hours
              </Text>
            </View>

            {/* Stats */}
            <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {[
                { label: "This Month",   value: formatUGX(420000), color: "#1FBF6B" },
                { label: "Bookings",     value: "12",              color: colors.foreground },
                { label: "Avg Rating",   value: "4.8 ★",           color: "#FF8A3D" },
              ].map(s => (
                <View key={s.label} style={styles.statBlock}>
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── TOP-UP TAB (seekers) or wallet tab ───────── */}
        {(tab === "wallet" || !userProfile.isCompanion) && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Add Funds</Text>
            <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
              Funds are secured until a booking is confirmed
            </Text>

            <View style={styles.topupGrid}>
              {TOPUP_AMOUNTS.map(amt => (
                <TouchableOpacity
                  key={amt}
                  style={[
                    styles.topupBtn,
                    {
                      backgroundColor: selectedTopup === amt ? "rgba(255,78,98,0.12)" : colors.background,
                      borderColor: selectedTopup === amt ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => { setSelectedTopup(amt === selectedTopup ? null : amt); Haptics.selectionAsync(); }}
                >
                  <Text style={[styles.topupAmount, { color: selectedTopup === amt ? colors.primary : colors.foreground }]}>
                    {(amt / 1000).toFixed(0)}k
                  </Text>
                  <Text style={[styles.topupSub, { color: colors.mutedForeground }]}>UGX</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.mobileMoneyRow}>
              {["MTN", "Airtel", "Visa"].map(p => (
                <View key={p} style={[styles.mmBadge, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.mmText, { color: colors.foreground }]}>{p}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: selectedTopup ? colors.primary : colors.muted }]}
              onPress={selectedTopup ? handleTopup : undefined}
            >
              <Ionicons name="wallet-outline" size={17} color="#fff" />
              <Text style={styles.primaryBtnText}>
                {selectedTopup ? `Add UGX ${selectedTopup.toLocaleString()}` : "Select an amount"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── TRANSACTION HISTORY ──────────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Transaction History</Text>
          {MOCK_TRANSACTIONS.map((tx, i) => (
            <View
              key={tx.id}
              style={[
                styles.txRow,
                i < MOCK_TRANSACTIONS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <View style={[styles.txIcon, { backgroundColor: tx.type === "credit" ? "rgba(31,191,107,0.12)" : "rgba(255,78,98,0.08)" }]}>
                <Ionicons
                  name={tx.icon as never}
                  size={16}
                  color={tx.type === "credit" ? "#1FBF6B" : colors.mutedForeground}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.txDesc, { color: colors.foreground }]}>{tx.desc}</Text>
                <Text style={[styles.txTime, { color: colors.mutedForeground }]}>{tx.time}</Text>
              </View>
              <Text style={[styles.txAmount, { color: tx.type === "credit" ? "#1FBF6B" : colors.mutedForeground }]}>
                {tx.type === "credit" ? "+" : ""}UGX {Math.abs(tx.amount).toLocaleString()}
              </Text>
            </View>
          ))}
        </View>

        {/* Help */}
        <View style={[styles.helpCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="help-circle-outline" size={20} color={colors.mutedForeground} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.helpTitle, { color: colors.foreground }]}>Need help?</Text>
            <Text style={[styles.helpSub, { color: colors.mutedForeground }]}>Contact support for payment issues</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 8,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 20 },
  balanceCard: {
    marginHorizontal: 16, marginBottom: 8, borderRadius: 24, padding: 24, gap: 6,
    overflow: "hidden", position: "relative",
  },
  balanceGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 24,
  },
  balanceLabel: { color: "rgba(255,255,255,0.75)", fontFamily: "Inter_500Medium", fontSize: 14 },
  balanceAmount: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 36, letterSpacing: -1 },
  balanceSub: { color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular", fontSize: 13 },
  balanceBadges: { flexDirection: "row", gap: 12, marginTop: 6 },
  balanceBadge: { flexDirection: "row", alignItems: "center", gap: 5 },
  balanceBadgeText: { color: "rgba(255,255,255,0.75)", fontFamily: "Inter_500Medium", fontSize: 12 },
  tabBar: { flexDirection: "row", borderBottomWidth: 1, marginHorizontal: 16, marginBottom: 4 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  scroll: { padding: 16, gap: 12 },
  card: {
    borderRadius: 20, borderWidth: 1, padding: 18, gap: 14,
  },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
  cardSub: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: -8 },
  methodRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  methodBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5,
  },
  methodText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  primaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, borderRadius: 16,
  },
  primaryBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 },
  disclaimer: { fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center", marginTop: -6 },
  statsRow: {
    flexDirection: "row", borderRadius: 20, borderWidth: 1, padding: 18,
  },
  statBlock: { flex: 1, alignItems: "center", gap: 4 },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 18 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 12 },
  topupGrid: { flexDirection: "row", gap: 10 },
  topupBtn: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingVertical: 16, borderRadius: 16, borderWidth: 1.5, gap: 2,
  },
  topupAmount: { fontFamily: "Inter_700Bold", fontSize: 20 },
  topupSub: { fontFamily: "Inter_400Regular", fontSize: 11 },
  mobileMoneyRow: { flexDirection: "row", gap: 8, justifyContent: "center" },
  mmBadge: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, borderWidth: 1,
  },
  mmText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  txRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  txIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  txDesc: { fontFamily: "Inter_500Medium", fontSize: 14 },
  txTime: { fontFamily: "Inter_400Regular", fontSize: 12 },
  txAmount: { fontFamily: "Inter_700Bold", fontSize: 14 },
  helpCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 16, borderWidth: 1, padding: 16,
  },
  helpTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  helpSub: { fontFamily: "Inter_400Regular", fontSize: 12 },
});

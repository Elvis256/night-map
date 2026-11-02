import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getGetWalletQueryKey, useGetWallet } from "@workspace/api-client-react";
import { useColors } from "@workspace/nightmap-design-system/hooks/use-colors";
import {
  nativeFontFamily,
  nativeRadius,
  nativeSpacing,
  withAlpha,
} from "@workspace/nightmap-design-system/lib/native-theme";
import { formatUGX, relativeTime, useApp } from "@/context/AppContext";

const KIND_LABEL: Record<string, string> = {
  topup: "Top-up",
  booking_charge: "Booking charge",
  earning: "Meetup earning",
  payout: "Payout",
  tip: "Tip",
  referral_bonus: "Referral bonus",
  adjustment: "Adjustment",
};

export default function WalletScreen() {
  const colors = useColors("dark");
  const insets = useSafeAreaInsets();
  const { userProfile } = useApp();
  const isCompanion = userProfile.isCompanion;
  const walletQuery = useGetWallet({ query: { queryKey: getGetWalletQueryKey(), staleTime: 15_000 } });
  const wallet = walletQuery.data;
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 60 : insets.top + 4 }]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {isCompanion ? "Earnings & payouts" : "Wallet"}
        </Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Platform.OS === "web" ? nativeSpacing * 8 : insets.bottom + nativeSpacing * 8 },
        ]}
      >
        <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: withAlpha(colors.primary, 0.14) }]}>
            <Ionicons name="wallet-outline" size={25} color={colors.primary} />
          </View>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>WALLET BALANCE</Text>
          {walletQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={[styles.title, { color: colors.foreground }]}>{formatUGX(wallet?.balance ?? 0)}</Text>
          )}
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: isCompanion ? "#1FBF6B" : colors.primary }]}>
                {formatUGX(isCompanion ? wallet?.totalEarnings ?? 0 : wallet?.totalSpent ?? 0)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                {isCompanion ? "EARNED FROM MEETUPS" : "SPENT ON MEETUPS"}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{formatUGX(wallet?.pendingPayout ?? 0)}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>PENDING PAYOUT</Text>
            </View>
          </View>
          <View style={[styles.notice, { backgroundColor: withAlpha(colors.accent, 0.1) }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.accent} />
            <Text style={[styles.noticeText, { color: colors.foreground }]}>
              {isCompanion
                ? "Meetup amounts are agreed and paid directly with clients. In-app top-ups and payouts are not connected yet."
                : "Meetup amounts are agreed and paid directly with companions. In-app top-ups are not connected yet."}
            </Text>
          </View>
        </View>
        <View style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.historyHeader}>
            <Ionicons name="receipt-outline" size={19} color={colors.mutedForeground} />
            <Text style={[styles.historyTitle, { color: colors.foreground }]}>Transaction history</Text>
          </View>
          {!walletQuery.isLoading && (wallet?.transactions.length ?? 0) === 0 && (
            <Text style={[styles.historyBody, { color: colors.mutedForeground }]}>
              No transactions yet. Completed meetups and future top-ups or payouts will appear here.
            </Text>
          )}
          {(wallet?.transactions ?? []).map((tx) => (
            <View key={tx.id} style={[styles.txRow, { borderTopColor: colors.border }]}>
              <View style={[styles.txIcon, { backgroundColor: tx.amount >= 0 ? "rgba(31,191,107,0.12)" : "rgba(255,78,98,0.12)" }]}>
                <Ionicons name={tx.amount >= 0 ? "arrow-down-outline" : "arrow-up-outline"} size={16} color={tx.amount >= 0 ? "#1FBF6B" : "#FF4E62"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.txTitle, { color: colors.foreground }]}>{KIND_LABEL[tx.kind] ?? tx.kind}</Text>
                <Text style={[styles.txMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {relativeTime(tx.createdAt)}{tx.reference ? ` · ${tx.reference}` : ""}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.txAmount, { color: tx.amount >= 0 ? "#1FBF6B" : colors.foreground }]}>
                  {tx.amount >= 0 ? "+" : "-"}{formatUGX(Math.abs(tx.amount))}
                </Text>
                <Text style={[styles.txMeta, { color: tx.status === "completed" ? "#1FBF6B" : tx.status === "failed" ? "#FF4E62" : colors.accent }]}>
                  {tx.status}
                </Text>
              </View>
            </View>
          ))}
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          disabled
          style={[
            styles.disabledButton,
            { backgroundColor: colors.muted, borderColor: colors.border },
          ]}
        >
          <Ionicons name="lock-closed-outline" size={17} color={colors.mutedForeground} />
          <Text style={[styles.disabledButtonText, { color: colors.mutedForeground }]}>
            {isCompanion ? "Payouts not connected yet" : "Top-ups not connected yet"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  statRow: { flexDirection: "row", alignItems: "center", width: "100%", marginTop: 4 },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statDivider: { width: 1, height: 32 },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 15 },
  statLabel: { fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 0.8, textAlign: "center" },
  txRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  txIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  txTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  txMeta: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 },
  txAmount: { fontFamily: "Inter_700Bold", fontSize: 14 },
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: nativeSpacing * 4,
    paddingBottom: nativeSpacing * 2,
  },
  backButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: nativeFontFamily.bold, fontSize: 20 },
  headerSpacer: { width: 36 },
  content: { padding: nativeSpacing * 4, gap: nativeSpacing * 3 },
  statusCard: {
    alignItems: "center",
    gap: nativeSpacing * 3,
    padding: nativeSpacing * 5,
    borderWidth: 1,
    borderRadius: nativeRadius,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: nativeRadius,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: nativeFontFamily.bold, fontSize: 20, textAlign: "center" },
  body: {
    fontFamily: nativeFontFamily.regular,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: nativeSpacing * 2,
    padding: nativeSpacing * 3,
    borderRadius: nativeRadius,
  },
  noticeText: { flex: 1, fontFamily: nativeFontFamily.medium, fontSize: 12, lineHeight: 18 },
  historyCard: {
    gap: nativeSpacing * 2,
    padding: nativeSpacing * 4,
    borderWidth: 1,
    borderRadius: nativeRadius,
  },
  historyHeader: { flexDirection: "row", alignItems: "center", gap: nativeSpacing * 2 },
  historyTitle: { fontFamily: nativeFontFamily.bold, fontSize: 15 },
  historyBody: { fontFamily: nativeFontFamily.regular, fontSize: 13, lineHeight: 19 },
  disabledButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: nativeSpacing * 2,
    paddingVertical: nativeSpacing * 4,
    borderRadius: nativeRadius,
    borderWidth: 1,
  },
  disabledButtonText: { fontFamily: nativeFontFamily.bold, fontSize: 13 },
});

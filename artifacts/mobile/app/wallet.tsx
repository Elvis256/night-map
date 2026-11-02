import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@workspace/nightmap-design-system/hooks/use-colors";
import {
  nativeFontFamily,
  nativeRadius,
  nativeSpacing,
  withAlpha,
} from "@workspace/nightmap-design-system/lib/native-theme";
import { useApp } from "@/context/AppContext";

export default function WalletScreen() {
  const colors = useColors("dark");
  const insets = useSafeAreaInsets();
  const { userProfile } = useApp();
  const isCompanion = userProfile.isCompanion;

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
          <Text style={[styles.title, { color: colors.foreground }]}>
            Money services aren’t connected
          </Text>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>
            {isCompanion
              ? "Earnings, balances, and payouts aren’t available in this preview."
              : "Wallet balances and top-ups aren’t available in this preview."}
          </Text>
          <View style={[styles.notice, { backgroundColor: withAlpha(colors.accent, 0.1) }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.accent} />
            <Text style={[styles.noticeText, { color: colors.foreground }]}>
              No booking charge, tip, top-up, or payout is processed here. Old demo amounts are not real transaction records.
            </Text>
          </View>
        </View>

        <View style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.historyHeader}>
            <Ionicons name="receipt-outline" size={19} color={colors.mutedForeground} />
            <Text style={[styles.historyTitle, { color: colors.foreground }]}>Transaction history</Text>
          </View>
          <Text style={[styles.historyBody, { color: colors.mutedForeground }]}>
            No live transaction history is available. Payment and payout details will appear here if checkout is approved and connected.
          </Text>
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
            Top-ups and payouts unavailable
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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

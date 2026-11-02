import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
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

export default function PaymentScreen() {
  const colors = useColors("dark");
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 56 : insets.top + 4 }]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Payments</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: withAlpha(colors.primary, 0.14) }]}>
          <Ionicons name="card-outline" size={30} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Payments aren’t available yet
        </Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          No payment provider is connected in this app. This screen will not ask for card or mobile-money details, charge you, or add funds to a wallet.
        </Text>
        <View style={[styles.notice, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={19} color={colors.accent} />
          <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
            Don’t send money through this preview. Checkout will be enabled only after a provider approves NightMap’s business model.
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => router.back()}
          style={[styles.backAction, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.backActionText, { color: colors.primaryForeground }]}>
            Back
          </Text>
        </TouchableOpacity>
      </View>
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
  headerTitle: { fontFamily: nativeFontFamily.bold, fontSize: 18 },
  headerSpacer: { width: 36 },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: nativeSpacing * 6,
    gap: nativeSpacing * 4,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: nativeRadius,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: nativeFontFamily.bold, fontSize: 23, textAlign: "center" },
  body: {
    maxWidth: 380,
    fontFamily: nativeFontFamily.regular,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  notice: {
    maxWidth: 420,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: nativeSpacing * 2,
    borderWidth: 1,
    borderRadius: nativeRadius,
    padding: nativeSpacing * 3,
  },
  noticeText: { flex: 1, fontFamily: nativeFontFamily.regular, fontSize: 12, lineHeight: 18 },
  backAction: {
    minWidth: 180,
    alignItems: "center",
    borderRadius: nativeRadius,
    paddingHorizontal: nativeSpacing * 5,
    paddingVertical: nativeSpacing * 3,
  },
  backActionText: { fontFamily: nativeFontFamily.bold, fontSize: 14 },
});

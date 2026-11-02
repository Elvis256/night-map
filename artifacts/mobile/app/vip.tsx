import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
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
import { formatUGX, useApp } from "@/context/AppContext";

type PackageOption = {
  id: string;
  title: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  accent: "primary" | "accent";
  highlighted?: boolean;
};

const CLIENT_PACKAGES: PackageOption[] = [
  {
    id: "client-free",
    title: "Free",
    price: 0,
    period: "",
    description: "Explore NightMap before choosing a paid plan.",
    features: [
      "Browse standard profiles",
      "Preview the High-End collection",
      "Safety and verification details",
    ],
    accent: "accent",
  },
  {
    id: "high-end",
    title: "High-End Access",
    price: 20_000,
    period: "/month",
    description: "For clients who want access to premium profiles.",
    features: [
      "View full High-End profiles",
      "Use premium discovery filters",
      "Save profiles for later",
    ],
    accent: "primary",
    highlighted: true,
  },
  {
    id: "client-vip",
    title: "NightMap VIP",
    price: 35_000,
    period: "/month",
    description: "High-End Access plus extra discovery features.",
    features: [
      "Everything in High-End Access",
      "Incognito browsing",
      "Early access to featured deals",
    ],
    accent: "accent",
  },
];

const COMPANION_PACKAGES: PackageOption[] = [
  {
    id: "companion-basic",
    title: "Basic Listing",
    price: 0,
    period: "",
    description: "Start with a free profile and receive client requests.",
    features: [
      "Standard placement in city results",
      "Show your rates and availability",
      "Manage booking requests",
      "Verification and safety features stay free",
    ],
    accent: "accent",
  },
  {
    id: "companion-featured",
    title: "Featured",
    price: 100_000,
    period: "/week",
    description: "Optional extra visibility for your profile.",
    features: [
      "Boosted placement in discovery",
      "Featured label on your profile",
      "Keep the free listing if you don't upgrade",
    ],
    accent: "primary",
    highlighted: true,
  },
];

export default function VipScreen() {
  const colors = useColors("dark");
  const insets = useSafeAreaInsets();
  const { userProfile } = useApp();
  const isCompanion = userProfile.isCompanion;
  const packages = isCompanion ? COMPANION_PACKAGES : CLIENT_PACKAGES;
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const selectedPackage = packages.find((option) => option.id === selectedPackageId);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 56 : insets.top + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Packages</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 140 }]}
      >
        <View style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: withAlpha(colors.primary, 0.14) }]}>
            <Ionicons
              name={isCompanion ? "trending-up-outline" : "diamond-outline"}
              size={26}
              color={colors.primary}
            />
          </View>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>
            {isCompanion ? "Grow your reach" : "Choose your access"}
          </Text>
          <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
            {isCompanion
              ? "Start with a free listing. Upgrade only when extra visibility is worth it."
              : "Browse for free, then unlock the High-End collection if it fits you."}
          </Text>
        </View>

        <View style={[styles.notice, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={19} color={colors.accent} />
          <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
            Package preview only. Checkout is not connected, so no payment or access will be activated here.
          </Text>
        </View>

        <View style={styles.packageList}>
          {packages.map((option) => {
            const isSelected = selectedPackageId === option.id;
            const accent = option.accent === "primary" ? colors.primary : colors.accent;

            return (
            <TouchableOpacity
              key={option.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => setSelectedPackageId(option.id)}
              style={[
                styles.packageCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isSelected || option.highlighted ? accent : colors.border,
                },
              ]}
              activeOpacity={0.85}
            >
              <View style={styles.packageHeading}>
                <View style={styles.packageTitleBlock}>
                  <View style={styles.packageTitleRow}>
                    <Text style={[styles.packageTitle, { color: colors.foreground }]}>
                      {option.title}
                    </Text>
                    {option.highlighted && (
                      <View style={[styles.recommendedBadge, { backgroundColor: withAlpha(accent, 0.14) }]}>
                        <Text style={[styles.recommendedText, { color: accent }]}>
                          {isCompanion ? "OPTIONAL" : "RECOMMENDED"}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.packageDescription, { color: colors.mutedForeground }]}>
                    {option.description}
                  </Text>
                </View>
                <View style={styles.priceBlock}>
                  <Text style={[styles.packagePrice, { color: accent }]}>
                    {option.price === 0 ? "Free" : formatUGX(option.price)}
                  </Text>
                  {option.period ? (
                    <Text style={[styles.packagePeriod, { color: colors.mutedForeground }]}>
                      {option.period}
                    </Text>
                  ) : null}
                </View>
                <View
                  style={[
                    styles.selectionMark,
                    {
                      borderColor: isSelected ? accent : colors.border,
                      backgroundColor: isSelected ? accent : "transparent",
                    },
                  ]}
                >
                  {isSelected && <Ionicons name="checkmark" size={13} color={colors.primaryForeground} />}
                </View>
              </View>

              <View style={styles.featureList}>
                {option.features.map((feature) => (
                  <View key={feature} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={17} color={accent} />
                    <Text style={[styles.featureText, { color: colors.foreground }]}>
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>

              {option.id === "companion-featured" && (
                <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
                  Featured placement does not guarantee clients or bookings.
                </Text>
              )}
            </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + nativeSpacing * 4,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.checkoutNote, { color: colors.mutedForeground }]}>
          {selectedPackage
            ? `${selectedPackage.title} selected · Checkout is not available yet`
            : "Choose a package to review it"}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          style={[styles.checkoutButton, { backgroundColor: colors.primary, opacity: 0.5 }]}
          disabled
        >
          <Ionicons name="lock-closed-outline" size={18} color={colors.primaryForeground} />
          <Text style={[styles.checkoutButtonText, { color: colors.primaryForeground }]}>
            Checkout not set up
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: nativeSpacing * 4, paddingBottom: nativeSpacing * 2,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: nativeFontFamily.bold, fontSize: 18 },
  content: {
    paddingHorizontal: nativeSpacing * 4,
    paddingTop: nativeSpacing * 2,
    gap: nativeSpacing * 4,
  },
  hero: { alignItems: "center", gap: nativeSpacing * 2 },
  heroIcon: {
    width: 56, height: 56, borderRadius: nativeRadius,
    alignItems: "center", justifyContent: "center",
  },
  heroTitle: { fontFamily: nativeFontFamily.bold, fontSize: 25, textAlign: "center" },
  heroSub: {
    fontFamily: nativeFontFamily.regular, fontSize: 14, lineHeight: 21,
    textAlign: "center", maxWidth: 340,
  },
  notice: {
    flexDirection: "row", alignItems: "flex-start", gap: nativeSpacing * 2,
    borderWidth: 1, borderRadius: nativeRadius, padding: nativeSpacing * 3,
  },
  noticeText: { flex: 1, fontFamily: nativeFontFamily.regular, fontSize: 12, lineHeight: 18 },
  packageList: { gap: nativeSpacing * 3 },
  packageCard: {
    borderWidth: 1.5, borderRadius: nativeRadius, padding: nativeSpacing * 4,
    gap: nativeSpacing * 3,
  },
  packageHeading: { flexDirection: "row", alignItems: "flex-start", gap: nativeSpacing * 2 },
  packageTitleBlock: { flex: 1, gap: nativeSpacing },
  packageTitleRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: nativeSpacing * 2 },
  packageTitle: { fontFamily: nativeFontFamily.bold, fontSize: 17 },
  packageDescription: { fontFamily: nativeFontFamily.regular, fontSize: 12, lineHeight: 18 },
  recommendedBadge: { paddingHorizontal: nativeSpacing * 2, paddingVertical: nativeSpacing, borderRadius: nativeRadius },
  recommendedText: { fontFamily: nativeFontFamily.bold, fontSize: 9, letterSpacing: 0.5 },
  priceBlock: { alignItems: "flex-end", gap: 2 },
  packagePrice: { fontFamily: nativeFontFamily.bold, fontSize: 16 },
  packagePeriod: { fontFamily: nativeFontFamily.regular, fontSize: 11 },
  featureList: { gap: nativeSpacing * 2 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: nativeSpacing * 2 },
  featureText: { flex: 1, fontFamily: nativeFontFamily.medium, fontSize: 12, lineHeight: 18 },
  disclaimer: { fontFamily: nativeFontFamily.regular, fontSize: 11, lineHeight: 16 },
  selectionMark: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingTop: nativeSpacing * 3, paddingHorizontal: nativeSpacing * 4,
    borderTopWidth: StyleSheet.hairlineWidth, gap: nativeSpacing * 2,
  },
  checkoutNote: { fontFamily: nativeFontFamily.regular, fontSize: 12, textAlign: "center" },
  checkoutButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: nativeSpacing * 2, borderRadius: nativeRadius, paddingVertical: nativeSpacing * 4,
  },
  checkoutButtonText: { fontFamily: nativeFontFamily.bold, fontSize: 14 },
});

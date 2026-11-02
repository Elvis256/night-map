import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getGetEntitlementsQueryKey,
  getListPackagesQueryKey,
  requestSubscription,
  useGetEntitlements,
  useListPackages,
  type Package,
} from "@workspace/api-client-react";
import { useColors } from "@workspace/nightmap-design-system/hooks/use-colors";
import {
  nativeFontFamily,
  nativeRadius,
  nativeSpacing,
  withAlpha,
} from "@workspace/nightmap-design-system/lib/native-theme";
import { formatUGX, relativeTime, useApp } from "@/context/AppContext";
import { errorMessage } from "@/lib/api";

export default function VipScreen() {
  const colors = useColors("dark");
  const insets = useSafeAreaInsets();
  const { userProfile, invalidate } = useApp();
  const isCompanion = userProfile.isCompanion;
  const packagesQuery = useListPackages({ query: { queryKey: getListPackagesQueryKey(), staleTime: 600_000 } });
  const entitlementsQuery = useGetEntitlements({ query: { queryKey: getGetEntitlementsQueryKey(), staleTime: 30_000 } });
  const packages: Package[] = packagesQuery.data ?? [];
  const entitlements = entitlementsQuery.data;
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const selectedPackage = packages.find((option) => option.id === selectedPackageId);
  const activeId = entitlements?.activePackageId;
  const pending = entitlements?.pendingRequest ?? null;
  const selectedIsActive = !!selectedPackage && selectedPackage.id === activeId;
  const selectedIsPending = !!selectedPackage && pending?.packageId === selectedPackage.id;
  const canRequest = !!selectedPackage && selectedPackage.price > 0 && !selectedIsActive && !selectedIsPending && !requesting;

  const handleRequest = async () => {
    if (!selectedPackage || !canRequest) return;
    setRequesting(true);
    try {
      await requestSubscription({ packageId: selectedPackage.id });
      invalidate([getGetEntitlementsQueryKey()]);
      Alert.alert(
        "Request received",
        `We've noted your interest in ${selectedPackage.title}. Checkout isn't open yet, so nothing has been charged. We'll notify you the moment it's available.`,
      );
    } catch (err) {
      Alert.alert("Could not send request", errorMessage(err));
    } finally {
      setRequesting(false);
    }
  };

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
        {entitlements && (
          <View style={[styles.notice, { backgroundColor: withAlpha("#1FBF6B", 0.08), borderColor: withAlpha("#1FBF6B", 0.3) }]}>
            <Ionicons name="checkmark-circle-outline" size={19} color="#1FBF6B" />
            <Text style={[styles.noticeText, { color: colors.foreground }]}>
              Current plan: {packages.find((p) => p.id === activeId)?.title ?? activeId}
              {entitlements.activeUntil ? ` · until ${new Date(entitlements.activeUntil).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : ""}
              {!isCompanion && !entitlements.unlimitedSuperRequests ? ` · ${entitlements.superRequestsLeftToday} super requests left today` : ""}
            </Text>
          </View>
        )}
        {pending && (
          <View style={[styles.notice, { backgroundColor: withAlpha(colors.accent, 0.08), borderColor: withAlpha(colors.accent, 0.3) }]}>
            <Ionicons name="time-outline" size={19} color={colors.accent} />
            <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
              Request for {packages.find((p) => p.id === pending.packageId)?.title ?? pending.packageId} noted {relativeTime(pending.createdAt).toLowerCase()}. We'll notify you when checkout opens.
            </Text>
          </View>
        )}
        <View style={[styles.notice, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={19} color={colors.accent} />
          <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
            Checkout is not connected yet. You can register interest in a package; nothing is charged and no access is activated until payments go live.
          </Text>
        </View>
        {packagesQuery.isLoading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />}
        <View style={styles.packageList}>
          {packages.map((option) => {
            const isSelected = selectedPackageId === option.id;
            const isActive = option.id === activeId;
            const accent = option.highlighted ? colors.primary : colors.accent;
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
                  borderColor: isSelected || option.highlighted || isActive ? (isActive ? "#1FBF6B" : accent) : colors.border,
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
                    {isActive ? (
                      <View style={[styles.recommendedBadge, { backgroundColor: withAlpha("#1FBF6B", 0.14) }]}>
                        <Text style={[styles.recommendedText, { color: "#1FBF6B" }]}>CURRENT</Text>
                      </View>
                    ) : option.highlighted ? (
                      <View style={[styles.recommendedBadge, { backgroundColor: withAlpha(accent, 0.14) }]}>
                        <Text style={[styles.recommendedText, { color: accent }]}>
                          {isCompanion ? "OPTIONAL" : "RECOMMENDED"}
                        </Text>
                      </View>
                    ) : null}
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
            ? selectedIsActive
              ? `${selectedPackage.title} is your current plan`
              : selectedIsPending
                ? `${selectedPackage.title} request already noted`
                : selectedPackage.price === 0
                  ? `${selectedPackage.title} is free and always on`
                  : `${selectedPackage.title} selected · ${formatUGX(selectedPackage.price)}${selectedPackage.period}`
            : "Choose a package to review it"}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: !canRequest }}
          style={[styles.checkoutButton, { backgroundColor: colors.primary, opacity: canRequest ? 1 : 0.5 }]}
          disabled={!canRequest}
          onPress={handleRequest}
        >
          {requesting ? <ActivityIndicator color={colors.primaryForeground} /> : <Ionicons name={canRequest ? "notifications-outline" : "lock-closed-outline"} size={18} color={colors.primaryForeground} />}
          <Text style={[styles.checkoutButtonText, { color: colors.primaryForeground }]}>
            {canRequest ? "Notify me when checkout opens" : "Checkout not set up"}
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

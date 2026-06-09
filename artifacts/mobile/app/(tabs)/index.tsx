import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { Companion, useApp } from "@/context/AppContext";

import { TrustBadge } from "@/components/TrustBadge";
import { FilterModal } from "@/components/FilterModal";

const CITIES = ["Kampala", "Entebbe", "Mbarara", "Gulu", "Jinja", "Nairobi", "Dar es Salaam", "Dubai"];

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Kampala:        { lat:  0.3476, lng: 32.5825 },
  Entebbe:        { lat:  0.0512, lng: 32.4637 },
  Mbarara:        { lat: -0.6073, lng: 30.6573 },
  Gulu:           { lat:  2.7748, lng: 32.2991 },
  Jinja:          { lat:  0.4478, lng: 33.2026 },
  Nairobi:        { lat: -1.2921, lng: 36.8219 },
  "Dar es Salaam":{ lat: -6.7924, lng: 39.2083 },
  Dubai:          { lat: 25.2048, lng: 55.2708 },
};

function nearestCity(lat: number, lng: number): string {
  let best = "Kampala";
  let bestDist = Infinity;
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    const dLat = (coords.lat - lat) * (Math.PI / 180);
    const dLng = (coords.lng - lng) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat * (Math.PI / 180)) * Math.cos(coords.lat * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2;
    const dist = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (dist < bestDist) { bestDist = dist; best = city; }
  }
  return best;
}

const STATUS_COLOR: Record<string, string> = {
  now: "#22c55e",
  tonight: "#FF8A3D",
  offline: "#6b6b8a",
};

function MapPinView({
  companion,
  isSelected,
  onPress,
  pulseAnim,
}: {
  companion: Companion;
  isSelected: boolean;
  onPress: () => void;
  pulseAnim?: Animated.Value;
}) {
  const colors = useColors();
  const dotColor = STATUS_COLOR[companion.availabilityStatus];

  return (
    <TouchableOpacity
      style={[
        styles.pin,
        {
          backgroundColor: isSelected ? colors.primary : companion.color,
          borderColor: isSelected ? "#fff" : dotColor,
          borderWidth: isSelected ? 2.5 : 1.5,
          opacity: companion.availabilityStatus === "offline" ? 0.5 : 1,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {companion.isSpotlight && (
        <View style={styles.crownBadge}>
          <Ionicons name="star" size={8} color="#FF8A3D" />
        </View>
      )}
      {companion.isTonightsDeal && pulseAnim && (
        <Animated.View style={[styles.dealRing, { borderColor: "#FF8A3D", transform: [{ scale: pulseAnim }], opacity: pulseAnim.interpolate({ inputRange: [1, 1.4], outputRange: [0.8, 0] }) }]} />
      )}
      <Text style={styles.pinInitial}>{companion.name[0]}</Text>
    </TouchableOpacity>
  );
}

function BadgeRow({ companion, colors }: { companion: Companion; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.badgeRow}>
      {companion.isHotStreak && (
        <View style={[styles.badge, { backgroundColor: "rgba(229,57,53,0.15)", borderColor: "#e53935" }]}>
          <Ionicons name="flame" size={10} color="#e53935" />
          <Text style={[styles.badgeText, { color: "#e53935" }]}>Hot Streak</Text>
        </View>
      )}
      {companion.isNewInTown && (
        <View style={[styles.badge, { backgroundColor: "rgba(33,150,243,0.15)", borderColor: "#2196f3" }]}>
          <Ionicons name="sparkles" size={10} color="#2196f3" />
          <Text style={[styles.badgeText, { color: "#2196f3" }]}>New in Town</Text>
        </View>
      )}
      {companion.isTonightsDeal && (
        <View style={[styles.badge, { backgroundColor: "rgba(255,138,61,0.15)", borderColor: "#FF8A3D" }]}>
          <Ionicons name="flash" size={10} color="#FF8A3D" />
          <Text style={[styles.badgeText, { color: "#FF8A3D" }]}>{companion.dealDiscount}% Deal</Text>
        </View>
      )}
    </View>
  );
}

function CompanionPinCard({ companion, onClose, colors }: { companion: Companion; onClose: () => void; colors: ReturnType<typeof useColors> }) {
  const dotColor = STATUS_COLOR[companion.availabilityStatus];
  return (
    <Pressable
      style={[styles.pinCard, { backgroundColor: colors.card, borderColor: companion.isTonightsDeal ? "#FF8A3D" : colors.border }]}
      onPress={() => { onClose(); router.push(`/companion/${companion.id}`); }}
    >
      <View style={[styles.pinCardAvatar, { backgroundColor: companion.color }]}>
        <Text style={styles.pinCardInitial}>{companion.name[0]}</Text>
        <View style={[styles.statusDot, { backgroundColor: dotColor, borderColor: colors.card }]} />
      </View>
      <View style={styles.pinCardInfo}>
        <View style={styles.pinNameRow}>
          <Text style={[styles.pinCardName, { color: colors.foreground }]}>{companion.name}, {companion.age}</Text>
          {companion.isSpotlight && <Ionicons name="star" size={12} color="#FF8A3D" />}
        </View>
        <Text style={[styles.pinCardDist, { color: colors.mutedForeground }]}>
          {companion.distance} km · UGX {(companion.rate / 1000).toFixed(0)}k/hr
        </Text>
        <BadgeRow companion={companion} colors={colors} />
      </View>
      <View style={styles.pinCardRight}>
        <TrustBadge score={companion.trustScore} size="sm" />
        <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} style={{ marginTop: 8 }} />
      </View>
    </Pressable>
  );
}

const WEATHER_DATA = {
  Kampala: { icon: "🌦️", label: "Scattered showers · 22°C", tip: "Indoor venues recommended tonight", color: "#3DA9FF" },
  Nairobi: { icon: "⛅", label: "Partly cloudy · 19°C", tip: "Good evening for rooftop bars", color: "#FF8A3D" },
  "Dar es Salaam": { icon: "🌙", label: "Clear · 28°C", tip: "Perfect beach night", color: "#1FBF6B" },
  Entebbe: { icon: "🌧️", label: "Heavy rain · 21°C", tip: "Stay indoors — great night for dinner", color: "#3DA9FF" },
  default: { icon: "⛅", label: "Partly cloudy · 24°C", tip: "Nice evening ahead", color: "#FF8A3D" },
};

const POWER_ZONES = [
  { x: 18, y: 22, label: "Ntinda", status: "out" as const },
  { x: 62, y: 44, label: "Kabalagala", status: "warning" as const },
  { x: 80, y: 18, label: "Mukono", status: "out" as const },
  { x: 38, y: 68, label: "Entebbe Rd", status: "warning" as const },
];

export default function MapScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { filteredCompanions, userProfile, updateProfile, filters, setUserCity } = useApp();
  const [selectedCity, setSelectedCity] = useState("Kampala");
  const [locating, setLocating] = useState(true);
  const [locationDenied, setLocationDenied] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showWeather, setShowWeather] = useState(false);
  const [showPowerCut, setShowPowerCut] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dealPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (!cancelled) { setLocating(false); setLocationDenied(true); }
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled) {
          const city = nearestCity(pos.coords.latitude, pos.coords.longitude);
          setSelectedCity(city);
          setUserCity(city);
          setLocating(false);
        }
      } catch {
        if (!cancelled) setLocating(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const weather = (WEATHER_DATA as Record<string, typeof WEATHER_DATA.default>)[selectedCity] ?? WEATHER_DATA.default;

  const companions = filteredCompanions(userProfile.isLadiesMode);
  const onlineNow = companions.filter((c) => c.availabilityStatus === "now").length;
  const trending = [...companions].sort((a, b) => b.completedMeetups - a.completedMeetups).slice(0, 4);
  const selectedCompanion = companions.find((c) => c.id === selectedId) ?? null;

  const activeFilterCount = [
    filters.maxDistance < 50,
    filters.minRating > 0,
    filters.verifiedOnly,
    filters.status !== "all",
    filters.maxRate < 500000,
  ].filter(Boolean).length;

  useEffect(() => {
    const liveP = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    const dealP = Animated.loop(
      Animated.sequence([
        Animated.timing(dealPulse, { toValue: 1.6, duration: 700, useNativeDriver: true }),
        Animated.timing(dealPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    liveP.start();
    dealP.start();
    return () => { liveP.stop(); dealP.stop(); };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.cityButton, { borderColor: locating ? colors.accent : colors.border, backgroundColor: colors.card }]}
          onPress={() => setShowCityPicker(!showCityPicker)}
        >
          {locating ? (
            <>
              <Ionicons name="locate-outline" size={13} color={colors.accent} />
              <Text style={[styles.cityText, { color: colors.mutedForeground }]}>Locating…</Text>
            </>
          ) : (
            <>
              <Ionicons name={locationDenied ? "location-outline" : "navigate"} size={13} color={locationDenied ? colors.mutedForeground : colors.primary} />
              <Text style={[styles.cityText, { color: colors.foreground }]}>{selectedCity}</Text>
            </>
          )}
          <Ionicons name="chevron-down" size={13} color={colors.mutedForeground} />
        </TouchableOpacity>

        <View style={styles.headerRight}>
          {userProfile.ghostMode && (
            <View style={[styles.ghostChip, { backgroundColor: "rgba(107,107,138,0.2)" }]}>
              <Ionicons name="eye-off" size={12} color={colors.mutedForeground} />
              <Text style={[styles.ghostChipText, { color: colors.mutedForeground }]}>Ghost</Text>
            </View>
          )}
          <View style={[styles.liveChip, { backgroundColor: "rgba(255,78,98,0.12)" }]}>
            <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
            <Text style={[styles.liveText, { color: colors.primary }]}>{onlineNow} live</Text>
          </View>
          <TouchableOpacity
            style={[styles.bellBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push("/notifications")}
          >
            <Ionicons name="notifications-outline" size={17} color={colors.foreground} />
            <View style={[styles.bellBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.bellBadgeText}>4</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, { backgroundColor: activeFilterCount > 0 ? "rgba(255,78,98,0.15)" : colors.card, borderColor: activeFilterCount > 0 ? colors.primary : colors.border }]}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="options" size={16} color={activeFilterCount > 0 ? colors.primary : colors.foreground} />
            {activeFilterCount > 0 && (
              <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* City picker */}
      {showCityPicker && (
        <View style={[styles.cityPicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {CITIES.map((city) => (
            <TouchableOpacity
              key={city}
              style={[styles.cityOption, selectedCity === city && { backgroundColor: colors.muted }]}
              onPress={() => { setSelectedCity(city); setShowCityPicker(false); }}
            >
              <Text style={[styles.cityOptionText, { color: selectedCity === city ? colors.primary : colors.foreground }]}>{city}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Ladies Mode banner */}
      {userProfile.isLadiesMode && (
        <View style={[styles.ladiesBanner, { backgroundColor: "rgba(33,150,243,0.12)", borderColor: "rgba(33,150,243,0.3)" }]}>
          <Ionicons name="sparkles" size={14} color="#2196f3" />
          <Text style={[styles.ladiesBannerText, { color: "#2196f3" }]}>Ladies Mode — showing Gentleman Companions only</Text>
        </View>
      )}

      {/* Map */}
      <View style={[styles.mapArea, { backgroundColor: "#0a0f1a" }]}>
        {/* Grid lines */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {[0.2, 0.4, 0.6, 0.8].map((pos) => (
            <View key={`h${pos}`} style={[styles.gridLine, styles.gridLineH, { top: `${pos * 100}%`, backgroundColor: "rgba(44,40,69,0.4)" }]} />
          ))}
          {[0.2, 0.4, 0.6, 0.8].map((pos) => (
            <View key={`v${pos}`} style={[styles.gridLine, styles.gridLineV, { left: `${pos * 100}%`, backgroundColor: "rgba(44,40,69,0.4)" }]} />
          ))}
        </View>

        {/* Companion pins */}
        {companions.map((c, i) => {
          const x = 10 + ((i * 47 + 23) % 80);
          const y = 8 + ((i * 61 + 15) % 84);
          return (
            <View key={c.id} style={{ position: "absolute", left: `${x}%`, top: `${y}%` } as never}>
              <MapPinView
                companion={c}
                isSelected={selectedId === c.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedId(selectedId === c.id ? null : c.id);
                }}
                pulseAnim={c.isTonightsDeal ? dealPulse : undefined}
              />
            </View>
          );
        })}

        {/* Map legend */}
        <View style={[styles.legend, { backgroundColor: "rgba(8,8,16,0.85)" }]}>
          {[
            { color: "#22c55e", label: "Now" },
            { color: "#FF8A3D", label: "Tonight" },
            { color: "#6b6b8a", label: "Offline" },
          ].map(({ color, label }) => (
            <View key={label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={[styles.legendText, { color: "rgba(255,255,255,0.6)" }]}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Ghost Mode toggle */}
        <TouchableOpacity
          style={[styles.ghostToggle, {
            backgroundColor: userProfile.ghostMode ? "rgba(107,107,138,0.3)" : "rgba(8,8,16,0.8)",
            borderColor: userProfile.ghostMode ? colors.mutedForeground : "rgba(44,40,69,0.6)",
          }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateProfile({ ghostMode: !userProfile.ghostMode });
          }}
        >
          <Ionicons name={userProfile.ghostMode ? "eye-off" : "eye"} size={16} color={userProfile.ghostMode ? colors.mutedForeground : "#fff"} />
          <Text style={[styles.ghostToggleText, { color: userProfile.ghostMode ? colors.mutedForeground : "#fff" }]}>
            {userProfile.ghostMode ? "Ghost On" : "Ghost Mode"}
          </Text>
        </TouchableOpacity>

        {/* Overlay toggles */}
        <View style={styles.overlayToggles}>
          <TouchableOpacity
            style={[styles.overlayBtn, { backgroundColor: showWeather ? `${weather.color}22` : "rgba(8,8,16,0.8)", borderColor: showWeather ? weather.color : "rgba(44,40,69,0.6)" }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowWeather(!showWeather); }}
          >
            <Text style={styles.overlayBtnEmoji}>{weather.icon}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.overlayBtn, { backgroundColor: showPowerCut ? "rgba(255,193,7,0.15)" : "rgba(8,8,16,0.8)", borderColor: showPowerCut ? "#FFC107" : "rgba(44,40,69,0.6)" }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowPowerCut(!showPowerCut); }}
          >
            <Ionicons name={showPowerCut ? "flash" : "flash-outline"} size={15} color={showPowerCut ? "#FFC107" : "rgba(255,255,255,0.6)"} />
          </TouchableOpacity>
        </View>

        {/* Power cut zone markers */}
        {showPowerCut && POWER_ZONES.map((z) => (
          <View
            key={z.label}
            style={[
              styles.powerZone,
              {
                left: `${z.x}%`,
                top: `${z.y}%`,
                backgroundColor: z.status === "out" ? "rgba(239,68,68,0.18)" : "rgba(255,193,7,0.14)",
                borderColor: z.status === "out" ? "rgba(239,68,68,0.5)" : "rgba(255,193,7,0.5)",
              },
            ] as never}
            pointerEvents="none"
          >
            <Ionicons name={z.status === "out" ? "flash-off" : "flash"} size={9} color={z.status === "out" ? "#ef4444" : "#FFC107"} />
            <Text style={[styles.powerZoneText, { color: z.status === "out" ? "#ef4444" : "#FFC107" }]}>{z.label}</Text>
          </View>
        ))}
      </View>

      {/* Weather banner */}
      {showWeather && (
        <View style={[styles.weatherBanner, { backgroundColor: `${weather.color}18`, borderColor: `${weather.color}40` }]}>
          <Text style={styles.weatherIcon}>{weather.icon}</Text>
          <View style={styles.weatherInfo}>
            <Text style={[styles.weatherLabel, { color: weather.color }]}>{selectedCity} — {weather.label}</Text>
            <Text style={[styles.weatherTip, { color: colors.mutedForeground }]}>{weather.tip}</Text>
          </View>
          <TouchableOpacity onPress={() => setShowWeather(false)}>
            <Ionicons name="close" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      )}

      {/* Selected pin card */}
      {selectedCompanion && (
        <View style={styles.pinCardContainer}>
          <CompanionPinCard companion={selectedCompanion} onClose={() => setSelectedId(null)} colors={colors} />
        </View>
      )}

      {/* Bottom section */}
      <View style={[styles.bottomSection, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        {/* Radio FAB */}
        <TouchableOpacity
          style={[styles.radioFab, { backgroundColor: "rgba(122,60,255,0.15)", borderColor: "rgba(122,60,255,0.5)" }]}
          onPress={() => router.push("/radio")}
        >
          <Ionicons name="radio-outline" size={17} color="#7A3CFF" />
          <Text style={[styles.radioFabText, { color: "#7A3CFF" }]}>Radio</Text>
        </TouchableOpacity>

        {/* Trending Tonight */}
        <View style={styles.trendingSection}>
          <View style={styles.trendingHeader}>
            <Ionicons name="trending-up" size={14} color={colors.primary} />
            <Text style={[styles.trendingTitle, { color: colors.foreground }]}>Trending Tonight</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingScroll}>
            {trending.map((c, i) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.trendingCard, { backgroundColor: colors.card, borderColor: c.isSpotlight ? "#FF8A3D" : colors.border }]}
                onPress={() => router.push(`/companion/${c.id}`)}
              >
                <View style={styles.trendingRank}>
                  <Text style={[styles.trendingRankNum, { color: i === 0 ? "#FF8A3D" : colors.mutedForeground }]}>#{i + 1}</Text>
                </View>
                <View style={[styles.trendingAvatar, { backgroundColor: c.color }]}>
                  <Text style={styles.trendingInitial}>{c.name[0]}</Text>
                  {c.availabilityStatus === "now" && <View style={[styles.trendingDot, { borderColor: colors.card }]} />}
                </View>
                <Text style={[styles.trendingName, { color: colors.foreground }]} numberOfLines={1}>{c.name}</Text>
                <Text style={[styles.trendingMeetups, { color: colors.mutedForeground }]}>{c.completedMeetups} meets</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      <FilterModal visible={showFilters} onClose={() => setShowFilters(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  cityButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  cityText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  ghostChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
  },
  ghostChipText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FF4E62",
  },
  liveText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  filterBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    position: "relative",
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: { color: "#fff", fontSize: 9, fontFamily: "Inter_700Bold" },
  cityPicker: {
    position: "absolute",
    top: 70,
    left: 14,
    zIndex: 100,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  cityOption: { paddingHorizontal: 20, paddingVertical: 12 },
  cityOptionText: { fontFamily: "Inter_500Medium", fontSize: 14 },
  ladiesBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  ladiesBannerText: { fontFamily: "Inter_500Medium", fontSize: 12, flex: 1 },
  mapArea: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  gridLine: { position: "absolute" },
  gridLineH: { left: 0, right: 0, height: 1 },
  gridLineV: { top: 0, bottom: 0, width: 1 },
  pin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    position: "relative",
  },
  crownBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FF8A3D",
    alignItems: "center",
    justifyContent: "center",
  },
  dealRing: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
  },
  pinInitial: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14, zIndex: 1 },
  legend: {
    position: "absolute",
    bottom: 12,
    left: 12,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  ghostToggle: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  ghostToggleText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  pinCardContainer: {
    position: "absolute",
    bottom: 196,
    left: 14,
    right: 14,
    zIndex: 20,
  },
  pinCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  pinCardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  pinCardInitial: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 18 },
  statusDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  pinCardInfo: { flex: 1, marginLeft: 10, gap: 3 },
  pinNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  pinCardName: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  pinCardDist: { fontFamily: "Inter_400Regular", fontSize: 12 },
  badgeRow: { flexDirection: "row", gap: 4, flexWrap: "wrap" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  pinCardRight: { alignItems: "center", marginLeft: 6 },
  bottomSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: Platform.OS === "web" ? 34 : 0,
  },
  trendingSection: { paddingTop: 10 },
  trendingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  trendingTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  trendingScroll: { paddingHorizontal: 14, paddingBottom: 12, gap: 10 },
  trendingCard: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    width: 80,
    gap: 4,
  },
  trendingRank: { alignSelf: "flex-start" },
  trendingRankNum: { fontFamily: "Inter_700Bold", fontSize: 11 },
  trendingAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  trendingInitial: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 },
  trendingDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#22c55e",
    borderWidth: 2,
  },
  trendingName: { fontFamily: "Inter_600SemiBold", fontSize: 12, textAlign: "center" },
  trendingMeetups: { fontFamily: "Inter_400Regular", fontSize: 10 },
  bellBtn: {
    width: 34, height: 34, borderRadius: 17, alignItems: "center",
    justifyContent: "center", borderWidth: 1, position: "relative",
  },
  bellBadge: {
    position: "absolute", top: -4, right: -4, width: 16, height: 16,
    borderRadius: 8, alignItems: "center", justifyContent: "center",
  },
  bellBadgeText: { color: "#fff", fontSize: 9, fontFamily: "Inter_700Bold" },
  radioFab: {
    flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start",
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1,
    marginHorizontal: 14, marginTop: 10, marginBottom: 2,
  },
  radioFabText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  overlayToggles: {
    position: "absolute",
    top: 54,
    right: 12,
    gap: 6,
  },
  overlayBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  overlayBtnEmoji: { fontSize: 14 },
  powerZone: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  powerZoneText: { fontFamily: "Inter_700Bold", fontSize: 9 },
  weatherBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  weatherIcon: { fontSize: 22 },
  weatherInfo: { flex: 1 },
  weatherLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  weatherTip: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
});

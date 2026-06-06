import { Ionicons } from "@expo/vector-icons";
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
import { COMPANIONS, Companion, useApp } from "@/context/AppContext";
import { TrustBadge } from "@/components/TrustBadge";

const CITIES = ["Kampala", "Nairobi", "Dubai", "London", "Paris"];

function CompanionPinCard({ companion, onClose }: { companion: Companion; onClose: () => void }) {
  const colors = useColors();
  return (
    <Pressable style={[styles.pinCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => { onClose(); router.push(`/companion/${companion.id}`); }}>
      <View style={[styles.pinCardAvatar, { backgroundColor: companion.color }]}>
        <Text style={styles.pinCardInitial}>{companion.name[0]}</Text>
        {companion.online && <View style={[styles.onlineDot, { borderColor: colors.card }]} />}
      </View>
      <View style={styles.pinCardInfo}>
        <Text style={[styles.pinCardName, { color: colors.foreground }]}>{companion.name}, {companion.age}</Text>
        <Text style={[styles.pinCardCity, { color: colors.mutedForeground }]}>{companion.distance} km away</Text>
        <View style={styles.vibeRow}>
          {companion.vibes.slice(0, 2).map((v) => (
            <View key={v} style={[styles.vibePill, { backgroundColor: colors.muted }]}>
              <Text style={[styles.vibeText, { color: colors.mutedForeground }]}>{v}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.pinCardRight}>
        <TrustBadge score={companion.trustScore} size="sm" />
        <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} style={{ marginTop: 8 }} />
      </View>
    </Pressable>
  );
}

function MapPlaceholder({ companions, selectedId, onSelect }: {
  companions: Companion[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const colors = useColors();
  return (
    <View style={[styles.mapPlaceholder, { backgroundColor: colors.muted }]}>
      <View style={styles.cityGrid}>
        {companions.filter(c => c.online).map((c, i) => {
          const x = 15 + ((i * 47 + 23) % 70);
          const y = 10 + ((i * 61 + 15) % 80);
          return (
            <TouchableOpacity
              key={c.id}
              style={[
                styles.mapPin,
                { left: `${x}%`, top: `${y}%`, backgroundColor: selectedId === c.id ? colors.primary : c.color },
              ]}
              onPress={() => onSelect(c.id)}
            >
              <Text style={styles.mapPinText}>{c.name[0]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={[styles.mapLabel, { backgroundColor: colors.card }]}>
        <Ionicons name="map-outline" size={14} color={colors.mutedForeground} />
        <Text style={[styles.mapLabelText, { color: colors.mutedForeground }]}>Live Map</Text>
      </View>
    </View>
  );
}

export default function MapScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { companions } = useApp();
  const [selectedCity, setSelectedCity] = useState("Kampala");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const onlineCount = companions.filter((c) => c.online).length;
  const selectedCompanion = companions.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: Platform.OS === "web" ? 67 : insets.top,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.cityButton, { borderColor: colors.border, backgroundColor: colors.card }]}
          onPress={() => setShowCityPicker(!showCityPicker)}
        >
          <Ionicons name="location" size={14} color={colors.primary} />
          <Text style={[styles.cityText, { color: colors.foreground }]}>{selectedCity}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.mutedForeground} />
        </TouchableOpacity>

        <View style={[styles.liveChip, { backgroundColor: "rgba(255,45,126,0.15)" }]}>
          <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
          <Text style={[styles.liveText, { color: colors.primary }]}>{onlineCount} live tonight</Text>
        </View>
      </View>

      {showCityPicker && (
        <View style={[styles.cityPicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {CITIES.map((city) => (
            <TouchableOpacity
              key={city}
              style={[styles.cityOption, selectedCity === city && { backgroundColor: colors.muted }]}
              onPress={() => { setSelectedCity(city); setShowCityPicker(false); }}
            >
              <Text style={[styles.cityOptionText, { color: selectedCity === city ? colors.primary : colors.foreground }]}>
                {city}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <MapPlaceholder
        companions={companions}
        selectedId={selectedId}
        onSelect={(id) => setSelectedId(selectedId === id ? null : id)}
      />

      {selectedCompanion && (
        <View style={styles.pinCardContainer}>
          <CompanionPinCard companion={selectedCompanion} onClose={() => setSelectedId(null)} />
        </View>
      )}

      <View style={[styles.nearbySection, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Text style={[styles.nearbySectionTitle, { color: colors.foreground }]}>Nearby Tonight</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.nearbyScroll}>
          {companions.filter((c) => c.online).map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.nearbyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(`/companion/${c.id}`)}
            >
              <View style={[styles.nearbyAvatar, { backgroundColor: c.color }]}>
                <Text style={styles.nearbyInitial}>{c.name[0]}</Text>
                <View style={[styles.onlineDot, { borderColor: colors.card, bottom: 0, right: 0 }]} />
              </View>
              <Text style={[styles.nearbyName, { color: colors.foreground }]} numberOfLines={1}>{c.name}</Text>
              <Text style={[styles.nearbyDist, { color: colors.mutedForeground }]}>{c.distance}km</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  cityButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  cityText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#ff2d7e",
  },
  liveText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  cityPicker: {
    position: "absolute",
    top: 70,
    left: 16,
    zIndex: 100,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  cityOption: { paddingHorizontal: 20, paddingVertical: 12 },
  cityOptionText: { fontFamily: "Inter_500Medium", fontSize: 15 },
  mapPlaceholder: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  cityGrid: { flex: 1, position: "relative" },
  mapPin: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  mapPinText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  mapLabel: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    opacity: 0.85,
  },
  mapLabelText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  pinCardContainer: {
    position: "absolute",
    bottom: 200,
    left: 16,
    right: 16,
    zIndex: 20,
  },
  pinCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  pinCardAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  pinCardInitial: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 20 },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22c55e",
    borderWidth: 2,
  },
  pinCardInfo: { flex: 1, marginLeft: 12, gap: 4 },
  pinCardName: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  pinCardCity: { fontFamily: "Inter_400Regular", fontSize: 13 },
  vibeRow: { flexDirection: "row", gap: 4, flexWrap: "wrap" },
  vibePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  vibeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  pinCardRight: { alignItems: "center", marginLeft: 8 },
  nearbySection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    paddingBottom: Platform.OS === "web" ? 34 : 0,
  },
  nearbySectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  nearbyScroll: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  nearbyCard: {
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    width: 80,
    gap: 6,
  },
  nearbyAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  nearbyInitial: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 18 },
  nearbyName: { fontFamily: "Inter_600SemiBold", fontSize: 12, textAlign: "center" },
  nearbyDist: { fontFamily: "Inter_400Regular", fontSize: 11 },
});

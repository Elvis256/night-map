import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { Ionicons } from "@expo/vector-icons";
import { useLocationCity } from "@/hooks/useLocationCity";

const { width: W } = Dimensions.get("window");

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { updateProfile } = useApp();

  const [page, setPage] = useState(0);
  const [role, setRole] = useState<"seeker" | "companion" | null>(null);
  const [name, setName] = useState("");
  const [detectedCity, setDetectedCity] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const { detect: detectCity, status: detectStatus } = useLocationCity((city) => {
    setDetectedCity(city);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  });

  const goTo = (next: number) => {
    Haptics.selectionAsync();
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setPage(next);
      slideAnim.setValue(next === page + 1 ? 40 : -40);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    });
  };

  const finish = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await AsyncStorage.setItem("onboarded", "true");
    updateProfile({ name: name.trim() || "Explorer", city: detectedCity ?? "Kampala", isCompanion: role === "companion" });
    router.replace("/(tabs)");
  };

  return (
    <View style={[styles.root, { paddingTop: Platform.OS === "web" ? 0 : insets.top }]}>
      {/* Background gradient layers */}
      <View style={[styles.bgGlow, { backgroundColor: page === 0 ? "#FF4E6220" : page === 1 ? "#7A3CFF20" : "#1FBF6B20" }]} />

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

        {/* ── PAGE 0: WELCOME ─────────────────────────────── */}
        {page === 0 && (
          <View style={styles.page}>
            <View style={styles.logoBlock}>
              <View style={styles.logoRing}>
                <Text style={styles.logoPin}>📍</Text>
              </View>
              <Text style={styles.logoText}>NightMap</Text>
              <Text style={styles.logoTagline}>East Africa's social companionship platform</Text>
            </View>

            <View style={styles.cityFlags}>
              {["🇺🇬 Kampala", "🇰🇪 Nairobi", "🇹🇿 Dar es Salaam"].map(f => (
                <View key={f} style={styles.flagChip}>
                  <Text style={styles.flagText}>{f}</Text>
                </View>
              ))}
            </View>

            <View style={styles.featureList}>
              {[
                { icon: "✅", text: "Verified companions only" },
                { icon: "🔒", text: "Privacy-first — ghost mode included" },
                { icon: "⭐", text: "Ratings + chemistry scores" },
                { icon: "📻", text: "City radio lounges + live streams" },
              ].map(f => (
                <View key={f.text} style={styles.featureRow}>
                  <Text style={styles.featureIcon}>{f.icon}</Text>
                  <Text style={styles.featureText}>{f.text}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: "#FF4E62" }]} onPress={() => goTo(1)}>
              <Text style={styles.primaryBtnText}>Get Started →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── PAGE 1: ROLE ─────────────────────────────────── */}
        {page === 1 && (
          <View style={styles.page}>
            <Text style={styles.pageTitle}>Who are you?</Text>
            <Text style={styles.pageSub}>Choose how you want to use NightMap</Text>

            <View style={styles.roleCards}>
              <TouchableOpacity
                style={[
                  styles.roleCard,
                  { borderColor: role === "seeker" ? "#FF4E62" : "#2A3045", backgroundColor: role === "seeker" ? "rgba(255,78,98,0.1)" : "#161923" },
                ]}
                onPress={() => { setRole("seeker"); Haptics.selectionAsync(); }}
                activeOpacity={0.85}
              >
                <Text style={styles.roleEmoji}>🌙</Text>
                <Text style={styles.roleTitle}>I'm a Seeker</Text>
                <Text style={styles.roleDesc}>Find verified companions for dinners, events, nightlife & more</Text>
                {role === "seeker" && <View style={styles.roleCheck}><Text style={styles.roleCheckText}>✓</Text></View>}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleCard,
                  { borderColor: role === "companion" ? "#7A3CFF" : "#2A3045", backgroundColor: role === "companion" ? "rgba(122,60,255,0.1)" : "#161923" },
                ]}
                onPress={() => { setRole("companion"); Haptics.selectionAsync(); }}
                activeOpacity={0.85}
              >
                <Text style={styles.roleEmoji}>💎</Text>
                <Text style={styles.roleTitle}>I'm a Companion</Text>
                <Text style={styles.roleDesc}>Earn on your own terms, set your services & build your client base</Text>
                {role === "companion" && <View style={[styles.roleCheck, { backgroundColor: "#7A3CFF" }]}><Text style={styles.roleCheckText}>✓</Text></View>}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: role ? (role === "seeker" ? "#FF4E62" : "#7A3CFF") : "#2A3045" }]}
              onPress={() => role && goTo(2)}
              activeOpacity={role ? 0.85 : 1}
            >
              <Text style={styles.primaryBtnText}>Continue →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── PAGE 2: SETUP ────────────────────────────────── */}
        {page === 2 && (
          <View style={styles.page}>
            <Text style={styles.pageTitle}>Your Profile</Text>
            <Text style={styles.pageSub}>Just the basics — you can edit everything later</Text>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>YOUR NAME</Text>
              <TextInput
                style={styles.formInput}
                placeholder={role === "companion" ? "Display name (e.g. Amara)" : "Your name"}
                placeholderTextColor="#AAB3C5"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                maxLength={30}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>YOUR CITY</Text>
              <TouchableOpacity
                style={[styles.detectBtn, detectedCity ? styles.detectBtnDone : null]}
                onPress={detectCity}
                disabled={detectStatus === "detecting"}
                activeOpacity={0.8}
              >
                {detectStatus === "detecting" ? (
                  <ActivityIndicator size="small" color="#1FBF6B" />
                ) : (
                  <Ionicons
                    name={detectedCity ? "checkmark-circle" : "location-outline"}
                    size={20}
                    color={detectedCity ? "#1FBF6B" : "#AAB3C5"}
                  />
                )}
                <Text style={[styles.detectBtnText, detectedCity ? { color: "#1FBF6B" } : null]}>
                  {detectStatus === "detecting"
                    ? "Locating you…"
                    : detectStatus === "denied"
                    ? "Location denied — tap to retry"
                    : detectedCity
                    ? detectedCity
                    : "Tap to detect your city"}
                </Text>
              </TouchableOpacity>
              {detectStatus === "denied" && (
                <Text style={styles.detectHint}>Enable Location in Settings so NightMap can show nearby companions.</Text>
              )}
            </View>

            {role === "companion" && (
              <View style={[styles.companionHint, { backgroundColor: "rgba(31,191,107,0.08)", borderColor: "rgba(31,191,107,0.3)" }]}>
                <Text style={styles.companionHintText}>💡 Companion accounts earn UGX on every booking. You keep 80% after platform fee.</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: "#1FBF6B" }]}
              onPress={finish}
            >
              <Text style={styles.primaryBtnText}>Start Exploring 🚀</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* Dot indicators */}
      <View style={[styles.dots, { paddingBottom: Platform.OS === "web" ? 24 : insets.bottom + 24 }]}>
        {[0, 1, 2].map(i => (
          <View key={i} style={[styles.dot, { backgroundColor: i === page ? "#FF4E62" : "#2A3045", width: i === page ? 24 : 8 }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0B0B0F" },
  bgGlow: { ...StyleSheet.absoluteFillObject, opacity: 0.6 },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: "center" },
  page: { gap: 24 },

  logoBlock: { alignItems: "center", gap: 12 },
  logoRing: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "rgba(255,78,98,0.12)",
    borderWidth: 2, borderColor: "rgba(255,78,98,0.4)",
    alignItems: "center", justifyContent: "center",
  },
  logoPin: { fontSize: 36 },
  logoText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 38, letterSpacing: -1 },
  logoTagline: { color: "#AAB3C5", fontFamily: "Inter_400Regular", fontSize: 15, textAlign: "center" },

  cityFlags: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  flagChip: {
    backgroundColor: "#161923", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: "#2A3045",
  },
  flagText: { color: "#AAB3C5", fontFamily: "Inter_500Medium", fontSize: 13 },

  featureList: { gap: 14 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureIcon: { fontSize: 18, width: 28, textAlign: "center" },
  featureText: { color: "#fff", fontFamily: "Inter_400Regular", fontSize: 15, flex: 1 },

  primaryBtn: {
    borderRadius: 18, paddingVertical: 16, alignItems: "center", justifyContent: "center",
    marginTop: 8,
  },
  primaryBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 17 },

  pageTitle: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 30 },
  pageSub: { color: "#AAB3C5", fontFamily: "Inter_400Regular", fontSize: 15, marginTop: -14 },

  roleCards: { gap: 14 },
  roleCard: {
    borderRadius: 20, borderWidth: 1.5, padding: 20, gap: 8, position: "relative",
  },
  roleEmoji: { fontSize: 32 },
  roleTitle: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 20 },
  roleDesc: { color: "#AAB3C5", fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  roleCheck: {
    position: "absolute", top: 16, right: 16,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#FF4E62",
    alignItems: "center", justifyContent: "center",
  },
  roleCheckText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 },

  formSection: { gap: 10 },
  formLabel: { color: "#AAB3C5", fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1 },
  formInput: {
    backgroundColor: "#161923", borderRadius: 14, borderWidth: 1, borderColor: "#2A3045",
    paddingHorizontal: 16, paddingVertical: 14,
    color: "#fff", fontFamily: "Inter_400Regular", fontSize: 16,
  },
  detectBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#161923", borderRadius: 14, borderWidth: 1.5,
    borderColor: "#2A3045", paddingHorizontal: 16, paddingVertical: 15,
  },
  detectBtnDone: { borderColor: "#1FBF6B", backgroundColor: "rgba(31,191,107,0.08)" },
  detectBtnText: { fontFamily: "Inter_500Medium", fontSize: 15, color: "#AAB3C5", flex: 1 },
  detectHint: { fontFamily: "Inter_400Regular", fontSize: 12, color: "#FF4E62", marginTop: 4 },

  companionHint: {
    borderRadius: 14, borderWidth: 1, padding: 14,
  },
  companionHintText: { color: "#AAB3C5", fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },

  dots: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  dot: { height: 8, borderRadius: 4, backgroundColor: "#2A3045" },
});

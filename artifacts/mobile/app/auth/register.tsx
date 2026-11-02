import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useApp, type CompanionGender } from "@/context/AppContext";
import { useLocationCity } from "@/hooks/useLocationCity";
import { errorMessage } from "@/lib/api";
import { buildPhone } from "./login";

const COUNTRIES = [
  { flag: "🇺🇬", code: "+256", iso: "UG" },
  { flag: "🇰🇪", code: "+254", iso: "KE" },
  { flag: "🇹🇿", code: "+255", iso: "TZ" },
];

function PinDots({ pin }: { pin: string }) {
  return (
    <View style={styles.pinDots}>
      {[0, 1, 2, 3].map(i => (
        <View
          key={i}
          style={[
            styles.pinDot,
            pin.length > i ? styles.pinDotFilled : styles.pinDotEmpty,
          ]}
        />
      ))}
    </View>
  );
}

function NumPad({ onPress, onDelete }: { onPress: (d: string) => void; onDelete: () => void }) {
  const keys = ["1","2","3","4","5","6","7","8","9","","0","⌫"];
  return (
    <View style={styles.numpad}>
      {keys.map((k, i) => (
        <TouchableOpacity
          key={i}
          style={[styles.numKey, k === "" && { opacity: 0 }]}
          onPress={() => {
            if (k === "⌫") { onDelete(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }
            else if (k !== "") { onPress(k); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }
          }}
          activeOpacity={0.6}
          disabled={k === ""}
        >
          <Text style={styles.numKeyText}>{k === "⌫" ? "" : k}</Text>
          {k === "⌫" && <Ionicons name="backspace-outline" size={22} color="#AAB3C5" />}
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { register } = useApp();
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const [page, setPage] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [countryIdx, setCountryIdx] = useState(0);
  const [role, setRole] = useState<"seeker" | "companion" | null>(null);
  const [gender, setGender] = useState<CompanionGender>("female");
  const [referral, setReferral] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinStage, setPinStage] = useState<"set" | "confirm">("set");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [detectedCity, setDetectedCity] = useState<string | null>(null);

  const { detect: detectCity, status: detectStatus } = useLocationCity((city) => {
    setDetectedCity(city);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  });

  const country = COUNTRIES[countryIdx];

  const animateTo = (next: number) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setPage(next);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  const handlePage0 = () => {
    if (!name.trim()) { setError("Enter your name"); return; }
    if (phone.replace(/\D/g, "").length < 9) { setError("Enter a valid phone number"); return; }
    if (!role) { setError("Choose your role"); return; }
    setError("");
    animateTo(1);
  };

  const handlePinDigit = (d: string) => {
    if (pinStage === "set") {
      if (pin.length >= 4) return;
      const next = pin + d;
      setPin(next);
      if (next.length === 4) {
        setTimeout(() => { setPinStage("confirm"); }, 300);
      }
    } else {
      if (confirmPin.length >= 4) return;
      const next = confirmPin + d;
      setConfirmPin(next);
      if (next.length === 4) {
        setTimeout(() => {
          if (next !== pin) {
            setError("PINs don't match. Try again.");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setConfirmPin("");
            setPinStage("set");
            setPin("");
          } else {
            setError("");
            animateTo(2);
          }
        }, 300);
      }
    }
  };

  const handleFinish = async () => {
    if (submitting || !role) return;
    setSubmitting(true);
    setError("");
    const fullPhone = buildPhone(country.code, phone);
    try {
      await register({
        phone: fullPhone,
        pin,
        name: name.trim(),
        role,
        city: detectedCity ?? "Kampala",
        gender: role === "companion" ? gender : undefined,
        referralCode: referral.trim() || undefined,
      });
      await AsyncStorage.setItem("lastPhone", fullPhone);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (err) {
      const msg = errorMessage(err, "Could not create your account. Try again.");
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (/already exists/i.test(msg)) animateTo(0);
    } finally {
      setSubmitting(false);
    }
  };

  const stepTitles = ["Create Account", "Set Your PIN", "Your Location"];

  return (
    <View style={[styles.root, { paddingTop: Platform.OS === "web" ? 60 : insets.top + 16, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.glow} />

      {/* Header */}
      <View style={styles.header}>
        {page > 0 && (
          <TouchableOpacity onPress={() => animateTo(page - 1)} style={styles.headerBack}>
            <Ionicons name="arrow-back" size={20} color="#AAB3C5" />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.logoText}>🔥 NightMap</Text>
        </View>
      </View>

      {/* Step pills */}
      <View style={styles.steps}>
        {[0, 1, 2].map(i => (
          <View key={i} style={[styles.stepPill, { backgroundColor: i <= page ? "#FF4E62" : "#1F2535", width: i === page ? 28 : 8 }]} />
        ))}
      </View>

      <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
        <Text style={styles.cardTitle}>{stepTitles[page]}</Text>

        {/* ── Page 0: Identity ────────────────────────────── */}
        {page === 0 && (
          <ScrollView contentContainerStyle={styles.formGap} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.fieldGap}>
              <Text style={styles.fieldLabel}>FULL NAME</Text>
              <TextInput
                style={styles.input}
                placeholder={role === "companion" ? "Display name (e.g. Amara)" : "Your name"}
                placeholderTextColor="#3A4460"
                value={name}
                onChangeText={v => { setName(v); setError(""); }}
                autoCapitalize="words"
                maxLength={30}
              />
            </View>

            <View style={styles.fieldGap}>
              <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
              <View style={styles.phoneRow}>
                <TouchableOpacity
                  style={styles.countryBtn}
                  onPress={() => setCountryIdx((countryIdx + 1) % COUNTRIES.length)}
                >
                  <Text style={styles.countryFlag}>{country.flag}</Text>
                  <Text style={styles.countryCode}>{country.code}</Text>
                  <Ionicons name="chevron-down" size={12} color="#AAB3C5" />
                </TouchableOpacity>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="700 000 000"
                  placeholderTextColor="#3A4460"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={v => { setPhone(v); setError(""); }}
                  maxLength={12}
                />
              </View>
            </View>

            <View style={styles.fieldGap}>
              <Text style={styles.fieldLabel}>I AM A…</Text>
              <View style={styles.roleRow}>
                <TouchableOpacity
                  style={[styles.roleCard, role === "seeker" && styles.roleCardActive]}
                  onPress={() => { setRole("seeker"); Haptics.selectionAsync(); setError(""); }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.roleEmoji}>🗺️</Text>
                  <Text style={[styles.roleTitle, role === "seeker" && { color: "#FF4E62" }]}>Seeker</Text>
                  <Text style={styles.roleDesc}>Explore & connect with companions</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleCard, role === "companion" && styles.roleCardCompActive]}
                  onPress={() => { setRole("companion"); Haptics.selectionAsync(); setError(""); }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.roleEmoji}>💫</Text>
                  <Text style={[styles.roleTitle, role === "companion" && { color: "#1FBF6B" }]}>Companion</Text>
                  <Text style={styles.roleDesc}>Create a profile · Receive client requests</Text>
                </TouchableOpacity>
              </View>
            </View>

            {role === "companion" && (
              <View style={styles.fieldGap}>
                <Text style={styles.fieldLabel}>LIST ME UNDER</Text>
                <View style={styles.roleRow}>
                  {([["female", "Companions"], ["male", "Gentleman Companions"]] as const).map(([value, label]) => (
                    <TouchableOpacity
                      key={value}
                      style={[styles.genderChip, gender === value && styles.genderChipActive]}
                      onPress={() => { setGender(value); Haptics.selectionAsync(); }}
                    >
                      <Text style={[styles.genderChipText, gender === value && { color: "#1FBF6B" }]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.fieldGap}>
              <Text style={styles.fieldLabel}>INVITE CODE (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="NIGHT-XXXX"
                placeholderTextColor="#3A4460"
                value={referral}
                onChangeText={v => setReferral(v.toUpperCase())}
                autoCapitalize="characters"
                maxLength={12}
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity style={styles.primaryBtn} onPress={handlePage0} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* ── Page 1: PIN ─────────────────────────────────── */}
        {page === 1 && (
          <View style={styles.formGap}>
            <Text style={styles.pinInstructions}>
              {pinStage === "set"
                ? "Choose a 4-digit PIN to protect your account"
                : "Re-enter your PIN to confirm"}
            </Text>
            <PinDots pin={pinStage === "set" ? pin : confirmPin} />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <NumPad
              onPress={handlePinDigit}
              onDelete={() => {
                setError("");
                if (pinStage === "set") setPin(p => p.slice(0, -1));
                else setConfirmPin(p => p.slice(0, -1));
              }}
            />
          </View>
        )}

        {/* ── Page 2: Location ────────────────────────────── */}
        {page === 2 && (
          <View style={styles.formGap}>
            <Text style={styles.pinInstructions}>
              Allow location so NightMap can show companions near you
            </Text>

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
                  size={22}
                  color={detectedCity ? "#1FBF6B" : "#AAB3C5"}
                />
              )}
              <Text style={[styles.detectBtnText, detectedCity ? { color: "#1FBF6B" } : null]}>
                {detectStatus === "detecting"
                  ? "Locating you…"
                  : detectStatus === "denied"
                  ? "Permission denied — tap to retry"
                  : detectedCity
                  ? `📍 ${detectedCity} detected`
                  : "Detect my city"}
              </Text>
            </TouchableOpacity>

            {detectStatus === "denied" && (
              <Text style={styles.deniedHint}>Enable Location in your device Settings, then tap again.</Text>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {!detectedCity && detectStatus !== "detecting" && (
              <TouchableOpacity onPress={handleFinish} style={styles.skipBtn} disabled={submitting}>
                <Text style={styles.skipBtnText}>{submitting ? "Creating your account…" : "Skip for now (defaults to Kampala)"}</Text>
              </TouchableOpacity>
            )}

            {detectedCity && (
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: "#1FBF6B" }]} onPress={handleFinish} activeOpacity={0.85} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark-circle" size={20} color="#fff" />}
                <Text style={styles.primaryBtnText}>{submitting ? "Creating account…" : "Start Exploring!"}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </Animated.View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <TouchableOpacity onPress={() => router.replace("/auth/login")}>
          <Text style={styles.footerLink}> Sign in</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  genderChip: {
    flex: 1, borderRadius: 14, borderWidth: 1.5, borderColor: "#2A3045",
    backgroundColor: "#1F2535", paddingVertical: 12, alignItems: "center",
  },
  genderChipActive: { borderColor: "#1FBF6B", backgroundColor: "rgba(31,191,107,0.08)" },
  genderChipText: { color: "#AAB3C5", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  root: {
    flex: 1,
    backgroundColor: "#0B0B0F",
    paddingHorizontal: 20,
  },
  glow: { ...StyleSheet.absoluteFillObject, backgroundColor: "#7A3CFF10" },

  header: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  headerBack: { marginRight: 8, padding: 4 },
  logoText: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },

  steps: { flexDirection: "row", gap: 6, marginBottom: 20, alignItems: "center" },
  stepPill: { height: 6, borderRadius: 3 },

  card: {
    flex: 1,
    backgroundColor: "#161923",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#2A3045",
    padding: 24,
    gap: 16,
  },
  cardTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },

  formGap: { gap: 16, flex: 1 },
  fieldGap: { gap: 8 },
  fieldLabel: { color: "#AAB3C5", fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1 },

  input: {
    backgroundColor: "#1F2535",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2A3045",
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#fff",
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },

  phoneRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  countryBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#1F2535", borderRadius: 14, borderWidth: 1, borderColor: "#2A3045",
    paddingHorizontal: 12, paddingVertical: 14,
  },
  countryFlag: { fontSize: 18 },
  countryCode: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },

  roleRow: { flexDirection: "row", gap: 10 },
  roleCard: {
    flex: 1, borderRadius: 16, borderWidth: 1.5, borderColor: "#2A3045",
    backgroundColor: "#1F2535", padding: 14, gap: 4,
  },
  roleCardActive: { borderColor: "#FF4E62", backgroundColor: "rgba(255,78,98,0.08)" },
  roleCardCompActive: { borderColor: "#1FBF6B", backgroundColor: "rgba(31,191,107,0.08)" },
  roleEmoji: { fontSize: 26 },
  roleTitle: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 },
  roleDesc: { color: "#AAB3C5", fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17 },

  pinInstructions: { color: "#AAB3C5", fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  pinDots: { flexDirection: "row", justifyContent: "center", gap: 18, marginVertical: 4 },
  pinDot: { width: 18, height: 18, borderRadius: 9 },
  pinDotEmpty: { backgroundColor: "#1F2535", borderWidth: 2, borderColor: "#2A3045" },
  pinDotFilled: { backgroundColor: "#FF4E62" },

  numpad: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  numKey: { width: "33.33%", alignItems: "center", justifyContent: "center", paddingVertical: 14 },
  numKeyText: { fontSize: 24, fontFamily: "Inter_400Regular", color: "#fff" },

  detectBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#1F2535", borderRadius: 16, borderWidth: 1.5,
    borderColor: "#2A3045", paddingHorizontal: 18, paddingVertical: 18,
  },
  detectBtnDone: { borderColor: "#1FBF6B", backgroundColor: "rgba(31,191,107,0.08)" },
  detectBtnText: { fontFamily: "Inter_500Medium", fontSize: 15, color: "#AAB3C5", flex: 1 },
  deniedHint: { color: "#FF4E62", fontFamily: "Inter_400Regular", fontSize: 12 },

  skipBtn: { alignItems: "center", paddingVertical: 6 },
  skipBtnText: { color: "#AAB3C5", fontFamily: "Inter_400Regular", fontSize: 13 },

  primaryBtn: {
    flexDirection: "row",
    backgroundColor: "#FF4E62",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: "auto",
  },
  primaryBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },

  errorText: { color: "#FF4E62", fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" },

  footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingTop: 16 },
  footerText: { color: "#AAB3C5", fontFamily: "Inter_400Regular", fontSize: 14 },
  footerLink: { color: "#FF4E62", fontFamily: "Inter_700Bold", fontSize: 14 },
});

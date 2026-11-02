import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "@/context/AppContext";
import { errorMessage } from "@/lib/api";

const COUNTRIES = [
  { flag: "🇺🇬", code: "+256", iso: "UG" },
  { flag: "🇰🇪", code: "+254", iso: "KE" },
  { flag: "🇹🇿", code: "+255", iso: "TZ" },
];

export function buildPhone(code: string, local: string): string {
  const digits = local.replace(/\D/g, "").replace(/^0+/, "");
  return `${code}${digits}`;
}

function PinDots({ pin }: { pin: string }) {
  return (
    <View style={styles.pinDots}>
      {[0, 1, 2, 3].map(i => (
        <View
          key={i}
          style={[
            styles.pinDot,
            pin.length > i
              ? styles.pinDotFilled
              : styles.pinDotEmpty,
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

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useApp();
  const [countryIdx, setCountryIdx] = useState(0);
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [step, setStep] = useState<"phone" | "pin">("phone");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const shake = useState(() => new Animated.Value(0))[0];

  const country = COUNTRIES[countryIdx];

  React.useEffect(() => {
    AsyncStorage.getItem("lastPhone").then((stored) => {
      if (!stored) return;
      const idx = COUNTRIES.findIndex((c) => stored.startsWith(c.code));
      if (idx >= 0) {
        setCountryIdx(idx);
        setPhone(stored.slice(COUNTRIES[idx].code.length));
      }
    }).catch(() => {});
  }, []);

  const doShake = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shake, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handlePhoneContinue = () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 9) { setError("Enter a valid phone number"); doShake(); return; }
    setError("");
    setStep("pin");
  };

  const handlePinDigit = (d: string) => {
    if (pin.length >= 4 || loading) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      setTimeout(() => handleLogin(next), 150);
    }
  };

  const handleLogin = async (finalPin: string) => {
    setLoading(true);
    setError("");
    const fullPhone = buildPhone(country.code, phone);
    try {
      await signIn(fullPhone, finalPin);
      await AsyncStorage.setItem("lastPhone", fullPhone);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (err) {
      setPin("");
      setError(errorMessage(err, "Could not sign in. Try again."));
      doShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: Platform.OS === "web" ? 60 : insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.glow} />

      {/* Logo */}
      <View style={styles.logoArea}>
        <Text style={styles.logoEmoji}>🔥</Text>
        <Text style={styles.logoText}>NightMap</Text>
        <Text style={styles.logoSub}>East Africa's Social Companion Platform</Text>
      </View>

      {step === "phone" ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSub}>Sign in with your phone number</Text>

          {/* Country + phone */}
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
              style={styles.phoneInput}
              placeholder="700 000 000"
              placeholderTextColor="#3A4460"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={v => { setPhone(v); setError(""); }}
              maxLength={12}
              autoFocus
              onSubmitEditing={handlePhoneContinue}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity style={styles.primaryBtn} onPress={handlePhoneContinue} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <TouchableOpacity style={styles.backRow} onPress={() => { setStep("phone"); setPin(""); setError(""); }}>
            <Ionicons name="arrow-back" size={18} color="#AAB3C5" />
            <Text style={styles.backRowText}>{country.flag} {country.code} {phone}</Text>
          </TouchableOpacity>
          <Text style={styles.cardTitle}>Enter PIN</Text>
          <Text style={styles.cardSub}>Your 4-digit NightMap PIN</Text>

          <Animated.View style={{ transform: [{ translateX: shake }] }}>
            <PinDots pin={pin} />
          </Animated.View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {loading ? <Text style={styles.loadingText}>Signing in…</Text> : null}

          <NumPad
            onPress={handlePinDigit}
            onDelete={() => { setPin(p => p.slice(0, -1)); setError(""); }}
          />

          <TouchableOpacity style={styles.forgotBtn} onPress={() => router.push("/auth/register")}>
            <Text style={styles.forgotBtnText}>Forgot PIN? Contact support to reset</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>New to NightMap?</Text>
        <TouchableOpacity onPress={() => router.replace("/auth/register")}>
          <Text style={styles.footerLink}> Create account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0B0B0F",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FF4E6212",
    opacity: 0.5,
  },

  logoArea: { alignItems: "center", marginBottom: 32, gap: 6 },
  logoEmoji: { fontSize: 48 },
  logoText: { fontSize: 32, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: -1 },
  logoSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#AAB3C5", textAlign: "center" },

  card: {
    width: "100%",
    backgroundColor: "#161923",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#2A3045",
    padding: 24,
    gap: 14,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  cardSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#AAB3C5", marginTop: -6 },

  phoneRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  countryBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#1F2535", borderRadius: 12, borderWidth: 1, borderColor: "#2A3045",
    paddingHorizontal: 12, paddingVertical: 14,
  },
  countryFlag: { fontSize: 18 },
  countryCode: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  phoneInput: {
    flex: 1,
    backgroundColor: "#1F2535",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2A3045",
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: "#fff",
    fontFamily: "Inter_400Regular",
    fontSize: 16,
  },

  pinDots: { flexDirection: "row", justifyContent: "center", gap: 18, marginVertical: 8 },
  pinDot: { width: 18, height: 18, borderRadius: 9 },
  pinDotEmpty: { backgroundColor: "#1F2535", borderWidth: 2, borderColor: "#2A3045" },
  pinDotFilled: { backgroundColor: "#FF4E62" },

  numpad: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -8 },
  numKey: {
    width: "33.33%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  numKeyText: { fontSize: 24, fontFamily: "Inter_400Regular", color: "#fff" },

  primaryBtn: {
    flexDirection: "row",
    backgroundColor: "#FF4E62",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  primaryBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },

  backRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  backRowText: { color: "#AAB3C5", fontFamily: "Inter_400Regular", fontSize: 13 },

  errorText: { color: "#FF4E62", fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" },
  loadingText: { color: "#AAB3C5", fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" },

  forgotBtn: { alignItems: "center", paddingTop: 4 },
  forgotBtnText: { color: "#AAB3C5", fontFamily: "Inter_400Regular", fontSize: 13 },

  footer: { flexDirection: "row", alignItems: "center", marginTop: "auto" },
  footerText: { color: "#AAB3C5", fontFamily: "Inter_400Regular", fontSize: 14 },
  footerLink: { color: "#FF4E62", fontFamily: "Inter_700Bold", fontSize: 14 },
});

import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@workspace/nightmap-design-system/hooks/use-colors";
import { formatUGX, useApp } from "@/context/AppContext";

const AMOUNTS = [50_000, 100_000, 200_000, 500_000];

type Method = "mtn" | "airtel" | "visa" | "mastercard";

const METHODS: { id: Method; name: string; sub: string; color: string; bg: string; icon: string }[] = [
  { id: "mtn",        name: "MTN Mobile Money",  sub: "Uganda · Rwanda · Ghana",  color: "#FFC400", bg: "rgba(255,196,0,0.10)",  icon: "phone-portrait-outline" },
  { id: "airtel",     name: "Airtel Money",       sub: "Uganda · Kenya · Tanzania",color: "#FF4E62", bg: "rgba(255,78,98,0.10)",  icon: "phone-portrait-outline" },
  { id: "visa",       name: "Visa Card",          sub: "Debit or credit",          color: "#3DA9FF", bg: "rgba(61,169,255,0.10)", icon: "card-outline" },
  { id: "mastercard", name: "Mastercard",         sub: "Debit or credit",          color: "#FF8A3D", bg: "rgba(255,138,61,0.10)", icon: "card-outline" },
];

type ScreenState = "select" | "details" | "processing" | "success";

export default function PaymentScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors("dark");
  const { walletCredit, userProfile } = useApp();

  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState<Method | null>(null);
  const [momoPhone, setMomoPhone] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [screen, setScreen] = useState<ScreenState>("select");
  const [error, setError] = useState("");

  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const selectedMethod = METHODS.find(m => m.id === method);
  const isMomo = method === "mtn" || method === "airtel";
  const isCard = method === "visa" || method === "mastercard";

  const handlePay = () => {
    setError("");
    if (!amount) { setError("Select an amount"); return; }
    if (!method) { setError("Choose a payment method"); return; }
    if (isMomo && momoPhone.replace(/\D/g, "").length < 9) { setError("Enter a valid phone number"); return; }
    if (isCard) {
      if (cardNumber.replace(/\s/g, "").length < 16) { setError("Enter a valid card number"); return; }
      if (cardExpiry.length < 5) { setError("Enter expiry (MM/YY)"); return; }
      if (cardCvv.length < 3) { setError("Enter CVV"); return; }
    }

    setScreen("processing");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Animate pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();

    setTimeout(() => {
      walletCredit(amount!);
      setScreen("success");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.parallel([
        Animated.spring(successScale, { toValue: 1, useNativeDriver: true, tension: 50, friction: 6 }),
        Animated.timing(successOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }, 2400);
  };

  const formatCard = (v: string) =>
    v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

  const formatExpiry = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 4);
    return digits.length > 2 ? digits.slice(0, 2) + "/" + digits.slice(2) : digits;
  };

  if (screen === "processing") {
    return (
      <View style={[styles.centeredScreen, { backgroundColor: colors.background }]}>
        <Animated.View style={[styles.processingIcon, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.processingEmoji}>
            {selectedMethod?.id === "mtn" ? "📲" : selectedMethod?.id === "airtel" ? "📲" : "💳"}
          </Text>
        </Animated.View>
        <Text style={[styles.processingTitle, { color: colors.foreground }]}>Processing…</Text>
        <Text style={[styles.processingSub, { color: colors.mutedForeground }]}>
          {isMomo ? `Sending request to ${momoPhone}` : "Verifying your card"}
        </Text>
        <Text style={[styles.processingAmount, { color: selectedMethod?.color }]}>
          {formatUGX(amount ?? 0)}
        </Text>
      </View>
    );
  }

  if (screen === "success") {
    return (
      <View style={[styles.centeredScreen, { backgroundColor: colors.background }]}>
        <Animated.View style={{ opacity: successOpacity, transform: [{ scale: successScale }], alignItems: "center", gap: 16 }}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={52} color="#fff" />
          </View>
          <Text style={[styles.successTitle, { color: colors.foreground }]}>Payment Successful!</Text>
          <Text style={[styles.successAmount, { color: "#1FBF6B" }]}>{formatUGX(amount ?? 0)}</Text>
          <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
            Added to your NightMap wallet
          </Text>
          <Text style={[styles.successBalance, { color: colors.mutedForeground }]}>
            New balance: {formatUGX(userProfile.walletBalance)}
          </Text>
          <TouchableOpacity
            style={styles.successBtn}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Text style={styles.successBtnText}>Back to Wallet</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 56 : insets.top + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Add Funds</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>

        {/* Amount */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>AMOUNT</Text>
        <View style={styles.amountGrid}>
          {AMOUNTS.map(a => (
            <TouchableOpacity
              key={a}
              style={[styles.amountChip, { backgroundColor: colors.card, borderColor: amount === a ? "#FF4E62" : colors.border }, amount === a && styles.amountChipActive]}
              onPress={() => { setAmount(a); setError(""); Haptics.selectionAsync(); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.amountChipText, { color: amount === a ? "#FF4E62" : colors.foreground }]}>
                {formatUGX(a)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Payment method */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PAYMENT METHOD</Text>
        <View style={{ gap: 10 }}>
          {METHODS.map(m => (
            <TouchableOpacity
              key={m.id}
              style={[
                styles.methodCard,
                { backgroundColor: method === m.id ? m.bg : colors.card, borderColor: method === m.id ? m.color : colors.border },
              ]}
              onPress={() => { setMethod(m.id); setError(""); Haptics.selectionAsync(); }}
              activeOpacity={0.8}
            >
              <View style={[styles.methodIcon, { backgroundColor: m.bg }]}>
                <Ionicons name={m.icon as never} size={22} color={m.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.methodName, { color: colors.foreground }]}>{m.name}</Text>
                <Text style={[styles.methodSub, { color: colors.mutedForeground }]}>{m.sub}</Text>
              </View>
              {method === m.id && (
                <Ionicons name="checkmark-circle" size={20} color={m.color} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Method details */}
        {isMomo && method && (
          <View style={{ marginTop: 16, gap: 8 }}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>MOBILE MONEY NUMBER</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={styles.inputPrefix}>{method === "mtn" ? "🇺🇬 +256" : "🌍"}</Text>
              <TextInput
                style={[styles.inputField, { color: colors.foreground }]}
                placeholder="700 000 000"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="phone-pad"
                value={momoPhone}
                onChangeText={v => { setMomoPhone(v); setError(""); }}
                maxLength={12}
              />
            </View>
            <Text style={[styles.inputHint, { color: colors.mutedForeground }]}>
              You'll receive a {method === "mtn" ? "MTN" : "Airtel"} prompt to approve the payment.
            </Text>
          </View>
        )}

        {isCard && (
          <View style={{ marginTop: 16, gap: 12 }}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>CARD DETAILS</Text>
            <TextInput
              style={[styles.cardInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Cardholder name"
              placeholderTextColor={colors.mutedForeground}
              value={cardName}
              onChangeText={v => { setCardName(v); setError(""); }}
              autoCapitalize="words"
            />
            <TextInput
              style={[styles.cardInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              placeholder="1234 5678 9012 3456"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
              value={cardNumber}
              onChangeText={v => { setCardNumber(formatCard(v)); setError(""); }}
              maxLength={19}
            />
            <View style={styles.cardRow}>
              <TextInput
                style={[styles.cardInput, { flex: 1, backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                placeholder="MM/YY"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                value={cardExpiry}
                onChangeText={v => { setCardExpiry(formatExpiry(v)); setError(""); }}
                maxLength={5}
              />
              <TextInput
                style={[styles.cardInput, { flex: 1, backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                placeholder="CVV"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                secureTextEntry
                value={cardCvv}
                onChangeText={v => { setCardCvv(v.replace(/\D/g, "").slice(0, 4)); setError(""); }}
                maxLength={4}
              />
            </View>
            <View style={[styles.secureRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="lock-closed" size={14} color="#1FBF6B" />
              <Text style={[styles.secureText, { color: colors.mutedForeground }]}>256-bit SSL · PCI-DSS compliant</Text>
            </View>
          </View>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      {/* Pay button pinned to bottom */}
      <View style={[styles.payFooter, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background, borderTopColor: colors.border }]}>
        {amount && method && (
          <Text style={[styles.payTotal, { color: colors.mutedForeground }]}>
            You'll add {formatUGX(amount)} via {selectedMethod?.name}
          </Text>
        )}
        <TouchableOpacity
          style={[styles.payBtn, (!amount || !method) && { opacity: 0.45 }]}
          onPress={handlePay}
          activeOpacity={0.85}
          disabled={!amount || !method}
        >
          <Ionicons name="wallet-outline" size={20} color="#fff" />
          <Text style={styles.payBtnText}>
            {amount ? `Pay ${formatUGX(amount)}` : "Pay"}
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
    paddingHorizontal: 16, paddingBottom: 8,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },

  sectionLabel: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1, marginTop: 20, marginBottom: 10 },

  amountGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  amountChip: {
    borderRadius: 16, borderWidth: 1.5,
    paddingHorizontal: 18, paddingVertical: 14,
    minWidth: "45%", flex: 1,
    alignItems: "center",
  },
  amountChipActive: { backgroundColor: "rgba(255,78,98,0.08)" },
  amountChipText: { fontFamily: "Inter_700Bold", fontSize: 15 },

  methodCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    borderRadius: 18, borderWidth: 1.5, padding: 16,
  },
  methodIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  methodName: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  methodSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },

  inputRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, borderWidth: 1, paddingHorizontal: 14,
  },
  inputPrefix: { color: "#AAB3C5", fontFamily: "Inter_500Medium", fontSize: 14, marginRight: 8 },
  inputField: { flex: 1, paddingVertical: 14, fontFamily: "Inter_400Regular", fontSize: 15 },
  inputHint: { fontFamily: "Inter_400Regular", fontSize: 12 },

  cardInput: {
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 14,
    fontFamily: "Inter_400Regular", fontSize: 15,
  },
  cardRow: { flexDirection: "row", gap: 10 },
  secureRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8,
  },
  secureText: { fontFamily: "Inter_400Regular", fontSize: 12 },

  errorText: { color: "#FF4E62", fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", marginTop: 8 },

  payFooter: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingTop: 12, paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  payTotal: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", marginBottom: 8 },
  payBtn: {
    flexDirection: "row",
    backgroundColor: "#FF4E62",
    borderRadius: 18, paddingVertical: 17,
    alignItems: "center", justifyContent: "center", gap: 10,
  },
  payBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 17 },

  centeredScreen: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  processingIcon: { width: 90, height: 90, borderRadius: 45, backgroundColor: "#161923", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  processingEmoji: { fontSize: 40 },
  processingTitle: { fontFamily: "Inter_700Bold", fontSize: 22 },
  processingSub: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" },
  processingAmount: { fontFamily: "Inter_700Bold", fontSize: 28, marginTop: 4 },

  successCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#1FBF6B", alignItems: "center", justifyContent: "center" },
  successTitle: { fontFamily: "Inter_700Bold", fontSize: 24 },
  successAmount: { fontFamily: "Inter_700Bold", fontSize: 32 },
  successSub: { fontFamily: "Inter_400Regular", fontSize: 14 },
  successBalance: { fontFamily: "Inter_400Regular", fontSize: 13 },
  successBtn: {
    backgroundColor: "#1FBF6B", borderRadius: 16, paddingVertical: 15,
    paddingHorizontal: 36, marginTop: 8,
  },
  successBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
});

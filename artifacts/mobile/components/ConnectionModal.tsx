import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { Companion, Match, formatUGX, useApp } from "@/context/AppContext";

interface ConnectionModalProps {
  companion: Companion | null;
  visible: boolean;
  onClose: () => void;
  onConnected: () => void;
}

type ConnectionType = "standard" | "super" | "paidDm";

interface Option {
  type: ConnectionType;
  label: string;
  description: string;
  price: number;
  icon: string;
  highlight?: boolean;
}

const OPTIONS: Option[] = [
  {
    type: "paidDm",
    label: "Paid DM",
    description: "Send one message before committing",
    price: 2000,
    icon: "chatbubble-outline",
  },
  {
    type: "standard",
    label: "Connect",
    description: "Standard connection request",
    price: 3500,
    icon: "heart-outline",
  },
  {
    type: "super",
    label: "Super Request",
    description: "Priority — she sees yours first",
    price: 8000,
    icon: "star",
    highlight: true,
  },
];

export function ConnectionModal({ companion, visible, onClose, onConnected }: ConnectionModalProps) {
  const colors = useColors();
  const { addMatch } = useApp();
  const [selected, setSelected] = useState<ConnectionType>("standard");
  const [step, setStep] = useState<"pick" | "pay" | "done">("pick");
  const [paymentMethod, setPaymentMethod] = useState<"mtn" | "airtel" | "mpesa">("mtn");

  const selectedOption = OPTIONS.find((o) => o.type === selected)!;

  const handlePay = () => {
    setStep("pay");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => {
      if (companion) addMatch(companion, selected);
      setStep("done");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        onConnected();
        setStep("pick");
      }, 1400);
    }, 2200);
  };

  const handleClose = () => {
    setStep("pick");
    onClose();
  };

  if (!companion) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={step === "pick" ? handleClose : undefined}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {step === "done" ? (
            <View style={styles.doneState}>
              <View style={[styles.doneIcon, { backgroundColor: "rgba(255,78,98,0.15)" }]}>
                <Ionicons name="checkmark-circle" size={56} color={colors.primary} />
              </View>
              <Text style={[styles.doneTitle, { color: colors.foreground }]}>Connected!</Text>
              <Text style={[styles.doneSubtitle, { color: colors.mutedForeground }]}>
                {companion.name} will receive your request
              </Text>
            </View>
          ) : step === "pay" ? (
            <View style={styles.doneState}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.doneTitle, { color: colors.foreground }]}>Processing</Text>
              <Text style={[styles.doneSubtitle, { color: colors.mutedForeground }]}>
                Charging {formatUGX(selectedOption.price)} via {paymentMethod === "mtn" ? "MTN MoMo" : paymentMethod === "airtel" ? "Airtel Money" : "M-Pesa"}
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.companionHeader}>
                <View style={[styles.companionAvatar, { backgroundColor: companion.color }]}>
                  <Text style={styles.companionInitial}>{companion.name[0]}</Text>
                </View>
                <View style={styles.companionInfo}>
                  <Text style={[styles.companionName, { color: colors.foreground }]}>
                    Connect with {companion.name}
                  </Text>
                  <Text style={[styles.companionRate, { color: colors.mutedForeground }]}>
                    {formatUGX(companion.rate)}/hr · min {companion.minBookingHours}h
                  </Text>
                </View>
              </View>

              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Choose request type</Text>
              <View style={styles.options}>
                {OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.type}
                    style={[
                      styles.optionRow,
                      {
                        backgroundColor: selected === opt.type
                          ? opt.highlight
                            ? "rgba(255,138,61,0.12)"
                            : "rgba(255,78,98,0.12)"
                          : colors.muted,
                        borderColor: selected === opt.type
                          ? opt.highlight ? colors.accent : colors.primary
                          : colors.border,
                      },
                    ]}
                    onPress={() => setSelected(opt.type)}
                  >
                    <View style={[styles.optionIconWrap, {
                      backgroundColor: opt.highlight ? "rgba(255,138,61,0.15)" : "rgba(255,78,98,0.12)"
                    }]}>
                      <Ionicons
                        name={opt.icon as never}
                        size={18}
                        color={opt.highlight ? colors.accent : colors.primary}
                      />
                    </View>
                    <View style={styles.optionText}>
                      <View style={styles.optionTitleRow}>
                        <Text style={[styles.optionLabel, { color: colors.foreground }]}>{opt.label}</Text>
                        {opt.highlight && (
                          <View style={[styles.popularBadge, { backgroundColor: colors.accent }]}>
                            <Text style={styles.popularText}>POPULAR</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>{opt.description}</Text>
                    </View>
                    <Text style={[styles.optionPrice, { color: opt.highlight ? colors.accent : colors.primary }]}>
                      {formatUGX(opt.price)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Pay via Mobile Money</Text>
              <View style={styles.paymentMethods}>
                {(["mtn", "airtel", "mpesa"] as const).map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.paymentBtn,
                      {
                        backgroundColor: paymentMethod === method ? "rgba(255,78,98,0.12)" : colors.muted,
                        borderColor: paymentMethod === method ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setPaymentMethod(method)}
                  >
                    <Text style={[styles.paymentLabel, { color: paymentMethod === method ? colors.primary : colors.mutedForeground }]}>
                      {method === "mtn" ? "MTN MoMo" : method === "airtel" ? "Airtel" : "M-Pesa"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={[styles.escrowNote, { backgroundColor: "rgba(255,138,61,0.08)", borderColor: "rgba(255,138,61,0.25)" }]}>
                <Ionicons name="shield-checkmark" size={14} color={colors.accent} />
                <Text style={[styles.escrowText, { color: colors.mutedForeground }]}>
                  Payment held in escrow — released only after meetup confirmed
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.payBtn, { backgroundColor: colors.primary }]}
                onPress={handlePay}
              >
                <Ionicons name="lock-closed" size={16} color="#fff" />
                <Text style={styles.payBtnText}>Pay {formatUGX(selectedOption.price)}</Text>
              </TouchableOpacity>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 4,
  },
  companionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  companionAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  companionInitial: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 20 },
  companionInfo: { flex: 1 },
  companionName: { fontFamily: "Inter_700Bold", fontSize: 16 },
  companionRate: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 },
  sectionLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  options: { gap: 8 },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 10,
  },
  optionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: { flex: 1 },
  optionTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  optionLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  popularBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  popularText: { color: "#fff", fontSize: 9, fontFamily: "Inter_700Bold" },
  optionDesc: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  optionPrice: { fontFamily: "Inter_700Bold", fontSize: 14 },
  paymentMethods: { flexDirection: "row", gap: 8 },
  paymentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
  },
  paymentLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  escrowNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  escrowText: { fontFamily: "Inter_400Regular", fontSize: 12, flex: 1, lineHeight: 17 },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  payBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
  doneState: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 12,
  },
  doneIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  doneTitle: { fontFamily: "Inter_700Bold", fontSize: 22 },
  doneSubtitle: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" },
});

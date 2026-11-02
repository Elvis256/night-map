import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@workspace/nightmap-design-system/hooks/use-colors";
import { Companion, formatUGX, useApp } from "@/context/AppContext";

interface ConnectionModalProps {
  companion: Companion | null;
  visible: boolean;
  onClose: () => void;
  onConnected: () => void;
}

export function ConnectionModal({ companion, visible, onClose, onConnected }: ConnectionModalProps) {
  const colors = useColors("dark");
  const { addMatch } = useApp();
  const [step, setStep] = useState<"request" | "done">("request");

  const handleConnect = () => {
    if (!companion) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addMatch(companion, "standard");
    setStep("done");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleClose = () => {
    setStep("request");
    onClose();
  };

  const handleDone = () => {
    setStep("request");
    onConnected();
  };

  if (!companion) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={step === "request" ? handleClose : undefined}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {step === "done" ? (
            <View style={styles.doneState}>
              <View style={[styles.doneIcon, { backgroundColor: "rgba(255,78,98,0.15)" }]}>
                <Ionicons name="checkmark-circle" size={56} color={colors.primary} />
              </View>
              <Text style={[styles.doneTitle, { color: colors.foreground }]}>Request saved</Text>
              <Text style={[styles.doneSubtitle, { color: colors.mutedForeground }]}>
                This preview saves the connection on this device. It does not notify {companion.name} or process a payment.
              </Text>
              <TouchableOpacity
                style={[styles.requestBtn, { backgroundColor: colors.primary }]}
                onPress={handleDone}
              >
                <Text style={styles.requestBtnText}>Close</Text>
              </TouchableOpacity>
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

              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Connection request</Text>
              <View style={[styles.requestCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <View style={[styles.requestIcon, { backgroundColor: "rgba(255,78,98,0.12)" }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={19} color={colors.primary} />
                </View>
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, { color: colors.foreground }]}>Free standard request</Text>
                  <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>
                    Start a conversation without a per-request fee.
                  </Text>
                </View>
              </View>

              <View style={[styles.paymentNote, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Ionicons name="information-circle-outline" size={15} color={colors.accent} />
                <Text style={[styles.paymentNoteText, { color: colors.mutedForeground }]}>
                  This preview stores the request locally. No payment or escrow is provided.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.requestBtn, { backgroundColor: colors.primary }]}
                onPress={handleConnect}
              >
                <Ionicons name="paper-plane-outline" size={16} color="#fff" />
                <Text style={styles.requestBtnText}>Send request</Text>
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
  requestCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  requestIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: { flex: 1 },
  optionLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  optionDesc: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  paymentNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  paymentNoteText: { fontFamily: "Inter_400Regular", fontSize: 12, flex: 1, lineHeight: 17 },
  requestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  requestBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
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

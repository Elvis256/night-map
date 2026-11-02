import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@workspace/nightmap-design-system/hooks/use-colors";
import { Companion, formatUGX, useApp } from "@/context/AppContext";
import { errorMessage } from "@/lib/api";

interface ConnectionModalProps {
  companion: Companion | null;
  visible: boolean;
  onClose: () => void;
  onConnected: (matchId: string) => void;
}

export function ConnectionModal({ companion, visible, onClose, onConnected }: ConnectionModalProps) {
  const colors = useColors("dark");
  const { addMatch } = useApp();
  const [step, setStep] = useState<"request" | "done">("request");
  const [type, setType] = useState<"standard" | "super">("standard");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [matchId, setMatchId] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!companion || sending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSending(true);
    setError("");
    try {
      const match = await addMatch(companion, type, message.trim() || undefined);
      setMatchId(match.id);
      setStep("done");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setError(errorMessage(err, "Could not send the request."));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setStep("request");
    setType("standard");
    setMessage("");
    setError("");
    setMatchId(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleDone = () => {
    const id = matchId;
    reset();
    if (id) onConnected(id);
    else onClose();
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
              <Text style={[styles.doneTitle, { color: colors.foreground }]}>Request sent</Text>
              <Text style={[styles.doneSubtitle, { color: colors.mutedForeground }]}>
                {companion.name} has been notified. You can start chatting right away.
              </Text>
              <TouchableOpacity
                style={[styles.requestBtn, { backgroundColor: colors.primary }]}
                onPress={handleDone}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={16} color="#fff" />
                <Text style={styles.requestBtnText}>Open chat</Text>
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
              <TouchableOpacity
                style={[styles.requestCard, { backgroundColor: colors.muted, borderColor: type === "standard" ? colors.primary : colors.border }]}
                onPress={() => { setType("standard"); Haptics.selectionAsync(); }}
                activeOpacity={0.8}
              >
                <View style={[styles.requestIcon, { backgroundColor: "rgba(255,78,98,0.12)" }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={19} color={colors.primary} />
                </View>
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, { color: colors.foreground }]}>Standard request</Text>
                  <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>
                    Start a conversation. Free, no per-request fee.
                  </Text>
                </View>
                {type === "standard" && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.requestCard, { backgroundColor: colors.muted, borderColor: type === "super" ? "#FF8A3D" : colors.border }]}
                onPress={() => { setType("super"); Haptics.selectionAsync(); }}
                activeOpacity={0.8}
              >
                <View style={[styles.requestIcon, { backgroundColor: "rgba(255,138,61,0.12)" }]}>
                  <Ionicons name="star" size={19} color="#FF8A3D" />
                </View>
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, { color: colors.foreground }]}>Super request</Text>
                  <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>
                    Stands out in their inbox with a ⭐ badge.
                  </Text>
                </View>
                {type === "super" && <Ionicons name="checkmark-circle" size={18} color="#FF8A3D" />}
              </TouchableOpacity>
              <TextInput
                style={[styles.messageInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                placeholder={`Say hi to ${companion.name}… (optional)`}
                placeholderTextColor={colors.mutedForeground}
                value={message}
                onChangeText={setMessage}
                maxLength={300}
                multiline
              />
              {error ? <Text style={[styles.paymentNoteText, { color: "#FF4E62", textAlign: "center" }]}>{error}</Text> : null}
              <TouchableOpacity
                style={[styles.requestBtn, { backgroundColor: type === "super" ? "#FF8A3D" : colors.primary }]}
                onPress={handleConnect}
                disabled={sending}
              >
                {sending ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="paper-plane-outline" size={16} color="#fff" />}
                <Text style={styles.requestBtnText}>{sending ? "Sending…" : type === "super" ? "Send super request" : "Send request"}</Text>
              </TouchableOpacity>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  messageInput: {
    borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: "Inter_400Regular", fontSize: 14, minHeight: 64, textAlignVertical: "top",
  },
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

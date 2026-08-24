import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { Companion, useApp } from "@/context/AppContext";

const DATE_OPTIONS = ["Tonight", "Tomorrow", "This Weekend", "Next Week"];
const DURATION_OPTIONS = [
  { label: "1 hr",  hours: 1 },
  { label: "2 hrs", hours: 2 },
  { label: "3 hrs", hours: 3 },
  { label: "4+ hrs", hours: 4 },
];

export function BookingModal({
  visible,
  companion,
  onClose,
}: {
  visible: boolean;
  companion: Companion | null;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addMatch, addBooking } = useApp();

  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedDuration, setSelectedDuration] = useState(1);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);

  if (!companion) return null;

  const total = companion.rate * DURATION_OPTIONS[selectedDuration].hours;

  const handleSend = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addMatch(companion, "standard");
    addBooking({
      companionId: companion.id,
      companionName: companion.name,
      companionColor: companion.color,
      companionInitial: companion.name[0],
      activity: selectedService!,
      date: DATE_OPTIONS[selectedDate],
      time: selectedDate === 0 ? "Tonight" : "To be confirmed",
      hours: DURATION_OPTIONS[selectedDuration].hours,
      rate: companion.rate,
      status: selectedDate === 0 ? "active" : "upcoming",
      city: companion.city,
      safetyActive: selectedDate === 0,
      note: note.trim(),
    });
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setSelectedService(null);
      setSelectedDate(0);
      setSelectedDuration(1);
      setNote("");
      onClose();
    }, 1800);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: Platform.OS === "web" ? 24 : insets.bottom + 16 }]}>
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.companionAvatar, { backgroundColor: companion.color }]}>
            <Text style={styles.companionInitial}>{companion.name[0]}</Text>
            {companion.online && <View style={[styles.onlineDot, { borderColor: colors.card }]} />}
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={[styles.companionName, { color: colors.foreground }]}>{companion.name}, {companion.age}</Text>
              {companion.verified && <Ionicons name="checkmark-circle" size={15} color="#3DA9FF" />}
            </View>
            <Text style={[styles.companionMeta, { color: colors.mutedForeground }]}>
              {companion.city} · {(companion.rate / 1000).toFixed(0)}k UGX/hr · ★ {companion.rating}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>

          {sent ? (
            <View style={styles.successBlock}>
              <Text style={styles.successEmoji}>✅</Text>
              <Text style={[styles.successTitle, { color: colors.foreground }]}>Request Sent!</Text>
              <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
                {companion.name} will respond within a few minutes
              </Text>
            </View>
          ) : (
            <>
              {/* Service */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SELECT SERVICE</Text>
                <View style={styles.chipRow}>
                  {companion.menu.map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selectedService === s ? "rgba(255,78,98,0.12)" : colors.background,
                          borderColor: selectedService === s ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => { setSelectedService(s === selectedService ? null : s); Haptics.selectionAsync(); }}
                    >
                      <Text style={[styles.chipText, { color: selectedService === s ? colors.primary : colors.foreground }]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Date */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>WHEN</Text>
                <View style={styles.chipRow}>
                  {DATE_OPTIONS.map((d, i) => (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selectedDate === i ? "rgba(61,169,255,0.12)" : colors.background,
                          borderColor: selectedDate === i ? "#3DA9FF" : colors.border,
                        },
                      ]}
                      onPress={() => { setSelectedDate(i); Haptics.selectionAsync(); }}
                    >
                      <Text style={[styles.chipText, { color: selectedDate === i ? "#3DA9FF" : colors.foreground }]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Duration */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>DURATION</Text>
                <View style={styles.durationRow}>
                  {DURATION_OPTIONS.map((d, i) => (
                    <TouchableOpacity
                      key={d.label}
                      style={[
                        styles.durationBtn,
                        {
                          backgroundColor: selectedDuration === i ? "rgba(122,60,255,0.12)" : colors.background,
                          borderColor: selectedDuration === i ? "#7A3CFF" : colors.border,
                          flex: 1,
                        },
                      ]}
                      onPress={() => { setSelectedDuration(i); Haptics.selectionAsync(); }}
                    >
                      <Text style={[styles.durationText, { color: selectedDuration === i ? "#7A3CFF" : colors.foreground }]}>{d.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Note */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>NOTE (optional)</Text>
                <TextInput
                  style={[styles.noteInput, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                  placeholder="Tell them about your plans, preferences, or any special requests..."
                  placeholderTextColor={colors.mutedForeground}
                  value={note}
                  onChangeText={setNote}
                  multiline
                  numberOfLines={3}
                  maxLength={200}
                />
              </View>

              {/* Total + CTA */}
              <View style={[styles.totalBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View>
                  <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Estimated total</Text>
                  <Text style={[styles.totalAmount, { color: "#1FBF6B" }]}>
                    UGX {total.toLocaleString()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.sendBtn, { backgroundColor: selectedService ? colors.primary : colors.muted }]}
                  onPress={selectedService ? handleSend : undefined}
                  activeOpacity={selectedService ? 0.85 : 1}
                >
                  <Ionicons name="paper-plane" size={15} color="#fff" />
                  <Text style={styles.sendBtnText}>
                    {selectedService ? "Send Request" : "Pick a service"}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
                No charge until {companion.name} confirms · Cancel anytime
              </Text>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "88%",
    paddingTop: 10,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingBottom: 16 },
  companionAvatar: {
    width: 50, height: 50, borderRadius: 25,
    alignItems: "center", justifyContent: "center",
    position: "relative",
  },
  companionInitial: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 20 },
  onlineDot: {
    position: "absolute", bottom: 2, right: 2,
    width: 11, height: 11, borderRadius: 5.5,
    backgroundColor: "#22c55e", borderWidth: 2,
  },
  companionName: { fontFamily: "Inter_700Bold", fontSize: 17 },
  companionMeta: { fontFamily: "Inter_400Regular", fontSize: 13 },
  closeBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  body: { paddingHorizontal: 20, gap: 20, paddingBottom: 8 },
  section: { gap: 10 },
  sectionLabel: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 22, borderWidth: 1.5,
  },
  chipText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  durationRow: { flexDirection: "row", gap: 8 },
  durationBtn: {
    paddingVertical: 12, borderRadius: 14, borderWidth: 1.5,
    alignItems: "center",
  },
  durationText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  noteInput: {
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: "Inter_400Regular", fontSize: 14,
    minHeight: 80, textAlignVertical: "top",
  },
  totalBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderRadius: 18, borderWidth: 1, padding: 14,
  },
  totalLabel: { fontFamily: "Inter_400Regular", fontSize: 12 },
  totalAmount: { fontFamily: "Inter_700Bold", fontSize: 20 },
  sendBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 20, paddingVertical: 13, borderRadius: 16,
  },
  sendBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 },
  disclaimer: { fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center" },
  successBlock: { alignItems: "center", gap: 12, paddingVertical: 40 },
  successEmoji: { fontSize: 56 },
  successTitle: { fontFamily: "Inter_700Bold", fontSize: 22 },
  successSub: { fontFamily: "Inter_400Regular", fontSize: 15, textAlign: "center" },
});

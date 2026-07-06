import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

interface TrustedContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
}

const DEFAULT_CONTACTS: TrustedContact[] = [
  { id: "tc1", name: "Miriam K.", phone: "+256 701 234 567", relation: "Sister" },
];

const SAFETY_TIPS = [
  { icon: "location-outline",        color: "#3DA9FF", tip: "Always share your live location with a trusted contact before a meetup" },
  { icon: "people-outline",          color: "#1FBF6B", tip: "Meet first in a public place — café, hotel lobby, or mall" },
  { icon: "shield-checkmark-outline",color: "#FF8A3D", tip: "Use the in-app meetup code to confirm identity at meetup" },
  { icon: "phone-portrait-outline",  color: "#7A3CFF", tip: "Keep your phone charged and mobile data on during the evening" },
  { icon: "eye-off-outline",         color: "#FF4E62", tip: "Never share your home address in chat before meeting in person" },
  { icon: "cash-outline",            color: "#1FBF6B", tip: "Pay only through NightMap wallet — never cash upfront" },
];

const CHECK_IN_INTERVALS = [
  { label: "30 min", seconds: 1800 },
  { label: "1 hr",   seconds: 3600 },
  { label: "2 hrs",  seconds: 7200 },
];

function AddContactModal({ visible, onClose, onAdd }: {
  visible: boolean;
  onClose: () => void;
  onAdd: (c: TrustedContact) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [name, setName]       = useState("");
  const [phone, setPhone]     = useState("");
  const [relation, setRelation] = useState("");

  const handleAdd = () => {
    if (!name.trim() || !phone.trim()) return;
    onAdd({ id: Date.now().toString(), name: name.trim(), phone: phone.trim(), relation: relation.trim() || "Contact" });
    setName(""); setPhone(""); setRelation("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.addSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.addTitle, { color: colors.foreground }]}>Add Trusted Contact</Text>
          <Text style={[styles.addSub, { color: colors.mutedForeground }]}>
            This person will receive your location when you check in
          </Text>
          {[
            { label: "Full Name", value: name, onChange: setName, placeholder: "e.g. Amara Diallo", keyboard: "default" as const },
            { label: "Phone Number", value: phone, onChange: setPhone, placeholder: "+256 7XX XXX XXX", keyboard: "phone-pad" as const },
            { label: "Relation", value: relation, onChange: setRelation, placeholder: "e.g. Sister, Friend, Colleague", keyboard: "default" as const },
          ].map(f => (
            <View key={f.label} style={{ gap: 6 }}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{f.label.toUpperCase()}</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                placeholder={f.placeholder}
                placeholderTextColor={colors.mutedForeground}
                value={f.value}
                onChangeText={f.onChange}
                keyboardType={f.keyboard}
              />
            </View>
          ))}
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: (name && phone) ? "#1FBF6B" : colors.muted }]}
            onPress={handleAdd}
            disabled={!name || !phone}
          >
            <Text style={[styles.addBtnText, { color: (name && phone) ? "#fff" : colors.mutedForeground }]}>Save Contact</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function SafetyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [contacts, setContacts]             = useState<TrustedContact[]>(DEFAULT_CONTACTS);
  const [checkInActive, setCheckInActive]   = useState(false);
  const [checkInInterval, setCheckInInterval] = useState(0);
  const [timeLeft, setTimeLeft]             = useState(0);
  const [panicMode, setPanicMode]           = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const panicScale  = useRef(new Animated.Value(1)).current;
  const panicGlow   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (checkInActive) {
      setTimeLeft(CHECK_IN_INTERVALS[checkInInterval].seconds);
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert("Check-In Reminder", "Time to check in! Tap Check In to let your contact know you're safe.");
            return CHECK_IN_INTERVALS[checkInInterval].seconds;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setTimeLeft(0);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [checkInActive, checkInInterval]);

  const handlePanic = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setPanicMode(true);
    Animated.loop(
      Animated.sequence([
        Animated.timing(panicGlow, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(panicGlow, { toValue: 0, duration: 500, useNativeDriver: true }),
      ])
    ).start();
    Animated.sequence([
      Animated.timing(panicScale, { toValue: 1.15, duration: 150, useNativeDriver: true }),
      Animated.spring(panicScale, { toValue: 1, useNativeDriver: true, friction: 4 }),
    ]).start();
    setTimeout(() => {
      setPanicMode(false);
      panicGlow.stopAnimation();
      Alert.alert(
        "🚨 Emergency Alert Sent",
        `Your location and a distress signal have been sent to ${contacts[0]?.name ?? "your emergency contact"} and the NightMap safety team.`,
        [{ text: "OK" }]
      );
    }, 3000);
  };

  const handleCheckIn = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeLeft(CHECK_IN_INTERVALS[checkInInterval].seconds);
    Alert.alert("Check-In Sent ✅", `Your location has been shared with ${contacts.map(c => c.name).join(", ")}.`);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 56 : insets.top + 4, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Safety Hub</Text>
          <Text style={[styles.headerSub, { color: "#1FBF6B" }]}>You're protected</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Panic button */}
        <View style={[styles.panicSection, { backgroundColor: "rgba(255,78,98,0.05)", borderColor: "rgba(255,78,98,0.15)" }]}>
          {panicMode && (
            <Animated.View style={[styles.panicGlowRing, { opacity: panicGlow }]} />
          )}
          <Text style={[styles.panicLabel, { color: colors.mutedForeground }]}>EMERGENCY PANIC BUTTON</Text>
          <TouchableOpacity onPress={handlePanic} activeOpacity={0.85}>
            <Animated.View style={[styles.panicBtn, panicMode && styles.panicBtnActive, { transform: [{ scale: panicScale }] }]}>
              <Ionicons name="warning" size={36} color="#fff" />
              <Text style={styles.panicBtnText}>{panicMode ? "SENDING ALERT..." : "PANIC"}</Text>
            </Animated.View>
          </TouchableOpacity>
          <Text style={[styles.panicDesc, { color: colors.mutedForeground }]}>
            Instantly alerts your trusted contacts and NightMap safety team with your live location
          </Text>
        </View>

        {/* Check-In Timer */}
        <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>CHECK-IN TIMER</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.checkInRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Auto Check-In</Text>
              <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                {checkInActive ? `Next check-in: ${formatTime(timeLeft)}` : "Notifies contacts at set intervals"}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.toggleBtn, { backgroundColor: checkInActive ? "rgba(31,191,107,0.15)" : colors.muted, borderColor: checkInActive ? "#1FBF6B" : colors.border }]}
              onPress={() => { setCheckInActive(!checkInActive); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
            >
              <Ionicons name={checkInActive ? "stop-circle" : "play-circle"} size={18} color={checkInActive ? "#1FBF6B" : colors.mutedForeground} />
              <Text style={[styles.toggleBtnText, { color: checkInActive ? "#1FBF6B" : colors.mutedForeground }]}>
                {checkInActive ? "Stop" : "Start"}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.intervalRow}>
            {CHECK_IN_INTERVALS.map((iv, i) => (
              <TouchableOpacity
                key={iv.label}
                style={[styles.ivChip, checkInInterval === i && { backgroundColor: "rgba(61,169,255,0.12)", borderColor: "#3DA9FF" }, { borderColor: colors.border, backgroundColor: colors.muted }]}
                onPress={() => setCheckInInterval(i)}
              >
                <Text style={[styles.ivChipText, { color: checkInInterval === i ? "#3DA9FF" : colors.mutedForeground }]}>{iv.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {checkInActive && (
            <TouchableOpacity
              style={[styles.checkInBtn, { backgroundColor: "#1FBF6B" }]}
              onPress={handleCheckIn}
            >
              <Ionicons name="shield-checkmark" size={16} color="#fff" />
              <Text style={styles.checkInBtnText}>Check In Now</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Trusted Contacts */}
        <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>TRUSTED CONTACTS</Text>
        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          {contacts.map(contact => (
            <View key={contact.id} style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.contactAvatar, { backgroundColor: "rgba(31,191,107,0.15)" }]}>
                <Text style={styles.contactInitial}>{contact.name[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.contactName, { color: colors.foreground }]}>{contact.name}</Text>
                <Text style={[styles.contactPhone, { color: colors.mutedForeground }]}>{contact.phone} · {contact.relation}</Text>
              </View>
              <TouchableOpacity
                style={[styles.contactAction, { backgroundColor: "rgba(255,78,98,0.08)", borderColor: "rgba(255,78,98,0.2)" }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Alert.alert("Remove Contact", `Remove ${contact.name} as a trusted contact?`, [
                    { text: "Cancel" },
                    { text: "Remove", style: "destructive", onPress: () => setContacts(prev => prev.filter(c => c.id !== contact.id)) },
                  ]);
                }}
              >
                <Ionicons name="trash-outline" size={14} color="#FF4E62" />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            style={[styles.addContactBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowAddContact(true)}
          >
            <Ionicons name="person-add-outline" size={18} color="#1FBF6B" />
            <Text style={[styles.addContactText, { color: "#1FBF6B" }]}>Add Trusted Contact</Text>
          </TouchableOpacity>
        </View>

        {/* Safety Tips */}
        <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>SAFETY GUIDELINES</Text>
        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          {SAFETY_TIPS.map((tip, i) => (
            <View key={i} style={[styles.tipRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.tipIcon, { backgroundColor: `${tip.color}15` }]}>
                <Ionicons name={tip.icon as never} size={17} color={tip.color} />
              </View>
              <Text style={[styles.tipText, { color: colors.foreground }]}>{tip.tip}</Text>
            </View>
          ))}
        </View>

        {/* Report */}
        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
          <TouchableOpacity
            style={[styles.reportBtn, { backgroundColor: "rgba(255,78,98,0.06)", borderColor: "rgba(255,78,98,0.2)" }]}
            onPress={() => Alert.alert("Report an Incident", "Our safety team will contact you within 30 minutes.\n\nEmail: safety@nightmap.app\nHotline: +256 800 100 200")}
          >
            <Ionicons name="flag-outline" size={18} color="#FF4E62" />
            <View>
              <Text style={[styles.reportTitle, { color: "#FF4E62" }]}>Report an Incident</Text>
              <Text style={[styles.reportSub, { color: colors.mutedForeground }]}>Confidential · 30-min response</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AddContactModal visible={showAddContact} onClose={() => setShowAddContact(false)} onAdd={c => setContacts(prev => [...prev, c])} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 20 },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },

  panicSection: {
    margin: 16, borderRadius: 20, borderWidth: 1.5,
    alignItems: "center", paddingVertical: 28, paddingHorizontal: 20, gap: 16,
    position: "relative", overflow: "hidden",
  },
  panicGlowRing: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,78,98,0.2)",
  },
  panicLabel: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1 },
  panicBtn: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: "#FF4E62",
    alignItems: "center", justifyContent: "center", gap: 6,
    shadowColor: "#FF4E62", shadowOpacity: 0.6, shadowRadius: 20, shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  panicBtnActive: { backgroundColor: "#cc2233" },
  panicBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 13, letterSpacing: 1 },
  panicDesc: { fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center", lineHeight: 18 },

  sectionHeader: {
    fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1,
    paddingHorizontal: 16, marginTop: 20, marginBottom: 10,
  },
  card: { marginHorizontal: 16, borderRadius: 18, borderWidth: 1, padding: 16, gap: 12 },
  checkInRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  cardSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  toggleBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1,
  },
  toggleBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  intervalRow: { flexDirection: "row", gap: 8 },
  ivChip: {
    flex: 1, alignItems: "center", paddingVertical: 8,
    borderRadius: 12, borderWidth: 1.5,
  },
  ivChipText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  checkInBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 12, borderRadius: 14,
  },
  checkInBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 },

  contactCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 12,
  },
  contactAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  contactInitial: { color: "#1FBF6B", fontFamily: "Inter_700Bold", fontSize: 16 },
  contactName: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  contactPhone: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  contactAction: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  addContactBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 13, borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed",
  },
  addContactText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },

  tipRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 12,
  },
  tipIcon: { width: 36, height: 36, borderRadius: 9, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  tipText: { fontFamily: "Inter_400Regular", fontSize: 13, flex: 1, lineHeight: 19 },

  reportBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 16, borderWidth: 1, padding: 16, marginTop: 4,
  },
  reportTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  reportSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },

  // Add contact modal
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  addSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, gap: 14 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  addTitle: { fontFamily: "Inter_700Bold", fontSize: 20 },
  addSub: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, marginBottom: 4 },
  fieldLabel: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 0.5 },
  fieldInput: {
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: "Inter_400Regular", fontSize: 15,
  },
  addBtn: { borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  addBtnText: { fontFamily: "Inter_700Bold", fontSize: 15 },
  cancelBtn: { alignItems: "center", paddingVertical: 8 },
  cancelBtnText: { fontFamily: "Inter_400Regular", fontSize: 14 },
});

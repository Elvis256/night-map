import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { uploadPhoto } from "@workspace/api-client-react";
import { useColors } from "@workspace/nightmap-design-system/hooks/use-colors";
import { useApp, type AvailabilityStatus } from "@/context/AppContext";
import { errorMessage } from "@/lib/api";

export const MENU_OPTIONS = [
  "Dinner Date",
  "Nightclub",
  "Movie Night",
  "Pool/Swim",
  "Massage",
  "Conversation & Drinks",
  "City Tour",
  "Events",
  "Travel Companion",
];
export const VIBE_OPTIONS = [
  "Fine Dining", "Nightlife", "Dancing", "Art", "Culture", "Music", "Travel", "Luxury",
  "Business", "Events", "Beach", "Coffee", "Spa Days", "Shopping", "Adventure", "Gentleman",
];
const RATE_PRESETS = [60000, 80000, 100000, 120000, 150000, 200000, 250000];

type Step = "photo" | "about" | "menu" | "rate" | "availability";
const STEPS: { key: Step; title: string; subtitle: string }[] = [
  { key: "photo", title: "Add your photo", subtitle: "Listings with a photo get 5× more requests" },
  { key: "about", title: "About you", subtitle: "A short intro clients will see first" },
  { key: "menu", title: "Your menu", subtitle: "What you offer and your vibe" },
  { key: "rate", title: "Your rate", subtitle: "Agreed directly with clients. NightMap takes no fee." },
  { key: "availability", title: "Availability", subtitle: "You can change this any time from your profile" },
];

export default function CompanionSetupScreen() {
  const colors = useColors("dark");
  const insets = useSafeAreaInsets();
  const { userProfile, updateProfile, updateCompanionProfile, refreshMe } = useApp();
  const existing = userProfile.companionProfile;

  const [stepIdx, setStepIdx] = useState(0);
  const [photoUri, setPhotoUri] = useState<string | null>(userProfile.photoUrl);
  const [uploading, setUploading] = useState(false);
  const [bio, setBio] = useState(userProfile.bio);
  const [age, setAge] = useState(userProfile.age ? String(userProfile.age) : "");
  const [menu, setMenu] = useState<string[]>(existing?.menu ?? []);
  const [vibes, setVibes] = useState<string[]>(existing?.vibes ?? []);
  const [rate, setRate] = useState<number>(existing?.rate && existing.rate > 0 ? existing.rate : 100000);
  const [customRate, setCustomRate] = useState("");
  const [minHours, setMinHours] = useState<number>(existing?.minBookingHours ?? 2);
  const [availability, setAvailability] = useState<AvailabilityStatus>(existing?.availabilityStatus ?? "tonight");
  const [saving, setSaving] = useState(false);

  const step = STEPS[stepIdx];
  const progress = (stepIdx + 1) / STEPS.length;

  const canContinue = useMemo(() => {
    switch (step.key) {
      case "photo": return !uploading;
      case "about": return bio.trim().length >= 10 && (age === "" || (Number(age) >= 18 && Number(age) <= 99));
      case "menu": return menu.length > 0;
      case "rate": return rate > 0 && minHours > 0;
      case "availability": return !saving;
    }
  }, [step.key, uploading, bio, age, menu, rate, minHours, saving]);

  const pickPhoto = async (fromCamera: boolean) => {
    try {
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert("Permission needed", "Allow access in your device settings to add a photo.");
        return;
      }
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7, allowsEditing: true, aspect: [4, 5] })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], base64: true, quality: 0.7, allowsEditing: true, aspect: [4, 5] });
      if (result.canceled || !result.assets[0]?.base64) return;
      setUploading(true);
      await uploadPhoto({ dataBase64: result.assets[0].base64, contentType: "image/jpeg", isPrimary: true });
      setPhotoUri(result.assets[0].uri);
      await refreshMe();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Alert.alert("Upload failed", errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const toggle = (list: string[], value: string, set: (v: string[]) => void, max: number) => {
    Haptics.selectionAsync();
    if (list.includes(value)) set(list.filter((v) => v !== value));
    else if (list.length < max) set([...list, value]);
  };

  const finish = async () => {
    setSaving(true);
    try {
      await updateProfile({ bio: bio.trim(), age: age ? Number(age) : undefined, isCompanion: true, availableTonight: availability !== "offline" });
      await updateCompanionProfile({ menu, vibes, rate, minBookingHours: minHours, availabilityStatus: availability });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)/profile");
    } catch (err) {
      Alert.alert("Could not save your listing", errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (!canContinue) return;
    if (stepIdx === STEPS.length - 1) {
      void finish();
      return;
    }
    Haptics.selectionAsync();
    setStepIdx((i) => i + 1);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: Platform.OS === "web" ? 56 : insets.top + 4 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (stepIdx > 0 ? setStepIdx((i) => i - 1) : router.replace("/(tabs)"))} style={styles.backBtn}>
          <Ionicons name={stepIdx > 0 ? "arrow-back" : "close"} size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Set up your listing</Text>
        <TouchableOpacity onPress={() => router.replace("/(tabs)")} style={styles.backBtn}>
          <Text style={[styles.skip, { color: colors.mutedForeground }]}>Later</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
        <View style={[styles.progressFill, { backgroundColor: "#1FBF6B", width: `${progress * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={[styles.stepLabel, { color: "#1FBF6B" }]}>STEP {stepIdx + 1} OF {STEPS.length}</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>{step.title}</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{step.subtitle}</Text>

        {step.key === "photo" && (
          <View style={styles.photoBlock}>
            <View style={[styles.photoFrame, { backgroundColor: colors.card, borderColor: photoUri ? "#1FBF6B" : colors.border }]}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
              ) : (
                <Ionicons name="person" size={64} color={colors.mutedForeground} />
              )}
              {uploading && (
                <View style={styles.photoOverlay}>
                  <ActivityIndicator color="#fff" />
                </View>
              )}
            </View>
            <View style={styles.photoActions}>
              <TouchableOpacity style={[styles.photoBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => pickPhoto(true)} disabled={uploading}>
                <Ionicons name="camera-outline" size={18} color={colors.foreground} />
                <Text style={[styles.photoBtnText, { color: colors.foreground }]}>Take photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.photoBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => pickPhoto(false)} disabled={uploading}>
                <Ionicons name="images-outline" size={18} color={colors.foreground} />
                <Text style={[styles.photoBtnText, { color: colors.foreground }]}>Choose from gallery</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              Your face should be clearly visible. You can add up to 6 photos later from your profile.
            </Text>
          </View>
        )}

        {step.key === "about" && (
          <View style={styles.formGap}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>BIO</Text>
            <TextInput
              style={[styles.input, styles.bioInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Sophisticated and adventurous. Love great food, rooftop views and genuine conversation…"
              placeholderTextColor={colors.mutedForeground}
              value={bio}
              onChangeText={setBio}
              multiline
              maxLength={300}
            />
            <Text style={[styles.hint, { color: colors.mutedForeground, textAlign: "right" }]}>{bio.trim().length}/300 · at least 10 characters</Text>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>AGE (optional, shown on your card)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, width: 120 }]}
              placeholder="24"
              placeholderTextColor={colors.mutedForeground}
              value={age}
              onChangeText={(v) => setAge(v.replace(/\D/g, "").slice(0, 2))}
              keyboardType="number-pad"
            />
          </View>
        )}

        {step.key === "menu" && (
          <View style={styles.formGap}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>SERVICES · pick up to 8</Text>
            <View style={styles.chipRow}>
              {MENU_OPTIONS.map((m) => {
                const on = menu.includes(m);
                return (
                  <TouchableOpacity key={m} style={[styles.chip, { backgroundColor: on ? "rgba(255,78,98,0.12)" : colors.card, borderColor: on ? colors.primary : colors.border }]} onPress={() => toggle(menu, m, setMenu, 8)}>
                    <Text style={[styles.chipText, { color: on ? colors.primary : colors.foreground }]}>{m}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 8 }]}>YOUR VIBE · pick up to 3</Text>
            <View style={styles.chipRow}>
              {VIBE_OPTIONS.map((v) => {
                const on = vibes.includes(v);
                return (
                  <TouchableOpacity key={v} style={[styles.chip, { backgroundColor: on ? "rgba(122,60,255,0.12)" : colors.card, borderColor: on ? "#7A3CFF" : colors.border }]} onPress={() => toggle(vibes, v, setVibes, 3)}>
                    <Text style={[styles.chipText, { color: on ? "#7A3CFF" : colors.foreground }]}>{v}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {step.key === "rate" && (
          <View style={styles.formGap}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>HOURLY RATE (UGX)</Text>
            <View style={styles.chipRow}>
              {RATE_PRESETS.map((r) => (
                <TouchableOpacity key={r} style={[styles.chip, { backgroundColor: rate === r ? "rgba(31,191,107,0.12)" : colors.card, borderColor: rate === r ? "#1FBF6B" : colors.border }]} onPress={() => { setRate(r); setCustomRate(""); Haptics.selectionAsync(); }}>
                  <Text style={[styles.chipText, { color: rate === r ? "#1FBF6B" : colors.foreground }]}>{(r / 1000).toFixed(0)}k</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Or type a custom rate, e.g. 175000"
              placeholderTextColor={colors.mutedForeground}
              value={customRate}
              onChangeText={(v) => { const digits = v.replace(/\D/g, ""); setCustomRate(digits); if (digits) setRate(Number(digits)); }}
              keyboardType="number-pad"
            />
            <Text style={[styles.bigRate, { color: "#1FBF6B" }]}>UGX {rate.toLocaleString()}<Text style={[styles.hint, { color: colors.mutedForeground }]}> / hour</Text></Text>
            {rate >= 150000 && (
              <View style={[styles.infoCard, { backgroundColor: "rgba(255,138,61,0.08)", borderColor: "rgba(255,138,61,0.3)" }]}>
                <Ionicons name="diamond-outline" size={16} color="#FF8A3D" />
                <Text style={[styles.infoText, { color: colors.mutedForeground }]}>Rates of UGX 150k and above place you in the High-End collection, visible to clients with High-End Access.</Text>
              </View>
            )}
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 8 }]}>MINIMUM BOOKING</Text>
            <View style={styles.chipRow}>
              {[1, 2, 3, 4].map((h) => (
                <TouchableOpacity key={h} style={[styles.chip, { backgroundColor: minHours === h ? "rgba(61,169,255,0.12)" : colors.card, borderColor: minHours === h ? "#3DA9FF" : colors.border }]} onPress={() => { setMinHours(h); Haptics.selectionAsync(); }}>
                  <Text style={[styles.chipText, { color: minHours === h ? "#3DA9FF" : colors.foreground }]}>{h} hr{h > 1 ? "s" : ""}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {step.key === "availability" && (
          <View style={styles.formGap}>
            {([
              ["now", "Available now", "Show at the top of the map with a green dot", "#22c55e"],
              ["tonight", "Available tonight", "Listed for evening plans", "#FF8A3D"],
              ["offline", "Offline for now", "Hidden from Available filters, profile stays visible", "#6b6b8a"],
            ] as const).map(([value, label, desc, color]) => {
              const on = availability === value;
              return (
                <TouchableOpacity key={value} style={[styles.availCard, { backgroundColor: on ? `${color}14` : colors.card, borderColor: on ? color : colors.border }]} onPress={() => { setAvailability(value); Haptics.selectionAsync(); }}>
                  <View style={[styles.availDot, { backgroundColor: color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.availLabel, { color: colors.foreground }]}>{label}</Text>
                    <Text style={[styles.hint, { color: colors.mutedForeground }]}>{desc}</Text>
                  </View>
                  {on && <Ionicons name="checkmark-circle" size={20} color={color} />}
                </TouchableOpacity>
              );
            })}
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#1FBF6B" />
              <Text style={[styles.infoText, { color: colors.mutedForeground }]}>Next, get verified from your profile. Verified companions receive far more requests and earn a trust badge.</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={[styles.nextBtn, { backgroundColor: canContinue ? "#1FBF6B" : colors.muted }]} onPress={next} disabled={!canContinue} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color="#fff" /> : (
            <>
              <Text style={[styles.nextBtnText, { color: canContinue ? "#fff" : colors.mutedForeground }]}>
                {stepIdx === STEPS.length - 1 ? "Publish my listing" : step.key === "photo" && !photoUri ? "Skip for now" : "Continue"}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={canContinue ? "#fff" : colors.mutedForeground} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingBottom: 8 },
  backBtn: { width: 44, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 16 },
  skip: { fontFamily: "Inter_500Medium", fontSize: 13 },
  progressTrack: { height: 4, marginHorizontal: 16, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 4, borderRadius: 2 },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  stepLabel: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1 },
  title: { fontFamily: "Inter_700Bold", fontSize: 26, marginTop: 6 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 4, marginBottom: 20, lineHeight: 20 },
  photoBlock: { alignItems: "center", gap: 16 },
  photoFrame: { width: 200, height: 250, borderRadius: 24, borderWidth: 2, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  photo: { width: "100%", height: "100%" },
  photoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  photoActions: { gap: 10, width: "100%" },
  photoBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, borderWidth: 1, paddingVertical: 14 },
  photoBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  hint: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17 },
  formGap: { gap: 10 },
  fieldLabel: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1 },
  input: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontFamily: "Inter_400Regular", fontSize: 15 },
  bioInput: { minHeight: 110, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  chipText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  bigRate: { fontFamily: "Inter_700Bold", fontSize: 28, marginTop: 4 },
  infoCard: { flexDirection: "row", gap: 10, alignItems: "flex-start", borderRadius: 14, borderWidth: 1, padding: 12, marginTop: 4 },
  infoText: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18, flex: 1 },
  availCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 1.5, padding: 14 },
  availDot: { width: 12, height: 12, borderRadius: 6 },
  availLabel: { fontFamily: "Inter_600SemiBold", fontSize: 15, marginBottom: 2 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, paddingVertical: 16 },
  nextBtnText: { fontFamily: "Inter_700Bold", fontSize: 16 },
});

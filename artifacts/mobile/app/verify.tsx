import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getGetVerificationQueryKey, submitVerification, useGetVerification } from "@workspace/api-client-react";
import { useColors } from "@workspace/nightmap-design-system/hooks/use-colors";
import { useApp } from "@/context/AppContext";
import { errorMessage, fileUriToBase64 } from "@/lib/api";

type Step = "id" | "selfie" | "video" | "review";
const STEPS: { key: Step; title: string; desc: string; icon: string }[] = [
  { key: "id", title: "Government ID", desc: "Upload your National ID (Uganda NIRA, Kenya Huduma, Tanzania NIDA)", icon: "card-outline" },
  { key: "selfie", title: "Biometric Selfie", desc: "Take a live selfie to match against your ID photo", icon: "camera-outline" },
  { key: "video", title: "5-Second Video", desc: "Record yourself saying the 4-digit code shown on screen", icon: "videocam-outline" },
  { key: "review", title: "Ready to submit", desc: "Our safety team reviews your verification within 24 hours", icon: "time-outline" },
];

interface Capture { uri: string; base64: string }

async function ensurePermission(kind: "camera" | "library"): Promise<boolean> {
  const res = kind === "camera"
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!res.granted) {
    Alert.alert(
      kind === "camera" ? "Camera access needed" : "Photo access needed",
      `Enable ${kind === "camera" ? "camera" : "photo library"} access in your device Settings to continue verification.`,
    );
    return false;
  }
  return true;
}

export default function VerifyScreen() {
  const colors = useColors("dark");
  const insets = useSafeAreaInsets();
  const { refreshMe, invalidate, userProfile } = useApp();
  const statusQuery = useGetVerification({ query: { queryKey: getGetVerificationQueryKey(), staleTime: 10_000 } });
  const [currentStep, setCurrentStep] = useState<Step>("id");
  const [busy, setBusy] = useState(false);
  const [code] = useState(Math.floor(1000 + Math.random() * 9000).toString());
  const [done, setDone] = useState(false);
  const [idPhoto, setIdPhoto] = useState<Capture | null>(null);
  const [selfie, setSelfie] = useState<Capture | null>(null);
  const [video, setVideo] = useState<Capture | null>(null);
  const stepIndex = STEPS.findIndex((s) => s.key === currentStep);
  const step = STEPS[stepIndex];
  const serverStatus = statusQuery.data?.status ?? userProfile.verificationStatus;

  const pickImage = async (source: "camera" | "library", front = false): Promise<Capture | null> => {
    if (!(await ensurePermission(source))) return null;
    try {
      const result = source === "camera"
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], base64: true, quality: 0.6, cameraType: front ? ImagePicker.CameraType.front : ImagePicker.CameraType.back })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], base64: true, quality: 0.6 });
      if (result.canceled || !result.assets[0]) return null;
      const asset = result.assets[0];
      const base64 = asset.base64 ?? (await fileUriToBase64(asset.uri));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return { uri: asset.uri, base64 };
    } catch (err) {
      Alert.alert("Could not capture", errorMessage(err));
      return null;
    }
  };

  const recordVideo = async () => {
    if (!(await ensurePermission("camera"))) return;
    setBusy(true);
    try {
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["videos"], videoMaxDuration: 6, cameraType: ImagePicker.CameraType.front, quality: 0.5 });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const base64 = await fileUriToBase64(asset.uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setVideo({ uri: asset.uri, base64 });
    } catch (err) {
      Alert.alert("Could not record", errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const canContinue =
    currentStep === "id" ? !!idPhoto :
    currentStep === "selfie" ? !!selfie :
    true;

  const handleSubmit = async () => {
    if (!idPhoto || !selfie || busy) return;
    setBusy(true);
    try {
      await submitVerification({
        idPhotoBase64: idPhoto.base64,
        selfieBase64: selfie.base64,
        videoBase64: video?.base64,
        code,
      });
      invalidate([getGetVerificationQueryKey()]);
      await refreshMe();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone(true);
      setTimeout(() => router.back(), 2200);
    } catch (err) {
      Alert.alert("Could not submit", errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (currentStep === "id") setCurrentStep("selfie");
    else if (currentStep === "selfie") setCurrentStep("video");
    else if (currentStep === "video") setCurrentStep("review");
    else void handleSubmit();
  };

  if (done || serverStatus === "pending" || serverStatus === "approved") {
    const approved = serverStatus === "approved";
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        <View style={[styles.header, { paddingTop: 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Verification</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.doneScreen}>
          <View style={[styles.doneIcon, { backgroundColor: approved ? "rgba(34,197,94,0.15)" : "rgba(255,138,61,0.15)" }]}>
            <Ionicons name={approved ? "shield-checkmark" : "time-outline"} size={64} color={approved ? "#22c55e" : "#FF8A3D"} />
          </View>
          <Text style={[styles.doneTitle, { color: colors.foreground }]}>
            {approved ? "You're verified" : "Verification Submitted"}
          </Text>
          <Text style={[styles.doneSubtitle, { color: colors.mutedForeground }]}>
            {approved
              ? "Your verified badge is live on your profile."
              : `Our team will review your documents within 24 hours. You'll receive a notification once verified.${statusQuery.data?.submittedAt ? `\n\nSubmitted ${new Date(statusQuery.data.submittedAt).toLocaleString()}` : ""}`}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Get Verified</Text>
        <View style={styles.backBtn} />
      </View>
      {/* Progress */}
      <View style={styles.progress}>
        {STEPS.filter((s) => s.key !== "review").map((s, i) => {
          const isActive = stepIndex >= i;
          const isDone = stepIndex > i;
          return (
            <React.Fragment key={s.key}>
              <View style={[styles.progressDot, {
                backgroundColor: isDone ? "#22c55e" : isActive ? colors.primary : colors.border,
                width: isActive && !isDone ? 24 : 10,
              }]}>
                {isDone && <Ionicons name="checkmark" size={7} color="#fff" />}
              </View>
              {i < 2 && <View style={[styles.progressLine, { backgroundColor: isDone ? "#22c55e" : colors.border }]} />}
            </React.Fragment>
          );
        })}
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Step icon */}
        <View style={[styles.stepIcon, { backgroundColor: "rgba(255,78,98,0.12)", borderColor: "rgba(255,78,98,0.3)" }]}>
          <Ionicons name={step.icon as never} size={40} color={colors.primary} />
        </View>
        <Text style={[styles.stepTitle, { color: colors.foreground }]}>{step.title}</Text>
        <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>{step.desc}</Text>
        {serverStatus === "rejected" && currentStep === "id" && (
          <View style={[styles.reviewNote, { backgroundColor: "rgba(255,78,98,0.08)", borderColor: "rgba(255,78,98,0.25)", alignSelf: "stretch" }]}>
            <Ionicons name="alert-circle-outline" size={14} color="#FF4E62" />
            <Text style={[styles.reviewNoteText, { color: colors.mutedForeground }]}>
              Previous submission was not approved{statusQuery.data?.reviewNote ? `: ${statusQuery.data.reviewNote}` : ""}. Please resubmit clearer documents.
            </Text>
          </View>
        )}
        {/* Step-specific UI */}
        {currentStep === "id" && (
          <View style={{ alignSelf: "stretch", gap: 10 }}>
            {idPhoto ? (
              <TouchableOpacity style={[styles.uploadBox, { borderColor: "#22c55e", backgroundColor: colors.card, padding: 8 }]} onPress={() => setIdPhoto(null)}>
                <Image source={{ uri: idPhoto.uri }} style={styles.previewImage} resizeMode="cover" />
                <Text style={[styles.uploadHint, { color: colors.mutedForeground }]}>Tap to retake</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.uploadBox, { borderColor: colors.border, backgroundColor: colors.card }]}
                  onPress={async () => { const c = await pickImage("library"); if (c) setIdPhoto(c); }}
                >
                  <Ionicons name="cloud-upload-outline" size={32} color={colors.mutedForeground} />
                  <Text style={[styles.uploadTitle, { color: colors.foreground }]}>Upload ID Photo</Text>
                  <Text style={[styles.uploadHint, { color: colors.mutedForeground }]}>Choose from your gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.altBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                  onPress={async () => { const c = await pickImage("camera"); if (c) setIdPhoto(c); }}
                >
                  <Ionicons name="camera-outline" size={18} color={colors.primary} />
                  <Text style={[styles.altBtnText, { color: colors.foreground }]}>Take a photo of your ID</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
        {currentStep === "selfie" && (
          <TouchableOpacity
            style={[styles.cameraBox, { borderColor: selfie ? "#22c55e" : colors.primary, backgroundColor: "rgba(255,78,98,0.06)" }]}
            onPress={async () => { const c = await pickImage("camera", true); if (c) setSelfie(c); }}
          >
            {selfie ? (
              <Image source={{ uri: selfie.uri }} style={styles.selfiePreview} resizeMode="cover" />
            ) : (
              <View style={[styles.cameraCircle, { backgroundColor: colors.muted }]}>
                <Ionicons name="person-outline" size={48} color={colors.mutedForeground} />
              </View>
            )}
            <Text style={[styles.cameraHint, { color: colors.mutedForeground }]}>{selfie ? "Tap to retake" : "Tap to open camera"}</Text>
          </TouchableOpacity>
        )}
        {currentStep === "video" && (
          <View style={[styles.videoBox, { borderColor: video ? "#22c55e" : colors.border, backgroundColor: colors.card }]}>
            <View style={[styles.codeDisplay, { backgroundColor: colors.muted }]}>
              <Text style={[styles.codeLabel, { color: colors.mutedForeground }]}>Say this code on camera:</Text>
              <Text style={[styles.codeNum, { color: colors.primary }]}>{code}</Text>
            </View>
            <TouchableOpacity
              style={[styles.recordBtn, { backgroundColor: video ? "#22c55e" : colors.destructive }]}
              onPress={recordVideo}
              disabled={busy}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Ionicons name={video ? "checkmark-circle" : "radio-button-on"} size={24} color="#fff" />}
              <Text style={styles.recordBtnText}>{video ? "Video recorded · tap to redo" : "Record 5-second video"}</Text>
            </TouchableOpacity>
            {Platform.OS === "web" && (
              <Text style={[styles.uploadHint, { color: colors.mutedForeground, marginTop: 8 }]}>Video is optional on web — you can continue without it.</Text>
            )}
          </View>
        )}
        {currentStep === "review" && (
          <View style={[styles.reviewBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {[
              { icon: "card", label: "National ID", done: !!idPhoto },
              { icon: "camera", label: "Biometric Selfie", done: !!selfie },
              { icon: "videocam", label: "Liveness Video", done: !!video, optional: true },
            ].map(({ icon, label, done: ok, optional }) => (
              <View key={label} style={styles.reviewItem}>
                <Ionicons name={`${icon}-outline` as never} size={18} color={colors.accent} />
                <Text style={[styles.reviewLabel, { color: colors.foreground }]}>{label}{optional && !ok ? " (skipped)" : ""}</Text>
                <Ionicons name={ok ? "checkmark-circle" : "remove-circle-outline"} size={18} color={ok ? "#22c55e" : colors.mutedForeground} />
              </View>
            ))}
            <View style={[styles.reviewNote, { backgroundColor: "rgba(255,138,61,0.08)", borderColor: "rgba(255,138,61,0.2)" }]}>
              <Ionicons name="time-outline" size={14} color={colors.accent} />
              <Text style={[styles.reviewNoteText, { color: colors.mutedForeground }]}>
                Human review within 24 hours. Documents are stored privately and only visible to the safety team.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
      {/* CTA */}
      <View style={[styles.footer, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: busy || !canContinue ? colors.muted : colors.primary }]}
          onPress={handleNext}
          disabled={busy || !canContinue}
        >
          {busy && currentStep === "review" ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={[styles.nextBtnText, !canContinue && { color: colors.mutedForeground }]}>
                {currentStep === "review" ? "Submit for Review" : currentStep === "video" && !video ? "Skip video & continue" : "Continue"}
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
  previewImage: { width: "100%", height: 160, borderRadius: 12 },
  selfiePreview: { width: 120, height: 120, borderRadius: 60 },
  altBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, borderWidth: 1, paddingVertical: 14 },
  altBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  progress: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingBottom: 24,
    gap: 0,
  },
  progressDot: {
    height: 10,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  progressLine: { flex: 1, height: 2, marginHorizontal: 4 },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 18,
  },
  stepIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  stepTitle: { fontFamily: "Inter_700Bold", fontSize: 22, textAlign: "center" },
  stepDesc: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 22 },
  uploadBox: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 36,
  },
  uploadTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  uploadHint: { fontFamily: "Inter_400Regular", fontSize: 13 },
  cameraBox: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    paddingVertical: 28,
    gap: 14,
  },
  cameraCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraHint: { fontFamily: "Inter_400Regular", fontSize: 13 },
  videoBox: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    gap: 16,
    alignItems: "center",
  },
  codeDisplay: {
    width: "100%",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    gap: 6,
  },
  codeLabel: { fontFamily: "Inter_400Regular", fontSize: 13 },
  codeNum: { fontFamily: "Inter_700Bold", fontSize: 36, letterSpacing: 8 },
  recordBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
  },
  recordBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 },
  reviewBox: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  reviewItem: { flexDirection: "row", alignItems: "center", gap: 12 },
  reviewLabel: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 15 },
  reviewNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  reviewNoteText: { fontFamily: "Inter_400Regular", fontSize: 12, flex: 1, lineHeight: 18 },
  footer: { paddingHorizontal: 24, paddingTop: 12 },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  nextBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
  doneScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  doneIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  doneTitle: { fontFamily: "Inter_700Bold", fontSize: 24, textAlign: "center" },
  doneSubtitle: { fontFamily: "Inter_400Regular", fontSize: 15, textAlign: "center", lineHeight: 24 },
});

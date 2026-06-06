import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";

type Step = "id" | "selfie" | "video" | "review" | "done";

const STEPS: { key: Step; title: string; desc: string; icon: string }[] = [
  { key: "id", title: "Government ID", desc: "Upload your National ID (Uganda NIRA, Kenya Huduma, Tanzania NIDA)", icon: "card-outline" },
  { key: "selfie", title: "Biometric Selfie", desc: "Take a live selfie to match against your ID photo", icon: "camera-outline" },
  { key: "video", title: "5-Second Video", desc: "Record yourself saying the 4-digit code shown on screen", icon: "videocam-outline" },
  { key: "review", title: "Under Review", desc: "Our safety team reviews your verification within 24 hours", icon: "time-outline" },
];

export default function VerifyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { updateProfile } = useApp();
  const [currentStep, setCurrentStep] = useState<Step>("id");
  const [loading, setLoading] = useState(false);
  const [code] = useState(Math.floor(1000 + Math.random() * 9000).toString());
  const [done, setDone] = useState(false);

  const stepIndex = STEPS.findIndex((s) => s.key === currentStep);
  const step = STEPS[stepIndex];

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (currentStep === "id") setCurrentStep("selfie");
    else if (currentStep === "selfie") setCurrentStep("video");
    else if (currentStep === "video") {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setCurrentStep("review");
      }, 2000);
    } else if (currentStep === "review") {
      setDone(true);
      setTimeout(() => {
        updateProfile({ verified: true });
        router.back();
      }, 1800);
    }
  };

  if (done) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        <View style={styles.doneScreen}>
          <View style={[styles.doneIcon, { backgroundColor: "rgba(34,197,94,0.15)" }]}>
            <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
          </View>
          <Text style={[styles.doneTitle, { color: colors.foreground }]}>Verification Submitted</Text>
          <Text style={[styles.doneSubtitle, { color: colors.mutedForeground }]}>
            Our team will review your documents within 24 hours. You'll receive a notification once verified.
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
          const isActive = STEPS.findIndex((x) => x.key === currentStep) >= i + (currentStep === "review" ? 0 : 0);
          const isDone = STEPS.findIndex((x) => x.key === currentStep) > i;
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

      <View style={styles.content}>
        {/* Step icon */}
        <View style={[styles.stepIcon, { backgroundColor: "rgba(255,78,98,0.12)", borderColor: "rgba(255,78,98,0.3)" }]}>
          <Ionicons name={step.icon as never} size={40} color={colors.primary} />
        </View>

        <Text style={[styles.stepTitle, { color: colors.foreground }]}>{step.title}</Text>
        <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>{step.desc}</Text>

        {/* Step-specific UI */}
        {currentStep === "id" && (
          <TouchableOpacity
            style={[styles.uploadBox, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <Ionicons name="cloud-upload-outline" size={32} color={colors.mutedForeground} />
            <Text style={[styles.uploadTitle, { color: colors.foreground }]}>Upload ID Photo</Text>
            <Text style={[styles.uploadHint, { color: colors.mutedForeground }]}>Tap to select from gallery or take a photo</Text>
          </TouchableOpacity>
        )}

        {currentStep === "selfie" && (
          <TouchableOpacity
            style={[styles.cameraBox, { borderColor: colors.primary, backgroundColor: "rgba(255,78,98,0.06)" }]}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <View style={[styles.cameraCircle, { backgroundColor: colors.muted }]}>
              <Ionicons name="person-outline" size={48} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.cameraHint, { color: colors.mutedForeground }]}>Tap to open camera</Text>
          </TouchableOpacity>
        )}

        {currentStep === "video" && (
          <View style={[styles.videoBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <View style={[styles.codeDisplay, { backgroundColor: colors.muted }]}>
              <Text style={[styles.codeLabel, { color: colors.mutedForeground }]}>Say this code on camera:</Text>
              <Text style={[styles.codeNum, { color: colors.primary }]}>{code}</Text>
            </View>
            <TouchableOpacity
              style={[styles.recordBtn, { backgroundColor: colors.destructive }]}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)}
            >
              <Ionicons name="radio-button-on" size={24} color="#fff" />
              <Text style={styles.recordBtnText}>Record 5-second video</Text>
            </TouchableOpacity>
          </View>
        )}

        {currentStep === "review" && (
          <View style={[styles.reviewBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {[
              { icon: "card", label: "National ID", done: true },
              { icon: "camera", label: "Biometric Selfie", done: true },
              { icon: "videocam", label: "Liveness Video", done: true },
            ].map(({ icon, label, done }) => (
              <View key={label} style={styles.reviewItem}>
                <Ionicons name={`${icon}-outline` as never} size={18} color={colors.accent} />
                <Text style={[styles.reviewLabel, { color: colors.foreground }]}>{label}</Text>
                <Ionicons name={done ? "checkmark-circle" : "time-outline"} size={18} color={done ? "#22c55e" : colors.mutedForeground} />
              </View>
            ))}
            <View style={[styles.reviewNote, { backgroundColor: "rgba(255,138,61,0.08)", borderColor: "rgba(255,138,61,0.2)" }]}>
              <Ionicons name="time-outline" size={14} color={colors.accent} />
              <Text style={[styles.reviewNoteText, { color: colors.mutedForeground }]}>
                Human review within 24 hours. You'll be notified when verified.
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* CTA */}
      <View style={[styles.footer, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: loading ? colors.muted : colors.primary }]}
          onPress={handleNext}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.nextBtnText}>
                {currentStep === "review" ? "Submit for Review" : "Continue"}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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

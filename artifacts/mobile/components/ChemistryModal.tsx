import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { createReview, getGetScoreQueryKey, getListBookingsQueryKey, getGetMeQueryKey } from "@workspace/api-client-react";
import { useColors } from "@workspace/nightmap-design-system/hooks/use-colors";
import { useApp } from "@/context/AppContext";
import { errorMessage } from "@/lib/api";

const DIMENSIONS = [
  { key: "personality", label: "Personality", icon: "happy-outline", color: "#7A3CFF" },
  { key: "appearance", label: "Appearance", icon: "eye-outline", color: "#FF4E62" },
  { key: "punctuality", label: "Punctuality", icon: "time-outline", color: "#3DA9FF" },
  { key: "service", label: "Service Quality", icon: "star-outline", color: "#FF8A3D" },
  { key: "safety", label: "Safety", icon: "shield-checkmark-outline", color: "#1FBF6B" },
] as const;
type DimensionKey = typeof DIMENSIONS[number]["key"];
type RatingsMap = Partial<Record<DimensionKey, number>>;

function StarRow({ dim, rating, onRate }: { dim: typeof DIMENSIONS[number]; rating: number; onRate: (r: number) => void }) {
  const colors = useColors("dark");
  return (
    <View style={styles.dimRow}>
      <View style={[styles.dimIcon, { backgroundColor: `${dim.color}18` }]}>
        <Ionicons name={dim.icon as never} size={16} color={dim.color} />
      </View>
      <Text style={[styles.dimLabel, { color: colors.foreground }]}>{dim.label}</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity
            key={n}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onRate(n);
            }}
          >
            <Ionicons
              name={n <= rating ? "star" : "star-outline"}
              size={22}
              color={n <= rating ? dim.color : colors.border}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function SuccessView({ points, onDone }: { points: number; onDone: () => void }) {
  const colors = useColors("dark");
  return (
    <View style={styles.successWrap}>
      <View style={[styles.successCircle, { backgroundColor: "rgba(31,191,107,0.12)", borderColor: "rgba(31,191,107,0.4)" }]}>
        <Ionicons name="checkmark-circle" size={52} color="#1FBF6B" />
      </View>
      <Text style={[styles.successTitle, { color: colors.foreground }]}>Review Submitted!</Text>
      <View style={[styles.pointsCard, { backgroundColor: "rgba(255,138,61,0.12)", borderColor: "rgba(255,138,61,0.3)" }]}>
        <Text style={styles.pointsEmoji}>⚡</Text>
        <View>
          <Text style={[styles.pointsEarned, { color: "#FF8A3D" }]}>+{points} Loyalty Points</Text>
          <Text style={[styles.pointsSub, { color: "#FF8A3D" }]}>Added to your NightMap score</Text>
        </View>
      </View>
      <Text style={[styles.successHint, { color: colors.mutedForeground }]}>
        Your honest review helps the community stay safe and find the best companions.
      </Text>
      <TouchableOpacity style={[styles.doneBtn, { backgroundColor: "#1FBF6B" }]} onPress={onDone}>
        <Text style={styles.doneBtnText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}

interface Props {
  visible: boolean;
  companionId: string;
  companionName: string;
  companionColor: string;
  bookingId?: string | null;
  onClose: () => void;
}

export function ChemistryModal({ visible, companionId, companionName, companionColor, bookingId, onClose }: Props) {
  const colors = useColors("dark");
  const { invalidate } = useApp();
  const [ratings, setRatings] = useState<RatingsMap>({});
  const [review, setReview] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [pointsEarned, setPointsEarned] = useState(0);
  const values = Object.values(ratings).filter((v): v is number => typeof v === "number");
  const avgRating = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const canSubmit = DIMENSIONS.every((d) => ratings[d.key]) && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await createReview({
        companionId,
        bookingId: bookingId ?? undefined,
        personality: ratings.personality!,
        appearance: ratings.appearance!,
        punctuality: ratings.punctuality!,
        service: ratings.service!,
        safety: ratings.safety!,
        text: review.trim() || undefined,
      });
      setPointsEarned(result.pointsEarned);
      setSubmitted(true);
      invalidate([getGetScoreQueryKey(), getListBookingsQueryKey(), getGetMeQueryKey()]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setError(errorMessage(err, "Could not submit your review."));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setRatings({});
    setReview("");
    setSubmitted(false);
    setError("");
    onClose();
  };

  const remaining = DIMENSIONS.filter((d) => !ratings[d.key]).length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          {submitted ? (
            <SuccessView points={pointsEarned} onDone={handleClose} />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Header */}
              <View style={styles.sheetHeader}>
                <View style={[styles.companionAvatar, { backgroundColor: companionColor }]}>
                  <Text style={styles.companionInitial}>{companionName[0]}</Text>
                </View>
                <View>
                  <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Rate your time</Text>
                  <Text style={[styles.sheetSub, { color: colors.mutedForeground }]}>with {companionName}</Text>
                </View>
                {avgRating > 0 && (
                  <View style={[styles.avgBadge, { backgroundColor: "rgba(255,138,61,0.12)" }]}>
                    <Ionicons name="star" size={12} color={colors.accent} />
                    <Text style={[styles.avgText, { color: colors.accent }]}>{avgRating.toFixed(1)}</Text>
                  </View>
                )}
              </View>
              {/* Chemistry score label */}
              <View style={[styles.chemistrLabel, { backgroundColor: "rgba(122,60,255,0.08)", borderColor: "rgba(122,60,255,0.2)" }]}>
                <Ionicons name="flask-outline" size={14} color="#7A3CFF" />
                <Text style={[styles.chemistryText, { color: "#7A3CFF" }]}>Chemistry Score — 5 dimensions</Text>
              </View>
              {/* Dimension ratings */}
              <View style={[styles.ratingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {DIMENSIONS.map((dim) => (
                  <StarRow
                    key={dim.key}
                    dim={dim}
                    rating={ratings[dim.key] ?? 0}
                    onRate={(r) => setRatings((prev) => ({ ...prev, [dim.key]: r }))}
                  />
                ))}
              </View>
              {/* Written review */}
              <View style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.reviewLabel, { color: colors.mutedForeground }]}>Write a review (optional · +25 pts)</Text>
                <TextInput
                  style={[styles.reviewInput, { color: colors.foreground }]}
                  placeholder="Describe your experience — this helps others in the community…"
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  maxLength={300}
                  value={review}
                  onChangeText={setReview}
                />
                <Text style={[styles.reviewCount, { color: colors.mutedForeground }]}>{review.length}/300</Text>
              </View>
              {/* Earn points notice */}
              <View style={[styles.earnNotice, { backgroundColor: "rgba(255,138,61,0.08)", borderColor: "rgba(255,138,61,0.2)" }]}>
                <Text style={styles.earnEmoji}>⚡</Text>
                <Text style={[styles.earnText, { color: colors.mutedForeground }]}>
                  Earn up to <Text style={{ color: "#FF8A3D", fontFamily: "Inter_700Bold" }}>100 loyalty points</Text> for reviewing{bookingId ? " a completed meetup" : ""}
                </Text>
              </View>
              {error ? <Text style={[styles.cancelText, { color: "#FF4E62", textAlign: "center" }]}>{error}</Text> : null}
              {/* Submit */}
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: canSubmit ? colors.primary : colors.muted }]}
                onPress={handleSubmit}
                disabled={!canSubmit}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : (
                  <Text style={[styles.submitText, { color: canSubmit ? "#fff" : colors.mutedForeground }]}>
                    {remaining === 0 ? "Submit Chemistry Score" : `Rate ${remaining} more dimension${remaining !== 1 ? "s" : ""}`}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Maybe later</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingBottom: 34,
    maxHeight: "90%",
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 16 },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  companionAvatar: {
    width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center",
  },
  companionInitial: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 20 },
  sheetTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  sheetSub: { fontFamily: "Inter_400Regular", fontSize: 13 },
  avgBadge: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  avgText: { fontFamily: "Inter_700Bold", fontSize: 14 },
  chemistrLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  chemistryText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  ratingCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 6,
    marginBottom: 12,
  },
  dimRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  dimIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  dimLabel: { fontFamily: "Inter_500Medium", fontSize: 13, flex: 1 },
  stars: { flexDirection: "row", gap: 4 },
  reviewCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },
  reviewLabel: { fontFamily: "Inter_500Medium", fontSize: 12 },
  reviewInput: { fontFamily: "Inter_400Regular", fontSize: 14, minHeight: 72, lineHeight: 22 },
  reviewCount: { fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "right" },
  earnNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  earnEmoji: { fontSize: 16 },
  earnText: { fontFamily: "Inter_400Regular", fontSize: 13, flex: 1 },
  submitBtn: { paddingVertical: 15, borderRadius: 16, alignItems: "center", marginBottom: 10 },
  submitText: { fontFamily: "Inter_700Bold", fontSize: 15 },
  cancelBtn: { alignItems: "center", paddingVertical: 6 },
  cancelText: { fontFamily: "Inter_500Medium", fontSize: 14 },
  successWrap: { alignItems: "center", gap: 16, paddingVertical: 24 },
  successCircle: {
    width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center", borderWidth: 2,
  },
  successTitle: { fontFamily: "Inter_700Bold", fontSize: 22 },
  pointsCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    width: "100%",
  },
  pointsEmoji: { fontSize: 24 },
  pointsEarned: { fontFamily: "Inter_700Bold", fontSize: 17 },
  pointsSub: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 },
  successHint: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", lineHeight: 20 },
  doneBtn: { paddingHorizontal: 40, paddingVertical: 14, borderRadius: 16 },
  doneBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 },
});

import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { safetyCheckIn, type BookingActionRequestAction } from "@workspace/api-client-react";
import { useColors } from "@workspace/nightmap-design-system/hooks/use-colors";
import { AppBooking, formatUGX, useApp } from "@/context/AppContext";
import { errorMessage } from "@/lib/api";
import { ChemistryModal } from "@/components/ChemistryModal";

type BookingStatus = AppBooking["status"];
const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; bg: string; icon: string }> = {
  pending:   { label: "Pending",   color: "#FF8A3D",  bg: "rgba(255,138,61,0.10)",  icon: "hourglass-outline" },
  active:    { label: "Active",    color: "#22c55e",  bg: "rgba(34,197,94,0.10)",   icon: "radio-button-on" },
  upcoming:  { label: "Confirmed", color: "#3DA9FF",  bg: "rgba(61,169,255,0.10)",  icon: "time-outline" },
  completed: { label: "Completed", color: "#AAB3C5",  bg: "rgba(170,179,197,0.10)", icon: "checkmark-circle-outline" },
  cancelled: { label: "Cancelled", color: "#FF4E62",  bg: "rgba(255,78,98,0.10)",   icon: "close-circle-outline" },
  declined:  { label: "Declined",  color: "#FF4E62",  bg: "rgba(255,78,98,0.10)",   icon: "close-circle-outline" },
};

function BookingCard({
  booking,
  isCompanion,
  busy,
  onChat,
  onShareLocation,
  onAction,
  onCheckIn,
  onRate,
}: {
  booking: AppBooking;
  isCompanion: boolean;
  busy: boolean;
  onChat: () => void;
  onShareLocation: () => void;
  onAction: (action: BookingActionRequestAction) => void;
  onCheckIn: () => void;
  onRate: () => void;
}) {
  const colors = useColors("dark");
  const s = STATUS_CONFIG[booking.status];
  const seekerSide = booking.isSeekerSide;
  const confirm = (title: string, message: string, action: BookingActionRequestAction, destructive = false) => {
    Alert.alert(title, message, [
      { text: "Back", style: "cancel" },
      { text: title, style: destructive ? "destructive" : "default", onPress: () => onAction(action) },
    ]);
  };
  const Btn = ({ label, icon, color, bg, border, onPress, flex }: { label: string; icon: string; color: string; bg: string; border: string; onPress: () => void; flex?: boolean }) => (
    <TouchableOpacity
      style={[styles.actionBtn, { backgroundColor: bg, borderColor: border, opacity: busy ? 0.6 : 1 }, flex && { flex: 1 }]}
      onPress={onPress}
      disabled={busy}
    >
      <Ionicons name={icon as never} size={15} color={color} />
      <Text style={[styles.actionBtnText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: booking.status === "active" ? `${s.color}40` : colors.border }]}>
      {/* Header row */}
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: booking.companionColor }]}>
          <Text style={styles.avatarText}>{booking.companionInitial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={[styles.companionName, { color: colors.foreground }]}>{booking.companionName}</Text>
            <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
              <Ionicons name={s.icon as never} size={10} color={s.color} />
              <Text style={[styles.statusText, { color: s.color }]}>
                {booking.status === "pending" && seekerSide ? "Awaiting response" : booking.status === "pending" ? "New request" : s.label}
              </Text>
            </View>
          </View>
          <Text style={[styles.activityText, { color: colors.mutedForeground }]}>
            {booking.activity} · {booking.city} · {booking.bookedAt}
          </Text>
        </View>
        <TouchableOpacity onPress={onChat} style={[styles.chatBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Ionicons name="chatbubble-outline" size={15} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>
      {/* Details */}
      <View style={[styles.detailRow, { borderColor: colors.border }]}>
        {[
          { icon: "calendar-outline", text: booking.date },
          { icon: "time-outline",     text: booking.time },
          { icon: "hourglass-outline",text: `${booking.hours}h` },
        ].map(d => (
          <View key={d.icon} style={styles.detailItem}>
            <Ionicons name={d.icon as never} size={13} color={colors.mutedForeground} />
            <Text style={[styles.detailText, { color: colors.foreground }]}>{d.text}</Text>
          </View>
        ))}
      </View>
      {!!booking.note && (
        <Text style={[styles.activityText, { color: colors.mutedForeground, fontStyle: "italic" }]}>“{booking.note}”</Text>
      )}
      {/* Amount */}
      <View style={styles.amountRow}>
        <View>
          <Text style={[styles.amountLabel, { color: colors.mutedForeground }]}>
            {isCompanion ? "You earn · paid directly" : "Agreed rate · paid directly"}
          </Text>
          <Text style={[styles.amountValue, { color: isCompanion ? "#1FBF6B" : colors.primary }]}>
            {formatUGX(booking.total)}
          </Text>
        </View>
        <View style={[styles.codeBox, { backgroundColor: colors.muted }]}>
          <Text style={[styles.codeLabel, { color: colors.mutedForeground }]}>CODE</Text>
          <Text style={[styles.codeValue, { color: colors.foreground }]}>{booking.meetupCode}</Text>
        </View>
      </View>
      {/* Actions */}
      {booking.status === "pending" && !seekerSide && (
        <View style={styles.actionsRow}>
          <Btn flex label="Accept" icon="checkmark-outline" color="#22c55e" bg="rgba(34,197,94,0.10)" border="rgba(34,197,94,0.3)" onPress={() => onAction("accept")} />
          <Btn flex label="Decline" icon="close-outline" color={colors.mutedForeground} bg={colors.muted} border={colors.border}
            onPress={() => confirm("Decline", `Decline ${booking.companionName}'s request?`, "decline", true)} />
        </View>
      )}
      {booking.status === "pending" && seekerSide && (
        <View style={styles.actionsRow}>
          <Btn flex label="Cancel request" icon="close-outline" color={colors.mutedForeground} bg={colors.muted} border={colors.border}
            onPress={() => confirm("Cancel request", `Withdraw your request to ${booking.companionName}?`, "cancel", true)} />
        </View>
      )}
      {booking.status === "upcoming" && (
        <View style={styles.actionsRow}>
          <Btn flex label="Start meetup" icon="play-outline" color="#22c55e" bg="rgba(34,197,94,0.10)" border="rgba(34,197,94,0.3)"
            onPress={() => confirm("Start meetup", `Confirm you have met using code ${booking.meetupCode}. Safety check-in will activate.`, "start")} />
          <Btn flex label="Cancel" icon="close-outline" color={colors.mutedForeground} bg={colors.muted} border={colors.border}
            onPress={() => confirm("Cancel booking", `Cancel your booking with ${booking.companionName}?`, "cancel", true)} />
        </View>
      )}
      {booking.status === "active" && (
        <>
          <View style={styles.actionsRow}>
            <Btn label="Check In" icon="shield-checkmark-outline" color="#22c55e" bg="rgba(34,197,94,0.10)" border="rgba(34,197,94,0.3)" onPress={onCheckIn} />
            <Btn label="Share Location" icon="location-outline" color={colors.mutedForeground} bg={colors.muted} border={colors.border} onPress={onShareLocation} />
          </View>
          <View style={styles.actionsRow}>
            <Btn flex label="Mark complete" icon="flag-outline" color="#7A3CFF" bg="rgba(122,60,255,0.10)" border="rgba(122,60,255,0.3)"
              onPress={() => confirm("Mark complete", "Confirm the meetup has ended.", "complete")} />
          </View>
        </>
      )}
      {booking.status === "completed" && !booking.rated && seekerSide && (
        <TouchableOpacity
          style={[styles.rateBtn, { backgroundColor: "rgba(122,60,255,0.10)", borderColor: "rgba(122,60,255,0.3)" }]}
          onPress={() => { Haptics.selectionAsync(); onRate(); }}
        >
          <Ionicons name="flask-outline" size={15} color="#7A3CFF" />
          <Text style={[styles.rateBtnText, { color: "#7A3CFF" }]}>Rate Chemistry Score</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

type Tab = "active" | "upcoming" | "history";

export default function BookingsScreen() {
  const colors = useColors("dark");
  const insets = useSafeAreaInsets();
  const { userProfile, bookings, bookingsLoading, updateBookingStatus, coords } = useApp();
  const [tab, setTab] = useState<Tab>("active");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [ratingTarget, setRatingTarget] = useState<AppBooking | null>(null);
  const isCompanion = userProfile.isCompanion;
  const active   = bookings.filter(b => b.status === "active");
  const upcoming = bookings.filter(b => b.status === "upcoming" || b.status === "pending");
  const history  = bookings.filter(b => b.status === "completed" || b.status === "cancelled" || b.status === "declined");
  const displayed = tab === "active" ? active : tab === "upcoming" ? upcoming : history;
  const completed = bookings.filter(b => b.status === "completed");
  const totalCompleted = completed.reduce((s, b) => s + b.total, 0);
  const ratedCount = completed.filter(b => b.rated).length;

  const runAction = async (b: AppBooking, action: BookingActionRequestAction) => {
    setBusyId(b.id);
    try {
      await updateBookingStatus(b.id, action);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (action === "start") setTab("active");
      if (action === "complete") setTab("history");
      if (action === "accept") setTab("upcoming");
    } catch (err) {
      Alert.alert("Something went wrong", errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };
  const handleCheckIn = async (b: AppBooking) => {
    setBusyId(b.id);
    try {
      const event = await safetyCheckIn({ lat: coords?.lat, lng: coords?.lng, bookingId: b.id });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Safety Check-In",
        event.contactsNotified > 0
          ? `Your location has been shared with ${event.contactsNotified} trusted contact${event.contactsNotified > 1 ? "s" : ""}. Stay safe! 💙`
          : "Check-in recorded. Add a trusted contact in the Safety Hub so they receive your location.",
      );
    } catch (err) {
      Alert.alert("Something went wrong", errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 56 : insets.top + 4, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {isCompanion ? "Booking Requests" : "My Bookings"}
          </Text>
          {active.length > 0 && (
            <Text style={[styles.headerSub, { color: "#22c55e" }]}>{active.length} active now</Text>
          )}
        </View>
        <View style={{ width: 36 }} />
      </View>
      {/* Stats strip */}
      <View style={[styles.statsStrip, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {isCompanion ? (
          <>
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: "#1FBF6B" }]}>{formatUGX(totalCompleted)}</Text>
              <Text style={[styles.statLab, { color: colors.mutedForeground }]}>Total Earned</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: colors.foreground }]}>{bookings.length}</Text>
              <Text style={[styles.statLab, { color: colors.mutedForeground }]}>Bookings</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: "#FF8A3D" }]}>{completed.length}</Text>
              <Text style={[styles.statLab, { color: colors.mutedForeground }]}>Completed</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: colors.primary }]}>{formatUGX(totalCompleted)}</Text>
              <Text style={[styles.statLab, { color: colors.mutedForeground }]}>Total Spent</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: colors.foreground }]}>{completed.length}</Text>
              <Text style={[styles.statLab, { color: colors.mutedForeground }]}>Meetups</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: "#7A3CFF" }]}>{ratedCount}</Text>
              <Text style={[styles.statLab, { color: colors.mutedForeground }]}>Rated</Text>
            </View>
          </>
        )}
      </View>
      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        {(["active", "upcoming", "history"] as Tab[]).map(t => {
          const count = t === "active" ? active.length : t === "upcoming" ? upcoming.length : history.length;
          return (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, { color: tab === t ? colors.primary : colors.mutedForeground }]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
              {count > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: tab === t ? colors.primary : colors.muted }]}>
                  <Text style={[styles.tabBadgeText, { color: tab === t ? "#fff" : colors.mutedForeground }]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {bookingsLoading && bookings.length === 0 ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
        ) : displayed.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No bookings here</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              {isCompanion
                ? tab === "active" ? "Requests you've accepted and started will appear here" : "New client requests will appear under Upcoming"
                : tab === "active" ? "Start by connecting with a companion on the map" : "Your past bookings will appear here"}
            </Text>
          </View>
        ) : (
          displayed.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              isCompanion={isCompanion}
              busy={busyId === b.id}
              onChat={() => b.connectionId ? router.push(`/chat/${b.connectionId}`) : router.push("/matches")}
              onShareLocation={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/safety");
              }}
              onAction={(action) => runAction(b, action)}
              onCheckIn={() => handleCheckIn(b)}
              onRate={() => setRatingTarget(b)}
            />
          ))
        )}
      </ScrollView>
      {ratingTarget && (
        <ChemistryModal
          visible
          companionId={ratingTarget.companionId}
          companionName={ratingTarget.companionName}
          companionColor={ratingTarget.companionColor}
          bookingId={ratingTarget.id}
          onClose={() => setRatingTarget(null)}
        />
      )}
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

  statsStrip: {
    flexDirection: "row", alignItems: "center", paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  statVal: { fontFamily: "Inter_700Bold", fontSize: 15 },
  statLab: { fontFamily: "Inter_400Regular", fontSize: 11 },
  statDivider: { width: 1, height: 28 },

  tabs: {
    flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth, marginHorizontal: 16,
  },
  tabBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 12, gap: 5,
  },
  tabText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  tabBadge: {
    minWidth: 18, height: 18, borderRadius: 9, alignItems: "center",
    justifyContent: "center", paddingHorizontal: 4,
  },
  tabBadgeText: { fontFamily: "Inter_700Bold", fontSize: 10 },

  scroll: { padding: 16, gap: 12 },

  card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 17 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  companionName: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  activityText: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 },
  chatBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", borderWidth: 1 },

  detailRow: {
    flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10, gap: 0,
  },
  detailItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 5, justifyContent: "center" },
  detailText: { fontFamily: "Inter_500Medium", fontSize: 13 },

  amountRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  amountLabel: { fontFamily: "Inter_400Regular", fontSize: 12 },
  amountValue: { fontFamily: "Inter_700Bold", fontSize: 20 },
  codeBox: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: "center" },
  codeLabel: { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 0.5, marginBottom: 2 },
  codeValue: { fontFamily: "Inter_700Bold", fontSize: 14, letterSpacing: 2 },

  actionsRow: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
  },
  actionBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  rateBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
  },
  rateBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },

  empty: { alignItems: "center", gap: 10, paddingTop: 60 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  emptySub: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", lineHeight: 20 },
});

import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { AppBooking, formatUGX, useApp } from "@/context/AppContext";
import { ChemistryModal } from "@/components/ChemistryModal";

type BookingStatus = "active" | "upcoming" | "completed" | "cancelled";

interface Booking {
  id: string;
  companionName: string;
  companionColor: string;
  companionInitial: string;
  activity: string;
  date: string;
  time: string;
  hours: number;
  rate: number;
  status: BookingStatus;
  city: string;
  bookedAt: string;
  safetyActive: boolean;
  meetupCode: string;
  rated: boolean;
}

const SEEKER_BOOKINGS: Booking[] = [
  {
    id: "b1", companionName: "Amara", companionColor: "#7A3CFF", companionInitial: "A",
    activity: "Dinner Date", date: "Tonight", time: "8:00 PM", hours: 3, rate: 120_000,
    status: "active", city: "Kampala", bookedAt: "2h ago",
    safetyActive: true, meetupCode: "NM-4821", rated: false,
  },
  {
    id: "b2", companionName: "Fatoumata", companionColor: "#FF8A3D", companionInitial: "F",
    activity: "Nightclub", date: "Fri 11 Jul", time: "10:00 PM", hours: 4, rate: 150_000,
    status: "upcoming", city: "Kampala", bookedAt: "Yesterday",
    safetyActive: false, meetupCode: "NM-7713", rated: false,
  },
  {
    id: "b3", companionName: "Leila", companionColor: "#FF4E62", companionInitial: "L",
    activity: "City Tour", date: "Mon 7 Jul", time: "2:00 PM", hours: 5, rate: 100_000,
    status: "completed", city: "Nairobi", bookedAt: "5 days ago",
    safetyActive: false, meetupCode: "NM-3305", rated: true,
  },
  {
    id: "b4", companionName: "Zara", companionColor: "#1FBF6B", companionInitial: "Z",
    activity: "Movie Night", date: "Thu 3 Jul", time: "7:30 PM", hours: 2, rate: 80_000,
    status: "completed", city: "Kampala", bookedAt: "1 week ago",
    safetyActive: false, meetupCode: "NM-2291", rated: false,
  },
];

const COMPANION_REQUESTS: Booking[] = [
  {
    id: "r1", companionName: "James K.", companionColor: "#3DA9FF", companionInitial: "J",
    activity: "Dinner Date", date: "Tonight", time: "9:00 PM", hours: 3, rate: 120_000,
    status: "active", city: "Kampala", bookedAt: "1h ago",
    safetyActive: true, meetupCode: "NM-9042", rated: false,
  },
  {
    id: "r2", companionName: "Brian M.", companionColor: "#FF8A3D", companionInitial: "B",
    activity: "Conversation & Drinks", date: "Fri 11 Jul", time: "8:00 PM", hours: 2, rate: 120_000,
    status: "upcoming", city: "Kampala", bookedAt: "3h ago",
    safetyActive: false, meetupCode: "NM-6631", rated: false,
  },
  {
    id: "r3", companionName: "Kevin O.", companionColor: "#7A3CFF", companionInitial: "K",
    activity: "Events", date: "Mon 7 Jul", time: "6:00 PM", hours: 4, rate: 120_000,
    status: "completed", city: "Kampala", bookedAt: "5 days ago",
    safetyActive: false, meetupCode: "NM-1173", rated: false,
  },
];

const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; bg: string; icon: string }> = {
  active:    { label: "Active",    color: "#22c55e",  bg: "rgba(34,197,94,0.10)",   icon: "radio-button-on" },
  upcoming:  { label: "Upcoming",  color: "#3DA9FF",  bg: "rgba(61,169,255,0.10)",  icon: "time-outline" },
  completed: { label: "Completed", color: "#AAB3C5",  bg: "rgba(170,179,197,0.10)", icon: "checkmark-circle-outline" },
  cancelled: { label: "Cancelled", color: "#FF4E62",  bg: "rgba(255,78,98,0.10)",   icon: "close-circle-outline" },
};

function BookingCard({
  booking,
  isCompanion,
  onChat,
  onShareLocation,
  onCancel,
  onRate,
}: {
  booking: Booking;
  isCompanion: boolean;
  onChat: () => void;
  onShareLocation: () => void;
  onCancel: () => void;
  onRate: () => void;
}) {
  const colors = useColors();
  const s = STATUS_CONFIG[booking.status];
  const totalCost = booking.rate * booking.hours;
  const earnings = Math.round(totalCost * 0.8);

  const handleCheckIn = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Safety Check-In", "Your location has been shared with your trusted contact. Stay safe! 💙");
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancel Booking",
      `Cancel your booking with ${booking.companionName}? This may incur a cancellation fee.`,
      [{ text: "Keep Booking" }, { text: "Cancel", style: "destructive", onPress: onCancel }]
    );
  };

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
              <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
            </View>
          </View>
          <Text style={[styles.activityText, { color: colors.mutedForeground }]}>
            {booking.activity} · {booking.city}
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

      {/* Amount */}
      <View style={styles.amountRow}>
        <View>
          <Text style={[styles.amountLabel, { color: colors.mutedForeground }]}>
            {isCompanion ? "You earn" : "Total cost"}
          </Text>
          <Text style={[styles.amountValue, { color: isCompanion ? "#1FBF6B" : colors.primary }]}>
            {formatUGX(isCompanion ? earnings : totalCost)}
          </Text>
        </View>
        <View style={[styles.codeBox, { backgroundColor: colors.muted }]}>
          <Text style={[styles.codeLabel, { color: colors.mutedForeground }]}>CODE</Text>
          <Text style={[styles.codeValue, { color: colors.foreground }]}>{booking.meetupCode}</Text>
        </View>
      </View>

      {/* Actions */}
      {booking.status === "active" && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "rgba(34,197,94,0.10)", borderColor: "rgba(34,197,94,0.3)" }]}
            onPress={handleCheckIn}
          >
            <Ionicons name="shield-checkmark-outline" size={15} color="#22c55e" />
            <Text style={[styles.actionBtnText, { color: "#22c55e" }]}>Check In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
            onPress={onShareLocation}
          >
            <Ionicons name="location-outline" size={15} color={colors.mutedForeground} />
            <Text style={[styles.actionBtnText, { color: colors.mutedForeground }]}>Share Location</Text>
          </TouchableOpacity>
        </View>
      )}
      {booking.status === "upcoming" && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { flex: 1, backgroundColor: "rgba(61,169,255,0.10)", borderColor: "rgba(61,169,255,0.3)" }]}
            onPress={() => router.push("/payment")}
          >
            <Ionicons name="wallet-outline" size={15} color="#3DA9FF" />
            <Text style={[styles.actionBtnText, { color: "#3DA9FF" }]}>Fund Wallet</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { flex: 1, backgroundColor: colors.muted, borderColor: colors.border }]}
            onPress={handleCancel}
          >
            <Ionicons name="close-outline" size={15} color={colors.mutedForeground} />
            <Text style={[styles.actionBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
      {booking.status === "completed" && !booking.rated && (
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
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userProfile, matches, bookings: createdBookings, updateBookingStatus } = useApp();
  const [tab, setTab] = useState<Tab>("active");
  const [ratingTarget, setRatingTarget] = useState<{ name: string; color: string } | null>(null);

  const bookings: Booking[] = userProfile.isCompanion ? COMPANION_REQUESTS : [
    ...createdBookings.map((booking): Booking => ({
      id: booking.id,
      companionName: booking.companionName,
      companionColor: booking.companionColor,
      companionInitial: booking.companionInitial,
      activity: booking.activity,
      date: booking.date,
      time: booking.time,
      hours: booking.hours,
      rate: booking.rate,
      status: booking.status,
      city: booking.city,
      bookedAt: booking.bookedAt,
      safetyActive: booking.safetyActive,
      meetupCode: booking.meetupCode,
      rated: booking.rated,
    })),
    ...SEEKER_BOOKINGS,
  ];
  const active   = bookings.filter(b => b.status === "active");
  const upcoming = bookings.filter(b => b.status === "upcoming");
  const history  = bookings.filter(b => b.status === "completed" || b.status === "cancelled");

  const displayed = tab === "active" ? active : tab === "upcoming" ? upcoming : history;

  const totalSpent = SEEKER_BOOKINGS.filter(b => b.status === "completed").reduce((s, b) => s + b.rate * b.hours, 0);
  const totalEarned = COMPANION_REQUESTS.filter(b => b.status === "completed").reduce((s, b) => s + Math.round(b.rate * b.hours * 0.8), 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 56 : insets.top + 4, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {userProfile.isCompanion ? "Booking Requests" : "My Bookings"}
          </Text>
          {active.length > 0 && (
            <Text style={[styles.headerSub, { color: "#22c55e" }]}>{active.length} active tonight</Text>
          )}
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Stats strip */}
      <View style={[styles.statsStrip, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {userProfile.isCompanion ? (
          <>
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: "#1FBF6B" }]}>{formatUGX(totalEarned)}</Text>
              <Text style={[styles.statLab, { color: colors.mutedForeground }]}>Total Earned</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: colors.foreground }]}>{COMPANION_REQUESTS.length}</Text>
              <Text style={[styles.statLab, { color: colors.mutedForeground }]}>Bookings</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: "#FF8A3D" }]}>4.8 ★</Text>
              <Text style={[styles.statLab, { color: colors.mutedForeground }]}>Avg Rating</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: colors.primary }]}>{formatUGX(totalSpent)}</Text>
              <Text style={[styles.statLab, { color: colors.mutedForeground }]}>Total Spent</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: colors.foreground }]}>{SEEKER_BOOKINGS.length}</Text>
              <Text style={[styles.statLab, { color: colors.mutedForeground }]}>Meetups</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: "#7A3CFF" }]}>{SEEKER_BOOKINGS.filter(b => b.rated).length}</Text>
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
        {displayed.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No bookings here</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              {tab === "active" ? "Start by connecting with a companion on the map" : "Your past bookings will appear here"}
            </Text>
          </View>
        ) : (
          displayed.map((b) => {
            const match = matches.find((m) => m.companion.name === b.companionName);
            return (
              <BookingCard
                key={b.id}
                booking={b}
                isCompanion={userProfile.isCompanion}
                onChat={() => match ? router.push(`/chat/${match.id}`) : router.push("/matches")}
                onShareLocation={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/safety");
                }}
                onCancel={() => {
                  if (createdBookings.some((created) => created.id === b.id)) {
                    updateBookingStatus(b.id, "cancelled");
                  } else {
                    Alert.alert("Booking cancellation", "This demo booking is already managed by the sample schedule.");
                  }
                }}
                onRate={() => setRatingTarget({ name: b.companionName, color: b.companionColor })}
              />
            );
          })
        )}
      </ScrollView>

      {ratingTarget && (
        <ChemistryModal
          visible
          companionName={ratingTarget.name}
          companionColor={ratingTarget.color}
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

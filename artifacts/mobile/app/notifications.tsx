import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getGetUnreadCountQueryKey,
  getListNotificationsQueryKey,
  markNotificationsRead,
  useListNotifications,
  type Notification,
} from "@workspace/api-client-react";
import { useColors } from "@workspace/nightmap-design-system/hooks/use-colors";
import { relativeTime, useApp } from "@/context/AppContext";

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  available: { icon: "radio-button-on", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  rating: { icon: "flask-outline", color: "#7A3CFF", bg: "rgba(122,60,255,0.12)" },
  deal: { icon: "flash", color: "#FF8A3D", bg: "rgba(255,138,61,0.12)" },
  safety: { icon: "shield-checkmark-outline", color: "#FF4E62", bg: "rgba(255,78,98,0.12)" },
  new: { icon: "sparkles-outline", color: "#3DA9FF", bg: "rgba(61,169,255,0.12)" },
  tip: { icon: "cash-outline", color: "#1FBF6B", bg: "rgba(31,191,107,0.12)" },
  super: { icon: "star", color: "#FF8A3D", bg: "rgba(255,138,61,0.12)" },
  connection: { icon: "heart", color: "#FF4E62", bg: "rgba(255,78,98,0.12)" },
  message: { icon: "chatbubble-ellipses", color: "#3DA9FF", bg: "rgba(61,169,255,0.12)" },
  booking: { icon: "calendar", color: "#3DA9FF", bg: "rgba(61,169,255,0.12)" },
  referral: { icon: "gift", color: "#FF8A3D", bg: "rgba(255,138,61,0.12)" },
  verification: { icon: "shield-checkmark", color: "#1FBF6B", bg: "rgba(31,191,107,0.12)" },
};
const DEFAULT_CFG = { icon: "notifications-outline", color: "#AAB3C5", bg: "rgba(170,179,197,0.12)" };

function NotifRow({ notif, onRead, onAction }: {
  notif: Notification;
  onRead: (id: string) => void;
  onAction: (notif: Notification) => void;
}) {
  const colors = useColors("dark");
  const cfg = TYPE_CONFIG[notif.type] ?? DEFAULT_CFG;
  const actor = notif.actor ?? null;
  return (
    <TouchableOpacity
      style={[
        styles.row,
        {
          backgroundColor: notif.read ? colors.card : `${cfg.color}08`,
          borderColor: notif.read ? colors.border : `${cfg.color}30`,
        },
      ]}
      onPress={() => onAction(notif)}
      activeOpacity={0.75}
    >
      {/* Left: avatar or icon */}
      <View style={styles.rowLeft}>
        {actor ? (
          <View style={[styles.avatar, { backgroundColor: actor.avatarColor }]}>
            <Text style={styles.avatarInit}>{actor.name[0]?.toUpperCase()}</Text>
          </View>
        ) : (
          <View style={[styles.iconCircle, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon as never} size={18} color={cfg.color} />
          </View>
        )}
        {!notif.read && <View style={[styles.unreadDot, { backgroundColor: cfg.color }]} />}
      </View>
      {/* Content */}
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>{notif.title}</Text>
          <Text style={[styles.rowTime, { color: colors.mutedForeground }]}>{relativeTime(notif.createdAt)}</Text>
        </View>
        <Text style={[styles.rowBody, { color: colors.mutedForeground }]} numberOfLines={2}>{notif.body}</Text>
        {notif.actionLabel && (
          <TouchableOpacity
            style={[styles.actionPill, { backgroundColor: cfg.bg, borderColor: `${cfg.color}40` }]}
            onPress={() => onAction(notif)}
          >
            <Text style={[styles.actionText, { color: cfg.color }]}>{notif.actionLabel}</Text>
          </TouchableOpacity>
        )}
        {!notif.read && !notif.actionLabel && (
          <TouchableOpacity style={[styles.actionPill, { backgroundColor: colors.muted, borderColor: colors.border }]} onPress={() => onRead(notif.id)}>
            <Text style={[styles.actionText, { color: colors.mutedForeground }]}>Mark read</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const colors = useColors("dark");
  const insets = useSafeAreaInsets();
  const { invalidate } = useApp();
  const query = useListNotifications({ query: { queryKey: getListNotificationsQueryKey(), refetchInterval: 15_000, staleTime: 5_000 } });
  const notifs = query.data ?? [];
  const unreadCount = notifs.filter((n) => !n.read).length;

  const afterMark = () => invalidate([getListNotificationsQueryKey(), getGetUnreadCountQueryKey()]);

  const markRead = (id: string) => {
    markNotificationsRead({ ids: [id] }).then(afterMark).catch(() => {});
  };
  const markAllRead = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    markNotificationsRead({}).then(afterMark).catch(() => {});
  };
  const handleAction = (notif: Notification) => {
    if (!notif.read) markRead(notif.id);
    if (notif.actionRoute) router.push(notif.actionRoute as never);
  };
  const unread = notifs.filter((n) => !n.read);
  const earlier = notifs.filter((n) => n.read);
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>{unreadCount} unread</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
            <Text style={[styles.markAllText, { color: colors.primary }]}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20 }]}
      >
        {query.isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />}
        {!query.isLoading && notifs.length === 0 && (
          <View style={{ alignItems: "center", paddingVertical: 48, gap: 8 }}>
            <Ionicons name="notifications-off-outline" size={40} color={colors.mutedForeground} />
            <Text style={[styles.rowTitle, { color: colors.foreground }]}>You're all caught up</Text>
            <Text style={[styles.rowBody, { color: colors.mutedForeground, textAlign: "center" }]}>
              Connection requests, bookings and deals will show up here.
            </Text>
          </View>
        )}
        {unread.length > 0 && (
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>NEW</Text>
        )}
        {unread.map((n) => (
          <NotifRow key={n.id} notif={n} onRead={markRead} onAction={handleAction} />
        ))}
        {earlier.length > 0 && (
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>EARLIER</Text>
        )}
        {earlier.map((n) => (
          <NotifRow key={n.id} notif={n} onRead={markRead} onAction={handleAction} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 22 },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 12 },
  markAllBtn: { marginLeft: "auto", paddingHorizontal: 4 },
  markAllText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  scroll: { paddingHorizontal: 14, paddingTop: 10, gap: 8 },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 4,
    marginBottom: 2,
    paddingHorizontal: 2,
  },
  row: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  rowLeft: { position: "relative" },
  avatar: {
    width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center",
  },
  avatarInit: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center",
  },
  unreadDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#0B0B0F",
  },
  rowContent: { flex: 1, gap: 3 },
  rowTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 6 },
  rowTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, flex: 1 },
  rowTime: { fontFamily: "Inter_400Regular", fontSize: 11, flexShrink: 0 },
  rowBody: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  actionPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  actionText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
});

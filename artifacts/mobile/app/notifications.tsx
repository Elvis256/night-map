import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@workspace/nightmap-design-system/hooks/use-colors";

type NotifType = "available" | "rating" | "deal" | "safety" | "new" | "tip" | "super";

interface Notif {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  read: boolean;
  companionColor?: string;
  companionInitial?: string;
  actionLabel?: string;
  actionRoute?: string;
}

const INITIAL_NOTIFS: Notif[] = [
  {
    id: "n1",
    type: "available",
    title: "Amara is available again 🌙",
    body: "She just came online in Kampala · Now available",
    time: "2m ago",
    read: false,
    companionColor: "#7A3CFF",
    companionInitial: "A",
    actionLabel: "Connect",
    actionRoute: "/companion/1",
  },
  {
    id: "n2",
    type: "rating",
    title: "Rate your time with Leila",
    body: "Your meeting ended — share your Chemistry Score and earn 50 pts",
    time: "1h ago",
    read: false,
    companionColor: "#FF4E62",
    companionInitial: "L",
    actionLabel: "Rate Now",
  },
  {
    id: "n3",
    type: "deal",
    title: "Tonight's deal expires in 2 hours ⚡",
    body: "Fatoumata · 35% off · Tonight only in Kampala",
    time: "2h ago",
    read: false,
    companionColor: "#FF8A3D",
    companionInitial: "F",
    actionLabel: "View Deal",
    actionRoute: "/companion/5",
  },
  {
    id: "n4",
    type: "super",
    title: "Zara sent you a Super Request ⭐",
    body: "She's interested in connecting with you tonight",
    time: "3h ago",
    read: false,
    companionColor: "#1FBF6B",
    companionInitial: "Z",
    actionLabel: "Respond",
    actionRoute: "/matches",
  },
  {
    id: "n5",
    type: "safety",
    title: "Safety check-in reminder",
    body: "You've been in a meeting for 60 minutes — confirm you're safe",
    time: "4h ago",
    read: true,
    actionLabel: "I'm Safe",
  },
  {
    id: "n6",
    type: "new",
    title: "3 new companions in Kampala",
    body: "Nadine, Pearl, and 1 more joined tonight",
    time: "5h ago",
    read: true,
    actionLabel: "Discover",
    actionRoute: "/discover",
  },
  {
    id: "n8",
    type: "available",
    title: "Nadine is online now",
    body: "She's available in Nairobi tonight · 2.4 km away",
    time: "Yesterday",
    read: true,
    companionColor: "#3DA9FF",
    companionInitial: "N",
    actionLabel: "View",
    actionRoute: "/companion/4",
  },
];

const TYPE_CONFIG: Record<NotifType, { icon: string; color: string; bg: string }> = {
  available: { icon: "radio-button-on", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  rating: { icon: "flask-outline", color: "#7A3CFF", bg: "rgba(122,60,255,0.12)" },
  deal: { icon: "flash", color: "#FF8A3D", bg: "rgba(255,138,61,0.12)" },
  safety: { icon: "shield-checkmark-outline", color: "#FF4E62", bg: "rgba(255,78,98,0.12)" },
  new: { icon: "sparkles-outline", color: "#3DA9FF", bg: "rgba(61,169,255,0.12)" },
  tip: { icon: "cash-outline", color: "#1FBF6B", bg: "rgba(31,191,107,0.12)" },
  super: { icon: "star", color: "#FF8A3D", bg: "rgba(255,138,61,0.12)" },
};

function NotifRow({ notif, onRead, onAction }: {
  notif: Notif;
  onRead: (id: string) => void;
  onAction: (notif: Notif) => void;
}) {
  const colors = useColors("dark");
  const cfg = TYPE_CONFIG[notif.type];

  return (
    <TouchableOpacity
      style={[
        styles.row,
        {
          backgroundColor: notif.read ? colors.card : `${cfg.color}08`,
          borderColor: notif.read ? colors.border : `${cfg.color}30`,
        },
      ]}
      onPress={() => { onRead(notif.id); if (notif.actionRoute) router.push(notif.actionRoute as never); }}
      activeOpacity={0.75}
    >
      {/* Left: avatar or icon */}
      <View style={styles.rowLeft}>
        {notif.companionInitial ? (
          <View style={[styles.avatar, { backgroundColor: notif.companionColor }]}>
            <Text style={styles.avatarInit}>{notif.companionInitial}</Text>
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
          <Text style={[styles.rowTime, { color: colors.mutedForeground }]}>{notif.time}</Text>
        </View>
        <Text style={[styles.rowBody, { color: colors.mutedForeground }]} numberOfLines={2}>{notif.body}</Text>
        {notif.actionLabel && (
          <TouchableOpacity
            style={[styles.actionPill, { backgroundColor: cfg.bg, borderColor: `${cfg.color}40` }]}
            onPress={() => { onRead(notif.id); onAction(notif); }}
          >
            <Text style={[styles.actionText, { color: cfg.color }]}>{notif.actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const colors = useColors("dark");
  const insets = useSafeAreaInsets();
  const [notifs, setNotifs] = useState(INITIAL_NOTIFS);

  React.useEffect(() => {
    AsyncStorage.getItem("notifications")
      .then((stored) => {
        if (stored) setNotifs(JSON.parse(stored) as Notif[]);
      })
      .catch(() => {});
  }, []);

  const unreadCount = notifs.filter((n) => !n.read).length;

  const persist = (next: Notif[]) => {
    setNotifs(next);
    AsyncStorage.setItem("notifications", JSON.stringify(next)).catch(() => {});
  };

  const markRead = (id: string) => {
    persist(notifs.map((n) => n.id === id ? { ...n, read: true } : n));
  };
  const markAllRead = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    persist(notifs.map((n) => ({ ...n, read: true })));
  };

  const handleAction = (notif: Notif) => {
    markRead(notif.id);
    if (notif.actionRoute) router.push(notif.actionRoute as never);
  };

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
        {unreadCount > 0 && (
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>NEW</Text>
        )}
        {notifs.filter((n) => !n.read).map((n) => (
          <NotifRow key={n.id} notif={n} onRead={markRead} onAction={handleAction} />
        ))}
        {notifs.filter((n) => n.read).length > 0 && (
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>EARLIER</Text>
        )}
        {notifs.filter((n) => n.read).map((n) => (
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

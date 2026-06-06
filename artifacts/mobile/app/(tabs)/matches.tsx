import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { COMPANIONS, Companion, Match, useApp } from "@/context/AppContext";

type Tab = "connections" | "favorites" | "stories";

const STORY_DATA = COMPANIONS.filter((c) => c.availabilityStatus !== "offline").map((c, i) => ({
  companion: c,
  postedAgo: `${i * 23 + 12}m ago`,
  preview: ["Available tonight 🌙", "Just went online ✨", "New photos added 📷", "Tonight's deal active ⚡"][i % 4],
}));

function MatchRow({ match }: { match: Match }) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={() => router.push(`/chat/${match.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarWrap}>
        <View style={[styles.avatar, { backgroundColor: match.companion.color }]}>
          <Text style={styles.avatarInitial}>{match.companion.name[0]}</Text>
        </View>
        {match.companion.online && <View style={[styles.onlineDot, { borderColor: colors.background }]} />}
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <View style={styles.nameTypeRow}>
            <Text style={[styles.rowName, { color: colors.foreground }]}>{match.companion.name}</Text>
            {match.connectionType === "super" && (
              <View style={[styles.typePill, { backgroundColor: "rgba(255,138,61,0.15)" }]}>
                <Ionicons name="star" size={9} color="#FF8A3D" />
                <Text style={[styles.typeText, { color: "#FF8A3D" }]}>Super</Text>
              </View>
            )}
          </View>
          <Text style={[styles.rowTime, { color: colors.mutedForeground }]}>{formatTime(match.lastMessageTime)}</Text>
        </View>
        <View style={styles.rowBottom}>
          <Text
            style={[styles.rowMessage, { color: match.unread > 0 ? colors.foreground : colors.mutedForeground }]}
            numberOfLines={1}
          >
            {match.lastMessage.startsWith("🎤") ? "🎤 Voice note" : match.lastMessage}
          </Text>
          {match.unread > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.unreadText}>{match.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function FavoriteCard({ companion }: { companion: Companion }) {
  const colors = useColors();
  const isLive = companion.availabilityStatus === "now";
  return (
    <TouchableOpacity
      style={[styles.favCard, { backgroundColor: colors.card, borderColor: isLive ? colors.primary : colors.border }]}
      onPress={() => router.push(`/companion/${companion.id}`)}
      activeOpacity={0.8}
    >
      <View style={[styles.favAvatar, { backgroundColor: companion.color }]}>
        <Text style={styles.favInitial}>{companion.name[0]}</Text>
        {isLive && <View style={[styles.favDot, { borderColor: colors.card }]} />}
      </View>
      <Text style={[styles.favName, { color: colors.foreground }]} numberOfLines={1}>{companion.name}</Text>
      <Text style={[styles.favStatus, { color: isLive ? "#22c55e" : colors.mutedForeground }]}>
        {isLive ? "Live now" : companion.availabilityStatus === "tonight" ? "Tonight" : "Offline"}
      </Text>
      <View style={[styles.favRate, { backgroundColor: colors.muted }]}>
        <Text style={[styles.favRateText, { color: colors.mutedForeground }]}>
          {(companion.rate / 1000).toFixed(0)}k
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function StoryRow({ item }: { item: typeof STORY_DATA[number] }) {
  const colors = useColors();
  const c = item.companion;
  return (
    <TouchableOpacity
      style={[styles.storyRow, { borderBottomColor: colors.border }]}
      onPress={() => router.push(`/companion/${c.id}`)}
      activeOpacity={0.7}
    >
      <View style={[styles.storyRing, { borderColor: c.isTonightsDeal ? colors.accent : colors.primary }]}>
        <View style={[styles.storyAv, { backgroundColor: c.color }]}>
          <Text style={styles.storyAvInit}>{c.name[0]}</Text>
        </View>
      </View>
      <View style={styles.storyInfo}>
        <View style={styles.storyTopRow}>
          <Text style={[styles.storyName, { color: colors.foreground }]}>{c.name}</Text>
          <Text style={[styles.storyTime, { color: colors.mutedForeground }]}>{item.postedAgo}</Text>
        </View>
        <Text style={[styles.storyPreview, { color: colors.mutedForeground }]}>{item.preview}</Text>
      </View>
      {c.availabilityStatus === "now" && (
        <View style={[styles.liveTag, { backgroundColor: "rgba(34,197,94,0.15)", borderColor: "rgba(34,197,94,0.35)" }]}>
          <View style={[styles.liveDot, { backgroundColor: "#22c55e" }]} />
          <Text style={[styles.liveTagText, { color: "#22c55e" }]}>Live</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}

export default function MatchesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { matches } = useApp();
  const [tab, setTab] = useState<Tab>("connections");

  const favorites = COMPANIONS.filter((c) => c.availabilityStatus !== "offline").slice(0, 5);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Inbox</Text>
        {matches.length > 0 && (
          <View style={[styles.countBadge, { backgroundColor: "rgba(255,78,98,0.15)" }]}>
            <Text style={[styles.countText, { color: colors.primary }]}>{matches.length}</Text>
          </View>
        )}
      </View>

      {/* Tab bar */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {(["connections", "favorites", "stories"] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabLabel, { color: tab === t ? colors.primary : colors.mutedForeground }]}>
              {t === "connections" ? "Connections" : t === "favorites" ? "Saved" : "Stories"}
            </Text>
            {t === "connections" && matches.length > 0 && (
              <View style={[styles.tabCount, { backgroundColor: colors.primary }]}>
                <Text style={styles.tabCountText}>{matches.length}</Text>
              </View>
            )}
            {t === "stories" && (
              <View style={[styles.tabCount, { backgroundColor: colors.accent }]}>
                <Text style={styles.tabCountText}>{STORY_DATA.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      {tab === "connections" && (
        matches.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="heart-outline" size={36} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No connections yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              Swipe right or connect from the map to start
            </Text>
          </View>
        ) : (
          <FlatList
            data={matches}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <MatchRow match={item} />}
            contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : insets.bottom }}
          />
        )
      )}

      {tab === "favorites" && (
        <ScrollView contentContainerStyle={[styles.favScrollContent, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 16 }]}>
          <View style={[styles.favNotice, { backgroundColor: "rgba(255,138,61,0.08)", borderColor: "rgba(255,138,61,0.2)" }]}>
            <Ionicons name="notifications-outline" size={15} color={colors.accent} />
            <Text style={[styles.favNoticeText, { color: colors.mutedForeground }]}>
              You'll be notified when a saved companion goes live tonight
            </Text>
          </View>
          <View style={styles.favGrid}>
            {favorites.map((c) => (
              <FavoriteCard key={c.id} companion={c} />
            ))}
            <TouchableOpacity
              style={[styles.favAddCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {}}
            >
              <Ionicons name="add-circle-outline" size={30} color={colors.mutedForeground} />
              <Text style={[styles.favAddText, { color: colors.mutedForeground }]}>Browse</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {tab === "stories" && (
        <FlatList
          data={STORY_DATA}
          keyExtractor={(item) => item.companion.id}
          renderItem={({ item }) => <StoryRow item={item} />}
          contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : insets.bottom }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 26 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  countText: { fontFamily: "Inter_700Bold", fontSize: 13 },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 20,
    marginBottom: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 10,
    gap: 5,
  },
  tabLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  tabCount: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabCountText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 10 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 40 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 20 },
  emptySubtitle: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 22 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarWrap: { position: "relative", marginRight: 13 },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 19 },
  onlineDot: {
    position: "absolute", bottom: 1, right: 1, width: 12, height: 12,
    borderRadius: 6, backgroundColor: "#22c55e", borderWidth: 2,
  },
  rowContent: { flex: 1 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 3 },
  nameTypeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowName: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  typePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  typeText: { fontFamily: "Inter_700Bold", fontSize: 10 },
  rowTime: { fontFamily: "Inter_400Regular", fontSize: 12 },
  rowBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowMessage: { fontFamily: "Inter_400Regular", fontSize: 13, flex: 1 },
  unreadBadge: {
    minWidth: 20, height: 20, borderRadius: 10, alignItems: "center",
    justifyContent: "center", marginLeft: 8, paddingHorizontal: 4,
  },
  unreadText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 11 },
  favScrollContent: { padding: 16, gap: 14 },
  favNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 4,
  },
  favNoticeText: { fontFamily: "Inter_400Regular", fontSize: 13, flex: 1, lineHeight: 18 },
  favGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  favCard: {
    width: "30%",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 6,
  },
  favAvatar: {
    width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", position: "relative",
  },
  favInitial: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 18 },
  favDot: {
    position: "absolute", bottom: 0, right: 0, width: 12, height: 12,
    borderRadius: 6, backgroundColor: "#22c55e", borderWidth: 2,
  },
  favName: { fontFamily: "Inter_600SemiBold", fontSize: 12, textAlign: "center" },
  favStatus: { fontFamily: "Inter_400Regular", fontSize: 11 },
  favRate: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  favRateText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  favAddCard: {
    width: "30%",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    gap: 4,
    minHeight: 110,
  },
  favAddText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  storyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  storyRing: { width: 52, height: 52, borderRadius: 26, borderWidth: 2.5, alignItems: "center", justifyContent: "center" },
  storyAv: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  storyAvInit: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
  storyInfo: { flex: 1 },
  storyTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  storyName: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  storyTime: { fontFamily: "Inter_400Regular", fontSize: 12 },
  storyPreview: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 },
  liveTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveTagText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
});

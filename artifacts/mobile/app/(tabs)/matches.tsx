import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { Match, useApp } from "@/context/AppContext";

function MatchRow({ match }: { match: Match }) {
  const colors = useColors();
  const time = formatTime(match.lastMessageTime);

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
        {match.companion.online && (
          <View style={[styles.onlineDot, { borderColor: colors.background }]} />
        )}
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={[styles.rowName, { color: colors.foreground }]}>{match.companion.name}</Text>
          <Text style={[styles.rowTime, { color: colors.mutedForeground }]}>{time}</Text>
        </View>
        <View style={styles.rowBottom}>
          <Text
            style={[styles.rowMessage, { color: match.unread > 0 ? colors.foreground : colors.mutedForeground }]}
            numberOfLines={1}
          >
            {match.lastMessage}
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Connections</Text>
        {matches.length > 0 && (
          <View style={[styles.countBadge, { backgroundColor: "rgba(255,45,126,0.15)" }]}>
            <Text style={[styles.countText, { color: colors.primary }]}>{matches.length}</Text>
          </View>
        )}
      </View>

      {matches.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="heart-outline" size={36} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No connections yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            Swipe right on someone to start a connection
          </Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MatchRow match={item} />}
          scrollEnabled={!!matches.length}
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
    paddingBottom: 16,
  },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 26 },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: { fontFamily: "Inter_700Bold", fontSize: 13 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 20 },
  emptySubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarWrap: { position: "relative", marginRight: 14 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 20 },
  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#22c55e",
    borderWidth: 2,
  },
  rowContent: { flex: 1 },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  rowName: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  rowTime: { fontFamily: "Inter_400Regular", fontSize: 13 },
  rowBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowMessage: { fontFamily: "Inter_400Regular", fontSize: 14, flex: 1 },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    paddingHorizontal: 4,
  },
  unreadText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 12 },
});

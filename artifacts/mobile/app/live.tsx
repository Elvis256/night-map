import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  endStream,
  getGetStreamQueryKey,
  getListStreamCommentsQueryKey,
  getListStreamsQueryKey,
  joinStream,
  leaveStream,
  postStreamComment,
  sendStreamHeart,
  startStream,
  useGetStream,
  useListStreamComments,
  useListStreams,
  type Stream,
} from "@workspace/api-client-react";
import { useColors } from "@workspace/nightmap-design-system/hooks/use-colors";
import { useApp } from "@/context/AppContext";
import { errorMessage } from "@/lib/api";

function FloatingHeart({ color, startX }: { color: string; startX: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 1400, useNativeDriver: true }).start();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -200] });
  const opacity    = anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0.8, 0] });
  const scale      = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1.2, 0.8] });
  return (
    <Animated.Text
      style={{
        position: "absolute",
        bottom: 100,
        left: startX,
        fontSize: 26,
        color,
        transform: [{ translateY }, { scale }],
        opacity,
        zIndex: 99,
      }}
    >
      ❤️
    </Animated.Text>
  );
}

function BroadcastSetup({ onGoLive }: { onGoLive: (title: string, description: string) => Promise<void> }) {
  const colors = useColors("dark");
  const insets = useSafeAreaInsets();
  const { userProfile } = useApp();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [starting, setStarting] = useState(false);
  const meetups = userProfile.companionProfile?.completedMeetups ?? 0;
  return (
    <View style={[styles.setupContainer, { backgroundColor: colors.background, paddingTop: Platform.OS === "web" ? 60 : insets.top }]}>
      <View style={styles.setupHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.setupTitle, { color: colors.foreground }]}>Go Live</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView contentContainerStyle={styles.setupScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={[styles.setupPreview, { backgroundColor: userProfile.avatarColor }]}>
          <View style={[styles.setupAvatarRing, { borderColor: "#FF4E62" }]}>
            <Text style={styles.setupAvatarInitial}>{userProfile.name[0]}</Text>
          </View>
          <View style={[styles.setupLiveBadge, { backgroundColor: "#FF4E62" }]}>
            <View style={styles.setupLiveDot} />
            <Text style={styles.setupLiveBadgeText}>LIVE PREVIEW</Text>
          </View>
          <View style={styles.setupPreviewInfo}>
            <Text style={styles.setupPreviewName}>{userProfile.name}</Text>
            <Text style={styles.setupPreviewSub}>{userProfile.city} · {meetups} meetups</Text>
          </View>
        </View>
        <View style={styles.setupSection}>
          <Text style={[styles.setupLabel, { color: colors.mutedForeground }]}>STREAM TITLE</Text>
          <TextInput
            style={[styles.setupInput, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
            placeholder="What are you doing tonight?"
            placeholderTextColor={colors.mutedForeground}
            value={title}
            onChangeText={setTitle}
            maxLength={60}
          />
        </View>
        <View style={styles.setupSection}>
          <Text style={[styles.setupLabel, { color: colors.mutedForeground }]}>DESCRIPTION (optional)</Text>
          <TextInput
            style={[styles.setupInput, styles.setupTextarea, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
            placeholder="Tell viewers what to expect..."
            placeholderTextColor={colors.mutedForeground}
            value={desc}
            onChangeText={setDesc}
            multiline
            numberOfLines={3}
            maxLength={150}
          />
        </View>
        <View style={styles.setupSection}>
          <Text style={[styles.setupLabel, { color: colors.mutedForeground }]}>STREAM ACCESS</Text>
          <Text style={[styles.setupHint, { color: colors.mutedForeground }]}>
            Streams are free to watch. Viewers can comment and send hearts; paid viewing and tips are not active.
          </Text>
        </View>
        <View style={[styles.setupTips, { backgroundColor: "rgba(31,191,107,0.08)", borderColor: "rgba(31,191,107,0.3)" }]}>
          <Ionicons name="information-circle" size={16} color="#1FBF6B" />
          <Text style={[styles.setupTipText, { color: colors.mutedForeground }]}>
            Your stream appears in Radio › Live Streams for everyone in NightMap while it is live.
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.goLiveBtn, { backgroundColor: title.trim() ? "#FF4E62" : colors.muted }]}
          onPress={async () => {
            if (!title.trim() || starting) return;
            setStarting(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            try {
              await onGoLive(title.trim(), desc.trim());
            } finally {
              setStarting(false);
            }
          }}
          activeOpacity={0.85}
          disabled={starting}
        >
          {starting ? <ActivityIndicator color="#fff" /> : <View style={styles.goLiveDot} />}
          <Text style={styles.goLiveBtnText}>{starting ? "Starting…" : title.trim() ? "Go Live Now" : "Add a title to go live"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function LiveView({ streamId, isBroadcaster }: { streamId: string; isBroadcaster: boolean }) {
  const colors = useColors("dark");
  const insets = useSafeAreaInsets();
  const { invalidate } = useApp();
  const [comment, setComment] = useState("");
  const [hearts, setHearts] = useState<{ id: number; x: number; color: string }[]>([]);
  const [localHearts, setLocalHearts] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const heartId = useRef(0);

  const streamQuery = useGetStream(streamId, {
    query: { queryKey: getGetStreamQueryKey(streamId), refetchInterval: 5000 },
  });
  const commentsQuery = useListStreamComments(streamId, undefined, {
    query: { queryKey: getListStreamCommentsQueryKey(streamId), refetchInterval: 3000 },
  });

  // Join on mount (counts as a viewer), heartbeat every 30s, leave on unmount.
  useEffect(() => {
    let cancelled = false;
    joinStream(streamId).catch(() => {});
    const id = setInterval(() => {
      if (!cancelled) joinStream(streamId).catch(() => {});
    }, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
      leaveStream(streamId).catch(() => {});
    };
  }, [streamId]);

  const stream = streamQuery.data;
  const comments = commentsQuery.data ?? [];

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [comments.length]);

  const sendHeart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const id = heartId.current++;
    const x = 20 + Math.random() * 60;
    const color = ["#FF4E62", "#FF8A3D", "#7A3CFF", "#3DA9FF"][Math.floor(Math.random() * 4)];
    setHearts(h => [...h, { id, x, color }]);
    setLocalHearts(n => n + 1);
    setTimeout(() => setHearts(h => h.filter(hh => hh.id !== id)), 1500);
    sendStreamHeart(streamId).catch(() => {});
  };

  const sendComment = async () => {
    const text = comment.trim();
    if (!text) return;
    Haptics.selectionAsync();
    setComment("");
    try {
      await postStreamComment(streamId, { text });
      invalidate([getListStreamCommentsQueryKey(streamId)]);
    } catch (err) {
      Alert.alert("Could not send", errorMessage(err));
    }
  };

  const handleEnd = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await endStream(streamId);
      invalidate([getListStreamsQueryKey()]);
    } catch (err) {
      Alert.alert("Could not end stream", errorMessage(err));
      return;
    }
    router.back();
  };

  if (!stream) {
    return (
      <View style={[styles.liveContainer, { backgroundColor: "#000", alignItems: "center", justifyContent: "center" }]}>
        {streamQuery.isError ? (
          <>
            <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 16 }}>Stream unavailable</Text>
            <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
              <Text style={{ color: "#FF4E62", fontFamily: "Inter_600SemiBold" }}>Go back</Text>
            </TouchableOpacity>
          </>
        ) : (
          <ActivityIndicator color="#FF4E62" />
        )}
      </View>
    );
  }

  const ended = stream.status === "ended";
  const host = stream.host;

  return (
    <View style={[styles.liveContainer, { backgroundColor: "#000" }]}>
      {/* Background colour wash */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: host.avatarColor, opacity: 0.25 }]} />
      {/* Top bar */}
      <View style={[styles.liveTopBar, { paddingTop: Platform.OS === "web" ? 60 : insets.top + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.liveBackBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.liveTitleBlock}>
          <View style={[styles.liveBadgePill, ended && { backgroundColor: "rgba(107,107,138,0.6)" }]}>
            {!ended && <View style={styles.livePulse} />}
            <Text style={styles.liveBadgeText}>{ended ? "ENDED" : "LIVE"}</Text>
          </View>
          <Text style={styles.liveStreamTitle} numberOfLines={1}>{stream.title}</Text>
        </View>
        <View style={styles.liveViewerCount}>
          <Ionicons name="eye" size={13} color="rgba(255,255,255,0.8)" />
          <Text style={styles.liveViewerText}>{Math.max(1, stream.viewerCount).toLocaleString()}</Text>
          <Text style={[styles.liveViewerText, { marginLeft: 6 }]}>❤️ {(stream.heartCount + localHearts).toLocaleString()}</Text>
        </View>
      </View>
      {/* Host avatar */}
      <View style={styles.liveAvatarArea} pointerEvents="none">
        <View style={[styles.liveHostAvatar, { backgroundColor: host.avatarColor, borderColor: "#FF4E62" }]}>
          <Text style={styles.liveHostInitial}>{host.name[0]}</Text>
        </View>
        <Text style={styles.liveHostName}>{host.name}</Text>
        <Text style={styles.liveHostCity}>{host.city}{stream.description ? ` · ${stream.description}` : ""}</Text>
      </View>
      {/* Floating hearts */}
      {hearts.map(h => <FloatingHeart key={h.id} color={h.color} startX={h.x} />)}
      {/* Chat */}
      <View style={styles.chatArea} pointerEvents="box-none">
        <ScrollView
          ref={scrollRef}
          style={styles.chatScroll}
          showsVerticalScrollIndicator={false}
          pointerEvents="none"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {comments.slice(-30).map(c => (
            <View key={c.id} style={styles.chatBubble}>
              <Text style={[styles.chatName, { color: c.fromMe ? "#FF4E62" : c.userColor }]}>{c.fromMe ? "You" : c.userName}: </Text>
              <Text style={styles.chatText}>{c.text}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
      {/* Bottom controls */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.liveControls, { paddingBottom: Platform.OS === "web" ? 24 : insets.bottom + 8 }]}
      >
        <Text style={styles.paymentUnavailable}>
          {ended ? "This stream has ended." : "Chat and hearts are live · Camera streaming and tips are not connected yet."}
        </Text>
        {/* Comment input + action buttons */}
        <View style={styles.commentRow}>
          <TextInput
            style={[styles.commentInput, { backgroundColor: "rgba(255,255,255,0.12)", color: "#fff" }]}
            placeholder={ended ? "Stream ended" : "Say something..."}
            placeholderTextColor="rgba(255,255,255,0.45)"
            value={comment}
            onChangeText={setComment}
            onSubmitEditing={sendComment}
            returnKeyType="send"
            editable={!ended}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={sendComment} disabled={ended}>
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.heartBtn} onPress={sendHeart} disabled={ended}>
            <Text style={{ fontSize: 22 }}>❤️</Text>
          </TouchableOpacity>
          {isBroadcaster && !ended && (
            <TouchableOpacity
              style={[styles.endBtn, { backgroundColor: "#FF4E62" }]}
              onPress={handleEnd}
            >
              <Text style={styles.endBtnText}>End</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function StreamBrowser() {
  const colors = useColors("dark");
  const insets = useSafeAreaInsets();
  const { userProfile } = useApp();
  const streamsQuery = useListStreams({ query: { queryKey: getListStreamsQueryKey(), refetchInterval: 10000 } });
  const streams: Stream[] = streamsQuery.data ?? [];
  return (
    <View style={[styles.setupContainer, { backgroundColor: colors.background, paddingTop: Platform.OS === "web" ? 60 : insets.top }]}>
      <View style={styles.setupHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.setupTitle, { color: colors.foreground }]}>Live Streams</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView contentContainerStyle={styles.setupScroll} showsVerticalScrollIndicator={false}>
        {streamsQuery.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : streams.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 48, gap: 8 }}>
            <Text style={{ fontSize: 40 }}>📺</Text>
            <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>Nobody is live right now</Text>
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" }}>
              Companions go live most evenings. Check back after 8pm.
            </Text>
          </View>
        ) : (
          streams.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.browseCard, { backgroundColor: colors.card, borderColor: `${s.host.avatarColor}60` }]}
              onPress={() => router.replace({ pathname: "/live", params: { mode: "watch", streamId: s.id } })}
              activeOpacity={0.85}
            >
              <View style={[styles.browseAvatar, { backgroundColor: s.host.avatarColor }]}>
                <Text style={styles.setupAvatarInitial}>{s.host.name[0]}</Text>
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>{s.host.name}</Text>
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13 }} numberOfLines={1}>{s.title}</Text>
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 }}>👁 {s.viewerCount} · ❤️ {s.heartCount} · {s.host.city}</Text>
              </View>
              <View style={[styles.browseLive, { backgroundColor: "rgba(255,78,98,0.15)", borderColor: "rgba(255,78,98,0.5)" }]}>
                <Text style={{ color: "#FF4E62", fontFamily: "Inter_700Bold", fontSize: 11 }}>WATCH</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
        {userProfile.isCompanion && (
          <TouchableOpacity
            style={[styles.goLiveBtn, { backgroundColor: "#FF4E62" }]}
            onPress={() => router.replace({ pathname: "/live", params: { mode: "broadcast" } })}
          >
            <View style={styles.goLiveDot} />
            <Text style={styles.goLiveBtnText}>Go Live</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

export default function LiveScreen() {
  const { mode, streamId } = useLocalSearchParams<{ mode?: string; streamId?: string }>();
  const { userProfile, invalidate } = useApp();
  const [liveStreamId, setLiveStreamId] = useState<string | null>(null);

  if (mode === "watch" && streamId) {
    return <LiveView streamId={streamId} isBroadcaster={false} />;
  }

  if (mode === "broadcast" && userProfile.isCompanion) {
    if (!liveStreamId) {
      return (
        <BroadcastSetup
          onGoLive={async (title, description) => {
            try {
              const stream = await startStream({ title, description: description || undefined });
              invalidate([getListStreamsQueryKey()]);
              setLiveStreamId(stream.id);
            } catch (err) {
              Alert.alert("Could not go live", errorMessage(err));
            }
          }}
        />
      );
    }
    return <LiveView streamId={liveStreamId} isBroadcaster={true} />;
  }

  return <StreamBrowser />;
}

const styles = StyleSheet.create({
  browseCard: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10,
  },
  browseAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  browseLive: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  setupContainer: { flex: 1 },
  setupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  setupTitle: { fontFamily: "Inter_700Bold", fontSize: 20 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  setupScroll: { paddingHorizontal: 16, paddingBottom: 40, gap: 20 },
  setupPreview: {
    borderRadius: 24,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  setupAvatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  setupAvatarInitial: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 32 },
  setupLiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 8,
  },
  setupLiveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#fff" },
  setupLiveBadgeText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 12 },
  setupPreviewInfo: { position: "absolute", bottom: 16, left: 16 },
  setupPreviewName: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 18, textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  setupPreviewSub: { color: "rgba(255,255,255,0.8)", fontFamily: "Inter_400Regular", fontSize: 12 },
  setupSection: { gap: 8 },
  setupLabel: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1 },
  setupHint: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: -4 },
  setupInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  setupTextarea: { height: 80, textAlignVertical: "top" },
  ppvRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  ppvOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  ppvOptionText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  setupTips: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  setupTipText: { fontFamily: "Inter_400Regular", fontSize: 13, flex: 1 },
  goLiveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 18,
    marginTop: 4,
  },
  goLiveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },
  goLiveBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },

  paywallContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  paywallCard: {
    width: "88%",
    borderRadius: 28,
    borderWidth: 1.5,
    padding: 28,
    alignItems: "center",
    gap: 10,
  },
  paywallAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: 4,
  },
  paywallInitial: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 36 },
  paywallName: { fontFamily: "Inter_700Bold", fontSize: 20 },
  paywallTitle: { fontFamily: "Inter_400Regular", fontSize: 14 },
  paywallViewers: { flexDirection: "row", alignItems: "center", gap: 5 },
  paywallViewersText: { fontFamily: "Inter_400Regular", fontSize: 13 },
  paywallDivider: { width: "100%", height: 1, marginVertical: 4 },
  paymentUnavailable: {
    color: "rgba(255,255,255,0.65)",
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    textAlign: "center",
  },
  paywallPrompt: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  paywallPrice: { fontFamily: "Inter_700Bold", fontSize: 28 },
  paywallSub: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" },
  unlockBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 18,
    marginTop: 8,
  },
  unlockBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 },
  paywallSkip: { fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 4 },

  liveContainer: { flex: 1 },
  liveTopBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
    zIndex: 10,
  },
  liveBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  liveTitleBlock: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  liveBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FF4E62",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  livePulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },
  liveBadgeText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 11 },
  liveStreamTitle: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13, flex: 1 },
  liveViewerCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  liveViewerText: { color: "rgba(255,255,255,0.9)", fontFamily: "Inter_600SemiBold", fontSize: 12 },
  liveAvatarArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  liveHostAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  liveHostInitial: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 52 },
  liveHostName: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 22, textShadowColor: "rgba(0,0,0,0.6)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  liveHostCity: { color: "rgba(255,255,255,0.75)", fontFamily: "Inter_400Regular", fontSize: 14 },
  earningsBar: {
    position: "absolute",
    top: Platform.OS === "web" ? 120 : 120,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 14,
    padding: 10,
    alignItems: "center",
    gap: 2,
  },
  earningsLabel: { color: "#1FBF6B", fontFamily: "Inter_700Bold", fontSize: 15 },
  earningsSub: { color: "rgba(255,255,255,0.6)", fontFamily: "Inter_400Regular", fontSize: 10 },
  tipToast: {
    position: "absolute",
    top: "40%",
    alignSelf: "center",
    backgroundColor: "rgba(31,191,107,0.9)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 100,
  },
  tipToastText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 },
  chatArea: {
    position: "absolute",
    bottom: 130,
    left: 12,
    width: "65%",
    maxHeight: 200,
  },
  chatScroll: { maxHeight: 200 },
  chatBubble: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
  },
  chatName: { fontFamily: "Inter_700Bold", fontSize: 12 },
  chatText: { color: "#fff", fontFamily: "Inter_400Regular", fontSize: 12 },
  liveControls: {
    paddingHorizontal: 12,
    gap: 8,
  },
  tipRow: { gap: 8, paddingVertical: 4 },
  tipBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  tipBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 13 },
  commentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  commentInput: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,78,98,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  heartBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  endBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  endBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 13 },
  streamerLiveBadge: {
    position: "absolute",
    bottom: -6,
    left: "50%",
    transform: [{ translateX: -16 }],
    backgroundColor: "#FF4E62",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    width: 32,
    alignItems: "center",
  },
  streamerLiveBadgeText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 8 },
});

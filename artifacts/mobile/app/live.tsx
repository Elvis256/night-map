import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
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
import { useColors } from "@/hooks/useColors";
import { COMPANIONS, useApp } from "@/context/AppContext";

const LIVE_DATA: Record<string, { title: string; viewers: number; ppvPrice: number; isPremium: boolean }> = {
  "1": { title: "Morning yoga & chat ☀️",        viewers: 234, ppvPrice: 0,    isPremium: false },
  "3": { title: "Get ready with me 💄",           viewers: 189, ppvPrice: 5000, isPremium: true  },
  "5": { title: "Club night preparations 🎶",     viewers: 312, ppvPrice: 0,    isPremium: false },
  "2": { title: "Q&A — ask me anything ✨",       viewers: 97,  ppvPrice: 3000, isPremium: true  },
};

const MOCK_COMMENTS = [
  { id: "1",  name: "James",   text: "You look amazing tonight! 🔥",      color: "#FF4E62" },
  { id: "2",  name: "Kevin",   text: "First time watching 👀",             color: "#3DA9FF" },
  { id: "3",  name: "Sam",     text: "Sent you a rose 🌹",                 color: "#7A3CFF" },
  { id: "4",  name: "Marcus",  text: "How long are you streaming for?",    color: "#FF8A3D" },
  { id: "5",  name: "Brian",   text: "💎💎💎",                              color: "#1FBF6B" },
  { id: "6",  name: "David",   text: "Your bio said you're in Kampala?",   color: "#FF4E62" },
  { id: "7",  name: "Andre",   text: "Welcome back!! Missed your streams", color: "#3DA9FF" },
  { id: "8",  name: "Tone",    text: "Can we do a meet-up this weekend?",  color: "#7A3CFF" },
];

const TIP_AMOUNTS = [2000, 5000, 10000, 20000];

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

function BroadcastSetup({ companion, onGoLive }: { companion: NonNullable<ReturnType<typeof COMPANIONS.find>>; onGoLive: (title: string, ppv: number) => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [ppvIndex, setPpvIndex] = useState(0);
  const PPV_OPTIONS = [
    { label: "Free", price: 0 },
    { label: "UGX 3,000", price: 3000 },
    { label: "UGX 5,000", price: 5000 },
    { label: "UGX 10,000", price: 10000 },
  ];

  return (
    <View style={[styles.setupContainer, { backgroundColor: colors.background, paddingTop: Platform.OS === "web" ? 60 : insets.top }]}>
      <View style={styles.setupHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.setupTitle, { color: colors.foreground }]}>Go Live</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.setupScroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.setupPreview, { backgroundColor: companion.color }]}>
          <View style={[styles.setupAvatarRing, { borderColor: "#FF4E62" }]}>
            <Text style={styles.setupAvatarInitial}>{companion.name[0]}</Text>
          </View>
          <View style={[styles.setupLiveBadge, { backgroundColor: "#FF4E62" }]}>
            <View style={styles.setupLiveDot} />
            <Text style={styles.setupLiveBadgeText}>LIVE PREVIEW</Text>
          </View>
          <View style={styles.setupPreviewInfo}>
            <Text style={styles.setupPreviewName}>{companion.name}</Text>
            <Text style={styles.setupPreviewSub}>{companion.city} · {companion.completedMeetups} meetups</Text>
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
          <Text style={[styles.setupLabel, { color: colors.mutedForeground }]}>PAY-PER-VIEW</Text>
          <Text style={[styles.setupHint, { color: colors.mutedForeground }]}>Charge viewers to watch. You keep 80%.</Text>
          <View style={styles.ppvRow}>
            {PPV_OPTIONS.map((opt, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.ppvOption,
                  {
                    backgroundColor: ppvIndex === i ? "rgba(255,78,98,0.15)" : colors.card,
                    borderColor: ppvIndex === i ? "#FF4E62" : colors.border,
                  },
                ]}
                onPress={() => { setPpvIndex(i); Haptics.selectionAsync(); }}
              >
                <Text style={[styles.ppvOptionText, { color: ppvIndex === i ? "#FF4E62" : colors.foreground }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.setupTips, { backgroundColor: "rgba(31,191,107,0.08)", borderColor: "rgba(31,191,107,0.3)" }]}>
          <Ionicons name="information-circle" size={16} color="#1FBF6B" />
          <Text style={[styles.setupTipText, { color: colors.mutedForeground }]}>
            Tips are sent directly to your wallet. Withdraw anytime.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.goLiveBtn, { backgroundColor: title.trim() ? "#FF4E62" : colors.muted }]}
          onPress={() => {
            if (!title.trim()) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            onGoLive(title.trim(), PPV_OPTIONS[ppvIndex].price);
          }}
          activeOpacity={0.85}
        >
          <View style={styles.goLiveDot} />
          <Text style={styles.goLiveBtnText}>{title.trim() ? "Go Live Now" : "Add a title to go live"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function LiveView({ companion, title, ppvPrice, isBroadcaster }: {
  companion: NonNullable<ReturnType<typeof COMPANIONS.find>>;
  title: string;
  ppvPrice: number;
  isBroadcaster: boolean;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { walletCredit } = useApp();
  const [viewers, setViewers] = useState(isBroadcaster ? 1 : (LIVE_DATA[companion.id]?.viewers ?? 50));
  const [earnings, setEarnings] = useState(0);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState(MOCK_COMMENTS);
  const [hearts, setHearts] = useState<{ id: number; x: number; color: string }[]>([]);
  const [tipSent, setTipSent] = useState<number | null>(null);
  const [paywalled, setPaywalled] = useState(!isBroadcaster && ppvPrice > 0);
  const scrollRef = useRef<ScrollView>(null);
  const heartId = useRef(0);
  const earningsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      setViewers(v => v + Math.floor(Math.random() * 3 - 1));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isBroadcaster) return;
    const interval = setInterval(() => {
      const newComment = {
        id: Date.now().toString(),
        name: ["James", "Kevin", "Sam", "Marcus", "Brian", "David", "Andre"][Math.floor(Math.random() * 7)],
        text: ["You look amazing 🔥", "❤️❤️❤️", "Stay longer please!", "Sending tips!", "Best stream today 🙌"][Math.floor(Math.random() * 5)],
        color: ["#FF4E62", "#3DA9FF", "#7A3CFF", "#FF8A3D"][Math.floor(Math.random() * 4)],
      };
      setComments(prev => [...prev.slice(-15), newComment]);
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 3500);
    return () => clearInterval(interval);
  }, [isBroadcaster]);

  const sendHeart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const id = heartId.current++;
    const x = 20 + Math.random() * 60;
    const color = ["#FF4E62", "#FF8A3D", "#7A3CFF", "#3DA9FF"][Math.floor(Math.random() * 4)];
    setHearts(h => [...h, { id, x, color }]);
    setTimeout(() => setHearts(h => h.filter(hh => hh.id !== id)), 1500);
  };

  const sendTip = (amount: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTipSent(amount);
    if (isBroadcaster) {
      walletCredit(amount);
      setEarnings(e => e + amount);
      Animated.sequence([
        Animated.timing(earningsAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(earningsAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }
    setTimeout(() => setTipSent(null), 2000);
    const tip: typeof comments[0] = {
      id: Date.now().toString(),
      name: isBroadcaster ? "Viewer" : "You",
      text: `💰 Sent UGX ${amount.toLocaleString()} tip!`,
      color: "#1FBF6B",
    };
    setComments(prev => [...prev.slice(-15), tip]);
    scrollRef.current?.scrollToEnd({ animated: true });
  };

  const sendComment = () => {
    if (!comment.trim()) return;
    Haptics.selectionAsync();
    const c: typeof comments[0] = {
      id: Date.now().toString(),
      name: "You",
      text: comment.trim(),
      color: "#FF4E62",
    };
    setComments(prev => [...prev.slice(-15), c]);
    setComment("");
    scrollRef.current?.scrollToEnd({ animated: true });
  };

  if (paywalled) {
    return (
      <View style={[styles.paywallContainer, { backgroundColor: colors.background, paddingTop: Platform.OS === "web" ? 60 : insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { position: "absolute", top: Platform.OS === "web" ? 60 : insets.top + 8, left: 16, zIndex: 10 }]}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.paywallCard, { backgroundColor: colors.card, borderColor: `${companion.color}50` }]}>
          <View style={[styles.paywallAvatar, { backgroundColor: companion.color }]}>
            <Text style={styles.paywallInitial}>{companion.name[0]}</Text>
            <View style={[styles.streamerLiveBadge, { bottom: -8 }]}>
              <Text style={styles.streamerLiveBadgeText}>LIVE</Text>
            </View>
          </View>
          <Text style={[styles.paywallName, { color: colors.foreground }]}>{companion.name} is live</Text>
          <Text style={[styles.paywallTitle, { color: colors.mutedForeground }]}>{title}</Text>
          <View style={styles.paywallViewers}>
            <Ionicons name="eye" size={14} color={colors.mutedForeground} />
            <Text style={[styles.paywallViewersText, { color: colors.mutedForeground }]}>{viewers} watching</Text>
          </View>
          <View style={[styles.paywallDivider, { backgroundColor: colors.border }]} />
          <Text style={[styles.paywallPrompt, { color: colors.foreground }]}>This is a pay-per-view stream</Text>
          <Text style={[styles.paywallPrice, { color: "#FF4E62" }]}>UGX {ppvPrice.toLocaleString()}</Text>
          <Text style={[styles.paywallSub, { color: colors.mutedForeground }]}>One-time unlock · Watch live + replay</Text>
          <TouchableOpacity
            style={[styles.unlockBtn, { backgroundColor: "#FF4E62" }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setPaywalled(false); }}
          >
            <Ionicons name="lock-open" size={16} color="#fff" />
            <Text style={styles.unlockBtnText}>Unlock for UGX {ppvPrice.toLocaleString()}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.paywallSkip, { color: colors.mutedForeground }]}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const earningsScale = earningsAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] });

  return (
    <View style={[styles.liveContainer, { backgroundColor: "#000" }]}>
      {/* Background colour wash */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: companion.color, opacity: 0.25 }]} />

      {/* Top bar */}
      <View style={[styles.liveTopBar, { paddingTop: Platform.OS === "web" ? 60 : insets.top + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.liveBackBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.liveTitleBlock}>
          <View style={styles.liveBadgePill}>
            <View style={styles.livePulse} />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
          <Text style={styles.liveStreamTitle} numberOfLines={1}>{title}</Text>
        </View>
        <View style={styles.liveViewerCount}>
          <Ionicons name="eye" size={13} color="rgba(255,255,255,0.8)" />
          <Text style={styles.liveViewerText}>{Math.max(1, viewers).toLocaleString()}</Text>
        </View>
      </View>

      {/* Host avatar */}
      <View style={styles.liveAvatarArea} pointerEvents="none">
        <View style={[styles.liveHostAvatar, { backgroundColor: companion.color, borderColor: "#FF4E62" }]}>
          <Text style={styles.liveHostInitial}>{companion.name[0]}</Text>
        </View>
        <Text style={styles.liveHostName}>{companion.name}</Text>
        <Text style={styles.liveHostCity}>{companion.city} · {companion.completedMeetups} meetups</Text>
      </View>

      {/* Floating hearts */}
      {hearts.map(h => <FloatingHeart key={h.id} color={h.color} startX={h.x} />)}

      {/* Broadcaster earnings panel */}
      {isBroadcaster && (
        <View style={styles.earningsBar}>
          <Animated.View style={{ transform: [{ scale: earningsScale }] }}>
            <Text style={styles.earningsLabel}>💰 UGX {earnings.toLocaleString()}</Text>
          </Animated.View>
          <Text style={styles.earningsSub}>earned this stream</Text>
        </View>
      )}

      {/* Tip sent toast */}
      {tipSent !== null && (
        <View style={styles.tipToast}>
          <Text style={styles.tipToastText}>💰 UGX {tipSent.toLocaleString()} sent!</Text>
        </View>
      )}

      {/* Chat */}
      <View style={styles.chatArea} pointerEvents="box-none">
        <ScrollView
          ref={scrollRef}
          style={styles.chatScroll}
          showsVerticalScrollIndicator={false}
          pointerEvents="none"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {comments.map(c => (
            <View key={c.id} style={styles.chatBubble}>
              <Text style={[styles.chatName, { color: c.color }]}>{c.name}: </Text>
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
        {/* Tip row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tipRow}>
          {TIP_AMOUNTS.map(amt => (
            <TouchableOpacity
              key={amt}
              style={styles.tipBtn}
              onPress={() => sendTip(amt)}
            >
              <Text style={styles.tipBtnText}>💎 {(amt / 1000).toFixed(0)}k</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Comment input + action buttons */}
        <View style={styles.commentRow}>
          <TextInput
            style={[styles.commentInput, { backgroundColor: "rgba(255,255,255,0.12)", color: "#fff" }]}
            placeholder="Say something..."
            placeholderTextColor="rgba(255,255,255,0.45)"
            value={comment}
            onChangeText={setComment}
            onSubmitEditing={sendComment}
            returnKeyType="send"
          />
          <TouchableOpacity style={styles.sendBtn} onPress={sendComment}>
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.heartBtn} onPress={sendHeart}>
            <Text style={{ fontSize: 22 }}>❤️</Text>
          </TouchableOpacity>
          {isBroadcaster && (
            <TouchableOpacity
              style={[styles.endBtn, { backgroundColor: "#FF4E62" }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); router.back(); }}
            >
              <Text style={styles.endBtnText}>End</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

export default function LiveScreen() {
  const { mode, companionId } = useLocalSearchParams<{ mode: string; companionId: string }>();
  const { userProfile } = useApp();
  const [isLive, setIsLive] = useState(false);
  const [liveTitle, setLiveTitle] = useState("");
  const [livePpv, setLivePpv] = useState(0);

  const isBroadcaster = mode === "broadcast" || (mode !== "watch" && userProfile.isCompanion);

  const resolvedId = companionId ?? "1";
  const companion = COMPANIONS.find(c => c.id === resolvedId) ?? COMPANIONS[0];
  const streamData = LIVE_DATA[resolvedId];

  if (mode === "watch" || !userProfile.isCompanion) {
    return (
      <LiveView
        companion={companion}
        title={streamData?.title ?? "Live Stream"}
        ppvPrice={streamData?.ppvPrice ?? 0}
        isBroadcaster={false}
      />
    );
  }

  if (!isLive) {
    return (
      <BroadcastSetup
        companion={companion}
        onGoLive={(title, ppv) => {
          setLiveTitle(title);
          setLivePpv(ppv);
          setIsLive(true);
        }}
      />
    );
  }

  return (
    <LiveView
      companion={companion}
      title={liveTitle}
      ppvPrice={livePpv}
      isBroadcaster={true}
    />
  );
}

const styles = StyleSheet.create({
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

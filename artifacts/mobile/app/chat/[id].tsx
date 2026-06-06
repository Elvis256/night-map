import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useColors } from "@/hooks/useColors";
import { Message, useApp } from "@/context/AppContext";

const WAVEFORM = [8, 14, 22, 18, 28, 12, 20, 26, 16, 10, 24, 18, 14, 22, 8, 20, 26, 12, 18, 16];
const WAVEFORM_B = [12, 20, 10, 24, 16, 28, 14, 18, 22, 8, 20, 14, 26, 10, 18, 22, 16, 12, 28, 16];

function VoiceBubble({ fromMe, duration, colors }: { fromMe: boolean; duration: string; colors: ReturnType<typeof useColors> }) {
  const [playing, setPlaying] = useState(false);
  const playAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const togglePlay = () => {
    setPlaying(!playing);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!playing) {
      progressAnim.setValue(0);
      Animated.timing(progressAnim, { toValue: 1, duration: 3000, useNativeDriver: false }).start(() => setPlaying(false));
    } else {
      progressAnim.stopAnimation();
    }
  };

  const bars = fromMe ? WAVEFORM : WAVEFORM_B;
  return (
    <View style={[styles.voiceBubble, fromMe ? styles.voiceRight : styles.voiceLeft, {
      backgroundColor: fromMe ? colors.primary : colors.card,
      borderColor: fromMe ? colors.primary : colors.border,
    }]}>
      <TouchableOpacity style={styles.voicePlayBtn} onPress={togglePlay}>
        <Ionicons name={playing ? "pause" : "play"} size={16} color="#fff" />
      </TouchableOpacity>
      <View style={styles.waveformWrap}>
        {bars.map((h, i) => (
          <Animated.View
            key={i}
            style={[
              styles.waveBar,
              {
                height: h,
                backgroundColor: fromMe ? "rgba(255,255,255,0.7)" : colors.mutedForeground,
                opacity: playing ? progressAnim.interpolate({ inputRange: [0, i / bars.length, Math.min(1, (i + 1) / bars.length)], outputRange: [0.4, 0.4, 1] }) : 0.5,
              },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.voiceDuration, { color: fromMe ? "rgba(255,255,255,0.8)" : colors.mutedForeground }]}>
        {duration}
      </Text>
    </View>
  );
}

function MessageBubble({ message, colors }: { message: Message; colors: ReturnType<typeof useColors> }) {
  const time = new Date(message.time);
  const timeStr = `${time.getHours().toString().padStart(2, "0")}:${time.getMinutes().toString().padStart(2, "0")}`;
  const isVoice = message.text.startsWith("🎤");
  const duration = isVoice ? message.text.replace("🎤 ", "").replace("Voice note · ", "") : null;

  return (
    <View style={[styles.bubbleWrap, message.fromMe ? styles.bubbleRight : styles.bubbleLeft]}>
      {isVoice ? (
        <VoiceBubble fromMe={message.fromMe} duration={duration!} colors={colors} />
      ) : (
        <View style={[
          styles.bubble,
          message.fromMe ? { backgroundColor: colors.primary } : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
        ]}>
          <Text style={[styles.bubbleText, { color: message.fromMe ? "#fff" : colors.foreground }]}>
            {message.text}
          </Text>
        </View>
      )}
      <Text style={[styles.timeText, { color: colors.mutedForeground }]}>{timeStr}</Text>
    </View>
  );
}

function RecordingOverlay({ onCancel, colors }: { onCancel: () => void; colors: ReturnType<typeof useColors> }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <View style={[styles.recordingBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      <TouchableOpacity onPress={onCancel}>
        <Ionicons name="trash-outline" size={22} color={colors.mutedForeground} />
      </TouchableOpacity>
      <View style={styles.recordingCenter}>
        <Animated.View style={[styles.recordingDot, { transform: [{ scale: pulseAnim }], backgroundColor: colors.primary }]} />
        <Text style={[styles.recordingText, { color: colors.foreground }]}>Recording…</Text>
      </View>
      <Text style={[styles.recordingHint, { color: colors.mutedForeground }]}>Release to send</Text>
    </View>
  );
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { matches, messages, sendMessage } = useApp();
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const flatRef = useRef<FlatList>(null);

  const match = matches.find((m) => m.id === id);
  const threadMessages: Message[] = messages[id ?? ""] ?? [];

  const handleSend = () => {
    const text = input.trim();
    if (!text || !id) return;
    setInput("");
    sendMessage(id, text);
  };

  const handleVoiceStart = () => {
    setIsRecording(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const handleVoiceEnd = () => {
    if (!isRecording || !id) { setIsRecording(false); return; }
    setIsRecording(false);
    const dur = `0:${Math.floor(5 + Math.random() * 18).toString().padStart(2, "0")}`;
    sendMessage(id, `🎤 Voice note · ${dur}`);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleTip = (amount: number) => {
    setShowTip(false);
    if (id) sendMessage(id, `💰 Sent a UGX ${amount.toLocaleString()} tip`);
  };

  const QUICK_REPLIES = ["Hey, are you free tonight?", "What's your rate?", "Where are you located?", "Send me your location"];

  if (!match) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Text style={{ color: colors.foreground, padding: 20 }}>Conversation not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.chatHeader, {
        paddingTop: Platform.OS === "web" ? 67 : insets.top,
        backgroundColor: colors.background,
        borderBottomColor: colors.border,
      }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.headerAvatar, { backgroundColor: match.companion.color }]}>
          <Text style={styles.headerAvatarText}>{match.companion.name[0]}</Text>
          {match.companion.online && <View style={[styles.onlineDot, { borderColor: colors.background }]} />}
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: colors.foreground }]}>{match.companion.name}</Text>
          <Text style={[styles.headerStatus, { color: match.companion.online ? "#22c55e" : colors.mutedForeground }]}>
            {match.companion.online ? "Online now" : "Offline"}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.tipBtn, { backgroundColor: "rgba(31,191,107,0.12)", borderColor: "rgba(31,191,107,0.35)" }]}
          onPress={() => setShowTip(!showTip)}
        >
          <Ionicons name="cash-outline" size={17} color="#1FBF6B" />
          <Text style={[styles.tipBtnText, { color: "#1FBF6B" }]}>Tip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.infoBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push(`/companion/${match.companion.id}`)}
        >
          <Ionicons name="information-circle-outline" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Tip menu */}
      {showTip && (
        <View style={[styles.tipMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.tipMenuTitle, { color: colors.foreground }]}>Send a tip via MoMo</Text>
          <View style={styles.tipRow}>
            {[5000, 10000, 20000, 50000].map((amt) => (
              <TouchableOpacity
                key={amt}
                style={[styles.tipOption, { backgroundColor: "rgba(31,191,107,0.1)", borderColor: "rgba(31,191,107,0.3)" }]}
                onPress={() => handleTip(amt)}
              >
                <Text style={[styles.tipAmt, { color: "#1FBF6B" }]}>UGX {(amt / 1000).toFixed(0)}k</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Messages */}
      {threadMessages.length === 0 ? (
        <View style={styles.emptyChat}>
          <View style={[styles.emptyChatAvatar, { backgroundColor: match.companion.color }]}>
            <Text style={styles.emptyChatInitial}>{match.companion.name[0]}</Text>
          </View>
          <Text style={[styles.emptyChatName, { color: colors.foreground }]}>{match.companion.name}</Text>
          <Text style={[styles.emptyChatHint, { color: colors.mutedForeground }]}>Send a message to start the night</Text>
          <View style={styles.quickReplies}>
            {QUICK_REPLIES.map((q) => (
              <TouchableOpacity
                key={q}
                style={[styles.quickReply, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => sendMessage(id!, q)}
              >
                <Text style={[styles.quickReplyText, { color: colors.foreground }]} numberOfLines={1}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={threadMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} colors={colors} />}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
          scrollEnabled={!!threadMessages.length}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* Input bar */}
      {isRecording ? (
        <RecordingOverlay
          colors={colors}
          onCancel={() => setIsRecording(false)}
        />
      ) : (
        <View style={[styles.inputBar, {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 8,
        }]}>
          <TouchableOpacity
            style={[styles.micBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPressIn={handleVoiceStart}
            onPressOut={handleVoiceEnd}
          >
            <Ionicons name="mic-outline" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
          <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Message…"
              placeholderTextColor={colors.mutedForeground}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
              onSubmitEditing={handleSend}
            />
          </View>
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: input.trim() ? colors.primary : colors.muted }]}
            onPress={handleSend}
            disabled={!input.trim()}
          >
            <Ionicons name="send" size={17} color={input.trim() ? "#fff" : colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  backBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  headerAvatarText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22c55e",
    borderWidth: 2,
  },
  headerInfo: { flex: 1 },
  headerName: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  headerStatus: { fontFamily: "Inter_400Regular", fontSize: 11 },
  tipBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  tipBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  infoBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  tipMenu: {
    margin: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  tipMenuTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  tipRow: { flexDirection: "row", gap: 8 },
  tipOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  tipAmt: { fontFamily: "Inter_700Bold", fontSize: 13 },
  messageList: { padding: 14, gap: 8, flexGrow: 1 },
  bubbleWrap: { maxWidth: "78%", gap: 3 },
  bubbleLeft: { alignSelf: "flex-start", alignItems: "flex-start" },
  bubbleRight: { alignSelf: "flex-end", alignItems: "flex-end" },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleText: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 22 },
  timeText: { fontFamily: "Inter_400Regular", fontSize: 10, marginHorizontal: 4 },
  voiceBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 180,
  },
  voiceRight: { borderRadius: 20 },
  voiceLeft: { borderRadius: 20 },
  voicePlayBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  waveformWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 2, height: 32 },
  waveBar: { width: 3, borderRadius: 2 },
  voiceDuration: { fontFamily: "Inter_500Medium", fontSize: 11 },
  emptyChat: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  emptyChatAvatar: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  emptyChatInitial: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 28 },
  emptyChatName: { fontFamily: "Inter_700Bold", fontSize: 20 },
  emptyChatHint: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" },
  quickReplies: { width: "100%", gap: 8, marginTop: 8 },
  quickReply: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, borderWidth: 1 },
  quickReplyText: { fontFamily: "Inter_500Medium", fontSize: 14 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  inputWrap: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 120,
  },
  input: { fontFamily: "Inter_400Regular", fontSize: 15 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  recordingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: Platform.OS === "ios" ? 30 : 14,
  },
  recordingCenter: { flexDirection: "row", alignItems: "center", gap: 10 },
  recordingDot: { width: 10, height: 10, borderRadius: 5 },
  recordingText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  recordingHint: { fontFamily: "Inter_400Regular", fontSize: 13 },
});

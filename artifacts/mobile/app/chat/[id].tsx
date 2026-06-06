import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import {
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

function MessageBubble({ message, colors }: { message: Message; colors: ReturnType<typeof useColors> }) {
  const time = new Date(message.time);
  const timeStr = `${time.getHours().toString().padStart(2, "0")}:${time.getMinutes().toString().padStart(2, "0")}`;

  return (
    <View style={[styles.bubbleWrap, message.fromMe ? styles.bubbleRight : styles.bubbleLeft]}>
      <View
        style={[
          styles.bubble,
          message.fromMe
            ? { backgroundColor: colors.primary }
            : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
        ]}
      >
        <Text style={[styles.bubbleText, { color: message.fromMe ? "#fff" : colors.foreground }]}>
          {message.text}
        </Text>
      </View>
      <Text style={[styles.timeText, { color: colors.mutedForeground }]}>{timeStr}</Text>
    </View>
  );
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { matches, messages, sendMessage } = useApp();
  const [input, setInput] = useState("");
  const flatRef = useRef<FlatList>(null);

  const match = matches.find((m) => m.id === id);
  const threadMessages: Message[] = messages[id ?? ""] ?? [];

  const handleSend = () => {
    const text = input.trim();
    if (!text || !id) return;
    setInput("");
    sendMessage(id, text);
  };

  if (!match) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Text style={{ color: colors.foreground, padding: 20 }}>Conversation not found</Text>
      </View>
    );
  }

  const QUICK_REPLIES = ["Hey, are you free tonight?", "What's your rate?", "Where are you located?", "Send me your location"];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <View
        style={[
          styles.chatHeader,
          {
            paddingTop: Platform.OS === "web" ? 67 : insets.top,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
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
        <TouchableOpacity style={[styles.infoBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push(`/companion/${match.companion.id}`)}>
          <Ionicons name="information-circle-outline" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

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

      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 8,
          },
        ]}
      >
        <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            placeholder="Message..."
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
          <Ionicons name="send" size={18} color={input.trim() ? "#fff" : colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  headerAvatarText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#22c55e",
    borderWidth: 2,
  },
  headerInfo: { flex: 1 },
  headerName: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  headerStatus: { fontFamily: "Inter_400Regular", fontSize: 12 },
  infoBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  messageList: { padding: 16, gap: 8, flexGrow: 1 },
  bubbleWrap: { maxWidth: "78%", gap: 3 },
  bubbleLeft: { alignSelf: "flex-start", alignItems: "flex-start" },
  bubbleRight: { alignSelf: "flex-end", alignItems: "flex-end" },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleText: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 22 },
  timeText: { fontFamily: "Inter_400Regular", fontSize: 11, marginHorizontal: 4 },
  emptyChat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyChatAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyChatInitial: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 28 },
  emptyChatName: { fontFamily: "Inter_700Bold", fontSize: 20 },
  emptyChatHint: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" },
  quickReplies: { width: "100%", gap: 8, marginTop: 8 },
  quickReply: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  quickReplyText: { fontFamily: "Inter_500Medium", fontSize: 14 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputWrap: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
  },
  input: { fontFamily: "Inter_400Regular", fontSize: 15 },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
});

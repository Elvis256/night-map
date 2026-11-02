import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  createLounge,
  endLounge,
  getListLoungesQueryKey,
  getListStreamsQueryKey,
  joinLounge,
  leaveLounge,
  useListLounges,
  useListStreams,
  type Lounge,
  type Stream,
} from "@workspace/api-client-react";
import { useColors } from "@workspace/nightmap-design-system/hooks/use-colors";
import { useApp } from "@/context/AppContext";
import { CITY_COORDS, nearestCity } from "@/hooks/useLocationCity";
import { errorMessage } from "@/lib/api";

const CITY_FLAG: Record<string, string> = {
  Kampala: "🇺🇬", Entebbe: "🇺🇬", Mbarara: "🇺🇬", Gulu: "🇺🇬", Jinja: "🇺🇬",
  Nairobi: "🇰🇪", "Dar es Salaam": "🇹🇿", Dubai: "🇦🇪",
};
const CITIES = Object.keys(CITY_COORDS);

function cityLabel(city: string): string {
  return CITY_FLAG[city] ? `${city} ${CITY_FLAG[city]}` : city;
}

function haversineDist(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function cityCoord(city: string): { lat: number; lng: number } {
  return CITY_COORDS[city] ?? CITY_COORDS["Kampala"];
}

function PulsingDot({ color }: { color: string }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.5, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <View style={{ width: 10, height: 10, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, transform: [{ scale: pulse }], opacity: 0.5, position: "absolute" }} />
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
    </View>
  );
}

function ListenerAvatars({ initials, colors: avatarColors }: { initials: string[]; colors: string[] }) {
  if (initials.length === 0) {
    return (
      <View style={styles.avatarStack}>
        <View style={[styles.listenerAvatar, { backgroundColor: "rgba(170,179,197,0.2)" }]}>
          <Ionicons name="headset-outline" size={11} color="#AAB3C5" />
        </View>
      </View>
    );
  }
  return (
    <View style={styles.avatarStack}>
      {initials.slice(0, 4).map((init, i) => (
        <View
          key={i}
          style={[
            styles.listenerAvatar,
            { backgroundColor: avatarColors[i % avatarColors.length], marginLeft: i > 0 ? -8 : 0, zIndex: initials.length - i },
          ]}
        >
          <Text style={styles.listenerInitial}>{init}</Text>
        </View>
      ))}
      {initials.length > 4 && (
        <View style={[styles.listenerAvatar, { backgroundColor: "rgba(170,179,197,0.2)", marginLeft: -8 }]}>
          <Text style={[styles.listenerInitial, { fontSize: 9 }]}>+{initials.length - 4}</Text>
        </View>
      )}
    </View>
  );
}

function FeaturedLounge({ lounge, onJoin, isNearby }: { lounge: Lounge; onJoin: () => void; isNearby: boolean }) {
  const colors = useColors("dark");
  return (
    <View style={[styles.featured, { backgroundColor: colors.card, borderColor: lounge.color }]}>
      <View style={[styles.featuredGlow, { backgroundColor: `${lounge.color}15` }]} />
      <View style={styles.featuredTop}>
        <View style={styles.featuredBadges}>
          <View style={[styles.livePill, { backgroundColor: `${lounge.color}20`, borderColor: `${lounge.color}50` }]}>
            <PulsingDot color={lounge.color} />
            <Text style={[styles.livePillText, { color: lounge.color }]}>LIVE</Text>
          </View>
          <View style={[styles.cityPill, { backgroundColor: colors.muted }]}>
            <Text style={[styles.cityPillText, { color: colors.mutedForeground }]}>{cityLabel(lounge.city)}</Text>
          </View>
          {isNearby && (
            <View style={[styles.nearbyPill, { backgroundColor: "rgba(31,191,107,0.15)", borderColor: "rgba(31,191,107,0.4)" }]}>
              <Ionicons name="location" size={10} color="#1FBF6B" />
              <Text style={[styles.nearbyPillText, { color: "#1FBF6B" }]}>Nearby</Text>
            </View>
          )}
        </View>
        <View style={[styles.featuredListeners, { backgroundColor: "rgba(0,0,0,0.4)" }]}>
          <Ionicons name="headset" size={12} color={colors.mutedForeground} />
          <Text style={[styles.featuredListenersText, { color: colors.mutedForeground }]}>{lounge.listenerCount}</Text>
        </View>
      </View>
      <Text style={[styles.featuredName, { color: colors.foreground }]}>{lounge.name}</Text>
      <Text style={[styles.featuredTopic, { color: lounge.color }]}>🎙 {lounge.topic}</Text>
      <Text style={[styles.featuredDesc, { color: colors.mutedForeground }]}>{lounge.description}</Text>
      <View style={styles.featuredBottom}>
        <View style={styles.featuredLeft}>
          <ListenerAvatars initials={lounge.participants.map(p => p.initial)} colors={lounge.participants.map(p => p.color)} />
          <Text style={[styles.featuredWith, { color: colors.mutedForeground }]}>
            {lounge.listenerCount > 0 ? `${lounge.listenerCount} listening` : "Be the first to join"}
          </Text>
        </View>
        <TouchableOpacity style={[styles.joinBtn, { backgroundColor: lounge.joined ? colors.muted : lounge.color }]} onPress={onJoin}>
          <Ionicons name={lounge.joined ? "exit-outline" : "mic"} size={14} color="#fff" />
          <Text style={styles.joinBtnText}>{lounge.joined ? "Leave" : "Join Live"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function LoungeRow({ lounge, onJoin, isNearby }: { lounge: Lounge; onJoin: () => void; isNearby: boolean }) {
  const colors = useColors("dark");
  return (
    <View style={[styles.loungeRow, { backgroundColor: colors.card, borderColor: isNearby ? `${lounge.color}50` : colors.border }]}>
      <View style={[styles.loungeAccent, { backgroundColor: lounge.color }]} />
      <View style={styles.loungeInfo}>
        <View style={styles.loungeTopRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
            <Text style={[styles.loungeName, { color: colors.foreground }]} numberOfLines={1}>{lounge.name}</Text>
            {isNearby && <Ionicons name="location" size={11} color="#1FBF6B" />}
          </View>
          {lounge.isLive ? (
            <View style={styles.liveSmall}>
              <PulsingDot color={lounge.color} />
              <Text style={[styles.liveSmallText, { color: lounge.color }]}>LIVE</Text>
            </View>
          ) : (
            <Text style={[styles.upcomingText, { color: colors.mutedForeground }]}>Upcoming</Text>
          )}
        </View>
        <Text style={[styles.loungeTopic, { color: colors.accent }]}>🎙 {lounge.topic}</Text>
        <View style={styles.loungeMetaRow}>
          <ListenerAvatars initials={lounge.participants.map(p => p.initial)} colors={lounge.participants.map(p => p.color)} />
          <Text style={[styles.loungeListeners, { color: colors.mutedForeground }]}>
            {lounge.listenerCount} listening · {cityLabel(lounge.city)}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[
          styles.joinSmall,
          {
            backgroundColor: lounge.joined ? colors.muted : lounge.isLive ? `${lounge.color}18` : colors.muted,
            borderColor: lounge.isLive ? `${lounge.color}50` : colors.border,
          },
        ]}
        onPress={onJoin}
      >
        <Ionicons name={lounge.joined ? "exit-outline" : lounge.isLive ? "mic" : "notifications-outline"} size={14} color={lounge.isLive ? lounge.color : colors.mutedForeground} />
        <Text style={[styles.joinSmallText, { color: lounge.isLive ? lounge.color : colors.mutedForeground }]}>
          {lounge.joined ? "Leave" : lounge.isLive ? "Join" : "Remind"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function LiveStreamerCard({ stream, onWatch }: { stream: Stream; onWatch: () => void }) {
  const colors = useColors("dark");
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const host = stream.host;
  return (
    <TouchableOpacity style={[styles.streamerCard, { backgroundColor: colors.card, borderColor: `${host.avatarColor}60` }]} onPress={onWatch} activeOpacity={0.85}>
      <Animated.View style={[styles.streamerAvatar, { backgroundColor: host.avatarColor, borderColor: "#FF4E62", transform: [{ scale: pulse }] }]}>
        <Text style={styles.streamerInitial}>{host.name[0]}</Text>
        <View style={styles.streamerLiveBadge}>
          <Text style={styles.streamerLiveBadgeText}>LIVE</Text>
        </View>
      </Animated.View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={[styles.streamerName, { color: colors.foreground }]}>{host.name}</Text>
          {host.verified && <Ionicons name="checkmark-circle" size={13} color="#3DA9FF" />}
          {stream.isHost && (
            <View style={[styles.ppvBadge, { backgroundColor: "rgba(255,78,98,0.15)", borderColor: "rgba(255,78,98,0.4)" }]}>
              <Text style={[styles.ppvBadgeText, { color: "#FF4E62" }]}>YOU</Text>
            </View>
          )}
        </View>
        <Text style={[styles.streamerTitle, { color: colors.mutedForeground }]} numberOfLines={1}>{stream.title}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="eye" size={12} color={colors.mutedForeground} />
            <Text style={[styles.streamerMeta, { color: colors.mutedForeground }]}>{stream.viewerCount.toLocaleString()}</Text>
          </View>
          <Text style={[styles.streamerMeta, { color: colors.mutedForeground }]}>·</Text>
          <Text style={[styles.streamerMeta, { color: colors.mutedForeground }]}>{host.city}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.watchBtn, { backgroundColor: "rgba(255,78,98,0.15)", borderColor: "rgba(255,78,98,0.5)" }]}
        onPress={onWatch}
      >
        <Ionicons name="play" size={12} color="#FF4E62" />
        <Text style={[styles.watchBtnText, { color: "#FF4E62" }]}>Watch</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function CreateLoungeModal({ visible, defaultCity, onClose, onCreated }: { visible: boolean; defaultCity: string; onClose: () => void; onCreated: (lounge: Lounge) => void }) {
  const colors = useColors("dark");
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState(defaultCity || "Kampala");
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (defaultCity) setCity(defaultCity); }, [defaultCity]);
  const canSave = name.trim().length > 0 && topic.trim().length > 0 && !saving;
  const handleCreate = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const lounge = await createLounge({ name: name.trim(), topic: topic.trim(), description: description.trim() || undefined, city });
      setName(""); setTopic(""); setDescription("");
      onCreated(lounge);
    } catch (err) {
      Alert.alert("Could not start lounge", errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Start Your Own Lounge</Text>
          <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>City-based · Anonymous · Up to 50 listeners</Text>
          <TextInput style={[styles.modalInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]} placeholder="Lounge name" placeholderTextColor={colors.mutedForeground} value={name} onChangeText={setName} maxLength={60} />
          <TextInput style={[styles.modalInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]} placeholder="Topic (e.g. Weekend Vibes)" placeholderTextColor={colors.mutedForeground} value={topic} onChangeText={setTopic} maxLength={60} />
          <TextInput style={[styles.modalInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, minHeight: 60 }]} placeholder="What will you talk about? (optional)" placeholderTextColor={colors.mutedForeground} value={description} onChangeText={setDescription} maxLength={200} multiline />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
            {[...CITIES, "All Cities"].map((c) => (
              <TouchableOpacity key={c} style={[styles.cityChip, { backgroundColor: city === c ? "rgba(122,60,255,0.15)" : colors.muted, borderColor: city === c ? "#7A3CFF" : colors.border }]} onPress={() => setCity(c)}>
                <Text style={[styles.cityChipText, { color: city === c ? "#7A3CFF" : colors.mutedForeground }]}>{cityLabel(c)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: canSave ? "#7A3CFF" : colors.muted }]} onPress={handleCreate} disabled={!canSave}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={[styles.modalBtnText, { color: canSave ? "#fff" : colors.mutedForeground }]}>Go live in the lounge</Text>}
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function RadioScreen() {
  const colors = useColors("dark");
  const insets = useSafeAreaInsets();
  const { userCity, setUserCity, invalidate, userProfile } = useApp();
  const [joined, setJoined] = useState<string | null>(null);
  const [detectedCity, setDetectedCity] = useState<string>(userCity || "");
  const [showCreate, setShowCreate] = useState(false);

  const loungesQuery = useListLounges({ query: { queryKey: getListLoungesQueryKey(), refetchInterval: 15000 } });
  const streamsQuery = useListStreams({ query: { queryKey: getListStreamsQueryKey(), refetchInterval: 15000 } });
  const lounges: Lounge[] = loungesQuery.data ?? [];
  const streams: Stream[] = streamsQuery.data ?? [];

  useEffect(() => {
    const serverJoined = lounges.find((l) => l.joined);
    if (serverJoined && !joined) setJoined(serverJoined.id);
  }, [lounges, joined]);

  useEffect(() => {
    if (userCity) {
      setDetectedCity(userCity);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted" || cancelled) return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled) {
          const city = nearestCity(pos.coords.latitude, pos.coords.longitude);
          setDetectedCity(city);
          setUserCity(city);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [userCity]);

  // Presence heartbeat while in a lounge; leave when the screen unmounts.
  useEffect(() => {
    if (!joined) return;
    const id = setInterval(() => joinLounge(joined).catch(() => {}), 60000);
    return () => {
      clearInterval(id);
      leaveLounge(joined).catch(() => {});
    };
  }, [joined]);

  const sortedLounges = [...lounges].sort((a, b) => {
    if (!detectedCity) return 0;
    const userCoord = cityCoord(detectedCity);
    const cityA = a.city === "All Cities" ? detectedCity : a.city;
    const cityB = b.city === "All Cities" ? detectedCity : b.city;
    const coordA = cityCoord(cityA);
    const coordB = cityCoord(cityB);
    const distA = haversineDist(userCoord.lat, userCoord.lng, coordA.lat, coordA.lng);
    const distB = haversineDist(userCoord.lat, userCoord.lng, coordB.lat, coordB.lng);
    return distA - distB;
  });
  const NEARBY_THRESHOLD_KM = 200;
  const userCoord = detectedCity ? cityCoord(detectedCity) : null;
  function isNearby(lounge: Lounge): boolean {
    if (!userCoord || lounge.city === "All Cities") return false;
    const coord = cityCoord(lounge.city);
    return haversineDist(userCoord.lat, userCoord.lng, coord.lat, coord.lng) < NEARBY_THRESHOLD_KM;
  }
  const nearbyLounges = sortedLounges.filter(l => l.city !== "All Cities" && isNearby(l));
  const otherLounges = sortedLounges.filter(l => !isNearby(l));
  const featured = nearbyLounges[0] ?? sortedLounges[0];
  const joinedLounge = lounges.find((l) => l.id === joined) ?? null;

  const handleJoin = async (lounge: Lounge) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (joined === lounge.id) {
        setJoined(null);
        await leaveLounge(lounge.id);
      } else {
        if (joined) await leaveLounge(joined).catch(() => {});
        setJoined(lounge.id);
        await joinLounge(lounge.id);
      }
      invalidate([getListLoungesQueryKey()]);
    } catch (err) {
      Alert.alert("Lounge unavailable", errorMessage(err));
      setJoined(null);
    }
  };

  const handleEnd = async (lounge: Lounge) => {
    try {
      await endLounge(lounge.id);
      setJoined(null);
      invalidate([getListLoungesQueryKey()]);
    } catch (err) {
      Alert.alert("Could not end lounge", errorMessage(err));
    }
  };

  const handleWatch = (stream: Stream) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/live", params: { mode: "watch", streamId: stream.id } });
  };

  const totalListeners = lounges.filter(l => l.isLive).reduce((s, l) => s + l.listenerCount, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>NightMap Radio</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {detectedCity ? `Near ${detectedCity}` : "Anonymous audio lounges by city"}
          </Text>
        </View>
        <View style={[styles.headerLive, { backgroundColor: "rgba(255,78,98,0.12)" }]}>
          <PulsingDot color="#FF4E62" />
          <Text style={[styles.headerLiveText, { color: colors.primary }]}>
            {totalListeners} online
          </Text>
        </View>
      </View>
      {joinedLounge && (
        <View style={[styles.nowPlaying, { backgroundColor: `${joinedLounge.color}18`, borderColor: `${joinedLounge.color}40` }]}>
          <Ionicons name="radio" size={16} color={joinedLounge.color} />
          <Text style={[styles.nowPlayingText, { color: joinedLounge.color }]} numberOfLines={1}>
            Now in: {joinedLounge.name}
          </Text>
          {joinedLounge.isHost && (
            <TouchableOpacity onPress={() => handleEnd(joinedLounge)} style={styles.leaveBtn}>
              <Text style={[styles.leaveBtnText, { color: "#FF4E62" }]}>End</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => handleJoin(joinedLounge)} style={styles.leaveBtn}>
            <Text style={[styles.leaveBtnText, { color: colors.mutedForeground }]}>Leave</Text>
          </TouchableOpacity>
        </View>
      )}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20 }]}
      >
        {/* ── LIVE STREAMS ──────────────────────────────── */}
        <View style={styles.sectionRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <PulsingDot color="#FF4E62" />
            <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: 0, marginBottom: 0 }]}>LIVE STREAMS</Text>
          </View>
          <TouchableOpacity onPress={() => router.push({ pathname: "/live", params: { mode: userProfile.isCompanion ? "broadcast" : "browse" } })}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>{userProfile.isCompanion ? "Go live" : "See all"}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.streamersList}>
          {streams.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {streamsQuery.isLoading ? "Loading streams…" : "Nobody is streaming right now. Companions usually go live after 8pm."}
            </Text>
          ) : (
            streams.map(s => (
              <LiveStreamerCard key={s.id} stream={s} onWatch={() => handleWatch(s)} />
            ))
          )}
        </View>
        {/* ── NEARBY LOUNGES ───────────────────────────── */}
        {loungesQuery.isLoading && lounges.length === 0 && (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
        )}
        {nearbyLounges.length > 0 && featured && (
          <>
            <View style={styles.sectionRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="location" size={13} color="#1FBF6B" />
                <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: 0, marginBottom: 0 }]}>NEARBY</Text>
              </View>
              <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>{detectedCity}</Text>
            </View>
            <FeaturedLounge lounge={featured} onJoin={() => handleJoin(featured)} isNearby={true} />
            {nearbyLounges.slice(1).map(lounge => (
              <LoungeRow key={lounge.id} lounge={lounge} onJoin={() => handleJoin(lounge)} isNearby={true} />
            ))}
          </>
        )}
        {/* ── OTHER CITIES ─────────────────────────────── */}
        {otherLounges.length > 0 && featured && (
          <>
            <View style={styles.sectionRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="globe-outline" size={13} color={colors.mutedForeground} />
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 0, marginBottom: 0 }]}>
                  {nearbyLounges.length > 0 ? "OTHER CITIES" : "ALL LOUNGES"}
                </Text>
              </View>
            </View>
            {nearbyLounges.length === 0 && (
              <FeaturedLounge lounge={featured} onJoin={() => handleJoin(featured)} isNearby={false} />
            )}
            {(nearbyLounges.length > 0 ? otherLounges : otherLounges.filter(l => l.id !== featured.id)).map(lounge => (
              <LoungeRow key={lounge.id} lounge={lounge} onJoin={() => handleJoin(lounge)} isNearby={false} />
            ))}
          </>
        )}
        {/* ── START YOUR OWN LOUNGE ────────────────────── */}
        <TouchableOpacity style={[styles.createCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setShowCreate(true)} activeOpacity={0.8}>
          <Ionicons name="add-circle-outline" size={28} color={colors.mutedForeground} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.createTitle, { color: colors.foreground }]}>Start Your Own Lounge</Text>
            <Text style={[styles.createSub, { color: colors.mutedForeground }]}>City-based · Anonymous · Up to 50 listeners</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
        <Text style={[styles.emptyText, { color: colors.mutedForeground, marginTop: 12 }]}>
          Lounge audio is not connected yet. Presence, hosting and listener counts are live.
        </Text>
      </ScrollView>
      <CreateLoungeModal
        visible={showCreate}
        defaultCity={detectedCity}
        onClose={() => setShowCreate(false)}
        onCreated={(lounge) => {
          setShowCreate(false);
          setJoined(lounge.id);
          invalidate([getListLoungesQueryKey()]);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center", paddingHorizontal: 16, paddingVertical: 8 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, gap: 12 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  modalSub: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: -8 },
  modalInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontFamily: "Inter_400Regular", fontSize: 14 },
  cityChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, borderWidth: 1 },
  cityChipText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  modalBtn: { borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  modalBtnText: { fontFamily: "Inter_700Bold", fontSize: 15 },
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 20 },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 12 },
  headerLive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  headerLiveText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  nowPlaying: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  nowPlayingText: { fontFamily: "Inter_600SemiBold", fontSize: 13, flex: 1 },
  leaveBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  leaveBtnText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  scroll: { paddingHorizontal: 16, gap: 10 },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 4,
  },
  sectionLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 1,
  },
  sectionSub: { fontFamily: "Inter_400Regular", fontSize: 11 },
  seeAll: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  streamersList: { gap: 8 },
  streamerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  streamerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    position: "relative",
  },
  streamerInitial: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 20 },
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
  streamerName: { fontFamily: "Inter_700Bold", fontSize: 14 },
  streamerTitle: { fontFamily: "Inter_400Regular", fontSize: 12 },
  streamerMeta: { fontFamily: "Inter_400Regular", fontSize: 11 },
  ppvBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  ppvBadgeText: { fontFamily: "Inter_700Bold", fontSize: 9 },
  watchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  watchBtnText: { fontFamily: "Inter_700Bold", fontSize: 12 },
  nearbyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  nearbyPillText: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
  featured: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 18,
    gap: 8,
    overflow: "hidden",
    position: "relative",
  },
  featuredGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  featuredTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  featuredBadges: { flexDirection: "row", gap: 6, alignItems: "center", flexWrap: "wrap" },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  livePillText: { fontFamily: "Inter_700Bold", fontSize: 11 },
  cityPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  cityPillText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  featuredListeners: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  featuredListenersText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  featuredName: { fontFamily: "Inter_700Bold", fontSize: 22 },
  featuredTopic: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  featuredDesc: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
  featuredBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  featuredLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  featuredWith: { fontFamily: "Inter_400Regular", fontSize: 12 },
  joinBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  joinBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 },
  loungeRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    gap: 12,
    paddingRight: 12,
    paddingVertical: 12,
  },
  loungeAccent: { width: 4, alignSelf: "stretch", borderRadius: 2, marginRight: 4 },
  loungeInfo: { flex: 1, gap: 4 },
  loungeTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  loungeName: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  liveSmall: { flexDirection: "row", alignItems: "center", gap: 4 },
  liveSmallText: { fontFamily: "Inter_700Bold", fontSize: 10 },
  upcomingText: { fontFamily: "Inter_400Regular", fontSize: 11 },
  loungeTopic: { fontFamily: "Inter_500Medium", fontSize: 13 },
  loungeMetaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  loungeListeners: { fontFamily: "Inter_400Regular", fontSize: 11 },
  joinSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  joinSmallText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  avatarStack: { flexDirection: "row", alignItems: "center" },
  listenerAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.3)",
  },
  listenerInitial: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 9 },
  createCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: 16,
    marginTop: 4,
  },
  createTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  createSub: { fontFamily: "Inter_400Regular", fontSize: 12 },
});

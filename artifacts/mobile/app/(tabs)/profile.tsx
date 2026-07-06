import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useLocationCity } from "@/hooks/useLocationCity";
import { formatUGX, useApp } from "@/context/AppContext";

function SettingRow({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  onPress,
  danger,
  right,
}: {
  icon: string;
  iconBg?: string;
  iconColor?: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  right?: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.settingRow, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.settingIcon, { backgroundColor: iconBg ?? (danger ? "rgba(255,78,98,0.12)" : colors.muted) }]}>
        <Ionicons name={icon as never} size={17} color={iconColor ?? (danger ? colors.destructive : colors.primary)} />
      </View>
      <Text style={[styles.settingLabel, { color: danger ? colors.destructive : colors.foreground }]}>{label}</Text>
      <View style={styles.settingRight}>
        {value && <Text style={[styles.settingValue, { color: colors.mutedForeground }]}>{value}</Text>}
        {right}
        {onPress && !right && <Ionicons name="chevron-forward" size={15} color={colors.mutedForeground} />}
      </View>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userProfile, toggleAvailability, updateProfile, matches, walletCredit } = useApp();
  const [panicActive, setPanicActive] = useState(false);
  const [contactInput, setContactInput] = useState(userProfile.trustedContact);
  const [showContactInput, setShowContactInput] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState(userProfile.name);
  const [editBio, setEditBio] = useState(userProfile.bio ?? "");

  const saveEdit = () => {
    updateProfile({ name: editName.trim() || userProfile.name, bio: editBio.trim() });
    setShowEdit(false);
  };

  // GPS city detection
  const { detect: detectCity, status: detectStatus } = useLocationCity((city) => {
    updateProfile({ city });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  });

  // Settings modals
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);

  // Privacy toggles (local — would sync to backend in production)
  const [privShowDistance, setPrivShowDistance] = useState(true);
  const [privShowOnline, setPrivShowOnline] = useState(true);
  const [privAllowSaves, setPrivAllowSaves] = useState(true);
  const [privHideFromSearch, setPrivHideFromSearch] = useState(false);

  // Notification toggles
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifBookings, setNotifBookings] = useState(true);
  const [notifDeals, setNotifDeals] = useState(true);
  const [notifLive, setNotifLive] = useState(false);
  const [notifRadio, setNotifRadio] = useState(false);

  const [language, setLanguage] = useState("English");
  const LANGUAGES = ["English", "Swahili", "French", "Luganda"];

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
          await AsyncStorage.removeItem("authToken");
          router.replace("/auth/login");
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This permanently deletes your profile, connections, and chat history. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Forever",
          style: "destructive",
          onPress: async () => {
            const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
            await AsyncStorage.clear();
            router.replace("/auth/register");
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: "Join me on NightMap — East Africa's social companionship platform 🌙\nnightmap.itsolutionsuganda.com",
        title: "NightMap",
      });
    } catch (_) {}
  };

  const handlePanic = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setPanicActive(true);
    Alert.alert(
      "PANIC ALERT SENT",
      `Emergency alert sent to ${userProfile.trustedContact || "safety team"}.\n\nYour GPS location is being shared now. Stay safe — our safety team has been notified.`,
      [{ text: "I am Safe", style: "destructive", onPress: () => setPanicActive(false) }]
    );
  };

  const handleSafeCheckIn = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Safety Check-In", "Your location has been shared with your trusted contact. The 60-minute auto-check timer has started.", [{ text: "OK" }]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

    {/* ── Edit Profile Modal ─────────────────────────────── */}
    <Modal visible={showEdit} transparent animationType="slide" onRequestClose={() => setShowEdit(false)}>
      <Pressable style={styles.editBackdrop} onPress={() => setShowEdit(false)}>
        <Pressable style={[styles.editSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.editHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.editTitle, { color: colors.foreground }]}>Edit Profile</Text>

          <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>DISPLAY NAME</Text>
          <TextInput
            style={[styles.editInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
            value={editName}
            onChangeText={setEditName}
            placeholder="Your name"
            placeholderTextColor={colors.mutedForeground}
            maxLength={30}
            autoCapitalize="words"
          />

          <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>BIO</Text>
          <TextInput
            style={[styles.editInput, styles.editBioInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
            value={editBio}
            onChangeText={setEditBio}
            placeholder="A short intro about yourself…"
            placeholderTextColor={colors.mutedForeground}
            maxLength={140}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[styles.editSaveBtn, { backgroundColor: colors.primary }]}
            onPress={saveEdit}
          >
            <Text style={styles.editSaveBtnText}>Save Changes</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>

    {/* ── Privacy Modal ─────────────────────────────────── */}
    <Modal visible={showPrivacy} transparent animationType="slide" onRequestClose={() => setShowPrivacy(false)}>
      <Pressable style={styles.editBackdrop} onPress={() => setShowPrivacy(false)}>
        <Pressable style={[styles.editSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.editHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.editTitle, { color: colors.foreground }]}>Privacy</Text>

          {([
            { label: "Show my distance", sub: "Companions see how far you are", val: privShowDistance, set: setPrivShowDistance },
            { label: "Show online status", sub: "Others can see when you're active", val: privShowOnline, set: setPrivShowOnline },
            { label: "Allow profile saves", sub: "Let companions save your profile", val: privAllowSaves, set: setPrivAllowSaves },
            { label: "Hide from search", sub: "Only visible to your connections", val: privHideFromSearch, set: setPrivHideFromSearch },
          ] as const).map((item) => (
            <View key={item.label} style={[styles.settingModalRow, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingModalLabel, { color: colors.foreground }]}>{item.label}</Text>
                <Text style={[styles.settingModalSub, { color: colors.mutedForeground }]}>{item.sub}</Text>
              </View>
              <Switch
                value={item.val}
                onValueChange={(v) => { item.set(v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                trackColor={{ false: colors.border, true: "#3DA9FF" }}
                thumbColor="#fff"
              />
            </View>
          ))}

          <TouchableOpacity style={[styles.editSaveBtn, { backgroundColor: "#3DA9FF" }]} onPress={() => setShowPrivacy(false)}>
            <Text style={styles.editSaveBtnText}>Done</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>

    {/* ── Notifications Modal ───────────────────────────── */}
    <Modal visible={showNotifs} transparent animationType="slide" onRequestClose={() => setShowNotifs(false)}>
      <Pressable style={styles.editBackdrop} onPress={() => setShowNotifs(false)}>
        <Pressable style={[styles.editSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.editHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.editTitle, { color: colors.foreground }]}>Notifications</Text>

          {([
            { label: "New messages", sub: "Push alert when someone messages you", val: notifMessages, set: setNotifMessages, color: "#FF4E62" },
            { label: "Booking requests", sub: "Notify me of new booking activity", val: notifBookings, set: setNotifBookings, color: "#FF8A3D" },
            { label: "Tonight's deals", sub: "Flash deals from nearby companions", val: notifDeals, set: setNotifDeals, color: "#FFC400" },
            { label: "Live streams", sub: "When a companion you like goes live", val: notifLive, set: setNotifLive, color: "#7A3CFF" },
            { label: "Radio updates", sub: "New lounges and radio sessions", val: notifRadio, set: setNotifRadio, color: "#1FBF6B" },
          ] as const).map((item) => (
            <View key={item.label} style={[styles.settingModalRow, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingModalLabel, { color: colors.foreground }]}>{item.label}</Text>
                <Text style={[styles.settingModalSub, { color: colors.mutedForeground }]}>{item.sub}</Text>
              </View>
              <Switch
                value={item.val}
                onValueChange={(v) => { item.set(v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                trackColor={{ false: colors.border, true: item.color }}
                thumbColor="#fff"
              />
            </View>
          ))}

          <TouchableOpacity style={[styles.editSaveBtn, { backgroundColor: "#FF8A3D" }]} onPress={() => setShowNotifs(false)}>
            <Text style={styles.editSaveBtnText}>Done</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>

    {/* ── Language Modal ────────────────────────────────── */}
    <Modal visible={showLanguage} transparent animationType="slide" onRequestClose={() => setShowLanguage(false)}>
      <Pressable style={styles.editBackdrop} onPress={() => setShowLanguage(false)}>
        <Pressable style={[styles.editSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.editHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.editTitle, { color: colors.foreground }]}>Language</Text>
          <View style={{ gap: 10 }}>
            {LANGUAGES.map(lang => (
              <TouchableOpacity
                key={lang}
                style={[styles.langRow, { backgroundColor: language === lang ? "rgba(122,60,255,0.12)" : colors.muted, borderColor: language === lang ? "#7A3CFF" : colors.border }]}
                onPress={() => { setLanguage(lang); Haptics.selectionAsync(); setShowLanguage(false); }}
              >
                <Text style={[styles.langLabel, { color: language === lang ? "#7A3CFF" : colors.foreground }]}>{lang}</Text>
                {language === lang && <Ionicons name="checkmark-circle" size={20} color="#7A3CFF" />}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>

    {/* ── Support Modal ─────────────────────────────────── */}
    <Modal visible={showSupport} transparent animationType="slide" onRequestClose={() => setShowSupport(false)}>
      <Pressable style={styles.editBackdrop} onPress={() => setShowSupport(false)}>
        <Pressable style={[styles.editSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.editHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.editTitle, { color: colors.foreground }]}>Support</Text>
          <Text style={[styles.settingModalSub, { color: colors.mutedForeground, marginTop: -8 }]}>Available 24/7 across East Africa</Text>

          {([
            { icon: "logo-whatsapp", label: "WhatsApp Chat", sub: "+256 700 000000", color: "#25D366", action: () => Linking.openURL("https://wa.me/256700000000") },
            { icon: "mail-outline", label: "Email Support", sub: "support@nightmap.app", color: "#3DA9FF", action: () => Linking.openURL("mailto:support@nightmap.app") },
            { icon: "globe-outline", label: "Help Center", sub: "nightmap.itsolutionsuganda.com", color: "#FF8A3D", action: () => Linking.openURL("https://nightmap.itsolutionsuganda.com") },
            { icon: "flag-outline", label: "Report a Problem", sub: "Safety issues, bugs, billing", color: "#FF4E62", action: () => Linking.openURL("mailto:safety@nightmap.app?subject=Report") },
          ] as const).map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.supportRow, { backgroundColor: colors.muted, borderColor: colors.border }]}
              onPress={() => { item.action(); setShowSupport(false); }}
              activeOpacity={0.7}
            >
              <View style={[styles.supportIcon, { backgroundColor: `${item.color}18` }]}>
                <Ionicons name={item.icon as never} size={22} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingModalLabel, { color: colors.foreground }]}>{item.label}</Text>
                <Text style={[styles.settingModalSub, { color: colors.mutedForeground }]}>{item.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>

    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
        <TouchableOpacity style={[styles.editBtn, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={() => { setEditName(userProfile.name); setEditBio(userProfile.bio ?? ""); setEditCity(userProfile.city); setShowEdit(true); }}>
          <Ionicons name="create-outline" size={17} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Profile card */}
      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatarRing, { borderColor: userProfile.verified ? colors.accent : colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
            <Ionicons name="person" size={34} color={colors.mutedForeground} />
          </View>
        </View>
        <Text style={[styles.profileName, { color: colors.foreground }]}>{userProfile.name}</Text>
        <View style={styles.profileCityRow}>
          <Ionicons name="location-outline" size={13} color={colors.mutedForeground} />
          <Text style={[styles.profileCity, { color: colors.mutedForeground }]}>{userProfile.city}</Text>
        </View>

        {!!userProfile.bio && (
          <Text style={[styles.profileBio, { color: colors.mutedForeground }]} numberOfLines={2}>{userProfile.bio}</Text>
        )}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.primary }]}>{matches.length}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Connections</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.stat}>
            <Ionicons
              name={userProfile.verified ? "shield-checkmark" : "shield-outline"}
              size={22}
              color={userProfile.verified ? colors.accent : colors.mutedForeground}
            />
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              {userProfile.verified ? "Verified" : "Unverified"}
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.primary }]}>
              {userProfile.ghostMode ? "👻" : userProfile.isLadiesMode ? "♀" : "—"}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              {userProfile.ghostMode ? "Ghost" : userProfile.isLadiesMode ? "Ladies" : "Standard"}
            </Text>
          </View>
        </View>
      </View>

      {/* Verification CTA */}
      {!userProfile.verified && (
        <TouchableOpacity
          style={[styles.verifyBanner, { backgroundColor: "rgba(255,138,61,0.1)", borderColor: colors.accent }]}
          onPress={() => router.push("/verify")}
        >
          <Ionicons name="shield-outline" size={20} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.verifyTitle, { color: colors.accent }]}>Get Verified</Text>
            <Text style={[styles.verifySubtitle, { color: colors.mutedForeground }]}>National ID + selfie + 5-sec video · 24h review</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.accent} />
        </TouchableOpacity>
      )}

      {/* Loyalty Points / NightMap Score */}
      <TouchableOpacity
        style={[styles.loyaltyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.push("/score")}
        activeOpacity={0.85}
      >
        <View style={styles.loyaltyRow}>
          <View style={[styles.loyaltyIcon, { backgroundColor: "rgba(255,138,61,0.12)" }]}>
            <Ionicons name="flash" size={16} color={colors.accent} />
          </View>
          <View style={styles.loyaltyInfo}>
            <Text style={[styles.loyaltyTitle, { color: colors.foreground }]}>NightMap Score</Text>
            <Text style={[styles.loyaltyTier, { color: colors.accent }]}>⚡ Silver Member · 340 pts</Text>
          </View>
          <View style={[styles.loyaltyBadge, { backgroundColor: "rgba(255,138,61,0.15)", borderColor: "rgba(255,138,61,0.3)" }]}>
            <Text style={[styles.loyaltyBadgeText, { color: colors.accent }]}>340</Text>
            <Text style={[styles.loyaltyBadgeSub, { color: colors.accent }]}>pts</Text>
          </View>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.accent, width: "68%" }]} />
        </View>
        <View style={styles.tierRow}>
          {["Bronze", "Silver", "Gold", "Platinum"].map((t, i) => (
            <Text
              key={t}
              style={[
                styles.tierLabel,
                { color: i === 1 ? colors.accent : colors.mutedForeground, fontFamily: i === 1 ? "Inter_700Bold" : "Inter_400Regular" },
              ]}
            >
              {t}
            </Text>
          ))}
        </View>
        <Text style={[styles.progressHint, { color: colors.mutedForeground }]}>160 pts to Gold · Earn by rating meetups & referring friends</Text>
      </TouchableOpacity>

      {/* VIP card */}
      <TouchableOpacity
        style={[styles.vipCard, { backgroundColor: "rgba(122,60,255,0.08)", borderColor: "rgba(122,60,255,0.3)" }]}
        onPress={() => router.push("/vip")}
        activeOpacity={0.85}
      >
        <View style={styles.vipLeft}>
          <Ionicons name="diamond" size={20} color="#7A3CFF" />
          <View>
            <Text style={[styles.vipTitle, { color: "#7A3CFF" }]}>NightMap VIP</Text>
            <Text style={[styles.vipSub, { color: colors.mutedForeground }]}>Unlimited connects · Priority listings · 0% platform fee</Text>
          </View>
        </View>
        <View style={[styles.vipPrice, { backgroundColor: "rgba(122,60,255,0.15)" }]}>
          <Text style={[styles.vipAmt, { color: "#7A3CFF" }]}>UGX 35k</Text>
          <Text style={[styles.vipPer, { color: "#7A3CFF" }]}>/mo</Text>
        </View>
      </TouchableOpacity>

      {/* Who Viewed Me */}
      <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>WHO VIEWED MY PROFILE</Text>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {([
          { name: "Amara", time: "2m ago", color: "#7A3CFF" },
          { name: "Leila", time: "1h ago", color: "#FF4E62" },
          { name: "Zara", time: "3h ago", color: "#1FBF6B" },
          { name: "Hidden User", time: "5h ago", color: "#6b6b8a", hidden: true },
        ] as const).map((v, i) => (
          <View key={i} style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.settingIcon, { backgroundColor: v.hidden ? colors.muted : `${v.color}20` }]}>
              {v.hidden
                ? <Ionicons name="eye-off-outline" size={17} color={colors.mutedForeground} />
                : <Text style={{ fontFamily: "Inter_700Bold", fontSize: 14, color: "#fff" }}>{v.name[0]}</Text>}
            </View>
            <Text style={[styles.settingLabel, { color: v.hidden ? colors.mutedForeground : colors.foreground }]}>
              {v.name}
            </Text>
            <Text style={[styles.settingValue, { color: colors.mutedForeground }]}>{v.time}</Text>
            {v.hidden && (
              <View style={[styles.vipLock, { backgroundColor: "rgba(122,60,255,0.12)" }]}>
                <Ionicons name="lock-closed" size={10} color="#7A3CFF" />
                <Text style={[styles.vipLockText, { color: "#7A3CFF" }]}>VIP</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Wallet — always visible, links to full wallet screen */}
      <TouchableOpacity
        style={[styles.walletCard, { backgroundColor: colors.card, borderColor: userProfile.isCompanion ? colors.primary : colors.border }]}
        onPress={() => router.push("/wallet")}
        activeOpacity={0.85}
      >
        <View style={styles.walletHeader}>
          <Ionicons name="wallet" size={18} color={userProfile.isCompanion ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.walletTitle, { color: colors.foreground }]}>Wallet</Text>
          <Ionicons name="chevron-forward" size={15} color={colors.mutedForeground} style={{ marginLeft: "auto" }} />
        </View>
        <View style={styles.walletStats}>
          {userProfile.isCompanion ? (
            <>
              <View style={styles.walletStat}>
                <Text style={[styles.walletAmount, { color: colors.primary }]}>{formatUGX(userProfile.totalEarnings)}</Text>
                <Text style={[styles.walletLabel, { color: colors.mutedForeground }]}>Total Earned</Text>
              </View>
              <View style={[styles.walletDivider, { backgroundColor: colors.border }]} />
              <View style={styles.walletStat}>
                <Text style={[styles.walletAmount, { color: colors.accent }]}>{formatUGX(userProfile.pendingPayout)}</Text>
                <Text style={[styles.walletLabel, { color: colors.mutedForeground }]}>Pending Payout</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.walletStat}>
                <Text style={[styles.walletAmount, { color: colors.foreground }]}>{formatUGX(userProfile.walletBalance)}</Text>
                <Text style={[styles.walletLabel, { color: colors.mutedForeground }]}>Balance</Text>
              </View>
              <View style={[styles.walletDivider, { backgroundColor: colors.border }]} />
              <View style={styles.walletStat}>
                <Text style={[styles.walletAmount, { color: "#1FBF6B" }]}>+Top Up</Text>
                <Text style={[styles.walletLabel, { color: colors.mutedForeground }]}>Add Funds</Text>
              </View>
            </>
          )}
        </View>
      </TouchableOpacity>

      {/* Bookings */}
      <TouchableOpacity
        style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.push("/bookings")}
        activeOpacity={0.8}
      >
        <SettingRow
          icon="calendar"
          iconBg="rgba(61,169,255,0.12)"
          iconColor="#3DA9FF"
          label={userProfile.isCompanion ? "Booking Requests" : "My Bookings"}
          value={userProfile.isCompanion ? "3 requests" : "1 active"}
          onPress={() => router.push("/bookings")}
        />
      </TouchableOpacity>

      {/* Mode settings */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow
          icon="moon"
          iconBg="rgba(34,197,94,0.12)"
          iconColor="#22c55e"
          label="Available Tonight"
          right={
            <Switch
              value={userProfile.availableTonight}
              onValueChange={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                toggleAvailability();
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          }
        />
        <SettingRow
          icon="eye-off"
          iconBg="rgba(107,107,138,0.15)"
          iconColor={colors.mutedForeground}
          label="Ghost Mode"
          value={userProfile.ghostMode ? "On" : "Off"}
          right={
            <Switch
              value={userProfile.ghostMode}
              onValueChange={(v) => updateProfile({ ghostMode: v })}
              trackColor={{ false: colors.border, true: colors.mutedForeground }}
              thumbColor="#fff"
            />
          }
        />
        <SettingRow
          icon="sparkles"
          iconBg="rgba(33,150,243,0.12)"
          iconColor="#2196f3"
          label="Ladies Mode"
          right={
            <Switch
              value={userProfile.isLadiesMode}
              onValueChange={(v) => updateProfile({ isLadiesMode: v })}
              trackColor={{ false: colors.border, true: "#2196f3" }}
              thumbColor="#fff"
            />
          }
        />
        <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
          <View style={[styles.settingIcon, { backgroundColor: colors.muted }]}>
            <Ionicons name="people" size={17} color={colors.primary} />
          </View>
          <Text style={[styles.settingLabel, { color: colors.foreground }]}>Mode</Text>
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeBtn, !userProfile.isCompanion && { backgroundColor: colors.primary }]}
              onPress={() => updateProfile({ isCompanion: false })}
            >
              <Text style={[styles.modeBtnText, { color: !userProfile.isCompanion ? "#fff" : colors.mutedForeground }]}>Seeker</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, userProfile.isCompanion && { backgroundColor: colors.primary }]}
              onPress={() => updateProfile({ isCompanion: true })}
            >
              <Text style={[styles.modeBtnText, { color: userProfile.isCompanion ? "#fff" : colors.mutedForeground }]}>Companion</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Safety */}
      <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>SAFETY</Text>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow
          icon="shield-checkmark"
          iconBg="rgba(31,191,107,0.12)"
          iconColor="#1FBF6B"
          label="Safety Hub"
          value="Panic · Check-In · Contacts"
          onPress={() => router.push("/safety")}
        />
        {!showContactInput ? (
          <SettingRow
            icon="person-outline"
            label="Trusted Contact"
            value={userProfile.trustedContact || "Not set"}
            onPress={() => setShowContactInput(true)}
          />
        ) : (
          <View style={[styles.settingRow, { borderBottomColor: colors.border, gap: 10 }]}>
            <View style={[styles.settingIcon, { backgroundColor: colors.muted }]}>
              <Ionicons name="person-outline" size={17} color={colors.primary} />
            </View>
            <TextInput
              style={[styles.contactInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
              placeholder="+256 700 000000"
              placeholderTextColor={colors.mutedForeground}
              value={contactInput}
              onChangeText={setContactInput}
              keyboardType="phone-pad"
              autoFocus
              onBlur={() => {
                updateProfile({ trustedContact: contactInput });
                setShowContactInput(false);
              }}
            />
          </View>
        )}
        <SettingRow
          icon="shield-checkmark-outline"
          iconBg="rgba(34,197,94,0.12)"
          iconColor="#22c55e"
          label="Safety Check-In"
          onPress={handleSafeCheckIn}
        />
        <SettingRow
          icon="time-outline"
          label="60-Min Auto Check"
          value="Enabled"
        />
      </View>

      {/* Panic button */}
      <TouchableOpacity
        style={[
          styles.panicBtn,
          {
            backgroundColor: panicActive ? "#FF4E62" : "rgba(255,78,98,0.1)",
            borderColor: "#FF4E62",
          },
        ]}
        onPress={handlePanic}
        onLongPress={handlePanic}
      >
        <Ionicons name="warning" size={20} color={panicActive ? "#fff" : "#FF4E62"} />
        <View>
          <Text style={[styles.panicTitle, { color: panicActive ? "#fff" : "#FF4E62" }]}>
            {panicActive ? "ALERT SENT" : "Panic Button"}
          </Text>
          <Text style={[styles.panicSubtitle, { color: panicActive ? "rgba(255,255,255,0.8)" : "rgba(255,78,98,0.7)" }]}>
            Hold to send emergency alert + GPS
          </Text>
        </View>
      </TouchableOpacity>

      {/* App settings */}
      <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>SETTINGS</Text>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow
          icon="lock-closed-outline"
          iconBg="rgba(61,169,255,0.12)"
          iconColor="#3DA9FF"
          label="Privacy"
          value={privHideFromSearch ? "Restricted" : "Standard"}
          onPress={() => setShowPrivacy(true)}
        />
        <SettingRow
          icon="notifications-outline"
          iconBg="rgba(255,138,61,0.12)"
          iconColor="#FF8A3D"
          label="Notifications"
          value={[notifMessages, notifBookings, notifDeals, notifLive, notifRadio].filter(Boolean).length + " on"}
          onPress={() => setShowNotifs(true)}
        />
        <SettingRow
          icon="location-outline"
          iconBg="rgba(31,191,107,0.12)"
          iconColor="#1FBF6B"
          label="City"
          value={detectStatus === "detecting" ? "Detecting…" : detectStatus === "denied" ? "Permission denied" : userProfile.city}
          onPress={detectCity}
        />
        <SettingRow
          icon="language-outline"
          iconBg="rgba(122,60,255,0.12)"
          iconColor="#7A3CFF"
          label="Language"
          value={language}
          onPress={() => setShowLanguage(true)}
        />
      </View>

      <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>MORE</Text>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow
          icon="gift-outline"
          iconBg="rgba(255,138,61,0.12)"
          iconColor="#FF8A3D"
          label="Refer & Earn"
          value="200 pts + UGX 5k per invite"
          onPress={() => router.push("/referral")}
        />
        <SettingRow
          icon="share-social-outline"
          iconBg="rgba(255,78,98,0.12)"
          iconColor="#FF4E62"
          label="Share NightMap"
          onPress={handleShare}
        />
        <SettingRow
          icon="star-outline"
          iconBg="rgba(255,196,0,0.12)"
          iconColor="#FFC400"
          label="Rate the App"
          onPress={() => Linking.openURL("https://nightmap.itsolutionsuganda.com")}
        />
        <SettingRow
          icon="help-circle-outline"
          iconBg="rgba(61,169,255,0.12)"
          iconColor="#3DA9FF"
          label="Support"
          value="24/7"
          onPress={() => setShowSupport(true)}
        />
        <SettingRow
          icon="document-text-outline"
          iconBg="rgba(170,179,197,0.12)"
          iconColor="#AAB3C5"
          label="Terms of Service"
          onPress={() => Linking.openURL("https://nightmap.itsolutionsuganda.com/terms")}
        />
        <SettingRow
          icon="shield-outline"
          iconBg="rgba(170,179,197,0.12)"
          iconColor="#AAB3C5"
          label="Privacy Policy"
          onPress={() => Linking.openURL("https://nightmap.itsolutionsuganda.com/privacy")}
        />
      </View>

      <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>ACCOUNT</Text>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow
          icon="log-out-outline"
          label="Sign Out"
          danger
          onPress={handleSignOut}
        />
        <SettingRow
          icon="trash-outline"
          label="Delete Account"
          danger
          onPress={handleDeleteAccount}
        />
      </View>

      <Text style={[styles.version, { color: colors.mutedForeground }]}>NightMap v1.0 · Uganda · Kenya · Tanzania</Text>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 26 },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  profileCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    paddingVertical: 22,
    paddingHorizontal: 20,
    marginBottom: 14,
    gap: 5,
  },
  avatarRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: "center",
    justifyContent: "center",
  },
  profileName: { fontFamily: "Inter_700Bold", fontSize: 20 },
  profileCityRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  profileCity: { fontFamily: "Inter_400Regular", fontSize: 13 },
  statsRow: { flexDirection: "row", alignItems: "center", marginTop: 12, width: "100%" },
  stat: { flex: 1, alignItems: "center", gap: 4 },
  statNum: { fontFamily: "Inter_700Bold", fontSize: 20 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11 },
  statDivider: { width: 1, height: 34 },
  verifyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  verifyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  verifySubtitle: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  walletCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 14,
    gap: 12,
  },
  walletHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  walletTitle: { fontFamily: "Inter_700Bold", fontSize: 16 },
  walletStats: { flexDirection: "row", alignItems: "center" },
  walletStat: { flex: 1, alignItems: "center", gap: 4 },
  walletAmount: { fontFamily: "Inter_700Bold", fontSize: 18 },
  walletLabel: { fontFamily: "Inter_400Regular", fontSize: 12 },
  walletDivider: { width: 1, height: 36 },
  payoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  payoutBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  sectionHeader: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 1,
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  section: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 14,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 11,
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  settingLabel: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 14 },
  settingRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  settingValue: { fontFamily: "Inter_400Regular", fontSize: 13 },
  modeToggle: {
    flexDirection: "row",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(44,40,69,0.5)",
  },
  modeBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  modeBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  contactInput: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  panicBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
  },
  panicTitle: { fontFamily: "Inter_700Bold", fontSize: 16 },
  panicSubtitle: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  version: { textAlign: "center", fontSize: 12, fontFamily: "Inter_400Regular", paddingTop: 4 },
  loyaltyCard: {
    marginHorizontal: 16, marginBottom: 14, borderRadius: 16, borderWidth: 1, padding: 14, gap: 10,
  },
  loyaltyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  loyaltyIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  loyaltyInfo: { flex: 1 },
  loyaltyTitle: { fontFamily: "Inter_700Bold", fontSize: 15 },
  loyaltyTier: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
  loyaltyBadge: {
    alignItems: "center", justifyContent: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1,
  },
  loyaltyBadgeText: { fontFamily: "Inter_700Bold", fontSize: 18, lineHeight: 20 },
  loyaltyBadgeSub: { fontFamily: "Inter_400Regular", fontSize: 10 },
  progressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3 },
  tierRow: { flexDirection: "row", justifyContent: "space-between" },
  tierLabel: { fontSize: 10 },
  progressHint: { fontFamily: "Inter_400Regular", fontSize: 11 },
  vipCard: {
    marginHorizontal: 16, marginBottom: 14, borderRadius: 16, borderWidth: 1,
    flexDirection: "row", alignItems: "center", padding: 14, gap: 10,
  },
  vipLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  vipTitle: { fontFamily: "Inter_700Bold", fontSize: 15 },
  vipSub: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 },
  vipPrice: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, alignItems: "center",
  },
  vipAmt: { fontFamily: "Inter_700Bold", fontSize: 14 },
  vipPer: { fontFamily: "Inter_400Regular", fontSize: 10 },
  vipLock: {
    flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8,
  },
  vipLockText: { fontFamily: "Inter_700Bold", fontSize: 10 },

  profileBio: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", lineHeight: 18, paddingHorizontal: 10 },

  editBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  editSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1,
    padding: 22, gap: 14,
  },
  editHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  editTitle: { fontFamily: "Inter_700Bold", fontSize: 20 },
  editLabel: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 0.8 },
  editInput: {
    borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: "Inter_400Regular", fontSize: 15,
  },
  editBioInput: { minHeight: 80, textAlignVertical: "top" },
  editCityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  editCityChip: { borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 13, paddingVertical: 7 },
  editCityText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  editSaveBtn: { borderRadius: 16, paddingVertical: 15, alignItems: "center", marginTop: 4 },
  editSaveBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },

  settingModalRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingModalLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  settingModalSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },

  langRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 14, borderRadius: 14, borderWidth: 1.5,
  },
  langLabel: { fontFamily: "Inter_600SemiBold", fontSize: 15 },

  supportRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 16, borderWidth: 1,
  },
  supportIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});

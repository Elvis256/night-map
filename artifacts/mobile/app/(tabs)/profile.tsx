import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import {
  getGetProfileViewsQueryKey,
  getGetScoreQueryKey,
  getListStoriesQueryKey,
  postStory,
  safetyCheckIn,
  triggerPanic,
  uploadPhoto,
  useGetProfileViews,
  useGetScore,
} from "@workspace/api-client-react";
import { useColors } from "@workspace/nightmap-design-system/hooks/use-colors";
import { withAlpha } from "@workspace/nightmap-design-system/lib/native-theme";
import { useLocationCity } from "@/hooks/useLocationCity";
import { relativeTime, useApp, type AvailabilityStatus } from "@/context/AppContext";
import { errorMessage } from "@/lib/api";

const MENU_OPTIONS = ["Dinner Date", "Nightclub", "Movie Night", "Pool/Swim", "Massage", "Conversation & Drinks", "City Tour", "Events", "Travel Companion"];
const DEAL_OPTIONS = [15, 20, 30, 40];
const LANGUAGES = ["English", "Swahili", "French", "Luganda"];
const TIER_ORDER = ["Bronze", "Silver", "Gold", "Platinum"];

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
  const colors = useColors("dark");
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
  const colors = useColors("dark");
  const insets = useSafeAreaInsets();
  const {
    userProfile, toggleAvailability, updateProfile, updateCompanionProfile, matches, bookings,
    signOut, deleteAccount, refreshMe, coords, invalidate,
  } = useApp();
  const [panicActive, setPanicActive] = useState(false);
  const [contactInput, setContactInput] = useState(userProfile.trustedContact);
  const [showContactInput, setShowContactInput] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState(userProfile.name);
  const [editBio, setEditBio] = useState(userProfile.bio ?? "");
  const [editCity, setEditCity] = useState(userProfile.city);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const scoreQuery = useGetScore({ query: { queryKey: getGetScoreQueryKey(), staleTime: 30_000 } });
  const viewsQuery = useGetProfileViews({ query: { queryKey: getGetProfileViewsQueryKey(), staleTime: 30_000 } });
  const score = scoreQuery.data;
  const tierIdx = Math.max(0, TIER_ORDER.indexOf(score?.tier ?? "Bronze"));

  const fail = (err: unknown) => Alert.alert("Something went wrong", errorMessage(err));
  const apply = (updates: Parameters<typeof updateProfile>[0]) => updateProfile(updates).catch(fail);

  const saveEdit = async () => {
    setSaving(true);
    try {
      await updateProfile({
        name: editName.trim() || userProfile.name,
        bio: editBio.trim(),
        city: editCity.trim() || userProfile.city,
      });
      setShowEdit(false);
    } catch (err) {
      fail(err);
    } finally {
      setSaving(false);
    }
  };
  // GPS city detection
  const { detect: detectCity, status: detectStatus } = useLocationCity((city) => {
    apply({ city });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  });
  // Settings modals
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const [showListing, setShowListing] = useState(false);
  // Preferences live on the server; local state mirrors the profile for snappy switches.
  const [privacy, setPrivacy] = useState(userProfile.privacy);
  const [notifs, setNotifs] = useState(userProfile.notificationPrefs);
  useEffect(() => { setPrivacy(userProfile.privacy); }, [userProfile.privacy]);
  useEffect(() => { setNotifs(userProfile.notificationPrefs); }, [userProfile.notificationPrefs]);
  useEffect(() => { setContactInput(userProfile.trustedContact); }, [userProfile.trustedContact]);
  const setPrivacyKey = (key: keyof typeof privacy, v: boolean) => {
    const next = { ...privacy, [key]: v };
    setPrivacy(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    apply({ privacy: next });
  };
  const setNotifKey = (key: keyof typeof notifs, v: boolean) => {
    const next = { ...notifs, [key]: v };
    setNotifs(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    apply({ notificationPrefs: next });
  };
  const language = userProfile.language;

  // Companion listing
  const cp = userProfile.companionProfile;
  const [rateInput, setRateInput] = useState(String(cp?.rate ?? 100000));
  const [minHoursInput, setMinHoursInput] = useState(String(cp?.minBookingHours ?? 2));
  const [storyText, setStoryText] = useState("");
  const [postingStory, setPostingStory] = useState(false);
  const [listingBusy, setListingBusy] = useState(false);
  useEffect(() => {
    setRateInput(String(cp?.rate ?? 100000));
    setMinHoursInput(String(cp?.minBookingHours ?? 2));
  }, [cp?.rate, cp?.minBookingHours]);
  const runListing = async (updates: Parameters<typeof updateCompanionProfile>[0]) => {
    setListingBusy(true);
    try {
      await updateCompanionProfile(updates);
      Haptics.selectionAsync();
    } catch (err) {
      fail(err);
    } finally {
      setListingBusy(false);
    }
  };
  const toggleMenuItem = (item: string) => {
    const current = cp?.menu ?? [];
    const next = current.includes(item) ? current.filter((m) => m !== item) : [...current, item];
    void runListing({ menu: next });
  };
  const saveRate = async () => {
    const rate = Math.max(0, Math.round(Number(rateInput.replace(/[^0-9]/g, "")) || 0));
    const minBookingHours = Math.min(24, Math.max(1, Math.round(Number(minHoursInput) || 1)));
    await runListing({ rate, minBookingHours });
    setShowListing(false);
  };
  const handlePostStory = async () => {
    if (!storyText.trim() || postingStory) return;
    setPostingStory(true);
    try {
      await postStory({ text: storyText.trim() });
      setStoryText("");
      invalidate([getListStoriesQueryKey({ city: userProfile.city })]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Story posted", "Your status is visible to seekers for the next 24 hours.");
    } catch (err) {
      fail(err);
    } finally {
      setPostingStory(false);
    }
  };

  const handlePickPhoto = async () => {
    if (uploadingPhoto) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Photo access needed", "Enable photo library access in Settings to add a profile photo.");
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], base64: true, quality: 0.7, allowsEditing: true, aspect: [1, 1] });
      if (result.canceled || !result.assets[0]?.base64) return;
      setUploadingPhoto(true);
      await uploadPhoto({ dataBase64: result.assets[0].base64, contentType: "image/jpeg", isPrimary: true });
      await refreshMe();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      fail(err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
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
            try {
              await deleteAccount();
              router.replace("/auth/register");
            } catch (err) {
              fail(err);
            }
          },
        },
      ]
    );
  };
  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join me on NightMap — East Africa's social companionship platform 🌙\nUse my invite code ${userProfile.referralCode}\nnightmap.itsolutionsuganda.com`,
        title: "NightMap",
      });
    } catch (_) {}
  };
  const handlePanic = async () => {
    if (panicActive) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setPanicActive(true);
    try {
      const event = await triggerPanic({ lat: coords?.lat, lng: coords?.lng });
      Alert.alert(
        "PANIC ALERT SENT",
        event.contactsNotified > 0
          ? `Emergency alert sent to ${event.contactsNotified} trusted contact${event.contactsNotified > 1 ? "s" : ""} and the NightMap safety team.\n\nYour GPS location is being shared now. Stay safe.`
          : "Emergency alert sent to the NightMap safety team.\n\nAdd a trusted contact so they are alerted too.",
        [{ text: "I am Safe", style: "destructive", onPress: () => setPanicActive(false) }]
      );
    } catch (err) {
      setPanicActive(false);
      Alert.alert("Alert not sent", errorMessage(err, "Could not reach NightMap. Call your emergency contact directly."));
    }
  };
  const handleSafeCheckIn = async () => {
    try {
      const event = await safetyCheckIn({ lat: coords?.lat, lng: coords?.lng });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Safety Check-In",
        event.contactsNotified > 0
          ? `Your location has been shared with ${event.contactsNotified} trusted contact${event.contactsNotified > 1 ? "s" : ""}.`
          : "Check-in recorded. Add a trusted contact so they receive your location.",
        [{ text: "OK" }],
      );
    } catch (err) {
      fail(err);
    }
  };

  const activeBookings = bookings.filter(b => b.status === "active").length;
  const pendingRequests = bookings.filter(b => b.status === "pending" || b.status === "upcoming").length;
  const verifyBanner =
    userProfile.verificationStatus === "pending"
      ? { title: "Verification under review", sub: "Our team reviews within 24 hours", icon: "time-outline" as const }
      : userProfile.verificationStatus === "rejected"
        ? { title: "Resubmit verification", sub: "Your last submission wasn't approved · tap to retry", icon: "alert-circle-outline" as const }
        : { title: "Get Verified", sub: "National ID + selfie + 5-sec video · 24h review", icon: "shield-outline" as const };
  const availability: AvailabilityStatus = cp?.availabilityStatus ?? "offline";
  const dealActive = !!cp && cp.dealDiscount > 0;

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
            maxLength={300}
            multiline
            numberOfLines={3}
          />
          <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>CITY</Text>
          <TextInput
            style={[styles.editInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
            value={editCity}
            onChangeText={setEditCity}
            placeholder="e.g. Kampala"
            placeholderTextColor={colors.mutedForeground}
            maxLength={30}
            autoCapitalize="words"
          />
          <TouchableOpacity
            style={[styles.editSaveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
            onPress={saveEdit}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.editSaveBtnText}>Save Changes</Text>}
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
    {/* ── Listing (rate) Modal ───────────────────────────── */}
    <Modal visible={showListing} transparent animationType="slide" onRequestClose={() => setShowListing(false)}>
      <Pressable style={styles.editBackdrop} onPress={() => setShowListing(false)}>
        <Pressable style={[styles.editSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.editHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.editTitle, { color: colors.foreground }]}>Rate & minimum</Text>
          <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>HOURLY RATE (UGX)</Text>
          <TextInput
            style={[styles.editInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
            value={rateInput}
            onChangeText={setRateInput}
            keyboardType="number-pad"
            placeholder="150000"
            placeholderTextColor={colors.mutedForeground}
          />
          <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>MINIMUM BOOKING (HOURS)</Text>
          <TextInput
            style={[styles.editInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
            value={minHoursInput}
            onChangeText={setMinHoursInput}
            keyboardType="number-pad"
            placeholder="2"
            placeholderTextColor={colors.mutedForeground}
          />
          <TouchableOpacity style={[styles.editSaveBtn, { backgroundColor: "#1FBF6B", opacity: listingBusy ? 0.7 : 1 }]} onPress={saveRate} disabled={listingBusy}>
            {listingBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.editSaveBtnText}>Save listing</Text>}
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
            { key: "showDistance", label: "Show my distance", sub: "Others see how far you are" },
            { key: "showOnline", label: "Show online status", sub: "Others can see when you're active" },
            { key: "allowSaves", label: "Allow profile saves", sub: "Let people save your profile" },
            { key: "hideFromSearch", label: "Hide from search", sub: "Only visible to your connections" },
          ] as const).map((item) => (
            <View key={item.key} style={[styles.settingModalRow, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingModalLabel, { color: colors.foreground }]}>{item.label}</Text>
                <Text style={[styles.settingModalSub, { color: colors.mutedForeground }]}>{item.sub}</Text>
              </View>
              <Switch
                value={privacy[item.key]}
                onValueChange={(v) => setPrivacyKey(item.key, v)}
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
            { key: "messages", label: "New messages", sub: "Alert when someone messages you", color: "#FF4E62" },
            { key: "bookings", label: "Booking requests", sub: "Notify me of new booking activity", color: "#FF8A3D" },
            { key: "deals", label: "Tonight's deals", sub: "Flash deals and saved companions going live", color: "#FFC400" },
            { key: "live", label: "Live streams", sub: "When a companion you like goes live", color: "#7A3CFF" },
            { key: "radio", label: "Radio updates", sub: "New lounges and radio sessions", color: "#1FBF6B" },
          ] as const).map((item) => (
            <View key={item.key} style={[styles.settingModalRow, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingModalLabel, { color: colors.foreground }]}>{item.label}</Text>
                <Text style={[styles.settingModalSub, { color: colors.mutedForeground }]}>{item.sub}</Text>
              </View>
              <Switch
                value={notifs[item.key]}
                onValueChange={(v) => setNotifKey(item.key, v)}
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
                onPress={() => { apply({ language: lang }); Haptics.selectionAsync(); setShowLanguage(false); }}
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
            { icon: "flag-outline", label: "Report a Problem", sub: "Safety issues, bugs, billing", color: "#FF4E62", action: () => router.push("/safety") },
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
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
        <TouchableOpacity style={[styles.editBtn, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={() => { setEditName(userProfile.name); setEditBio(userProfile.bio ?? ""); setEditCity(userProfile.city); setShowEdit(true); }}>
          <Ionicons name="create-outline" size={17} color={colors.foreground} />
        </TouchableOpacity>
      </View>
      {/* Profile card */}
      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.8} disabled={uploadingPhoto}>
          <View style={[styles.avatarRing, { borderColor: userProfile.verified ? colors.accent : colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: userProfile.photoUrl ? colors.muted : userProfile.avatarColor, overflow: "hidden" }]}>
              {uploadingPhoto ? (
                <ActivityIndicator color="#fff" />
              ) : userProfile.photoUrl ? (
                <Image source={{ uri: userProfile.photoUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarInitial}>{userProfile.name[0]?.toUpperCase() ?? "?"}</Text>
              )}
            </View>
          </View>
          <View style={[styles.avatarEditBadge, { backgroundColor: colors.primary, borderColor: colors.card }]}>
            <Ionicons name="camera" size={11} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={[styles.profileName, { color: colors.foreground }]}>{userProfile.name}</Text>
        <View style={styles.profileCityRow}>
          <Ionicons name="location-outline" size={13} color={colors.mutedForeground} />
          <Text style={[styles.profileCity, { color: colors.mutedForeground }]}>{userProfile.city} · {userProfile.phone}</Text>
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
          <Ionicons name={verifyBanner.icon} size={20} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.verifyTitle, { color: colors.accent }]}>{verifyBanner.title}</Text>
            <Text style={[styles.verifySubtitle, { color: colors.mutedForeground }]}>{verifyBanner.sub}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.accent} />
        </TouchableOpacity>
      )}
      {/* Companion listing */}
      {userProfile.isCompanion && (
        <>
          <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>MY LISTING</Text>
          {((cp?.menu.length ?? 0) === 0 || !userProfile.photoUrl) && (
            <TouchableOpacity
              style={{ marginHorizontal: 16, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, backgroundColor: "rgba(31,191,107,0.08)", borderColor: "rgba(31,191,107,0.4)" }}
              onPress={() => router.push("/companion-setup")}
              activeOpacity={0.85}
            >
              <Ionicons name="sparkles" size={20} color="#1FBF6B" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#1FBF6B", fontFamily: "Inter_700Bold", fontSize: 14 }}>Complete your listing</Text>
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 }}>
                  {!userProfile.photoUrl ? "Add a photo" : "Add your menu"} · listings with a photo and menu get far more requests
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#1FBF6B" />
            </TouchableOpacity>
          )}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, padding: 14, gap: 12 }]}>
            <View>
              <Text style={[styles.listingLabel, { color: colors.mutedForeground }]}>AVAILABILITY</Text>
              <View style={styles.segment}>
                {([["now", "Available now", "#22c55e"], ["tonight", "Tonight", "#FF8A3D"], ["offline", "Offline", "#6b6b8a"]] as const).map(([value, label, color]) => (
                  <TouchableOpacity
                    key={value}
                    style={[styles.segmentBtn, { backgroundColor: availability === value ? `${color}22` : colors.muted, borderColor: availability === value ? color : colors.border }]}
                    onPress={() => runListing({ availabilityStatus: value })}
                    disabled={listingBusy}
                  >
                    <Text style={[styles.segmentText, { color: availability === value ? color : colors.mutedForeground }]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TouchableOpacity style={[styles.listingRow, { borderColor: colors.border, backgroundColor: colors.muted }]} onPress={() => setShowListing(true)}>
              <Ionicons name="pricetag-outline" size={17} color={colors.primary} />
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>Rate</Text>
              <Text style={[styles.settingValue, { color: colors.mutedForeground }]}>
                UGX {(cp?.rate ?? 0).toLocaleString()}/hr · min {cp?.minBookingHours ?? 1}h
              </Text>
              <Ionicons name="chevron-forward" size={15} color={colors.mutedForeground} />
            </TouchableOpacity>
            <View>
              <Text style={[styles.listingLabel, { color: colors.mutedForeground }]}>THE MENU · what you offer</Text>
              <View style={styles.chipWrap}>
                {MENU_OPTIONS.map((item) => {
                  const on = (cp?.menu ?? []).includes(item);
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[styles.menuChip, { backgroundColor: on ? "rgba(255,78,98,0.12)" : colors.muted, borderColor: on ? colors.primary : colors.border }]}
                      onPress={() => toggleMenuItem(item)}
                      disabled={listingBusy}
                    >
                      <Text style={[styles.menuChipText, { color: on ? colors.primary : colors.mutedForeground }]}>{item}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View style={[styles.listingRow, { borderColor: dealActive ? "#FF8A3D" : colors.border, backgroundColor: dealActive ? "rgba(255,138,61,0.08)" : colors.muted }]}>
              <Ionicons name="flash" size={17} color="#FF8A3D" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>Tonight's deal</Text>
                <Text style={[styles.settingValue, { color: colors.mutedForeground }]}>
                  {dealActive ? `${cp?.dealDiscount}% off until midnight` : "Offer a discount tonight only"}
                </Text>
              </View>
              <Switch
                value={dealActive}
                onValueChange={(v) => runListing({ dealActive: v, dealDiscount: v ? (cp?.dealDiscount || 20) : 0 })}
                trackColor={{ false: colors.border, true: "#FF8A3D" }}
                thumbColor="#fff"
                disabled={listingBusy}
              />
            </View>
            {dealActive && (
              <View style={styles.chipWrap}>
                {DEAL_OPTIONS.map((pct) => (
                  <TouchableOpacity
                    key={pct}
                    style={[styles.menuChip, { backgroundColor: cp?.dealDiscount === pct ? "rgba(255,138,61,0.15)" : colors.muted, borderColor: cp?.dealDiscount === pct ? "#FF8A3D" : colors.border }]}
                    onPress={() => runListing({ dealActive: true, dealDiscount: pct })}
                    disabled={listingBusy}
                  >
                    <Text style={[styles.menuChipText, { color: cp?.dealDiscount === pct ? "#FF8A3D" : colors.mutedForeground }]}>{pct}% off</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View>
              <Text style={[styles.listingLabel, { color: colors.mutedForeground }]}>POST A STORY · 24h status</Text>
              <View style={styles.storyRow}>
                <TextInput
                  style={[styles.storyInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
                  placeholder="e.g. Available tonight from 8pm 🌙"
                  placeholderTextColor={colors.mutedForeground}
                  value={storyText}
                  onChangeText={setStoryText}
                  maxLength={140}
                />
                <TouchableOpacity
                  style={[styles.storyBtn, { backgroundColor: storyText.trim() ? colors.primary : colors.muted }]}
                  onPress={handlePostStory}
                  disabled={!storyText.trim() || postingStory}
                >
                  {postingStory ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={16} color={storyText.trim() ? "#fff" : colors.mutedForeground} />}
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.goLiveBtn, { backgroundColor: "rgba(255,78,98,0.12)", borderColor: "rgba(255,78,98,0.4)" }]}
              onPress={() => router.push({ pathname: "/live", params: { mode: "broadcast" } })}
            >
              <View style={styles.goLiveDot} />
              <Text style={[styles.goLiveText, { color: colors.primary }]}>Go live</Text>
              <Text style={[styles.settingValue, { color: colors.mutedForeground }]}>Stream to seekers in {userProfile.city}</Text>
            </TouchableOpacity>
          </View>
        </>
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
            <Text style={[styles.loyaltyTier, { color: colors.accent }]}>⚡ {score?.tier ?? "Bronze"} Member · {score?.points ?? userProfile.loyaltyPoints} pts</Text>
          </View>
          <View style={[styles.loyaltyBadge, { backgroundColor: "rgba(255,138,61,0.15)", borderColor: "rgba(255,138,61,0.3)" }]}>
            <Text style={[styles.loyaltyBadgeText, { color: colors.accent }]}>{score?.points ?? userProfile.loyaltyPoints}</Text>
            <Text style={[styles.loyaltyBadgeSub, { color: colors.accent }]}>pts</Text>
          </View>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.accent, width: `${Math.round((score?.progress ?? 0) * 100)}%` }]} />
        </View>
        <View style={styles.tierRow}>
          {TIER_ORDER.map((t, i) => (
            <Text
              key={t}
              style={[
                styles.tierLabel,
                { color: i === tierIdx ? colors.accent : colors.mutedForeground, fontFamily: i === tierIdx ? "Inter_700Bold" : "Inter_400Regular" },
              ]}
            >
              {t}
            </Text>
          ))}
        </View>
        <Text style={[styles.progressHint, { color: colors.mutedForeground }]}>
          {score?.nextTier ? `${score.ptsToNext} pts to ${score.nextTier} · ` : "Top tier reached · "}Earn by rating meetups & referring friends
        </Text>
      </TouchableOpacity>
      {/* Packages card */}
      <TouchableOpacity
        style={[styles.vipCard, { backgroundColor: withAlpha(colors.accent, 0.1), borderColor: withAlpha(colors.accent, 0.3) }]}
        onPress={() => router.push("/vip")}
        activeOpacity={0.85}
      >
        <View style={styles.vipLeft}>
          <Ionicons name={userProfile.isCompanion ? "trending-up-outline" : "diamond"} size={20} color={colors.accent} />
          <View>
            <Text style={[styles.vipTitle, { color: colors.accent }]}>
              {userProfile.isCompanion ? "Featured placement" : "High-End Access"}
            </Text>
            <Text style={[styles.vipSub, { color: colors.mutedForeground }]}>
              {userProfile.isCompanion ? "Free basic listing · Optional boost" : "Free browsing · Premium access"}
            </Text>
          </View>
        </View>
        <View style={[styles.vipPrice, { backgroundColor: withAlpha(colors.accent, 0.15) }]}>
          <Text style={[styles.vipAmt, { color: colors.accent }]}>
            {userProfile.isCompanion ? "UGX 100k" : "UGX 20k"}
          </Text>
          <Text style={[styles.vipPer, { color: colors.accent }]}>
            {userProfile.isCompanion ? "/wk" : "/mo"}
          </Text>
        </View>
      </TouchableOpacity>
      {/* Who Viewed Me */}
      <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>WHO VIEWED MY PROFILE</Text>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {viewsQuery.isLoading && <ActivityIndicator color={colors.primary} style={{ paddingVertical: 14 }} />}
        {!viewsQuery.isLoading && (viewsQuery.data ?? []).length === 0 && (
          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.settingValue, { color: colors.mutedForeground }]}>No profile views yet</Text>
          </View>
        )}
        {(viewsQuery.data ?? []).slice(0, 6).map((v) => (
          <TouchableOpacity
            key={v.id}
            style={[styles.settingRow, { borderBottomColor: colors.border }]}
            onPress={() => !v.hidden && v.viewerId && router.push(`/companion/${v.viewerId}`)}
            activeOpacity={v.hidden ? 1 : 0.7}
          >
            <View style={[styles.settingIcon, { backgroundColor: v.hidden ? colors.muted : v.viewerColor }]}>
              {v.hidden
                ? <Ionicons name="eye-off-outline" size={17} color={colors.mutedForeground} />
                : <Text style={{ fontFamily: "Inter_700Bold", fontSize: 14, color: "#fff" }}>{v.viewerName[0]}</Text>}
            </View>
            <Text style={[styles.settingLabel, { color: v.hidden ? colors.mutedForeground : colors.foreground }]}>
              {v.viewerName}
            </Text>
            <Text style={[styles.settingValue, { color: colors.mutedForeground }]}>{relativeTime(v.viewedAt)}</Text>
            {v.hidden && (
              <View style={[styles.vipLock, { backgroundColor: "rgba(122,60,255,0.12)" }]}>
                <Ionicons name="eye-off" size={10} color="#7A3CFF" />
                <Text style={[styles.vipLockText, { color: "#7A3CFF" }]}>Ghost</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
      {/* Wallet */}
      <TouchableOpacity
        style={[styles.walletCard, { backgroundColor: colors.card, borderColor: userProfile.isCompanion ? colors.primary : colors.border }]}
        onPress={() => router.push("/wallet")}
        activeOpacity={0.85}
      >
        <View style={styles.walletHeader}>
          <Ionicons name="wallet" size={18} color={userProfile.isCompanion ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.walletTitle, { color: colors.foreground }]}>
            {userProfile.isCompanion ? "Earnings & payouts" : "Wallet"}
          </Text>
          <Ionicons name="chevron-forward" size={15} color={colors.mutedForeground} style={{ marginLeft: "auto" }} />
        </View>
        <View style={styles.walletStats}>
          <Text style={[styles.walletLabel, { color: colors.mutedForeground }]}>
            Meetup totals and history · in-app payments not connected yet
          </Text>
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
          value={
            activeBookings > 0
              ? `${activeBookings} active`
              : pendingRequests > 0
                ? `${pendingRequests} ${userProfile.isCompanion ? "request" : "upcoming"}${pendingRequests > 1 ? "s" : ""}`
                : `${bookings.length} total`
          }
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
                toggleAvailability().catch(fail);
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
              onValueChange={(v) => apply({ ghostMode: v })}
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
              onValueChange={(v) => apply({ isLadiesMode: v })}
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
              onPress={() => apply({ isCompanion: false })}
            >
              <Text style={[styles.modeBtnText, { color: !userProfile.isCompanion ? "#fff" : colors.mutedForeground }]}>Seeker</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, userProfile.isCompanion && { backgroundColor: colors.primary }]}
              onPress={() => apply({ isCompanion: true })}
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
                apply({ trustedContact: contactInput });
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
            Tap to send emergency alert + GPS
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
          value={privacy.hideFromSearch ? "Restricted" : "Standard"}
          onPress={() => setShowPrivacy(true)}
        />
        <SettingRow
          icon="notifications-outline"
          iconBg="rgba(255,138,61,0.12)"
          iconColor="#FF8A3D"
          label="Notifications"
          value={Object.values(notifs).filter(Boolean).length + " on"}
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
          value="+200 pts per invite"
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
  avatarImage: { width: "100%", height: "100%" },
  avatarInitial: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 28 },
  avatarEditBadge: {
    position: "absolute", bottom: 2, right: 2, width: 24, height: 24, borderRadius: 12,
    alignItems: "center", justifyContent: "center", borderWidth: 2,
  },
  listingLabel: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1, marginBottom: 8 },
  segment: { flexDirection: "row", gap: 8 },
  segmentBtn: { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 10, alignItems: "center" },
  segmentText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  listingRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  menuChip: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  menuChipText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  storyRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  storyInput: { flex: 1, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontFamily: "Inter_400Regular", fontSize: 13 },
  storyBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  goLiveBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 12 },
  goLiveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF4E62" },
  goLiveText: { fontFamily: "Inter_700Bold", fontSize: 14 },
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

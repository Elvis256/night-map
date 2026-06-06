import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
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
      <View style={[styles.settingIcon, { backgroundColor: iconBg ?? (danger ? "rgba(255,77,77,0.12)" : colors.muted) }]}>
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
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
        <TouchableOpacity style={[styles.editBtn, { borderColor: colors.border, backgroundColor: colors.card }]}>
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
          style={[styles.verifyBanner, { backgroundColor: "rgba(245,166,35,0.1)", borderColor: colors.accent }]}
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

      {/* Companion wallet */}
      {userProfile.isCompanion && (
        <View style={[styles.walletCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
          <View style={styles.walletHeader}>
            <Ionicons name="wallet" size={18} color={colors.primary} />
            <Text style={[styles.walletTitle, { color: colors.foreground }]}>Wallet</Text>
          </View>
          <View style={styles.walletStats}>
            <View style={styles.walletStat}>
              <Text style={[styles.walletAmount, { color: colors.primary }]}>{formatUGX(userProfile.totalEarnings)}</Text>
              <Text style={[styles.walletLabel, { color: colors.mutedForeground }]}>Total Earned</Text>
            </View>
            <View style={[styles.walletDivider, { backgroundColor: colors.border }]} />
            <View style={styles.walletStat}>
              <Text style={[styles.walletAmount, { color: colors.accent }]}>{formatUGX(userProfile.pendingPayout)}</Text>
              <Text style={[styles.walletLabel, { color: colors.mutedForeground }]}>Pending Payout</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.payoutBtn, { backgroundColor: "rgba(255,45,126,0.12)", borderColor: colors.primary }]}
            onPress={() => Alert.alert("Payout Request", "Payout via MTN MoMo will be processed within 24 hours.")}
          >
            <Ionicons name="phone-portrait-outline" size={15} color={colors.primary} />
            <Text style={[styles.payoutBtnText, { color: colors.primary }]}>Request MoMo Payout</Text>
          </TouchableOpacity>
        </View>
      )}

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
            backgroundColor: panicActive ? "#ff4d4d" : "rgba(255,77,77,0.1)",
            borderColor: "#ff4d4d",
          },
        ]}
        onPress={handlePanic}
        onLongPress={handlePanic}
      >
        <Ionicons name="warning" size={20} color={panicActive ? "#fff" : "#ff4d4d"} />
        <View>
          <Text style={[styles.panicTitle, { color: panicActive ? "#fff" : "#ff4d4d" }]}>
            {panicActive ? "ALERT SENT" : "Panic Button"}
          </Text>
          <Text style={[styles.panicSubtitle, { color: panicActive ? "rgba(255,255,255,0.8)" : "rgba(255,77,77,0.7)" }]}>
            Hold to send emergency alert + GPS
          </Text>
        </View>
      </TouchableOpacity>

      {/* App settings */}
      <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>SETTINGS</Text>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow icon="lock-closed-outline" label="Privacy" onPress={() => {}} />
        <SettingRow icon="notifications-outline" label="Notifications" onPress={() => {}} />
        <SettingRow icon="location-outline" label="Location" value={userProfile.city} onPress={() => {}} />
        <SettingRow icon="help-circle-outline" label="Support" onPress={() => Alert.alert("Support", "WhatsApp: +256 700 000000\nAvailable 24/7")} />
        <SettingRow icon="document-text-outline" label="Terms of Service" onPress={() => {}} />
        <SettingRow
          icon="log-out-outline"
          label="Sign Out"
          danger
          onPress={() => Alert.alert("Sign Out", "Are you sure?", [{ text: "Cancel" }, { text: "Sign Out", style: "destructive" }])}
        />
      </View>

      <Text style={[styles.version, { color: colors.mutedForeground }]}>NightMap v1.0 · Uganda · Kenya · Tanzania</Text>
    </ScrollView>
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
});

import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";

interface SettingRowProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}

function SettingRow({ icon, label, value, onPress, danger }: SettingRowProps) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.settingRow, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.settingIcon, { backgroundColor: danger ? "rgba(255,77,77,0.12)" : colors.muted }]}>
        <Ionicons name={icon as never} size={18} color={danger ? colors.destructive : colors.primary} />
      </View>
      <Text style={[styles.settingLabel, { color: danger ? colors.destructive : colors.foreground }]}>
        {label}
      </Text>
      <View style={styles.settingRight}>
        {value && <Text style={[styles.settingValue, { color: colors.mutedForeground }]}>{value}</Text>}
        <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userProfile, toggleAvailability, updateProfile, matches } = useApp();
  const [safeCheckIn, setSafeCheckIn] = useState(false);

  const handleSafeCheckIn = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSafeCheckIn(true);
    Alert.alert("Safety Check-In", "Your location has been shared with your emergency contact. Stay safe.", [
      { text: "OK", onPress: () => setSafeCheckIn(false) },
    ]);
  };

  const handleToggleAvailability = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleAvailability();
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
        <TouchableOpacity style={[styles.editBtn, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Ionicons name="create-outline" size={18} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatarRing, { borderColor: colors.primary }]}>
          <View style={[styles.avatar, { backgroundColor: "#2c2845" }]}>
            <Ionicons name="person" size={36} color={colors.mutedForeground} />
          </View>
        </View>
        <Text style={[styles.profileName, { color: colors.foreground }]}>{userProfile.name}</Text>
        <Text style={[styles.profileCity, { color: colors.mutedForeground }]}>{userProfile.city}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.primary }]}>{matches.length}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Connections</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <View style={styles.verifiedRow}>
              <Ionicons name={userProfile.verified ? "shield-checkmark" : "shield-outline"} size={18} color={userProfile.verified ? colors.accent : colors.mutedForeground} />
            </View>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              {userProfile.verified ? "Verified" : "Unverified"}
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.primary }]}>0</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Reviews</Text>
          </View>
        </View>
      </View>

      {!userProfile.verified && (
        <TouchableOpacity
          style={[styles.verifyBanner, { backgroundColor: "rgba(245,166,35,0.1)", borderColor: colors.accent }]}
          onPress={() => Alert.alert("Verification", "ID verification coming soon. This will unlock the verified badge and trust score.")}
        >
          <Ionicons name="shield-outline" size={20} color={colors.accent} />
          <View style={styles.verifyBannerText}>
            <Text style={[styles.verifyTitle, { color: colors.accent }]}>Get Verified</Text>
            <Text style={[styles.verifySubtitle, { color: colors.mutedForeground }]}>ID + biometric · processed in 24h</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.accent} />
        </TouchableOpacity>
      )}

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
          <View style={[styles.settingIcon, { backgroundColor: "rgba(34,197,94,0.12)" }]}>
            <Ionicons name="moon" size={18} color="#22c55e" />
          </View>
          <Text style={[styles.settingLabel, { color: colors.foreground }]}>Available Tonight</Text>
          <Switch
            value={userProfile.availableTonight}
            onValueChange={handleToggleAvailability}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
          />
        </View>
        <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
          <View style={[styles.settingIcon, { backgroundColor: colors.muted }]}>
            <Ionicons name="people" size={18} color={colors.primary} />
          </View>
          <Text style={[styles.settingLabel, { color: colors.foreground }]}>Mode</Text>
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeBtn, !userProfile.isCompanion && { backgroundColor: colors.primary }]}
              onPress={() => updateProfile({ isCompanion: false })}
            >
              <Text style={[styles.modeBtnText, { color: !userProfile.isCompanion ? "#fff" : colors.mutedForeground }]}>Guest</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, userProfile.isCompanion && { backgroundColor: colors.primary }]}
              onPress={() => updateProfile({ isCompanion: true })}
            >
              <Text style={[styles.modeBtnText, { color: userProfile.isCompanion ? "#fff" : colors.mutedForeground }]}>Host</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.safeCheckInBtn, { backgroundColor: safeCheckIn ? "#22c55e" : "rgba(255,45,126,0.1)", borderColor: safeCheckIn ? "#22c55e" : colors.primary }]}
        onPress={handleSafeCheckIn}
      >
        <Ionicons name={safeCheckIn ? "checkmark-circle" : "shield-checkmark-outline"} size={20} color={safeCheckIn ? "#fff" : colors.primary} />
        <Text style={[styles.safeCheckInText, { color: safeCheckIn ? "#fff" : colors.primary }]}>
          {safeCheckIn ? "Check-In Sent" : "Safety Check-In"}
        </Text>
      </TouchableOpacity>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow icon="lock-closed-outline" label="Privacy" />
        <SettingRow icon="notifications-outline" label="Notifications" />
        <SettingRow icon="location-outline" label="Location" value="Kampala" />
        <SettingRow icon="help-circle-outline" label="Support" />
        <SettingRow icon="information-circle-outline" label="About NightMap" />
        <SettingRow icon="log-out-outline" label="Sign Out" danger onPress={() => Alert.alert("Sign Out", "Are you sure?", [{ text: "Cancel" }, { text: "Sign Out", style: "destructive" }])} />
      </View>

      <Text style={[styles.version, { color: colors.mutedForeground }]}>NightMap v1.0.0 · Tonight starts here</Text>
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
    paddingBottom: 16,
  },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 26 },
  editBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  profileCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 6,
  },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: "center",
    justifyContent: "center",
  },
  profileName: { fontFamily: "Inter_700Bold", fontSize: 22 },
  profileCity: { fontFamily: "Inter_400Regular", fontSize: 14 },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    width: "100%",
  },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statNum: { fontFamily: "Inter_700Bold", fontSize: 22 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 12 },
  statDivider: { width: 1, height: 36 },
  verifiedRow: { alignItems: "center", justifyContent: "center" },
  verifyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  verifyBannerText: { flex: 1 },
  verifyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  verifySubtitle: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  section: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  settingLabel: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 15 },
  settingRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  settingValue: { fontFamily: "Inter_400Regular", fontSize: 14 },
  modeToggle: {
    flexDirection: "row",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(44,40,69,0.5)",
  },
  modeBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  modeBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  safeCheckInBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  safeCheckInText: { fontFamily: "Inter_700Bold", fontSize: 16 },
  version: { textAlign: "center", fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 8 },
});

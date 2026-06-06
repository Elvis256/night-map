import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface TrustBadgeProps {
  score: number;
  size?: "sm" | "md";
}

export function TrustBadge({ score, size = "md" }: TrustBadgeProps) {
  const colors = useColors();
  const isSmall = size === "sm";

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: "rgba(245,166,35,0.15)",
          borderColor: colors.accent,
          paddingHorizontal: isSmall ? 6 : 8,
          paddingVertical: isSmall ? 2 : 4,
          borderRadius: 20,
        },
      ]}
    >
      <Ionicons
        name="shield-checkmark"
        size={isSmall ? 10 : 12}
        color={colors.accent}
      />
      <Text
        style={[
          styles.text,
          { color: colors.accent, fontSize: isSmall ? 10 : 12 },
        ]}
      >
        {score}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderWidth: 1,
  },
  text: {
    fontFamily: "Inter_600SemiBold",
  },
});

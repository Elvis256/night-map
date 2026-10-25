import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '../../hooks/use-colors';
import { nativeFontFamily, withAlpha } from '../../lib/native-theme';

interface TrustBadgeProps {
  score: number;
  size?: 'sm' | 'md';
}

export function TrustBadge({ score, size = 'md' }: TrustBadgeProps) {
  const colors = useColors();
  const isSmall = size === 'sm';

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Trust score ${score}%`}
      style={[
        styles.badge,
        {
          backgroundColor: withAlpha(colors.accent, 0.15),
          borderColor: colors.accent,
          paddingHorizontal: isSmall ? 6 : 8,
          paddingVertical: isSmall ? 2 : 4,
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
          {
            color: colors.accent,
            fontSize: isSmall ? 10 : 12,
          },
        ]}
      >
        {score}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderRadius: 20,
  },
  text: {
    fontFamily: nativeFontFamily.semibold,
  },
});

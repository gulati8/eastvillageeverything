import React from 'react';
import { StyleSheet, Text } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';

type Props = {
  /** Author name of a proxied Google photo; null or blank renders nothing. */
  attribution: string | null | undefined;
  style?: StyleProp<TextStyle>;
};

/**
 * "Photo: <name>" caption for Google-sourced place photos, in the muted
 * label style used by the detail screen's contact rows. Returns null when
 * there is no attribution so admin uploads show no caption at all.
 */
export function PhotoAttribution({ attribution, style }: Props) {
  const { colors, typography } = useTheme();
  const name = attribution?.trim();
  if (!name) return null;

  return (
    <Text
      style={[styles.caption, { color: colors.ink3, fontFamily: typography.ui500.fontFamily }, style]}
      numberOfLines={1}
      accessibilityLabel={`Photo by ${name}`}
    >
      Photo: {name}
    </Text>
  );
}

const styles = StyleSheet.create({
  caption: {
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.3,
  },
});

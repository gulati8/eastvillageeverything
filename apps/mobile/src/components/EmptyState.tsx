import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/useTheme';

type Props = {
  onReset: () => void;
  title?: string;
  subtitle?: string;
  actionLabel?: string;
};

export function EmptyState({
  onReset,
  title = "Nothing’s matching that vibe right now.",
  subtitle = "Try a different mood — or pull down to check again.",
  actionLabel = 'Show me everything',
}: Props) {
  const { colors, typography } = useTheme();

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.title,
          { color: colors.ink, fontFamily: typography.displayItalic.fontFamily },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          styles.subtitle,
          { color: colors.ink2, fontFamily: typography.body.fontFamily },
        ]}
      >
        {subtitle}
      </Text>
      <Pressable
        onPress={onReset}
        style={[styles.button, { backgroundColor: colors.ink }]}
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
      >
        <Text
          style={[
            styles.buttonText,
            { color: colors.paper, fontFamily: typography.ui600.fontFamily },
          ]}
        >
          {actionLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 22,
  },
  title: {
    fontSize: 32,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 15 * 1.5,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 28,
  },
  button: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

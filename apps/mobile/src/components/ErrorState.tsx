import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/useTheme';

export function ErrorState() {
  const { colors, typography } = useTheme();

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.title,
          { color: colors.ink, fontFamily: typography.displayItalic.fontFamily },
        ]}
      >
        {"We lost the signal somewhere on Avenue B."}
      </Text>
      <Text
        style={[
          styles.subtitle,
          { color: colors.ink2, fontFamily: typography.body.fontFamily },
        ]}
      >
        {"Check your connection and pull to try again. We'll be here."}
      </Text>
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
    fontSize: 28,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 15 * 1.5,
    textAlign: 'center',
    maxWidth: 280,
  },
});

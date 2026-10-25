import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { ensureEndPunctuation } from '../format/text';
import { useTheme } from '../theme/useTheme';

type Props = {
  pitch: string | null | undefined;
  perfect: string | null | undefined;
  insider: string | null | undefined;
  crowd: string | null | undefined;
  style?: StyleProp<ViewStyle>;
};

function present(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * The editorial copy block on the detail screen, in spec order: pitch,
 * "Perfect when" card, "The move", "Who's there". Each section renders only
 * when its field is non-blank, and the whole block returns null when all four
 * are blank so the layout reserves no space and shows no empty state.
 */
export function EditorialCopy({ pitch, perfect, insider, crowd, style }: Props) {
  const { colors, typography, radii } = useTheme();

  const pitchText = present(pitch);
  const perfectText = present(perfect);
  const insiderText = present(insider);
  const crowdText = present(crowd);

  if (!pitchText && !perfectText && !insiderText && !crowdText) return null;

  const sections: React.ReactElement[] = [];

  if (pitchText) {
    sections.push(
      <Text
        key="pitch"
        testID="editorial-pitch"
        style={[styles.pitch, { color: colors.ink, fontFamily: typography.body.fontFamily }]}
      >
        {pitchText}
      </Text>,
    );
  }

  if (perfectText) {
    sections.push(
      <View
        key="perfect"
        testID="editorial-perfect"
        style={[styles.perfectCard, { backgroundColor: colors.paper2, borderRadius: radii.md }]}
      >
        <Text style={[styles.perfectLabel, { color: colors.accent, fontFamily: typography.ui600.fontFamily }]}>
          PERFECT WHEN
        </Text>
        <Text style={[styles.perfectText, { color: colors.ink, fontFamily: typography.displayItalic.fontFamily }]}>
          {ensureEndPunctuation(perfectText)}
        </Text>
      </View>,
    );
  }

  if (insiderText) {
    sections.push(
      <View key="insider" testID="editorial-insider" style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.ink3, fontFamily: typography.ui700.fontFamily }]}>
          THE MOVE
        </Text>
        <Text style={[styles.sectionBody, { color: colors.ink2, fontFamily: typography.body.fontFamily }]}>
          {insiderText}
        </Text>
      </View>,
    );
  }

  if (crowdText) {
    sections.push(
      <View key="crowd" testID="editorial-crowd" style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.ink3, fontFamily: typography.ui700.fontFamily }]}>
          WHO&apos;S THERE
        </Text>
        <Text style={[styles.sectionBody, { color: colors.ink2, fontFamily: typography.body.fontFamily }]}>
          {crowdText}
        </Text>
      </View>,
    );
  }

  return (
    <View testID="editorial-copy" style={[styles.block, style]}>
      {sections}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: 20,
  },
  pitch: {
    fontSize: 17,
    lineHeight: 26,
  },
  perfectCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  perfectLabel: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  perfectText: {
    marginTop: 6,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.1,
  },
  section: {},
  sectionLabel: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  sectionBody: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 24,
  },
});

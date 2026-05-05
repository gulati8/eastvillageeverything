import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/useTheme';
import type { PlaceV2Display } from '../data/placeV2Display';
import { PhotoFallback } from './PhotoFallback';
import { SignalPip } from './SignalPip';

interface PlaceRowProps {
  place: PlaceV2Display;
  isLast?: boolean;
  onPress: () => void;
  onSave?: () => void;
}

function capitalizePitch(text: string): string {
  if (text.length === 0) return text;
  const trimmed = text.trim();
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  if (capitalized.endsWith('.')) return capitalized;
  return capitalized + '.';
}

export function PlaceRow({ place, isLast = false, onPress, onSave }: PlaceRowProps) {
  const { colors, typography } = useTheme();

  const metaSegments: string[] = [];
  if (place.kind != null) metaSegments.push(place.kind);
  if (place.priceTier != null) metaSegments.push(place.priceTier);
  if (place.crowdLevel != null) metaSegments.push(place.crowdLevel);
  const metaLine = metaSegments.length > 0 ? metaSegments.join(' · ') : null;

  const pitchText = place.perfect ?? place.pitch ?? null;
  const formattedPitch = pitchText != null ? capitalizePitch(pitchText) : null;

  function handleSave() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSave?.();
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
        pressed && styles.rowPressed,
      ]}
    >
      {/* Left: Photo area */}
      <PhotoFallback
        photo={place.photo}
        category={place.category}
        name={place.name}
        width={96}
        height={124}
        borderRadius={14}
        showDistancePill={true}
        distance={place.distance}
      />

      {/* Right: Info column */}
      <View style={styles.infoColumn}>
        {/* Top row: name + bookmark */}
        <View style={styles.topRow}>
          <Text
            style={[
              styles.placeName,
              { color: colors.ink, fontFamily: typography.displayItalic.fontFamily },
            ]}
            numberOfLines={1}
          >
            {place.name}
          </Text>

          <Pressable
            onPress={handleSave}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.bookmarkTouchable}
          >
            <View style={[styles.bookmark, { borderColor: colors.ink3 }]}>
              <View style={[styles.bookmarkNotch, { backgroundColor: colors.ink3 }]} />
            </View>
          </Pressable>
        </View>

        {/* Meta line */}
        {metaLine != null && (
          <Text
            style={[
              styles.metaLine,
              { color: colors.ink3, fontFamily: typography.ui600.fontFamily },
            ]}
            numberOfLines={1}
          >
            {metaLine}
          </Text>
        )}

        {/* Signal pip */}
        {place.signal != null && (
          <View style={styles.signalRow}>
            <SignalPip
              kind={place.signal.kind}
              label={place.signal.label}
              urgent={place.signal.urgent}
            />
          </View>
        )}

        {/* Pitch line */}
        {formattedPitch != null && (
          <Text
            style={[
              styles.pitchLine,
              { color: colors.ink2, fontFamily: typography.bodyItalic.fontFamily },
            ]}
            numberOfLines={2}
          >
            {formattedPitch}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: 16,
    gap: 14,
    alignItems: 'stretch',
  },
  rowPressed: {
    opacity: 0.75,
  },
  infoColumn: {
    flex: 1,
    minWidth: 0,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
  },
  placeName: {
    flex: 1,
    minWidth: 0,
    fontSize: 22,
    lineHeight: 22,
    letterSpacing: -0.22, // -0.01em at 22px
  },
  bookmarkTouchable: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  // Simple bookmark shape: a rectangle with a triangular notch cut from the bottom center
  bookmark: {
    width: 14,
    height: 16,
    borderWidth: 1.5,
    borderRadius: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bookmarkNotch: {
    position: 'absolute',
    bottom: -4,
    width: 8,
    height: 8,
    transform: [{ rotate: '45deg' }],
  },
  metaLine: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.11, // 0.01em at 11px
    lineHeight: 14,
  },
  signalRow: {
    marginTop: 8,
  },
  pitchLine: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
  },
});

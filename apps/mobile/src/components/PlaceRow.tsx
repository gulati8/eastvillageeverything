import React from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/useTheme';
import type { PlaceV2Display } from '../data/placeV2Display';
import { PhotoFallback } from './PhotoFallback';
import { SignalPip } from './SignalPip';
import { BookmarkIcon } from '../icons/BookmarkIcon';

interface PlaceRowProps {
  place: PlaceV2Display;
  isLast?: boolean;
  isSaved?: boolean;
  onPress: () => void;
  onSave?: () => void;
}

function collapseText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function PlaceRow({ place, isLast = false, isSaved = false, onPress, onSave }: PlaceRowProps) {
  const { colors, typography } = useTheme();

  const specialsExcerpt = place.specials != null ? collapseText(place.specials) : null;

  function handleSave(event: GestureResponderEvent) {
    event.stopPropagation();
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
      <PhotoFallback
        photo={place.photo}
        id={place.key}
        name={place.name}
        width={72}
        height={72}
        borderRadius={10}
      />

      <View style={styles.infoColumn}>
        <View style={styles.topRow}>
          <Text
            style={[
              styles.placeName,
              { color: colors.ink, fontFamily: typography.ui600.fontFamily },
            ]}
            numberOfLines={2}
          >
            {place.name}
          </Text>

          <Pressable
            onPress={handleSave}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.bookmarkTouchable}
            accessibilityRole="button"
            accessibilityLabel={isSaved ? `Remove ${place.name} from saved places` : `Save ${place.name}`}
          >
            <BookmarkIcon color={isSaved ? colors.accent : colors.ink3} filled={isSaved} />
          </Pressable>
        </View>

        {place.street != null && (
          <Text
            style={[
              styles.metaLine,
              { color: colors.ink3, fontFamily: typography.ui600.fontFamily },
            ]}
            numberOfLines={1}
          >
            {place.street}
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

        {specialsExcerpt != null && (
          <Text
            style={[
              styles.specialsLine,
              { color: colors.ink2, fontFamily: typography.body.fontFamily },
            ]}
            numberOfLines={2}
          >
            {specialsExcerpt}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: 14,
    gap: 12,
    alignItems: 'center',
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
    alignItems: 'flex-start',
    gap: 8,
  },
  placeName: {
    flex: 1,
    minWidth: 0,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.1,
  },
  bookmarkTouchable: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  metaLine: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
  },
  signalRow: {
    marginTop: 8,
  },
  specialsLine: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
  },
});

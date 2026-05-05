import React, { useRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/useTheme';
import type { SortMode } from '../data/placeV2Display';

interface ChipItem {
  value: string;
  label: string;
  active: boolean;
}

interface FilterRailProps {
  chips: ChipItem[];
  matchCount: number;
  totalCount: number;
  activeSort: SortMode;
  onChipToggle: (value: string) => void;
  onSortPress: () => void;
}

const SORT_LABELS: Record<SortMode, string> = {
  smart: 'Smart',
  nearest: 'Nearest',
  closing: 'Closing soon',
  az: 'A–Z',
};

export function FilterRail({
  chips,
  matchCount,
  totalCount,
  activeSort,
  onChipToggle,
  onSortPress,
}: FilterRailProps) {
  const { colors, typography } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const chipPositions = useRef<Record<string, number>>({});

  function handleChipPress(value: string, index: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChipToggle(value);

    const xPos = chipPositions.current[value];
    if (xPos !== undefined && scrollRef.current) {
      scrollRef.current.scrollTo({ x: Math.max(0, xPos - 22), animated: true });
    }
  }

  const sortLabel = SORT_LABELS[activeSort];

  return (
    <View>
      {/* Chip scroll row */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {chips.map((chip, index) => {
          const isActive = chip.active;
          return (
            <Pressable
              key={chip.value}
              onLayout={(e) => {
                chipPositions.current[chip.value] = e.nativeEvent.layout.x;
              }}
              onPress={() => handleChipPress(chip.value, index)}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive ? colors.chipActive : colors.chip,
                  borderColor: isActive ? colors.chipActive : colors.line,
                  borderWidth: isActive ? 0 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    fontFamily: typography.ui600.fontFamily,
                    color: isActive ? colors.paper : colors.ink,
                  },
                ]}
              >
                {chip.label}
                {isActive ? (
                  <Text
                    style={{
                      opacity: 0.6,
                      fontFamily: typography.ui600.fontFamily,
                      color: colors.paper,
                      fontSize: 13,
                    }}
                  >
                    {' ×'}
                  </Text>
                ) : null}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Meta row */}
      <View style={styles.metaRow}>
        {/* Left: match count text */}
        <Text
          style={[
            styles.metaText,
            {
              fontFamily: typography.ui600.fontFamily,
              color: colors.ink3,
            },
          ]}
        >
          {matchCount !== totalCount ? (
            <>
              <Text style={{ color: colors.ink, fontFamily: typography.ui600.fontFamily }}>
                {matchCount}
              </Text>
              {' of '}
              <Text style={{ color: colors.ink, fontFamily: typography.ui600.fontFamily }}>
                {totalCount}
              </Text>
              {' match'}
            </>
          ) : (
            <>
              <Text style={{ color: colors.ink, fontFamily: typography.ui600.fontFamily }}>
                {totalCount}
              </Text>
              {' spots'}
            </>
          )}
        </Text>

        {/* Right: sort selector */}
        <Pressable onPress={onSortPress} style={styles.sortPressable}>
          <Text
            style={[
              styles.sortText,
              {
                fontFamily: typography.ui700.fontFamily,
                color: colors.ink2,
              },
            ]}
          >
            {sortLabel.toUpperCase()}
            {' ▾'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 22,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    fontSize: 13,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    marginTop: 10,
  },
  metaText: {
    fontSize: 11,
    flexShrink: 1,
  },
  sortPressable: {
    minHeight: 44,
    justifyContent: 'center',
    paddingLeft: 12,
  },
  sortText: {
    fontSize: 11,
  },
});

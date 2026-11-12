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
  sectionKey: string;
}

interface FilterRailProps {
  chips: ChipItem[];
  matchCount: number;
  totalCount: number;
  activeSort: SortMode;
  /** Number of active filters, shown as a badge on the filter button. */
  activeFilterCount: number;
  /** True while a typed search is covering every neighborhood. */
  searchingEverywhere?: boolean;
  onFilterPress: () => void;
  onChipToggle: (sectionKey: string, value: string) => void;
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
  activeFilterCount,
  searchingEverywhere = false,
  onFilterPress,
  onChipToggle,
  onSortPress,
}: FilterRailProps) {
  const { colors, typography } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const chipPositions = useRef<Record<string, number>>({});

  function handleChipPress(sectionKey: string, value: string, index: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChipToggle(sectionKey, value);

    const xPos = chipPositions.current[value];
    if (xPos !== undefined && scrollRef.current) {
      scrollRef.current.scrollTo({ x: Math.max(0, xPos), animated: true });
    }
  }

  const sortLabel = SORT_LABELS[activeSort];

  return (
    <View style={styles.container}>
      {/* Filter button, pinned at the head of the rail, then the chip scroll row */}
      <View style={styles.railRow}>
        <Pressable
          onPress={onFilterPress}
          hitSlop={6}
          style={[
            styles.filterButton,
            { backgroundColor: colors.paper2, borderColor: colors.line },
          ]}
          accessibilityLabel="Open filters"
          accessibilityRole="button"
        >
          <View style={styles.filterIcon}>
            <View style={[styles.filterLine, { backgroundColor: colors.ink, width: 14 }]} />
            <View style={[styles.filterLine, { backgroundColor: colors.ink, width: 10 }]} />
            <View style={[styles.filterLine, { backgroundColor: colors.ink, width: 6 }]} />
          </View>

          {activeFilterCount > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: colors.accent }]}>
              <Text
                style={[
                  styles.filterBadgeText,
                  { color: '#FFFFFF', fontFamily: typography.ui700.fontFamily },
                ]}
              >
                {activeFilterCount}
              </Text>
            </View>
          )}
        </Pressable>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
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
              onPress={() => handleChipPress(chip.sectionKey, chip.value, index)}
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
      </View>

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
          {searchingEverywhere ? (
            <>
              <Text style={{ color: colors.ink, fontFamily: typography.ui600.fontFamily }}>
                {matchCount}
              </Text>
              {matchCount === 1 ? ' spot · all neighborhoods' : ' spots · all neighborhoods'}
            </>
          ) : matchCount !== totalCount ? (
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
              {totalCount === 1 ? ' spot' : ' spots'}
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
  container: {
    marginTop: 12,
  },
  railRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 22,
  },
  filterButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterIcon: {
    gap: 2.5,
    alignItems: 'center',
  },
  filterLine: {
    height: 2,
    borderRadius: 1,
  },
  filterBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 16,
    height: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterBadgeText: {
    fontSize: 10,
    lineHeight: 14,
  },
  scroll: {
    flex: 1,
    marginLeft: 8,
  },
  scrollContent: {
    paddingRight: 22,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    fontSize: 13,
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    marginTop: 8,
    marginBottom: 4,
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

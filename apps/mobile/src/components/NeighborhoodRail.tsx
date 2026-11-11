import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/useTheme';
import type { NeighborhoodPill } from '../data/neighborhoods';

interface NeighborhoodRailProps {
  /** Expanded (the masthead arrow was tapped) or collapsed to zero height. */
  open: boolean;
  pills: NeighborhoodPill[];
  /** Selected neighborhood slug or 'all'. */
  selected: string | null;
  onSelect: (value: string) => void;
}

/** 12 px above the pills plus the 32 px pill, as in the mockup's rail. */
export const NEIGHBORHOOD_RAIL_HEIGHT = 44;
const EXPAND_MS = 200;
const EDGE = 22;

/**
 * The row of neighborhood pills that the masthead arrow expands under the
 * title. Collapsed it has no height and takes no touches.
 */
export function NeighborhoodRail({ open, pills, selected, onSelect }: NeighborhoodRailProps) {
  const { colors, typography } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const pillPositions = useRef<Record<string, number>>({});

  const containerStyle = useAnimatedStyle(
    () => ({
      height: withTiming(open ? NEIGHBORHOOD_RAIL_HEIGHT : 0, { duration: EXPAND_MS }),
      opacity: withTiming(open ? 1 : 0, { duration: EXPAND_MS }),
    }),
    [open],
  );

  // Opening brings the current neighborhood's pill into view.
  useEffect(() => {
    if (!open || selected === null) return;
    const x = pillPositions.current[selected];
    if (x !== undefined) {
      scrollRef.current?.scrollTo({ x: Math.max(0, x - EDGE), animated: false });
    }
  }, [open, selected]);

  function handlePress(value: string) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(value);
  }

  return (
    <Animated.View
      style={[styles.container, containerStyle]}
      pointerEvents={open ? 'auto' : 'none'}
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {pills.map((pill) => {
          const isActive = pill.value === selected;
          return (
            <Pressable
              key={pill.value}
              onLayout={(e) => {
                pillPositions.current[pill.value] = e.nativeEvent.layout.x;
              }}
              onPress={() => handlePress(pill.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${pill.label}, ${pill.count} ${pill.count === 1 ? 'spot' : 'spots'}`}
              style={[
                styles.pill,
                {
                  backgroundColor: isActive ? colors.chipActive : colors.chip,
                  borderColor: isActive ? colors.chipActive : colors.line,
                },
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  {
                    fontFamily: typography.ui600.fontFamily,
                    color: isActive ? colors.paper : colors.ink,
                  },
                ]}
              >
                {pill.label}
                <Text style={[styles.pillCount, { color: colors.ink3 }]}>{`  ${pill.count}`}</Text>
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  scroll: {
    flexGrow: 0,
    height: 32,
  },
  scrollContent: {
    paddingHorizontal: EDGE,
    gap: 8,
    alignItems: 'center',
  },
  pill: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillText: {
    fontSize: 13,
    lineHeight: 16,
  },
  pillCount: {
    fontSize: 12,
  },
});

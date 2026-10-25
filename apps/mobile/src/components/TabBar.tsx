import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Svg, { Path } from 'react-native-svg';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useTheme } from '../theme/useTheme';
import { BookmarkIcon } from '../icons/BookmarkIcon';

export type TabKey = 'home' | 'saved';

export interface TabBarProps {
  activeTab?: TabKey;
  onTabPress?: (tab: TabKey) => void;
}

/** Outer height of the floating capsule. */
export const CAPSULE_HEIGHT = 56;
/** Gap between the capsule and the bottom safe-area edge. */
export const CAPSULE_LIFT = 12;
/** Inset between the capsule edge and the active pill / segments. */
const SEGMENT_INSET = 4;
const ICON_SIZE = 20;
const ICON_STROKE = 2.4;
const SLIDE_MS = 220;

/**
 * Bottom padding a scrolling list needs (before adding `insets.bottom`) so its
 * last row scrolls clear of the capsule with some breathing room.
 */
export const TAB_BAR_CLEARANCE = CAPSULE_HEIGHT + CAPSULE_LIFT + 24;

const TABS: { key: TabKey; label: string }[] = [
  { key: 'home', label: 'Home' },
  { key: 'saved', label: 'Saved' },
];

function HomeIcon({ color }: { color: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 10.75L12 4.5L20 10.75V19.25H15.25V14H8.75V19.25H4V10.75Z"
        stroke={color}
        strokeWidth={ICON_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TabIcon({ tab, color, active }: { tab: TabKey; color: string; active: boolean }) {
  if (tab === 'saved') {
    return <BookmarkIcon color={color} size={ICON_SIZE} filled={active} strokeWidth={ICON_STROKE} />;
  }
  return <HomeIcon color={color} />;
}

export function TabBar({ activeTab = 'home', onTabPress }: TabBarProps) {
  const { colors, isDark, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();

  const capsuleWidth = Math.round((windowWidth * 2) / 3);
  const segmentWidth = (capsuleWidth - SEGMENT_INSET * 2) / TABS.length;
  const activeIndex = Math.max(0, TABS.findIndex((t) => t.key === activeTab));

  const pillStyle = useAnimatedStyle(
    () => ({
      transform: [{ translateX: withTiming(activeIndex * segmentWidth, { duration: SLIDE_MS }) }],
    }),
    [activeIndex, segmentWidth],
  );

  return (
    <View
      style={[
        styles.capsule,
        {
          width: capsuleWidth,
          bottom: insets.bottom + CAPSULE_LIFT,
          backgroundColor: colors.paper + 'E6',
          shadowColor: isDark ? '#000000' : colors.ink,
        },
      ]}
      testID="tab-bar"
    >
      {/* Clipped backdrop: blur + hairline border, rounded to the capsule */}
      <View
        style={[styles.clip, { borderColor: colors.line }]}
        pointerEvents="none"
      >
        <BlurView tint={isDark ? 'dark' : 'light'} intensity={12} style={StyleSheet.absoluteFill} />
      </View>

      <View style={styles.row}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pill,
            { width: segmentWidth, backgroundColor: colors.ink },
            pillStyle,
          ]}
        />

        {TABS.map(({ key, label }) => {
          const isActive = key === activeTab;
          const tint = isActive ? colors.paper : colors.ink3;

          return (
            <Pressable
              key={key}
              onPress={() => onTabPress?.(key)}
              style={styles.segment}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: isActive }}
              testID={`tab-${key}`}
            >
              <TabIcon tab={key} color={tint} active={isActive} />
              <Text
                style={[
                  styles.label,
                  { fontFamily: typography.ui600.fontFamily, color: tint },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  capsule: {
    position: 'absolute',
    alignSelf: 'center',
    height: CAPSULE_HEIGHT,
    borderRadius: 999,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  clip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    padding: SEGMENT_INSET,
  },
  pill: {
    position: 'absolute',
    top: SEGMENT_INSET,
    left: SEGMENT_INSET,
    height: CAPSULE_HEIGHT - SEGMENT_INSET * 2,
    borderRadius: 999,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
  },
  label: {
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.3,
  },
});

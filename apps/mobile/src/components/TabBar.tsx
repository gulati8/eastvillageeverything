import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '../theme/useTheme';

export type TabKey = 'home' | 'saved' | 'map' | 'you';

export interface TabBarProps {
  activeTab?: TabKey;
  onTabPress?: (tab: TabKey) => void;
}

const TAB_HEIGHT = 76;

const TABS: { key: TabKey; label: string }[] = [
  { key: 'home', label: 'Home' },
  { key: 'saved', label: 'Saved' },
  { key: 'map', label: 'Map' },
  { key: 'you', label: 'You' },
];

function TabIcon({ tab, color }: { tab: TabKey; color: string }) {
  const common = {
    stroke: color,
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      {tab === 'home' && (
        <Path d="M4 10.75L12 4.5L20 10.75V19.25H15.25V14H8.75V19.25H4V10.75Z" {...common} />
      )}
      {tab === 'saved' && (
        <Path d="M7 4.75C7 4.33579 7.33579 4 7.75 4H16.25C16.6642 4 17 4.33579 17 4.75V19L12 15.75L7 19V4.75Z" {...common} />
      )}
      {tab === 'map' && (
        <>
          <Path d="M4.5 6.75L9.5 4.75L14.5 6.75L19.5 4.75V17.25L14.5 19.25L9.5 17.25L4.5 19.25V6.75Z" {...common} />
          <Path d="M9.5 4.75V17.25M14.5 6.75V19.25" {...common} />
        </>
      )}
      {tab === 'you' && (
        <>
          <Circle cx={12} cy={8} r={3.25} {...common} />
          <Path d="M5.75 19.25C6.55 16.45 8.65 15 12 15C15.35 15 17.45 16.45 18.25 19.25" {...common} />
        </>
      )}
    </Svg>
  );
}

export function TabBar({ activeTab = 'home', onTabPress }: TabBarProps) {
  const { colors, isDark, typography } = useTheme();
  const insets = useSafeAreaInsets();

  const totalHeight = TAB_HEIGHT + insets.bottom;
  const blurTint = isDark ? 'dark' : 'light';

  const fallbackBg = colors.paper + 'FA';

  return (
    <View
      style={[
        styles.container,
        {
          height: totalHeight,
          borderTopColor: colors.line,
          backgroundColor: colors.paper,
        },
      ]}
      pointerEvents="box-none"
    >
      {/* Blur background layer */}
      <BlurView
        tint={blurTint}
        intensity={12}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: fallbackBg },
        ]}
        pointerEvents="none"
      />

      {/* Tab row */}
      <View
        style={[
          styles.row,
          {
            paddingTop: 8,
            paddingHorizontal: 22,
            paddingBottom: insets.bottom + 2,
          },
        ]}
      >
        {TABS.map(({ key, label }) => {
          const isActive = key === activeTab;
          const labelColor = isActive ? colors.ink : colors.ink3;
          const iconColor = isActive ? colors.ink : colors.ink3;

          const tabContent = (
            <>
              <TabIcon tab={key} color={iconColor} />
              <Text
                style={[
                  styles.label,
                  {
                    fontFamily: typography.ui600.fontFamily,
                    color: labelColor,
                  },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </>
          );

          if (key === activeTab && onTabPress == null) {
            return (
              <View key={key} style={styles.tab}>
                {tabContent}
              </View>
            );
          }

          return (
            <Pressable
              key={key}
              onPress={() => onTabPress?.(key)}
              style={styles.tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              {tabContent}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
  },
});

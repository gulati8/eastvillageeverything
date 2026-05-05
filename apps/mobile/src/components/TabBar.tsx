import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme/useTheme';

export interface TabBarProps {
  activeTab?: 'tonight' | 'saved' | 'map' | 'you';
}

const TAB_HEIGHT = 76;

const TABS: { key: 'tonight' | 'saved' | 'map' | 'you'; label: string }[] = [
  { key: 'tonight', label: 'Tonight' },
  { key: 'saved', label: 'Saved' },
  { key: 'map', label: 'Map' },
  { key: 'you', label: 'You' },
];

export function TabBar({ activeTab = 'tonight' }: TabBarProps) {
  const { colors, isDark, typography } = useTheme();
  const insets = useSafeAreaInsets();

  const totalHeight = TAB_HEIGHT + insets.bottom;
  const blurTint = isDark ? 'dark' : 'light';

  // Paper color at 92% opacity as solid fallback
  const paperHex = colors.paper;
  const fallbackBg = paperHex + 'EB'; // 0xEB = ~92% of 255

  return (
    <View
      style={[
        styles.container,
        {
          height: totalHeight,
          borderTopColor: colors.line,
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
      {/* Solid fallback behind blur (also serves as fallback if BlurView is transparent) */}
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.fallback,
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
            paddingBottom: insets.bottom,
          },
        ]}
      >
        {TABS.map(({ key, label }) => {
          const isActive = key === activeTab;
          const labelColor = isActive ? colors.ink : colors.ink3;

          const tabContent = (
            <>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: isActive ? colors.accent : 'transparent',
                  },
                ]}
              />
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

          if (key === 'tonight') {
            // Tonight is always active — no press handler needed
            return (
              <View key={key} style={styles.tab}>
                {tabContent}
              </View>
            );
          }

          return (
            <Pressable key={key} style={styles.tab}>
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
  fallback: {
    zIndex: -1,
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
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
  },
});

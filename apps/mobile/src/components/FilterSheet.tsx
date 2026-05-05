import React, { useCallback } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/useTheme';
import type { FilterSection } from '../data/deriveFilterSections';

interface FilterSheetProps {
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  sections: FilterSection[];
  activeFilters: Map<string, Set<string>>; // sectionKey → active chip values
  chipCounts: Record<string, number>; // chipValue → count
  matchCount: number;
  onToggle: (sectionKey: string, chipValue: string) => void;
  onClear: () => void;
  onDone: () => void;
}

const SNAP_POINTS = ['76%'];

export function FilterSheet({
  bottomSheetRef,
  sections,
  activeFilters,
  chipCounts,
  matchCount,
  onToggle,
  onClear,
  onDone,
}: FilterSheetProps) {
  const { colors, typography } = useTheme();

  const handleClear = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClear();
  }, [onClear]);

  const handleDone = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDone();
  }, [onDone]);

  const handleChipPress = useCallback(
    (sectionKey: string, chipValue: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onToggle(sectionKey, chipValue);
    },
    [onToggle],
  );

  const renderHandle = useCallback(
    () => (
      <View style={styles.handleContainer}>
        <View
          style={[
            styles.grabber,
            { backgroundColor: colors.ink3 + '80' }, // 50% opacity
          ]}
        />
      </View>
    ),
    [colors.ink3],
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={SNAP_POINTS}
      enablePanDownToClose
      handleComponent={renderHandle}
      backgroundStyle={[
        styles.sheetBackground,
        { backgroundColor: colors.paper },
      ]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { borderBottomColor: colors.line },
        ]}
      >
        <Pressable onPress={handleClear} style={styles.headerSideButton} hitSlop={8}>
          <Text
            style={[
              styles.clearAllText,
              { fontFamily: typography.ui600.fontFamily, color: colors.ink2 },
            ]}
          >
            Clear all
          </Text>
        </Pressable>

        <Text
          style={[
            styles.headerTitle,
            { fontFamily: typography.displayItalic.fontFamily, color: colors.ink },
          ]}
        >
          What are you in the mood for?
        </Text>

        <Pressable onPress={handleDone} style={styles.headerSideButton} hitSlop={8}>
          <Text
            style={[
              styles.doneText,
              { fontFamily: typography.ui700.fontFamily, color: colors.accentDeep },
            ]}
          >
            Done
          </Text>
        </Pressable>
      </View>

      {/* Sections */}
      <BottomSheetScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section) => {
          const activeSectionFilters = activeFilters.get(section.key) ?? new Set<string>();

          return (
            <View key={section.key} style={styles.section}>
              <Text
                style={[
                  styles.sectionEyebrow,
                  {
                    fontFamily: typography.ui700.fontFamily,
                    color: colors.ink3,
                  },
                ]}
              >
                {section.title.toUpperCase()}
              </Text>

              <View style={styles.chipsRow}>
                {section.chips.map((chip) => {
                  const isActive = activeSectionFilters.has(chip.value);
                  const count = chipCounts[chip.value] ?? 0;

                  return (
                    <Pressable
                      key={chip.value}
                      style={[
                        styles.chip,
                        isActive
                          ? { backgroundColor: colors.chipActive }
                          : {
                              backgroundColor: colors.card,
                              borderWidth: 1,
                              borderColor: colors.line,
                            },
                      ]}
                      onPress={() => handleChipPress(section.key, chip.value)}
                    >
                      <Text
                        style={[
                          styles.chipLabel,
                          {
                            fontFamily: typography.ui600.fontFamily,
                            color: isActive ? colors.paper : colors.ink,
                          },
                        ]}
                      >
                        {chip.label}
                      </Text>
                      <Text
                        style={[
                          styles.chipCount,
                          {
                            fontFamily: typography.ui600.fontFamily,
                            color: isActive
                              ? colors.paper + 'B3' // 70% opacity
                              : colors.ink3,
                          },
                        ]}
                      >
                        {' '}{count}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </BottomSheetScrollView>

      {/* Footer */}
      <View
        style={[
          styles.footer,
          {
            borderTopColor: colors.line,
            backgroundColor: colors.paper,
          },
        ]}
      >
        <Pressable
          style={[styles.footerButton, { backgroundColor: colors.ink }]}
          onPress={handleDone}
        >
          <Text
            style={[
              styles.footerButtonText,
              { fontFamily: typography.ui700.fontFamily, color: colors.paper },
            ]}
          >
            Show {matchCount} spots
          </Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingHorizontal: 22,
    paddingBottom: 16,
  },
  headerSideButton: {
    minWidth: 56,
  },
  clearAllText: {
    fontSize: 13,
  },
  headerTitle: {
    fontSize: 22,
    fontStyle: 'italic',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 4,
  },
  doneText: {
    fontSize: 13,
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionEyebrow: {
    fontSize: 11,
    letterSpacing: 0.12 * 11, // 0.12em at 11px
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  chipLabel: {
    fontSize: 13,
  },
  chipCount: {
    fontSize: 10,
  },
  footer: {
    paddingTop: 14,
    paddingHorizontal: 18,
    paddingBottom: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerButton: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  footerButtonText: {
    fontSize: 14,
  },
});

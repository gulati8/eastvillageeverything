import React, { useRef, useCallback } from 'react';
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import BottomSheet from '@gorhom/bottom-sheet';

import { usePlacesList } from '../api/places';
import { transformPlace } from '../data/transformPlace';
import { useFilterState } from '../state/useFilterState';
import { PlaceRow } from '../components/PlaceRow';
import { SearchBar } from '../components/SearchBar';
import { FilterRail } from '../components/FilterRail';
import { FilterSheet } from '../components/FilterSheet';
import { TabBar } from '../components/TabBar';
import { EveListSkeleton } from '../components/EveListSkeleton';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { useTheme } from '../theme/useTheme';
import type { PlaceV2Display, SortMode } from '../data/placeV2Display';

// ---------------------------------------------------------------------------
// Day/time helpers
// ---------------------------------------------------------------------------

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getEyebrowText(count: number): string {
  const now = new Date();
  const day = DAY_ABBR[now.getDay()];
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  const displayMinute = minutes.toString().padStart(2, '0');
  const timeStr = `${displayHour}:${displayMinute}${ampm}`;
  return `${day} · ${timeStr} · East Village`;
}

// ---------------------------------------------------------------------------
// Sort action sheet
// ---------------------------------------------------------------------------

const SORT_OPTIONS: Array<{ label: string; mode: SortMode | null }> = [
  { label: 'A–Z', mode: 'az' },
  { label: 'Smart (coming soon)', mode: null },
  { label: 'Nearest (coming soon)', mode: null },
  { label: 'Closing soon (coming soon)', mode: null },
];

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function PlaceList() {
  const insets = useSafeAreaInsets();
  const { colors, typography, radii } = useTheme();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const listRef = useRef<FlatList<PlaceV2Display>>(null);

  // Data fetch — no tag param, all filtering is client-side
  const { data: rawData, isLoading, isError, refetch } = usePlacesList();

  // Transform raw API response to PlaceV2Display[]
  const allPlaces = React.useMemo(
    () => (rawData ? rawData.map(transformPlace) : []),
    [rawData],
  );

  // Filter state
  const {
    activeFilters,
    searchQuery,
    sortMode,
    toggleFilter,
    clearFilters,
    setSearchQuery,
    setSortMode,
    applyFilters,
    matchCount,
    totalCount,
    activeFilterCount,
    chipCounts,
    railChips,
  } = useFilterState(allPlaces);

  // Filtered + sorted places for the list
  const displayPlaces = React.useMemo(
    () => applyFilters(allPlaces),
    [applyFilters, allPlaces],
  );

  // Pull-to-refresh
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  // Sort action sheet
  const handleSortPress = useCallback(() => {
    const buttonTitles = [...SORT_OPTIONS.map((o) => o.label), 'Cancel'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: buttonTitles,
          cancelButtonIndex: buttonTitles.length - 1,
        },
        (buttonIndex) => {
          const option = SORT_OPTIONS[buttonIndex];
          if (option?.mode != null) {
            setSortMode(option.mode);
          }
        },
      );
    } else {
      Alert.alert(
        'Sort by',
        undefined,
        [
          ...SORT_OPTIONS.map((o) => ({
            text: o.label,
            onPress: () => {
              if (o.mode != null) setSortMode(o.mode);
            },
          })),
          { text: 'Cancel', style: 'cancel' as const },
        ],
      );
    }
  }, [setSortMode]);

  // FilterSheet handlers
  const handleFilterButtonPress = useCallback(() => {
    bottomSheetRef.current?.expand();
  }, []);

  const handleSheetDone = useCallback(() => {
    bottomSheetRef.current?.close();
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // Rail chip toggle — rail chips are sourced from 'move' section primarily;
  // we use the section key that owns the chip by looking it up in railChips.
  // However, railChips don't carry sectionKey. The task says:
  // onChipToggle → toggleFilter('move', value) or appropriate section.
  // Since FilterRail only exposes `value`, and we need a sectionKey, we use
  // a lookup map built from FILTER_SECTIONS.
  const handleRailChipToggle = useCallback(
    (value: string) => {
      // Find the section that owns this chip value via useFilterState railChips.
      // railChips flattens all sections — we need to find the section key.
      // We look up the chip in all sections via the import below.
      // Import is inline to avoid circular dependency; filterSections is pure data.
      const { FILTER_SECTIONS } = require('../data/filterSections') as {
        FILTER_SECTIONS: Array<{ key: string; chips: Array<{ value: string }> }>;
      };
      for (const section of FILTER_SECTIONS) {
        for (const chip of section.chips) {
          if (chip.value === value) {
            toggleFilter(section.key, value);
            return;
          }
        }
      }
      // Fallback: treat as 'move'
      toggleFilter('move', value);
    },
    [toggleFilter],
  );

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const keyExtractor = useCallback((item: PlaceV2Display) => item.key, []);

  const renderItem = useCallback(
    ({ item, index }: { item: PlaceV2Display; index: number }) => (
      <PlaceRow
        place={item}
        isLast={index === displayPlaces.length - 1}
        onPress={() => router.push(`/place/${item.key}`)}
      />
    ),
    [displayPlaces.length],
  );

  // ---------------------------------------------------------------------------
  // State flags
  // ---------------------------------------------------------------------------

  const hasData = rawData !== undefined;
  const isLoadingInitial = isLoading && !hasData;
  const isErrorNoData = isError && !hasData;
  const isEmpty = !isLoadingInitial && !isErrorNoData && displayPlaces.length === 0;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper, paddingTop: insets.top }]}>
      {/* 1. Compact masthead */}
      <View style={styles.masthead}>
        <Text
          style={[
            styles.eyebrow,
            { color: colors.ink3, fontFamily: typography.ui600.fontFamily },
          ]}
        >
          {getEyebrowText(totalCount)}
        </Text>
        <Text
          style={[
            styles.mastheadTitle,
            { color: colors.ink, fontFamily: typography.display.fontFamily },
          ]}
        >
          <Text
            style={[
              styles.mastheadCount,
              { fontFamily: typography.displayItalic.fontFamily },
            ]}
          >
            {totalCount} spots
          </Text>
          {'.'}
        </Text>
      </View>

      {/* 2. Search + filter bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBarWrapper}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter button */}
        <Pressable
          onPress={handleFilterButtonPress}
          style={[
            styles.filterButton,
            {
              backgroundColor: colors.card,
              borderColor: colors.line,
            },
          ]}
          accessibilityLabel="Open filters"
          accessibilityRole="button"
        >
          {/* Three-line filter icon */}
          <View style={styles.filterIcon}>
            <View style={[styles.filterLine, { backgroundColor: colors.ink, width: 16 }]} />
            <View style={[styles.filterLine, { backgroundColor: colors.ink, width: 12 }]} />
            <View style={[styles.filterLine, { backgroundColor: colors.ink, width: 8 }]} />
          </View>

          {/* Badge when filters active */}
          {activeFilterCount > 0 && (
            <View
              style={[
                styles.filterBadge,
                { backgroundColor: colors.accent },
              ]}
            >
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
      </View>

      {/* 3. FilterRail */}
      <FilterRail
        chips={railChips}
        matchCount={matchCount}
        totalCount={totalCount}
        activeSort={sortMode}
        onChipToggle={handleRailChipToggle}
        onSortPress={handleSortPress}
      />

      {/* 4. Content area */}
      <View style={styles.content}>
        {isLoadingInitial && <EveListSkeleton />}

        {isErrorNoData && <ErrorState />}

        {isEmpty && (
          <EmptyState onReset={clearFilters} />
        )}

        {!isLoadingInitial && !isErrorNoData && !isEmpty && (
          <FlatList
            ref={listRef}
            data={displayPlaces}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* 5. FilterSheet — rendered at bottom, controlled by ref */}
      <FilterSheet
        bottomSheetRef={bottomSheetRef}
        activeFilters={activeFilters}
        chipCounts={chipCounts}
        matchCount={matchCount}
        onToggle={toggleFilter}
        onClear={clearFilters}
        onDone={handleSheetDone}
      />

      {/* 6. TabBar */}
      <TabBar activeTab="tonight" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  masthead: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 0,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.66,
    lineHeight: 16,
    marginBottom: 4,
  },
  mastheadTitle: {
    fontSize: 32,
    letterSpacing: -0.64,
    lineHeight: 38,
    marginBottom: 0,
  },
  mastheadCount: {
    fontSize: 32,
    letterSpacing: -0.64,
    fontStyle: 'italic',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 0,
    gap: 8,
  },
  searchBarWrapper: {
    flex: 1,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterIcon: {
    gap: 3,
    alignItems: 'center',
  },
  filterLine: {
    height: 2,
    borderRadius: 1,
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 22,
    paddingBottom: 100,
  },
});

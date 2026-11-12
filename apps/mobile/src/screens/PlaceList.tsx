import React, { useRef, useCallback, useEffect } from 'react';
import {
  ActionSheetIOS,
  Alert,
  BackHandler,
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
import { useIsRestoring } from '@tanstack/react-query';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { usePlacesList } from '../api/places';
import { useTagsStructured } from '../api/tags';
import { useNeighborhoods } from '../api/neighborhoods';
import { transformPlace } from '../data/transformPlace';
import { placesForTab } from '../data/tabPlaces';
import { deriveFilterSections, filterSectionsForPlaces } from '../data/deriveFilterSections';
import { useFilterState } from '../state/useFilterState';
import { useNeighborhood } from '../state/useNeighborhood';
import {
  ALL_NEIGHBORHOODS,
  neighborhoodPills,
  neighborhoodTitle,
} from '../data/neighborhoods';
import { useSavedPlaces } from '../state/useSavedPlaces';
import { PlaceRow } from '../components/PlaceRow';
import { SearchBar } from '../components/SearchBar';
import { FilterRail } from '../components/FilterRail';
import { NeighborhoodRail } from '../components/NeighborhoodRail';
import { FilterSheet } from '../components/FilterSheet';
import { TabBar, TAB_BAR_CLEARANCE, type TabKey } from '../components/TabBar';
import { EveListSkeleton } from '../components/EveListSkeleton';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { useTheme } from '../theme/useTheme';
import type { PlaceV2Display, SortMode } from '../data/placeV2Display';

// ---------------------------------------------------------------------------
// Day/time helpers
// ---------------------------------------------------------------------------

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Right-hand side of the eyebrow: the day and the time, e.g. "Tue · 6:24pm". */
function getEyebrowClock(): string {
  const now = new Date();
  const day = DAY_ABBR[now.getDay()];
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  const displayMinute = minutes.toString().padStart(2, '0');
  const timeStr = `${displayHour}:${displayMinute}${ampm}`;
  return `${day} · ${timeStr}`;
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
  const { colors, typography } = useTheme();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const listRef = useRef<FlatList<PlaceV2Display>>(null);
  const [activeTab, setActiveTab] = React.useState<TabKey>('home');
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [tabBarHidden, setTabBarHidden] = React.useState(false);
  const [switcherOpen, setSwitcherOpen] = React.useState(false);
  const { savedPlaceKeys, toggleSavedPlace } = useSavedPlaces();

  // Data fetch — no tag param, all filtering is client-side
  const { data: rawData, isLoading, isError, refetch } = usePlacesList();

  // Transform raw API response to PlaceV2Display[]
  const allPlaces = React.useMemo(
    () => (rawData ? rawData.map(transformPlace) : []),
    [rawData],
  );

  // Tags taxonomy for server-driven filter sections
  const { data: tagsData } = useTagsStructured();
  const filterSections = React.useMemo(
    () => (tagsData ? filterSectionsForPlaces(deriveFilterSections(tagsData), allPlaces) : []),
    [allPlaces, tagsData],
  );

  // Neighborhood: the remembered choice, or the default row. While it cannot
  // be known yet the list waits. If the neighborhoods are not coming (the
  // request failed, or the device is offline with nothing cached) the whole
  // list is shown instead.
  const isRestoringCache = useIsRestoring();
  const { data: neighborhoods, fetchStatus: neighborhoodsFetchStatus } = useNeighborhoods();
  const { selected: resolvedNeighborhood, select: selectNeighborhood } = useNeighborhood(neighborhoods);
  const neighborhoodsUnavailable =
    neighborhoods === undefined && !isRestoringCache && neighborhoodsFetchStatus !== 'fetching';
  const neighborhood =
    resolvedNeighborhood ?? (neighborhoodsUnavailable ? ALL_NEIGHBORHOODS : null);

  const pills = React.useMemo(
    () => neighborhoodPills(neighborhoods ?? [], allPlaces, neighborhood),
    [neighborhoods, allPlaces, neighborhood],
  );
  // The Saved tab ignores the neighborhood, so its title is not one and it has
  // no switcher: a neighborhood's name above another neighborhood's places
  // would read as wrong.
  const onSavedTab = activeTab === 'saved';
  const title = onSavedTab ? 'Saved' : neighborhoodTitle(neighborhood, neighborhoods, allPlaces);
  const canSwitch = !onSavedTab && title !== null;

  // The Saved tab works over the saved places only, so every count it shows
  // (the count line, the sheet's button, the chip counts) is of saved rows.
  const tabPlaces = React.useMemo(
    () => placesForTab(activeTab, allPlaces, savedPlaceKeys),
    [activeTab, allPlaces, savedPlaceKeys],
  );

  // Filter state. The Saved tab ignores the neighborhood: a saved list is the user's own.
  const {
    activeFilters,
    searchQuery,
    sortMode,
    toggleFilter,
    clearFilters,
    setSearchQuery,
    setSortMode,
    applyFilters,
    scopedPlaces,
    searchingEverywhere,
    matchCount,
    totalCount,
    activeFilterCount,
    chipCounts,
    railChips,
  } = useFilterState(
    tabPlaces,
    filterSections,
    onSavedTab ? ALL_NEIGHBORHOODS : neighborhood ?? ALL_NEIGHBORHOODS,
  );

  // Filtered + sorted rows; Home and Saved share the same row formatting.
  const displayPlaces = React.useMemo(
    () => applyFilters(scopedPlaces),
    [applyFilters, scopedPlaces],
  );

  // Rows name their neighborhood whenever the list spans more than one.
  const showRowNeighborhood =
    onSavedTab || neighborhood === ALL_NEIGHBORHOODS || searchingEverywhere;

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
      // Android's Alert shows at most three buttons; SORT_OPTIONS plus Cancel
      // is five, so only the one working sort is offered until the others ship.
      Alert.alert(
        'Sort by',
        'A–Z is the only sort for now.',
        [
          { text: 'A–Z', onPress: () => setSortMode('az') },
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

  const handleSheetChange = useCallback((index: number) => {
    setSheetOpen(index >= 0);
    setTabBarHidden(index >= 0);
  }, []);

  // The tab capsule floats above the sheet and would cover its "Show n spots"
  // button. It goes as soon as the sheet starts to open, and comes back only
  // once the sheet has finished closing (handleSheetChange with -1).
  const handleSheetAnimate = useCallback((_fromIndex: number, toIndex: number) => {
    if (toIndex >= 0) setTabBarHidden(true);
  }, []);

  // Android hardware back: while the filter sheet is open it closes the sheet
  // instead of leaving the screen. When the sheet is closed, default behaviour.
  useEffect(() => {
    if (!sheetOpen) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      bottomSheetRef.current?.close();
      return true;
    });
    return () => subscription.remove();
  }, [sheetOpen]);

  // Rail chip toggle — sectionKey is now carried on each chip from useFilterState.railChips.
  const handleRailChipToggle = useCallback(
    (sectionKey: string, value: string) => {
      toggleFilter(sectionKey, value);
    },
    [toggleFilter],
  );

  const handleTabPress = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    setSwitcherOpen(false);
  }, []);

  // Neighborhood switcher: the title's arrow expands the pill row; a pill
  // switches and collapses it; the arrow again collapses it unchanged.
  const handleSwitcherToggle = useCallback(() => {
    setSwitcherOpen((open) => !open);
  }, []);

  const handleNeighborhoodSelect = useCallback(
    (value: string) => {
      selectNeighborhood(value);
      setSwitcherOpen(false);
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    },
    [selectNeighborhood],
  );

  const chevronStyle = useAnimatedStyle(
    () => ({
      transform: [
        { translateY: withTiming(switcherOpen ? 3 : -2, { duration: 200 }) },
        { rotate: withTiming(switcherOpen ? '-135deg' : '45deg', { duration: 200 }) },
      ],
    }),
    [switcherOpen],
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
        isSaved={savedPlaceKeys.has(item.key)}
        showNeighborhood={showRowNeighborhood}
        onPress={() => router.push(`/place/${item.key}`)}
        onSave={() => toggleSavedPlace(item.key)}
      />
    ),
    [displayPlaces.length, savedPlaceKeys, showRowNeighborhood, toggleSavedPlace],
  );

  // ---------------------------------------------------------------------------
  // State flags
  // ---------------------------------------------------------------------------

  const hasData = rawData !== undefined;
  const isLoadingInitial = (isLoading && !hasData) || (hasData && neighborhood === null);
  const isErrorNoData = isError && !hasData;
  const isEmpty = !isLoadingInitial && !isErrorNoData && displayPlaces.length === 0;
  const isSavedTabEmpty = activeTab === 'saved' && savedPlaceKeys.size === 0;
  const emptyState = isSavedTabEmpty
    ? {
        title: 'No saved places yet.',
        subtitle: 'Bookmark a spot from Home and it will show up here.',
        actionLabel: 'Go to Home',
        onReset: () => setActiveTab('home'),
      }
    : {
        title: undefined,
        subtitle: undefined,
        actionLabel: undefined,
        onReset: clearFilters,
      };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper, paddingTop: insets.top }]}>
      {/* 1. Masthead: brand and clock in the eyebrow, the neighborhood as the title */}
      <View style={styles.masthead}>
        <View style={styles.eyebrowRow}>
          <Text
            style={[
              styles.eyebrow,
              { color: colors.ink3, fontFamily: typography.ui600.fontFamily },
            ]}
          >
            East Village Everything
          </Text>
          <Text
            style={[
              styles.eyebrow,
              { color: colors.ink3, fontFamily: typography.ui600.fontFamily },
            ]}
          >
            {getEyebrowClock()}
          </Text>
        </View>
        <Pressable
          onPress={handleSwitcherToggle}
          disabled={!canSwitch}
          hitSlop={{ top: 4, bottom: 8, left: 8, right: 16 }}
          style={styles.titleRow}
          accessibilityRole={canSwitch ? 'button' : 'header'}
          accessibilityState={canSwitch ? { expanded: switcherOpen } : undefined}
          accessibilityLabel={canSwitch ? `${title}. Change neighborhood` : undefined}
        >
          <Text
            style={[
              styles.mastheadTitle,
              { color: colors.ink, fontFamily: typography.displayItalic.fontFamily },
            ]}
            numberOfLines={1}
          >
            {title ?? ' '}
          </Text>
          {canSwitch && (
            <Animated.View
              style={[styles.chevron, { borderColor: colors.accent }, chevronStyle]}
            />
          )}
        </Pressable>
      </View>

      {/* 2. Neighborhood pills, expanded by the title's arrow */}
      <NeighborhoodRail
        open={switcherOpen && canSwitch}
        pills={pills}
        selected={neighborhood}
        onSelect={handleNeighborhoodSelect}
      />

      {/* 3. Search, full width */}
      <View style={styles.searchRow}>
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
      </View>

      {/* 4. Tag rail, led by the filter button */}
      <FilterRail
        chips={railChips}
        matchCount={matchCount}
        totalCount={totalCount}
        activeSort={sortMode}
        activeFilterCount={activeFilterCount}
        searchingEverywhere={searchingEverywhere}
        onFilterPress={handleFilterButtonPress}
        onChipToggle={handleRailChipToggle}
        onSortPress={handleSortPress}
      />

      {/* 5. Content area */}
      <View style={styles.content}>
        {isLoadingInitial && <EveListSkeleton />}

        {isErrorNoData && <ErrorState />}

        {isEmpty && (
          <EmptyState
            onReset={emptyState.onReset}
            title={emptyState.title}
            subtitle={emptyState.subtitle}
            actionLabel={emptyState.actionLabel}
          />
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
            contentContainerStyle={[styles.listContent, { paddingBottom: TAB_BAR_CLEARANCE + insets.bottom }]}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* 6. FilterSheet — rendered at bottom, controlled by ref */}
      <FilterSheet
        bottomSheetRef={bottomSheetRef}
        sections={filterSections}
        activeFilters={activeFilters}
        chipCounts={chipCounts}
        matchCount={matchCount}
        onToggle={toggleFilter}
        onClear={clearFilters}
        onDone={handleSheetDone}
        onChange={handleSheetChange}
        onAnimate={handleSheetAnimate}
      />

      {/* 7. TabBar, out of the way while the filter sheet is up */}
      <TabBar activeTab={activeTab} onTabPress={handleTabPress} hidden={tabBarHidden} />
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
  eyebrowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eyebrow: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.66,
    lineHeight: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  mastheadTitle: {
    flexShrink: 1,
    fontSize: 32,
    letterSpacing: -0.64,
    lineHeight: 38,
  },
  chevron: {
    width: 9,
    height: 9,
    marginLeft: 14,
    marginRight: 4,
    borderRightWidth: 2,
    borderBottomWidth: 2,
  },
  searchRow: {
    paddingHorizontal: 22,
    paddingTop: 14,
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 22,
    paddingTop: 2,
  },
});

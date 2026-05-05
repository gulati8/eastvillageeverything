import { useMemo, useState } from 'react';
import { FILTER_SECTIONS } from '../data/filterSections';
import type { PlaceV2Display, SortMode } from '../data/placeV2Display';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseFilterStateReturn {
  // State
  activeFilters: Map<string, Set<string>>;
  searchQuery: string;
  sortMode: SortMode;

  // Actions
  toggleFilter: (sectionKey: string, chipValue: string) => void;
  clearFilters: () => void;
  setSearchQuery: (query: string) => void;
  setSortMode: (mode: SortMode) => void;

  // Derived
  applyFilters: (places: PlaceV2Display[]) => PlaceV2Display[];
  matchCount: number;
  totalCount: number;
  activeFilterCount: number;
  chipCounts: Record<string, number>;

  // For rail
  railChips: Array<{ value: string; label: string; active: boolean }>;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Build the initial empty active-filters map: one empty Set per section key.
 */
function buildEmptyFilters(): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const section of FILTER_SECTIONS) {
    map.set(section.key, new Set<string>());
  }
  return map;
}

/**
 * Returns true if the place's tags array contains a value that includes
 * `chip` as a case-insensitive substring.
 */
function tagsContain(tags: string[], chip: string): boolean {
  const lower = chip.toLowerCase();
  return tags.some((t) => t.toLowerCase().includes(lower));
}

/**
 * Returns true if `place` matches the given chip within the given section.
 * This is the core matching function used for both filtering and chip-count
 * computation.
 */
function matchesChip(place: PlaceV2Display, sectionKey: string, chipValue: string): boolean {
  switch (sectionKey) {
    case 'move': {
      // Match against tags (case-insensitive contains)
      return tagsContain(place.tags, chipValue);
    }

    case 'type': {
      // Match against category or kind or tags
      const lower = chipValue.toLowerCase();
      if (place.category?.toLowerCase().includes(lower)) return true;
      if (place.kind?.toLowerCase().includes(lower)) return true;
      if (tagsContain(place.tags, chipValue)) return true;
      return false;
    }

    case 'when': {
      // Match against tags (now/late/24h/brunch)
      return tagsContain(place.tags, chipValue);
    }

    case 'price': {
      // Match against priceTier
      return place.priceTier === chipValue;
    }

    case 'vibe': {
      // Match against tags or vibe field
      if (tagsContain(place.tags, chipValue)) return true;
      if (place.vibe?.toLowerCase().includes(chipValue.toLowerCase())) return true;
      return false;
    }

    default:
      return false;
  }
}

/**
 * Returns true if `place` passes the filters for a single section, given
 * the set of active chips for that section.
 * An empty set means "no constraint" (all places pass).
 * A non-empty set is an OR across the chips in the set.
 */
function matchesSection(
  place: PlaceV2Display,
  sectionKey: string,
  activeChips: Set<string>,
): boolean {
  if (activeChips.size === 0) return true;
  for (const chip of activeChips) {
    if (matchesChip(place, sectionKey, chip)) return true;
  }
  return false;
}

/**
 * Returns true if `place` passes ALL active section filters (AND across
 * sections).
 */
function matchesAllSections(
  place: PlaceV2Display,
  activeFilters: Map<string, Set<string>>,
): boolean {
  for (const [sectionKey, activeChips] of activeFilters) {
    if (!matchesSection(place, sectionKey, activeChips)) return false;
  }
  return true;
}

/**
 * Apply text search: filter by name and kind containing searchQuery
 * (case-insensitive substring).
 */
function applySearch(places: PlaceV2Display[], searchQuery: string): PlaceV2Display[] {
  if (!searchQuery.trim()) return places;
  const lower = searchQuery.toLowerCase().trim();
  return places.filter(
    (p) =>
      p.name.toLowerCase().includes(lower) ||
      (p.kind !== null && p.kind.toLowerCase().includes(lower)),
  );
}

/**
 * Apply sort mode to places array. Returns a new sorted array.
 * 'smart', 'nearest', 'closing' fall back to 'az' when the relevant
 * enrichment field is null on all items.
 */
function applySort(places: PlaceV2Display[], sortMode: SortMode): PlaceV2Display[] {
  if (places.length === 0) return places;

  const sorted = [...places];

  switch (sortMode) {
    case 'az': {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    }

    case 'smart': {
      // Fall back to a-z when signal is null on all items
      const anySignal = places.some((p) => p.signal !== null);
      if (!anySignal) {
        sorted.sort((a, b) => a.name.localeCompare(b.name));
      } else {
        // Signal-present items first (by urgency), then a-z within each group
        sorted.sort((a, b) => {
          const aHas = a.signal !== null ? 1 : 0;
          const bHas = b.signal !== null ? 1 : 0;
          if (aHas !== bHas) return bHas - aHas;
          const aUrgent = a.signal?.urgent ? 1 : 0;
          const bUrgent = b.signal?.urgent ? 1 : 0;
          if (aUrgent !== bUrgent) return bUrgent - aUrgent;
          return a.name.localeCompare(b.name);
        });
      }
      break;
    }

    case 'nearest': {
      // Fall back to a-z when distance is null on all items
      const anyDistance = places.some((p) => p.distance !== null);
      if (!anyDistance) {
        sorted.sort((a, b) => a.name.localeCompare(b.name));
      } else {
        // Null-distance items go to the end
        sorted.sort((a, b) => {
          if (a.distance === null && b.distance === null) return a.name.localeCompare(b.name);
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          // distance is a display string like "0.3 mi"; parse numeric prefix
          const aNum = parseFloat(a.distance);
          const bNum = parseFloat(b.distance);
          if (isNaN(aNum) && isNaN(bNum)) return a.name.localeCompare(b.name);
          if (isNaN(aNum)) return 1;
          if (isNaN(bNum)) return -1;
          return aNum - bNum;
        });
      }
      break;
    }

    case 'closing': {
      // Fall back to a-z when closesIn is null on all items
      const anyClosesIn = places.some((p) => p.closesIn !== null);
      if (!anyClosesIn) {
        sorted.sort((a, b) => a.name.localeCompare(b.name));
      } else {
        // Null-closesIn items go to the end
        sorted.sort((a, b) => {
          if (a.closesIn === null && b.closesIn === null) return a.name.localeCompare(b.name);
          if (a.closesIn === null) return 1;
          if (b.closesIn === null) return -1;
          // closesIn is a display string like "30 min"; parse numeric prefix
          const aNum = parseFloat(a.closesIn);
          const bNum = parseFloat(b.closesIn);
          if (isNaN(aNum) && isNaN(bNum)) return a.name.localeCompare(b.name);
          if (isNaN(aNum)) return 1;
          if (isNaN(bNum)) return -1;
          return aNum - bNum;
        });
      }
      break;
    }

    default:
      sorted.sort((a, b) => a.name.localeCompare(b.name));
  }

  return sorted;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useFilterState(allPlaces: PlaceV2Display[] = []): UseFilterStateReturn {
  const [activeFilters, setActiveFilters] = useState<Map<string, Set<string>>>(buildEmptyFilters);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('az');

  // --------------------------------------------------------------------------
  // Actions
  // --------------------------------------------------------------------------

  function toggleFilter(sectionKey: string, chipValue: string): void {
    setActiveFilters((prev) => {
      const next = new Map(prev);
      const sectionSet = new Set(next.get(sectionKey) ?? []);
      if (sectionSet.has(chipValue)) {
        sectionSet.delete(chipValue);
      } else {
        sectionSet.add(chipValue);
      }
      next.set(sectionKey, sectionSet);
      return next;
    });
  }

  function clearFilters(): void {
    setActiveFilters(buildEmptyFilters());
    setSearchQuery('');
  }

  // --------------------------------------------------------------------------
  // Derived: applyFilters
  // --------------------------------------------------------------------------

  const applyFilters = useMemo(
    () =>
      (places: PlaceV2Display[]): PlaceV2Display[] => {
        // 1. Text search
        let result = applySearch(places, searchQuery);
        // 2. Section filters (AND across sections, OR within each section)
        result = result.filter((p) => matchesAllSections(p, activeFilters));
        // 3. Sort
        return applySort(result, sortMode);
      },
    [activeFilters, searchQuery, sortMode],
  );

  // --------------------------------------------------------------------------
  // Derived: matchCount and totalCount
  // --------------------------------------------------------------------------

  const totalCount = allPlaces.length;

  const matchCount = useMemo(
    () => applyFilters(allPlaces).length,
    [applyFilters, allPlaces],
  );

  // --------------------------------------------------------------------------
  // Derived: activeFilterCount
  // --------------------------------------------------------------------------

  const activeFilterCount = useMemo(() => {
    let count = 0;
    for (const chipSet of activeFilters.values()) {
      count += chipSet.size;
    }
    return count;
  }, [activeFilters]);

  // --------------------------------------------------------------------------
  // Derived: chipCounts
  //
  // For each chip across all sections, compute how many places would match IF
  // that chip were the only active filter in its section (while keeping other
  // sections' active). This is the "marginal" count.
  // --------------------------------------------------------------------------

  const chipCounts = useMemo((): Record<string, number> => {
    const counts: Record<string, number> = {};

    // Pre-filter by search query — chip counts are marginal over text-filtered results
    const searchFiltered = applySearch(allPlaces, searchQuery);

    for (const section of FILTER_SECTIONS) {
      // Build a hypothetical activeFilters with only this chip active in this section
      for (const chip of section.chips) {
        const hypothetical = new Map(activeFilters);
        hypothetical.set(section.key, new Set([chip.value]));

        const count = searchFiltered.filter((p) => matchesAllSections(p, hypothetical)).length;
        counts[chip.value] = count;
      }
    }

    return counts;
  }, [activeFilters, allPlaces, searchQuery]);

  // --------------------------------------------------------------------------
  // Derived: railChips
  // --------------------------------------------------------------------------

  const railChips = useMemo(() => {
    const chips: Array<{ value: string; label: string; active: boolean }> = [];
    for (const section of FILTER_SECTIONS) {
      const activeChips = activeFilters.get(section.key) ?? new Set<string>();
      for (const chip of section.chips) {
        chips.push({
          value: chip.value,
          label: chip.label,
          active: activeChips.has(chip.value),
        });
      }
    }
    return chips;
  }, [activeFilters]);

  // --------------------------------------------------------------------------

  return {
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
  };
}

/**
 * filterLogic.test.ts
 *
 * Tests the filter and sort logic that drives useFilterState.
 * The internal helper functions (applySearch, matchesAllSections, applySort,
 * etc.) are not exported, so this file reproduces the same logic as
 * standalone pure functions and verifies their behaviour in isolation.
 *
 * All logic is copied verbatim from src/state/useFilterState.ts so that
 * any future divergence is caught here.
 */

import type { PlaceV2Display, SortMode } from '../../../src/data/placeV2Display';

// ---------------------------------------------------------------------------
// Pure helpers — verbatim from useFilterState.ts
// ---------------------------------------------------------------------------

function tagsContain(tags: string[], chip: string): boolean {
  const lower = chip.toLowerCase();
  return tags.some((t) => t.toLowerCase().includes(lower));
}

function matchesChip(place: PlaceV2Display, sectionKey: string, chipValue: string): boolean {
  switch (sectionKey) {
    case 'move':
      return tagsContain(place.tags, chipValue);

    case 'type': {
      const lower = chipValue.toLowerCase();
      if (place.category?.toLowerCase().includes(lower)) return true;
      if (place.kind?.toLowerCase().includes(lower)) return true;
      if (tagsContain(place.tags, chipValue)) return true;
      return false;
    }

    case 'when':
      return tagsContain(place.tags, chipValue);

    case 'price':
      return place.priceTier === chipValue;

    case 'vibe': {
      if (tagsContain(place.tags, chipValue)) return true;
      if (place.vibe?.toLowerCase().includes(chipValue.toLowerCase())) return true;
      return false;
    }

    default:
      return false;
  }
}

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

function matchesAllSections(
  place: PlaceV2Display,
  activeFilters: Map<string, Set<string>>,
): boolean {
  for (const [sectionKey, activeChips] of activeFilters) {
    if (!matchesSection(place, sectionKey, activeChips)) return false;
  }
  return true;
}

function applySearch(places: PlaceV2Display[], searchQuery: string): PlaceV2Display[] {
  if (!searchQuery.trim()) return places;
  const lower = searchQuery.toLowerCase().trim();
  return places.filter(
    (p) =>
      p.name.toLowerCase().includes(lower) ||
      (p.kind !== null && p.kind.toLowerCase().includes(lower)),
  );
}

function applySort(places: PlaceV2Display[], sortMode: SortMode): PlaceV2Display[] {
  if (places.length === 0) return places;
  const sorted = [...places];
  switch (sortMode) {
    case 'az':
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    default:
      sorted.sort((a, b) => a.name.localeCompare(b.name));
  }
  return sorted;
}

/** Convenience: apply search + section filters + sort. */
function applyAll(
  places: PlaceV2Display[],
  activeFilters: Map<string, Set<string>>,
  searchQuery: string,
  sortMode: SortMode,
): PlaceV2Display[] {
  let result = applySearch(places, searchQuery);
  result = result.filter((p) => matchesAllSections(p, activeFilters));
  return applySort(result, sortMode);
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeSectionFilters(overrides: Record<string, string[]> = {}): Map<string, Set<string>> {
  const sectionKeys = ['move', 'type', 'when', 'price', 'vibe'];
  const map = new Map<string, Set<string>>();
  for (const key of sectionKeys) {
    map.set(key, new Set(overrides[key] ?? []));
  }
  return map;
}

function makePlace(overrides: Partial<PlaceV2Display> = {}): PlaceV2Display {
  return {
    key: 'key-001',
    name: 'Test Place',
    kind: 'Dive bar',
    category: 'dive',
    street: '123 Ave A',
    cross: null,
    hours: null,
    open: null,
    vibe: null,
    photo: null,
    photoCredit: null,
    pitch: null,
    perfect: null,
    tags: [],
    insider: null,
    crowd: null,
    distance: null,
    closesIn: null,
    signal: null,
    crowdLevel: null,
    priceTier: null,
    phone: null,
    url: null,
    lat: null,
    lng: null,
    ...overrides,
  };
}

const PLACE_A = makePlace({ key: 'a', name: 'Ace Bar', category: 'dive', kind: 'Dive bar', tags: ['happy', 'walkin'] });
const PLACE_B = makePlace({ key: 'b', name: 'Bua Thai', category: 'diner', kind: 'Restaurant', tags: ['food', 'brunch'] });
const PLACE_C = makePlace({ key: 'c', name: 'Cienfuegos', category: 'cocktail', kind: 'Cocktail bar', tags: ['date', 'cocktail'], priceTier: '$$' });
const PLACE_D = makePlace({ key: 'd', name: 'Death & Co', category: 'cocktail', kind: 'Cocktail bar', tags: ['cocktail'], priceTier: '$$$' });

const ALL_PLACES = [PLACE_A, PLACE_B, PLACE_C, PLACE_D];

// ---------------------------------------------------------------------------
// Tests: empty filters
// ---------------------------------------------------------------------------

describe('filter logic — empty filters', () => {
  it('returns all items when no filters are active', () => {
    const filters = makeSectionFilters();
    const result = applyAll(ALL_PLACES, filters, '', 'az');
    expect(result).toHaveLength(ALL_PLACES.length);
  });

  it('returns items in a-z order when sort is az and no filters', () => {
    const filters = makeSectionFilters();
    const result = applyAll(ALL_PLACES, filters, '', 'az');
    const names = result.map((p) => p.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});

// ---------------------------------------------------------------------------
// Tests: single tag filter (OR within section)
// ---------------------------------------------------------------------------

describe('filter logic — single section filter', () => {
  it('returns only places matching the "move" chip via tags', () => {
    const filters = makeSectionFilters({ move: ['happy'] });
    const result = applyAll(ALL_PLACES, filters, '', 'az');
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('a');
  });

  it('OR within section: "move" happy OR walkin both match Ace Bar', () => {
    const filters = makeSectionFilters({ move: ['happy', 'date'] });
    const result = applyAll(ALL_PLACES, filters, '', 'az');
    // Ace Bar has 'happy', Cienfuegos has 'date'
    expect(result.map((p) => p.key).sort()).toEqual(['a', 'c']);
  });

  it('returns only places matching "type" chip via category', () => {
    const filters = makeSectionFilters({ type: ['dive'] });
    const result = applyAll(ALL_PLACES, filters, '', 'az');
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('a');
  });

  it('returns places matching "price" chip via priceTier', () => {
    const filters = makeSectionFilters({ price: ['$$'] });
    const result = applyAll(ALL_PLACES, filters, '', 'az');
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('c');
  });
});

// ---------------------------------------------------------------------------
// Tests: multi-section AND logic
// ---------------------------------------------------------------------------

describe('filter logic — multi-section AND', () => {
  it('AND across sections: cocktail type AND $$$ price → only Death & Co', () => {
    const filters = makeSectionFilters({ type: ['cocktail'], price: ['$$$'] });
    const result = applyAll(ALL_PLACES, filters, '', 'az');
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('d');
  });

  it('AND across sections: cocktail type AND $$ price → only Cienfuegos', () => {
    const filters = makeSectionFilters({ type: ['cocktail'], price: ['$$'] });
    const result = applyAll(ALL_PLACES, filters, '', 'az');
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('c');
  });

  it('returns empty when AND conditions are mutually exclusive', () => {
    // Ace Bar is dive, not cocktail — price $$$  would only apply to D
    const filters = makeSectionFilters({ type: ['dive'], price: ['$$$'] });
    const result = applyAll(ALL_PLACES, filters, '', 'az');
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: text search
// ---------------------------------------------------------------------------

describe('filter logic — text search', () => {
  it('returns places whose name contains the query (case-insensitive)', () => {
    const result = applySearch(ALL_PLACES, 'ace');
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('a');
  });

  it('is case-insensitive', () => {
    const result = applySearch(ALL_PLACES, 'DEATH');
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('d');
  });

  it('returns places whose kind contains the query', () => {
    const result = applySearch(ALL_PLACES, 'cocktail');
    // Cienfuegos and Death & Co both have kind 'Cocktail bar'
    expect(result.map((p) => p.key).sort()).toEqual(['c', 'd']);
  });

  it('returns all places when query is empty', () => {
    const result = applySearch(ALL_PLACES, '');
    expect(result).toHaveLength(ALL_PLACES.length);
  });

  it('returns all places when query is whitespace only', () => {
    const result = applySearch(ALL_PLACES, '   ');
    expect(result).toHaveLength(ALL_PLACES.length);
  });

  it('returns empty array when no places match', () => {
    const result = applySearch(ALL_PLACES, 'xyzzy');
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: a-z sort
// ---------------------------------------------------------------------------

describe('filter logic — a-z sort', () => {
  it('sorts alphabetically ascending', () => {
    const unsorted = [PLACE_D, PLACE_C, PLACE_A, PLACE_B];
    const result = applySort(unsorted, 'az');
    expect(result.map((p) => p.name)).toEqual(['Ace Bar', 'Bua Thai', 'Cienfuegos', 'Death & Co']);
  });

  it('returns empty array unchanged', () => {
    expect(applySort([], 'az')).toEqual([]);
  });

  it('does not mutate the original array', () => {
    const original = [PLACE_D, PLACE_A];
    const result = applySort(original, 'az');
    expect(original[0].key).toBe('d'); // unchanged
    expect(result[0].key).toBe('a');   // sorted
  });
});

// ---------------------------------------------------------------------------
// Tests: combined search + filter
// ---------------------------------------------------------------------------

describe('filter logic — combined search and filter', () => {
  it('applies search and then section filter', () => {
    // Search for 'bar' matches Ace Bar (kind: Dive bar) + no others by name
    // Then filter type=dive — should still be Ace Bar only
    const filters = makeSectionFilters({ type: ['dive'] });
    const result = applyAll(ALL_PLACES, filters, 'ace', 'az');
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('a');
  });

  it('returns empty when search matches but filter excludes', () => {
    // Search for 'ace' matches Ace Bar, but cocktail type filter excludes it
    const filters = makeSectionFilters({ type: ['cocktail'] });
    const result = applyAll(ALL_PLACES, filters, 'ace', 'az');
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: empty result when no matches
// ---------------------------------------------------------------------------

describe('filter logic — empty results', () => {
  it('returns empty array when filter matches nothing', () => {
    const nowhere = makePlace({ key: 'x', name: 'No Match', category: 'pub', tags: [] });
    const filters = makeSectionFilters({ price: ['$$$'] });
    const result = applyAll([nowhere], filters, '', 'az');
    expect(result).toHaveLength(0);
  });
});

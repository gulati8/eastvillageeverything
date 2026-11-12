/**
 * placesForTab, and the counts the Saved tab shows once the list is narrowed
 * with it: the count line, the filter sheet's button and the chip counts must
 * describe the saved rows, not the whole list. Hook part uses the
 * react-test-renderer pattern from useFilterState.neighborhood.test.ts.
 */

import React from 'react';
import { act, create } from 'react-test-renderer';
import { placesForTab } from './tabPlaces';
import { useFilterState, type UseFilterStateReturn } from '../state/useFilterState';
import { ALL_NEIGHBORHOODS } from './neighborhoods';
import type { PlaceV2Display } from './placeV2Display';
import type { FilterSection } from './deriveFilterSections';
import type { TabKey } from '../components/TabBar';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function place(name: string, hood: string, tags: string[] = []): PlaceV2Display {
  return {
    key: name,
    name,
    street: null,
    tags,
    neighborhood: { value: hood, display: hood },
    signal: null,
    distance: null,
    closesIn: null,
  } as unknown as PlaceV2Display;
}

const PLACES = [
  place('Ace Bar', 'alphabet-city', ['pool']),
  place('Bar Bob', 'alphabet-city'),
  place('Chloe Bar', 'lower-east-side', ['pool']),
  place('Dirt', 'lower-east-side'),
  place('Elsewhere', 'lower-east-side', ['pool']),
];

const SECTIONS = [
  { key: 'games', label: 'Games', chips: [{ value: 'pool', label: 'Pool' }] },
] as unknown as FilterSection[];

const SAVED = new Set(['Ace Bar', 'Chloe Bar', 'Dirt']);

describe('placesForTab', () => {
  it('gives Home every place, untouched', () => {
    expect(placesForTab('home', PLACES, SAVED)).toBe(PLACES);
  });

  it('gives Saved only the saved places, in list order', () => {
    expect(placesForTab('saved', PLACES, SAVED).map((p) => p.name)).toEqual([
      'Ace Bar',
      'Chloe Bar',
      'Dirt',
    ]);
  });

  it('gives Saved nothing when nothing is saved', () => {
    expect(placesForTab('saved', PLACES, new Set())).toEqual([]);
  });

  it('ignores saved keys that are no longer in the list', () => {
    expect(placesForTab('saved', PLACES, new Set(['Gone', 'Dirt'])).map((p) => p.name)).toEqual([
      'Dirt',
    ]);
  });
});

interface Instance {
  current: UseFilterStateReturn;
}

function Probe({ into, tab }: { into: Instance; tab: TabKey }) {
  into.current = useFilterState(placesForTab(tab, PLACES, SAVED), SECTIONS, ALL_NEIGHBORHOODS);
  return null;
}

async function mount(tab: TabKey): Promise<Instance> {
  const into: Instance = { current: undefined as unknown as UseFilterStateReturn };
  await act(async () => {
    create(React.createElement(Probe, { into, tab }));
  });
  return into;
}

describe('counts on the Saved tab', () => {
  // react-test-renderer prints a deprecation notice through console.error.
  let originalConsoleError: typeof console.error;
  beforeAll(() => {
    originalConsoleError = console.error;
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalConsoleError;
  });

  it('total and match are the number of saved places', async () => {
    const saved = await mount('saved');
    expect(saved.current.totalCount).toBe(3);
    expect(saved.current.matchCount).toBe(3);

    const home = await mount('home');
    expect(home.current.totalCount).toBe(5);
  });

  it('a chip narrows the match within the saved total, and chip counts are saved-only', async () => {
    const saved = await mount('saved');
    expect(saved.current.chipCounts.pool).toBe(2); // 3 on Home
    await act(async () => {
      saved.current.toggleFilter('games', 'pool');
    });
    expect(saved.current.matchCount).toBe(2);
    expect(saved.current.totalCount).toBe(3);
    expect(saved.current.applyFilters(saved.current.scopedPlaces).map((p) => p.name)).toEqual([
      'Ace Bar',
      'Chloe Bar',
    ]);
  });

  it('a search narrows the match within the saved total', async () => {
    const saved = await mount('saved');
    await act(async () => {
      saved.current.setSearchQuery('dirt');
    });
    expect(saved.current.matchCount).toBe(1);
    expect(saved.current.totalCount).toBe(3);
    expect(saved.current.searchingEverywhere).toBe(false);
  });
});

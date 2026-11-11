/**
 * useFilterState — the neighborhood scope: counts and the list follow the
 * selected neighborhood until a search is typed, which covers every
 * neighborhood. react-test-renderer pattern, as in useSavedPlaces.hook.test.ts.
 */

import React from 'react';
import { act, create } from 'react-test-renderer';
import { useFilterState, type UseFilterStateReturn } from './useFilterState';
import type { PlaceV2Display } from '../data/placeV2Display';
import type { FilterSection } from '../data/deriveFilterSections';

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
];

const SECTIONS = [
  { key: 'games', label: 'Games', chips: [{ value: 'pool', label: 'Pool' }] },
] as unknown as FilterSection[];

interface Instance {
  current: UseFilterStateReturn;
}

function Probe({ into, hood }: { into: Instance; hood?: string }) {
  into.current = useFilterState(PLACES, SECTIONS, hood);
  return null;
}

async function mount(hood?: string): Promise<Instance> {
  const into: Instance = { current: undefined as unknown as UseFilterStateReturn };
  await act(async () => {
    create(React.createElement(Probe, { into, hood }));
  });
  return into;
}

function names(places: PlaceV2Display[]): string[] {
  return places.map((p) => p.name);
}

let originalConsoleError: typeof console.error;

beforeAll(() => {
  originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('react-test-renderer is deprecated')) return;
    originalConsoleError(...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe('useFilterState with a neighborhood', () => {
  it('covers every place when no neighborhood is given', async () => {
    const hook = await mount();
    expect(hook.current.totalCount).toBe(4);
    expect(hook.current.matchCount).toBe(4);
    expect(hook.current.searchingEverywhere).toBe(false);
    expect(hook.current.chipCounts).toEqual({ pool: 2 });
  });

  it('narrows the list and the counts to the selected neighborhood', async () => {
    const hook = await mount('lower-east-side');
    expect(names(hook.current.scopedPlaces)).toEqual(['Chloe Bar', 'Dirt']);
    expect(hook.current.totalCount).toBe(2);
    expect(hook.current.matchCount).toBe(2);
    expect(hook.current.chipCounts).toEqual({ pool: 1 });
    expect(hook.current.searchingEverywhere).toBe(false);
  });

  it('a typed search covers every neighborhood, and clearing it returns to the selected one', async () => {
    const hook = await mount('lower-east-side');

    await act(async () => {
      hook.current.setSearchQuery('bar');
    });
    expect(hook.current.searchingEverywhere).toBe(true);
    expect(names(hook.current.applyFilters(hook.current.scopedPlaces))).toEqual([
      'Ace Bar',
      'Bar Bob',
      'Chloe Bar',
    ]);
    expect(hook.current.matchCount).toBe(3);

    await act(async () => {
      hook.current.setSearchQuery('');
    });
    expect(hook.current.searchingEverywhere).toBe(false);
    expect(names(hook.current.applyFilters(hook.current.scopedPlaces))).toEqual(['Chloe Bar', 'Dirt']);
  });

  it('tag chips still apply to a search across neighborhoods', async () => {
    const hook = await mount('lower-east-side');
    await act(async () => {
      hook.current.setSearchQuery('bar');
      hook.current.toggleFilter('games', 'pool');
    });
    expect(names(hook.current.applyFilters(hook.current.scopedPlaces))).toEqual(['Ace Bar', 'Chloe Bar']);
    expect(hook.current.matchCount).toBe(2);
  });

  it("is not 'searching everywhere' when every neighborhood is already selected", async () => {
    const hook = await mount('all');
    await act(async () => {
      hook.current.setSearchQuery('bar');
    });
    expect(hook.current.searchingEverywhere).toBe(false);
  });
});

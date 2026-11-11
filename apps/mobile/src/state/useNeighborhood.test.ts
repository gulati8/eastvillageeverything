/**
 * useNeighborhood — hydration from AsyncStorage, the default row, and writes.
 *
 * Renders the real hook with react-test-renderer (same pattern as
 * useSavedPlaces.hook.test.ts). AsyncStorage is an in-memory map whose
 * `getItem` can be held open to exercise the pre-hydration path.
 */

import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import type { NeighborhoodSummary } from '@eve/shared-types';

const storage = new Map<string, string>();
let holdGetItem: Promise<void> | null = null;

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => {
      if (holdGetItem) await holdGetItem;
      return storage.get(key) ?? null;
    }),
    setItem: jest.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NEIGHBORHOOD_STORAGE_KEY, useNeighborhood } from './useNeighborhood';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const HOODS: NeighborhoodSummary[] = [
  { id: 'n1', value: 'alphabet-city', display: 'Alphabet City', is_default: true, order: '0' },
  { id: 'n2', value: 'lower-east-side', display: 'Lower East Side', is_default: false, order: '10' },
];

type HookResult = ReturnType<typeof useNeighborhood>;
interface Instance {
  current: HookResult;
}

function Probe({ into, hoods }: { into: Instance; hoods: NeighborhoodSummary[] | undefined }) {
  into.current = useNeighborhood(hoods);
  return null;
}

async function mount(into: Instance, hoods: NeighborhoodSummary[] | undefined): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(React.createElement(Probe, { into, hoods }));
  });
  return renderer;
}

function instance(): Instance {
  return { current: undefined as unknown as HookResult };
}

let originalConsoleError: typeof console.error;

beforeAll(() => {
  // react-test-renderer 19 logs a deprecation notice on every create().
  originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('react-test-renderer is deprecated')) return;
    originalConsoleError(...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
});

beforeEach(() => {
  storage.clear();
  holdGetItem = null;
});

describe('useNeighborhood', () => {
  it('defaults to the is_default row when nothing is stored, and writes nothing', async () => {
    const a = instance();
    await mount(a, HOODS);
    expect(a.current.selected).toBe('alphabet-city');
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('hydrates the stored choice', async () => {
    storage.set(NEIGHBORHOOD_STORAGE_KEY, 'lower-east-side');
    const a = instance();
    await mount(a, HOODS);
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(NEIGHBORHOOD_STORAGE_KEY);
    expect(a.current.selected).toBe('lower-east-side');
  });

  it("hydrates a stored 'all'", async () => {
    storage.set(NEIGHBORHOOD_STORAGE_KEY, 'all');
    const a = instance();
    await mount(a, HOODS);
    expect(a.current.selected).toBe('all');
  });

  it('falls back to the default when the stored neighborhood is gone', async () => {
    storage.set(NEIGHBORHOOD_STORAGE_KEY, 'renamed-away');
    const a = instance();
    await mount(a, HOODS);
    expect(a.current.selected).toBe('alphabet-city');
  });

  it('is unknown until the stored choice has been read', async () => {
    let release!: () => void;
    holdGetItem = new Promise<void>((resolve) => {
      release = resolve;
    });
    storage.set(NEIGHBORHOOD_STORAGE_KEY, 'lower-east-side');
    const a = instance();
    await mount(a, HOODS);
    expect(a.current.selected).toBeNull();

    await act(async () => {
      release();
      await holdGetItem;
    });
    expect(a.current.selected).toBe('lower-east-side');
  });

  it('is unknown without a stored choice until the neighborhoods load, then takes the default', async () => {
    const a = instance();
    const renderer = await mount(a, undefined);
    expect(a.current.selected).toBeNull();

    await act(async () => {
      renderer.update(React.createElement(Probe, { into: a, hoods: HOODS }));
    });
    expect(a.current.selected).toBe('alphabet-city');
  });

  it('trusts a stored choice before the neighborhoods load', async () => {
    storage.set(NEIGHBORHOOD_STORAGE_KEY, 'lower-east-side');
    const a = instance();
    await mount(a, undefined);
    expect(a.current.selected).toBe('lower-east-side');
  });

  it('select switches at once and writes the choice', async () => {
    const a = instance();
    await mount(a, HOODS);

    await act(async () => {
      a.current.select('lower-east-side');
    });
    expect(a.current.selected).toBe('lower-east-side');
    expect(storage.get(NEIGHBORHOOD_STORAGE_KEY)).toBe('lower-east-side');

    await act(async () => {
      a.current.select('all');
    });
    expect(a.current.selected).toBe('all');
    expect(storage.get(NEIGHBORHOOD_STORAGE_KEY)).toBe('all');
  });

  it('a choice made before hydration finishes is not overwritten by the stored one', async () => {
    let release!: () => void;
    holdGetItem = new Promise<void>((resolve) => {
      release = resolve;
    });
    storage.set(NEIGHBORHOOD_STORAGE_KEY, 'lower-east-side');
    const a = instance();
    await mount(a, HOODS);

    await act(async () => {
      a.current.select('all');
    });
    expect(a.current.selected).toBe('all');

    await act(async () => {
      release();
      await holdGetItem;
    });
    expect(a.current.selected).toBe('all');
  });

  it('a relaunch keeps the choice', async () => {
    const first = instance();
    const renderer = await mount(first, HOODS);
    await act(async () => {
      first.current.select('lower-east-side');
    });
    await act(async () => {
      renderer.unmount();
    });

    const second = instance();
    await mount(second, HOODS);
    expect(second.current.selected).toBe('lower-east-side');
  });
});

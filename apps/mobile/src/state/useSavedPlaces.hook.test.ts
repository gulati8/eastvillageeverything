/**
 * useSavedPlaces — shared state across hook instances.
 *
 * Renders real hook instances with react-test-renderer (no DOM, no native
 * renderer). AsyncStorage is replaced with an in-memory map whose `getItem`
 * can be held open to exercise the pre-hydration path.
 */

import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

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
import { useSavedPlaces } from './useSavedPlaces';
import {
  SAVED_PLACE_KEYS_STORAGE_KEY,
  flushSavedPlaceWrites,
  hasHydratedSavedPlaces,
  resetSavedPlacesStoreForTests,
} from './savedPlacesStore';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type HookResult = ReturnType<typeof useSavedPlaces>;

interface Instance {
  current: HookResult;
  renders: number;
}

function Probe({ into }: { into: Instance }) {
  into.current = useSavedPlaces();
  into.renders += 1;
  return null;
}

async function mount(...instances: Instance[]): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      React.createElement(
        React.Fragment,
        null,
        ...instances.map((into, i) => React.createElement(Probe, { key: i, into })),
      ),
    );
  });
  return renderer;
}

function instance(): Instance {
  return { current: undefined as unknown as HookResult, renders: 0 };
}

function storedKeys(): string[] {
  const raw = storage.get(SAVED_PLACE_KEYS_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as string[]) : [];
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
  resetSavedPlacesStoreForTests();
});

describe('useSavedPlaces (shared store)', () => {
  it('hydrates every instance from the stored keys', async () => {
    storage.set(SAVED_PLACE_KEYS_STORAGE_KEY, JSON.stringify(['a', 'b']));
    const list = instance();
    const detail = instance();

    const renderer = await mount(list, detail);

    expect(hasHydratedSavedPlaces()).toBe(true);
    expect(list.current.savedPlaceKeyList).toEqual(['a', 'b']);
    expect(detail.current.savedPlaceKeys.has('b')).toBe(true);
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('makes a toggle from the detail hook visible to the list hook without a remount', async () => {
    const list = instance();
    const detail = instance();
    const renderer = await mount(list, detail);
    const listRendersBefore = list.renders;

    await act(async () => {
      detail.current.toggleSavedPlace('veselka');
    });

    expect(list.current.savedPlaceKeys.has('veselka')).toBe(true);
    expect(detail.current.savedPlaceKeys.has('veselka')).toBe(true);
    expect(list.current.savedPlaceKeys).toBe(detail.current.savedPlaceKeys);
    expect(list.renders).toBeGreaterThan(listRendersBefore);
    act(() => renderer.unmount());
  });

  it('does not drop a save made in one instance when another instance toggles', async () => {
    const list = instance();
    const detail = instance();
    const renderer = await mount(list, detail);

    await act(async () => {
      list.current.toggleSavedPlace('a');
    });
    await act(async () => {
      detail.current.toggleSavedPlace('b');
    });
    await flushSavedPlaceWrites();

    expect(list.current.savedPlaceKeyList).toEqual(['a', 'b']);
    expect(detail.current.savedPlaceKeyList).toEqual(['a', 'b']);
    expect(storedKeys()).toEqual(['a', 'b']);
    act(() => renderer.unmount());
  });

  it('removes a key when toggled a second time from a different instance', async () => {
    const list = instance();
    const detail = instance();
    const renderer = await mount(list, detail);

    await act(async () => {
      list.current.toggleSavedPlace('a');
    });
    await act(async () => {
      detail.current.toggleSavedPlace('a');
    });
    await flushSavedPlaceWrites();

    expect(list.current.savedPlaceKeys.size).toBe(0);
    expect(storedKeys()).toEqual([]);
    act(() => renderer.unmount());
  });

  it('keeps the shared set when one instance unmounts and a new one mounts', async () => {
    const list = instance();
    const detail = instance();
    const renderer = await mount(list, detail);

    await act(async () => {
      detail.current.toggleSavedPlace('a');
    });
    act(() => renderer.unmount());

    const detailAgain = instance();
    const renderer2 = await mount(detailAgain);

    expect(detailAgain.current.savedPlaceKeys.has('a')).toBe(true);
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
    act(() => renderer2.unmount());
  });

  it('applies a toggle made before hydration on top of the stored keys', async () => {
    storage.set(SAVED_PLACE_KEYS_STORAGE_KEY, JSON.stringify(['stored']));
    let release!: () => void;
    holdGetItem = new Promise<void>((resolve) => {
      release = resolve;
    });

    const detail = instance();
    const renderer = await mount(detail);
    expect(hasHydratedSavedPlaces()).toBe(false);

    await act(async () => {
      detail.current.toggleSavedPlace('early');
    });
    expect(detail.current.savedPlaceKeys.has('early')).toBe(true);

    await act(async () => {
      release();
      await Promise.resolve();
    });
    await flushSavedPlaceWrites();

    expect(hasHydratedSavedPlaces()).toBe(true);
    expect(detail.current.savedPlaceKeyList).toEqual(['stored', 'early']);
    expect(storedKeys()).toEqual(['stored', 'early']);
    act(() => renderer.unmount());
  });

  it('exposes a stable toggle function across renders and instances', async () => {
    const list = instance();
    const detail = instance();
    const renderer = await mount(list, detail);
    const toggle = list.current.toggleSavedPlace;

    await act(async () => {
      detail.current.toggleSavedPlace('a');
    });

    expect(list.current.toggleSavedPlace).toBe(toggle);
    expect(detail.current.toggleSavedPlace).toBe(toggle);
    act(() => renderer.unmount());
  });
});

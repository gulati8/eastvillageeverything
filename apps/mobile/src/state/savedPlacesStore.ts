/**
 * Saved places store.
 *
 * A single module-level set of saved place keys shared by every screen.
 * `useSavedPlaces` subscribes to it with `useSyncExternalStore`, so the list
 * and the detail screen always read and write the same set, and a toggle in
 * one is visible to the other without a remount.
 *
 * Persistence: the set is hydrated once from AsyncStorage (same key as the
 * original per-component hook) and every change after hydration is written
 * back as a JSON array. Toggles made before hydration finishes are applied on
 * top of the stored keys as the state the user asked for, so neither the
 * stored keys nor the early tap is lost.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const SAVED_PLACE_KEYS_STORAGE_KEY = 'eve:saved-place-keys:v1';

type Listener = () => void;

let savedPlaceKeys: ReadonlySet<string> = new Set();
let hydrated = false;
let hydration: Promise<void> | null = null;
let writeChain: Promise<void> = Promise.resolve();
const pendingBeforeHydration = new Map<string, boolean>();
const listeners = new Set<Listener>();

export function parseSavedPlaceKeys(raw: string | null): string[] {
  if (raw == null) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const seen = new Set<string>();
    const keys: string[] = [];
    for (const value of parsed) {
      if (typeof value !== 'string' || value.length === 0 || seen.has(value)) continue;
      seen.add(value);
      keys.push(value);
    }
    return keys;
  } catch {
    return [];
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}

function persist(): void {
  const keys = Array.from(savedPlaceKeys);
  const payload = JSON.stringify(keys);
  writeChain = writeChain
    .then(() => AsyncStorage.setItem(SAVED_PLACE_KEYS_STORAGE_KEY, payload))
    .catch(() => undefined);
}

function replace(next: ReadonlySet<string>): void {
  savedPlaceKeys = next;
  emit();
}

export function subscribeSavedPlaces(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSavedPlaceKeys(): ReadonlySet<string> {
  return savedPlaceKeys;
}

export function hasHydratedSavedPlaces(): boolean {
  return hydrated;
}

/** Load the stored keys once. Later calls return the same promise. */
export function hydrateSavedPlaces(): Promise<void> {
  if (hydration) return hydration;

  hydration = (async () => {
    let raw: string | null = null;
    try {
      raw = await AsyncStorage.getItem(SAVED_PLACE_KEYS_STORAGE_KEY);
    } catch {
      raw = null;
    }

    const next = new Set(parseSavedPlaceKeys(raw));
    for (const [key, saved] of pendingBeforeHydration) {
      if (saved) {
        next.add(key);
      } else {
        next.delete(key);
      }
    }
    const hadPending = pendingBeforeHydration.size > 0;
    pendingBeforeHydration.clear();

    hydrated = true;
    replace(next);
    if (hadPending) persist();
  })();

  return hydration;
}

export function toggleSavedPlace(placeKey: string): void {
  const next = new Set(savedPlaceKeys);
  const nowSaved = !next.has(placeKey);
  if (nowSaved) {
    next.add(placeKey);
  } else {
    next.delete(placeKey);
  }

  if (!hydrated) {
    pendingBeforeHydration.set(placeKey, nowSaved);
    replace(next);
    return;
  }

  replace(next);
  persist();
}

/** Wait for queued AsyncStorage writes. Test helper. */
export function flushSavedPlaceWrites(): Promise<void> {
  return writeChain;
}

/** Drop all in-memory state so a test starts from a cold launch. */
export function resetSavedPlacesStoreForTests(): void {
  savedPlaceKeys = new Set();
  hydrated = false;
  hydration = null;
  writeChain = Promise.resolve();
  pendingBeforeHydration.clear();
  listeners.clear();
}

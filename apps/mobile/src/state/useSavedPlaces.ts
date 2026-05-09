import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

const SAVED_PLACE_KEYS_STORAGE_KEY = 'eve:saved-place-keys:v1';

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

export function useSavedPlaces() {
  const [savedPlaceKeys, setSavedPlaceKeys] = useState<Set<string>>(() => new Set());
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSavedPlaces() {
      const raw = await AsyncStorage.getItem(SAVED_PLACE_KEYS_STORAGE_KEY);
      if (cancelled) return;

      setSavedPlaceKeys(new Set(parseSavedPlaceKeys(raw)));
      setHasHydrated(true);
    }

    void loadSavedPlaces();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;

    const keys = Array.from(savedPlaceKeys);
    void AsyncStorage.setItem(SAVED_PLACE_KEYS_STORAGE_KEY, JSON.stringify(keys));
  }, [hasHydrated, savedPlaceKeys]);

  const toggleSavedPlace = useCallback((placeKey: string) => {
    setSavedPlaceKeys((prev) => {
      const next = new Set(prev);
      if (next.has(placeKey)) {
        next.delete(placeKey);
      } else {
        next.add(placeKey);
      }
      return next;
    });
  }, []);

  const savedPlaceKeyList = useMemo(() => Array.from(savedPlaceKeys), [savedPlaceKeys]);

  return {
    savedPlaceKeys,
    savedPlaceKeyList,
    toggleSavedPlace,
  };
}

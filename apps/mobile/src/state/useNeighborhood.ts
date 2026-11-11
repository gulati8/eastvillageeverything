import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NeighborhoodSummary } from '@eve/shared-types';
import { resolveNeighborhood } from '../data/neighborhoods';

export const NEIGHBORHOOD_STORAGE_KEY = 'eve:neighborhood:v1';

export interface UseNeighborhoodReturn {
  /**
   * The selected neighborhood slug or 'all'. Null until the stored choice has
   * been read and, when there is none, until the neighborhoods have loaded
   * (the default row is not known before that).
   */
  selected: string | null;
  /** Switch neighborhood and remember it on the device. */
  select: (value: string) => void;
}

/**
 * The neighborhood the Home list is showing, remembered across launches.
 *
 * Only an explicit choice is written to AsyncStorage. A device that never
 * chose follows the API's default row, so moving the default in the admin
 * moves those devices with it.
 */
export function useNeighborhood(
  neighborhoods: NeighborhoodSummary[] | undefined,
): UseNeighborhoodReturn {
  const [stored, setStored] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(NEIGHBORHOOD_STORAGE_KEY)
      .catch(() => null)
      .then((raw) => {
        if (cancelled) return;
        // A choice made before the read finished wins over the stored one.
        setStored((current) => current ?? (raw ? raw : null));
        setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const select = useCallback((value: string) => {
    setStored(value);
    setHydrated(true);
    AsyncStorage.setItem(NEIGHBORHOOD_STORAGE_KEY, value).catch(() => undefined);
  }, []);

  return {
    selected: hydrated ? resolveNeighborhood(stored, neighborhoods) : null,
    select,
  };
}

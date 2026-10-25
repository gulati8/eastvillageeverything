import { useEffect, useMemo, useSyncExternalStore } from 'react';
import {
  getSavedPlaceKeys,
  hydrateSavedPlaces,
  subscribeSavedPlaces,
  toggleSavedPlace,
} from './savedPlacesStore';

export { parseSavedPlaceKeys } from './savedPlacesStore';

/**
 * Read and toggle the shared saved-places set.
 *
 * Every instance of this hook reads the same module-level store
 * (`savedPlacesStore.ts`), so the list and the detail screen stay in sync and
 * never overwrite each other's AsyncStorage writes. The first mounted instance
 * kicks off hydration; later ones reuse it.
 */
export function useSavedPlaces() {
  useEffect(() => {
    void hydrateSavedPlaces();
  }, []);

  const savedPlaceKeys = useSyncExternalStore(
    subscribeSavedPlaces,
    getSavedPlaceKeys,
    getSavedPlaceKeys,
  );

  const savedPlaceKeyList = useMemo(() => Array.from(savedPlaceKeys), [savedPlaceKeys]);

  return {
    savedPlaceKeys,
    savedPlaceKeyList,
    toggleSavedPlace,
  };
}

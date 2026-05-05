import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import Constants from 'expo-constants';

/**
 * AsyncStorage-backed persister. Buster derived from the running app version:
 * a version bump invalidates the cache so a stale schema cannot resurrect.
 */
export function createPersister() {
  return createAsyncStoragePersister({
    storage: AsyncStorage,
    key: 'eve.tanstack-cache',
    throttleTime: 1000,
  });
}

/** Buster string used by PersistQueryClientProvider. */
export function getCacheBuster(): string {
  const v = Constants.expoConfig?.version;
  return v ? `app-${v}` : 'app-unknown';
}

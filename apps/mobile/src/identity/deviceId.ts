import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'eve.device_id';

// iOS 26 raises an NSException from the keychain layer when SecureStore is
// invoked without an explicit keychainService. Under the new architecture
// that exception is rethrown out of ObjCTurboModule::performVoidMethodInvocation
// and aborts the process on launch. Pinning the service to the bundle id
// keeps every call inside a single named keychain partition. iOS-only;
// ignored on Android. See facebook/react-native#54859.
const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainService: 'com.eastvillageeverything.app',
};

/**
 * Read or generate an anonymous device UUID.
 * Per architecture decision 2.5: never rotated by client; persisted to SecureStore.
 *
 * Throws if SecureStore is unavailable (e.g., Expo web target).
 * eve-mobile is iOS/Android only.
 */

// Single-flight guard: concurrent first-callers all await the same generation.
let pendingPromise: Promise<string> | null = null;

export async function getOrCreateDeviceId(): Promise<string> {
  if (pendingPromise) return pendingPromise;
  pendingPromise = (async () => {
    try {
      if (!SecureStore.isAvailableAsync) {
        throw new Error(
          'SecureStore not available on this platform; eve-mobile is iOS/Android only.'
        );
      }

      let existing: string | null;
      try {
        existing = await SecureStore.getItemAsync(STORAGE_KEY, SECURE_STORE_OPTIONS);
      } catch {
        throw new Error(
          'SecureStore not available on this platform; eve-mobile is iOS/Android only.'
        );
      }

      if (existing) return existing;

      const fresh = generateUuidV4();
      await SecureStore.setItemAsync(STORAGE_KEY, fresh, SECURE_STORE_OPTIONS);
      return fresh;
    } catch (err) {
      // on error, clear so next caller can retry
      pendingPromise = null;
      throw err;
    }
  })();
  return pendingPromise;
}

/**
 * RFC 4122 v4 fallback. Reached only when crypto.randomUUID is unavailable.
 * On Expo SDK 51 (Hermes + JSC), crypto.randomUUID is always present, so
 * this branch is unreachable in practice. Architecture decision 2.5 accepts
 * this fallback's non-cryptographic randomness because the device id is an
 * anonymous identifier, not a security boundary. If a future runtime lacks
 * crypto.randomUUID and we want stronger entropy, swap this for the
 * `react-native-get-random-values` polyfill + `uuid` package.
 */
function generateUuidV4(): string {
  // Use crypto.randomUUID if available; fallback for older RN runtimes.
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }

  // RFC 4122 v4 fallback using Math.random
  // Pattern: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * @internal
 * Remove the stored device id. For use in tests and dev tooling only.
 * Do not call this in production code.
 */
export async function clearDeviceIdForTest(): Promise<void> {
  pendingPromise = null;
  await SecureStore.deleteItemAsync(STORAGE_KEY, SECURE_STORE_OPTIONS);
}

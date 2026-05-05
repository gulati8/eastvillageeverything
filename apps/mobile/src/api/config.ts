/**
 * Resolve the API base URL from the EAS-injected EXPO_PUBLIC_API_BASE_URL.
 * T1.12 wires per-profile values in eas.json. Default fallback for local dev:
 * auto-detected from the Metro bundler's debuggerHost (Expo Go), or
 * http://localhost:3000 for simulators.
 */
import Constants from 'expo-constants';

export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (fromEnv && fromEnv.length > 0) return fromEnv.replace(/\/$/, '');

  if (__DEV__) {
    // In Expo Go, debuggerHost is "ip:port" of the Metro bundler.
    // Extract the IP so we can reach the API server on the same machine.
    const debuggerHost = Constants.expoGoConfig?.debuggerHost;
    if (debuggerHost) {
      const ip = debuggerHost.split(':')[0];
      return `http://${ip}:3000`;
    }
    // Fallback for simulators where localhost works
    return 'http://localhost:3000';
  }

  throw new Error(
    'EXPO_PUBLIC_API_BASE_URL is not set. ' +
    'Configure it via eas.json env block for the build profile.'
  );
}

export const REQUEST_TIMEOUT_MS = 10_000;

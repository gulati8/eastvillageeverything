import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { ApiError } from '../api/errors';

/**
 * Initializes Sentry on app cold-start. Safe to call multiple times — Sentry
 * dedupes init internally, but we guard with a module-level flag anyway.
 *
 * DSN comes from EXPO_PUBLIC_SENTRY_DSN. If missing, Sentry init is a no-op
 * (returns false). Local development will typically not have a DSN; that's fine.
 */
let initialized = false;

export function initSentry(): boolean {
  if (initialized) return true;
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    // No DSN configured — skip silently. Logged once for visibility.
    if (__DEV__) {
      console.log('[sentry] EXPO_PUBLIC_SENTRY_DSN not set; crash reporting disabled.');
    }
    return false;
  }

  const env = process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT
    ?? (process.env.NODE_ENV === 'production' ? 'production' : 'development');
  const release = Constants.expoConfig?.version
    ? `eve-mobile@${Constants.expoConfig.version}`
    : 'eve-mobile@unknown';

  Sentry.init({
    dsn,
    environment: env,
    release,
    debug: __DEV__,
    tracesSampleRate: env === 'production' ? 0.1 : 1.0,
    // Strip location/coords from breadcrumbs (Phase 3 will rely on this).
    // For Phase 1 there is no location data; this is forward-defensive.
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.data) {
        for (const k of Object.keys(breadcrumb.data)) {
          if (/lat|lng|latitude|longitude|coord/i.test(k)) {
            delete breadcrumb.data[k];
          }
          if (/^x-device-id$/i.test(k)) {
            delete breadcrumb.data[k];
          }
        }
        // also scrub headers nested objects if present
        for (const headerKey of ['request_headers', 'response_headers', 'headers'] as const) {
          const headers = (breadcrumb.data as any)[headerKey];
          if (headers && typeof headers === 'object') {
            for (const h of Object.keys(headers)) {
              if (/^x-device-id$/i.test(h)) delete headers[h];
            }
          }
        }
      }
      return breadcrumb;
    },
  });

  initialized = true;
  return true;
}

/**
 * Report an unhandled ApiError to Sentry with structured tags.
 * 4xx are info-level (expected), 5xx are error-level (server issue).
 */
export function reportApiError(err: ApiError, context?: Record<string, unknown>) {
  if (!initialized) return;
  Sentry.captureException(err, {
    tags: {
      api_status: String(err.status),
      api_code: err.code,
    },
    contexts: context ? { extra: context as any } : undefined,
    level: err.status >= 500 ? 'error' : 'info',
  });
}

/**
 * Report a generic exception (network errors, timeouts, etc).
 */
export function reportException(err: unknown, context?: Record<string, unknown>) {
  if (!initialized) return;
  Sentry.captureException(err, context ? { contexts: { extra: context as any } } : undefined);
}

export { Sentry };

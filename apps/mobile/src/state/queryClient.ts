import { QueryClient } from '@tanstack/react-query';

/**
 * Per architecture decision and Phase 1 product-thinking defaults:
 * - staleTime 60s (places data changes infrequently)
 * - gcTime 24h (allow long-lived persisted cache across launches)
 * - retry 2 with exponential backoff
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 24 * 60 * 60 * 1000,
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30_000),
        refetchOnReconnect: true,
        refetchOnWindowFocus: false, // not meaningful in RN
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

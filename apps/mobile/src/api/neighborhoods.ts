import { useQuery } from '@tanstack/react-query';
import { neighborhoodsApi } from './client';
import type { NeighborhoodSummary } from '@eve/shared-types';

/** Every neighborhood, in the API's display order. Persisted like the other queries. */
export function useNeighborhoods() {
  return useQuery<NeighborhoodSummary[]>({
    queryKey: ['neighborhoods'],
    queryFn: () => neighborhoodsApi.list(),
  });
}

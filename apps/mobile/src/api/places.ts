import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { placesApi } from './client';
import type { PlacesListResponse, PlaceDetailResponse } from '@eve/shared-types';

export function usePlacesList(tag?: string | null) {
  return useQuery<PlacesListResponse>({
    queryKey: tag ? ['places', tag] : ['places'],
    queryFn: () => placesApi.list(tag ?? undefined),
  });
}

export function placeQueryOptions(queryClient: QueryClient, id: string | undefined) {
  return {
    queryKey: ['place', id] as const,
    queryFn: () => placesApi.byId(id!),
    enabled: typeof id === 'string' && id.length > 0,
    // The list row is only a partial record (no perfect/insider copy, no
    // photo attribution). Mark the seed as already stale so the full detail
    // is fetched immediately while the row data renders in the meantime.
    initialDataUpdatedAt: 0,
    initialData: (): PlaceDetailResponse | undefined => {
      if (typeof id !== 'string' || id.length === 0) return undefined;

      const placeLists = queryClient.getQueriesData<PlacesListResponse>({
        queryKey: ['places'],
      });

      for (const [, places] of placeLists) {
        const cachedPlace = places?.find((place) => place.key === id);
        if (cachedPlace) return cachedPlace;
      }

      return undefined;
    },
  };
}

export function usePlace(id: string | undefined) {
  const queryClient = useQueryClient();

  return useQuery<PlaceDetailResponse>(placeQueryOptions(queryClient, id));
}

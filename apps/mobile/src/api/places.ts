import { useQuery, useQueryClient } from '@tanstack/react-query';
import { placesApi } from './client';
import type { PlacesListResponse, PlaceDetailResponse } from '@eve/shared-types';

export function usePlacesList(tag?: string | null) {
  return useQuery<PlacesListResponse>({
    queryKey: tag ? ['places', tag] : ['places'],
    queryFn: () => placesApi.list(tag ?? undefined),
  });
}

export function usePlace(id: string | undefined) {
  const queryClient = useQueryClient();

  return useQuery<PlaceDetailResponse>({
    queryKey: ['place', id],
    queryFn: () => placesApi.byId(id!),
    enabled: typeof id === 'string' && id.length > 0,
    initialData: () => {
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
  });
}

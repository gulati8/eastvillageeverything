import { useQuery } from '@tanstack/react-query';
import { placesApi } from './client';
import type { PlacesListResponse, PlaceDetailResponse } from '@eve/shared-types';

export function usePlacesList(tag?: string | null) {
  return useQuery<PlacesListResponse>({
    queryKey: tag ? ['places', tag] : ['places'],
    queryFn: () => placesApi.list(tag ?? undefined),
  });
}

export function usePlace(id: string | undefined) {
  return useQuery<PlaceDetailResponse>({
    queryKey: ['place', id],
    queryFn: () => placesApi.byId(id!),
    enabled: typeof id === 'string' && id.length > 0,
  });
}

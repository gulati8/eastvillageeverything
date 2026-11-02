import type { PlacePhoto, PlacePhotoResponse } from '@eve/shared-types';

/** Wire shape of one uploaded photo, as the admin UI and `GET /api/places/:id` carry it. */
export function toPlacePhotoResponse(row: PlacePhoto): PlacePhotoResponse {
  return {
    id: row.id,
    url: row.url,
    thumb_url: row.thumb_url,
    hero_url: row.hero_url,
    credit: row.credit,
    position: row.position,
    attribution: null,
  };
}

/** Base URL of the public Express API; empty in prod because `/api` shares the origin. */
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

/** The Google photo proxy URL for a place, served by Express (302 to the Google CDN). */
export function googlePhotoUrl(placeId: string, size: 'orig' | 'thumb' | 'hero'): string {
  return `${API_BASE}/api/places/${placeId}/photo?size=${size}`;
}

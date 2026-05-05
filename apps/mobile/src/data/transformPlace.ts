import type { PlaceResponse } from '@eve/shared-types';
import type { PlaceV2Display } from './placeV2Display';
import { inferCategory } from './categoryMap';

export function transformPlace(p: PlaceResponse): PlaceV2Display {
  const firstLine = p.categories ? p.categories.split('\n')[0].trim() || null : null;

  return {
    key: p.key,
    name: p.name,
    kind: firstLine,
    category: inferCategory(p.categories),
    street: p.address ?? null,
    tags: Array.isArray(p.tags) ? p.tags : [],
    phone: p.phone ?? null,
    url: p.url ?? null,
    lat: p.lat ?? null,
    lng: p.lng ?? null,
    // Enrichment fields — not available from API; will be null until server provides them
    cross: null,
    hours: null,
    open: null,
    vibe: null,
    photo: null,
    photoCredit: null,
    pitch: null,
    perfect: null,
    insider: null,
    crowd: null,
    distance: null,
    closesIn: null,
    signal: null,
    crowdLevel: null,
    priceTier: null,
  };
}

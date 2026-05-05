import type { PlaceResponse } from '@eve/shared-types';
import type { PlaceV2Display, CrowdLevel, PriceTier } from './placeV2Display';
import { inferCategory } from './categoryMap';

function isCrowdLevel(v: unknown): v is CrowdLevel {
  return v === 'Quiet' || v === 'Light' || v === 'Steady' || v === 'Filling up' || v === 'Booked till 11';
}

function isPriceTier(v: unknown): v is PriceTier {
  return v === '$' || v === '$$' || v === '$$$';
}

export function transformPlace(p: PlaceResponse): PlaceV2Display {
  const firstLine = p.categories ? p.categories.split('\n')[0].trim() || null : null;

  return {
    key: p.key,
    name: p.name,
    kind: firstLine,
    category: inferCategory(p.categories),
    street: p.address ?? null,
    cross: p.cross_street ?? null,
    tags: Array.isArray(p.tags) ? p.tags : [],
    phone: p.phone ?? null,
    url: p.url ?? null,
    lat: p.lat ?? null,
    lng: p.lng ?? null,
    photo: p.photo_url ?? null,
    photoCredit: p.photo_credit ?? null,
    pitch: p.pitch ?? null,
    perfect: p.perfect ?? null,
    insider: p.insider ?? null,
    crowd: p.crowd ?? null,
    vibe: p.vibe ?? null,
    crowdLevel: isCrowdLevel(p.crowd_level) ? p.crowd_level : null,
    priceTier: isPriceTier(p.price_tier) ? p.price_tier : null,
    hours: null,        // hours derivation deferred to a later phase
    open: null,         // not derived in Phase 1
    distance: null,     // not derived in Phase 1
    closesIn: null,     // not derived in Phase 1
    signal: null,       // not derived in Phase 1
  };
}

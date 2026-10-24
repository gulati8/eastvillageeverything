import type { PlaceResponse } from '@eve/shared-types';
import type { HoursSummary, PlaceV2Display } from './placeV2Display';

function normalizeString(v: string | null | undefined): string | null {
  const trimmed = v?.trim();
  return trimmed ? trimmed : null;
}

/**
 * First usable URL from the candidates, in order. Empty or whitespace-only
 * strings count as absent so a blank column falls through to the next size.
 */
function firstPhoto(...candidates: Array<string | null | undefined>): string | null {
  for (const candidate of candidates) {
    const url = normalizeString(candidate);
    if (url) return url;
  }
  return null;
}

function summarizeHours(p: PlaceResponse): HoursSummary | null {
  const hoursJson = p.hours_json ?? null;
  if (!hoursJson) return null;

  const weekdayDescriptions = hoursJson.weekdayDescriptions;
  const label = Array.isArray(weekdayDescriptions) && weekdayDescriptions.length > 0
    ? weekdayDescriptions[new Date().getDay()] ?? null
    : null;

  return {
    openNow: null,
    label,
  };
}

export function transformPlace(p: PlaceResponse): PlaceV2Display {
  const tags = Array.isArray(p.tags) ? p.tags : [];

  return {
    key: p.key,
    name: p.name,
    street: p.address ?? null,
    cross: p.cross_street ?? null,
    tags,
    phone: p.phone ?? null,
    url: p.url ?? null,
    lat: p.lat ?? null,
    lng: p.lng ?? null,
    photo: firstPhoto(p.photo_url),
    photoThumb: firstPhoto(p.photo_thumb_url, p.photo_url),
    photoHero: firstPhoto(p.photo_hero_url, p.photo_url),
    photoCredit: p.photo_credit ?? null,
    specials: p.specials ?? null,
    notes: p.notes ?? null,
    pitch: p.pitch ?? null,
    perfect: p.perfect ?? null,
    insider: p.insider ?? null,
    crowd: p.crowd ?? null,
    vibe: p.vibe ?? null,
    crowdLevel: normalizeString(p.crowd_level),
    priceTier: normalizeString(p.price_tier),
    googlePriceLevel: p.google_price_level ?? null,
    hours: summarizeHours(p),
    hoursJson: p.hours_json ?? null,
    distance: null,     // not derived in Phase 1
    closesIn: null,     // not derived in Phase 1
    signal: null,       // not derived in Phase 1
  };
}

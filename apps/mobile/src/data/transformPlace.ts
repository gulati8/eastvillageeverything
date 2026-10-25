import type { HoursJson, PlaceDetailResponse, PlaceResponse } from '@eve/shared-types';
import { getETWeekday } from '../signals/hours';
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

/**
 * Today's line from Google's weekdayDescriptions, e.g. "Monday: 2:00 PM – 4:00 AM".
 *
 * Google orders weekdayDescriptions Monday-first (index 0 = Monday, 6 = Sunday),
 * while JS Date#getDay and Google period.open.day are Sunday-first, so the
 * weekday has to be rotated by one. "Today" is the Eastern Time day, because
 * every place is in New York and the device clock may be elsewhere.
 */
export function todayHoursLabel(hoursJson: HoursJson | null, now: Date = new Date()): string | null {
  if (!hoursJson) return null;
  const weekdayDescriptions = hoursJson.weekdayDescriptions;
  if (!Array.isArray(weekdayDescriptions) || weekdayDescriptions.length === 0) return null;
  const mondayFirstIndex = (getETWeekday(now) + 6) % 7;
  return weekdayDescriptions[mondayFirstIndex] ?? null;
}

function summarizeHours(p: PlaceResponse): HoursSummary | null {
  const hoursJson = p.hours_json ?? null;
  if (!hoursJson) return null;

  return {
    openNow: null,
    label: todayHoursLabel(hoursJson),
  };
}

/**
 * Accepts a list row (PlaceResponse) or a detail response; `photo_attribution`
 * only exists on the latter, so list-seeded detail renders have it null until
 * the detail fetch lands.
 */
export function transformPlace(p: PlaceResponse | PlaceDetailResponse): PlaceV2Display {
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
    photoAttribution: normalizeString('photo_attribution' in p ? p.photo_attribution : null),
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

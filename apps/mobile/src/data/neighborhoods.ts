import type { NeighborhoodSummary } from '@eve/shared-types';
import type { PlaceV2Display } from './placeV2Display';

/** Selection value meaning "every neighborhood". Never a real slug (slugs come from display names). */
export const ALL_NEIGHBORHOODS = 'all';

export interface NeighborhoodPill {
  /** Neighborhood slug, or ALL_NEIGHBORHOODS. */
  value: string;
  label: string;
  count: number;
}

/**
 * The neighborhood the list should show, or null while it cannot be known yet.
 *
 * `stored` is the device's remembered choice (null when the user never chose).
 * Until the neighborhoods have loaded a stored choice is trusted as is; once
 * they have, a choice that no longer exists (a renamed neighborhood changes
 * its slug) falls back to the default row.
 */
export function resolveNeighborhood(
  stored: string | null,
  neighborhoods: NeighborhoodSummary[] | undefined,
): string | null {
  if (!neighborhoods) return stored;
  if (stored === ALL_NEIGHBORHOODS) return stored;
  if (stored !== null && neighborhoods.some((n) => n.value === stored)) return stored;
  const fallback = neighborhoods.find((n) => n.is_default) ?? neighborhoods[0];
  return fallback ? fallback.value : ALL_NEIGHBORHOODS;
}

/**
 * Narrow the list to the selected neighborhood. A typed search covers every
 * neighborhood, so with a query the list is returned whole.
 */
export function filterByNeighborhood(
  places: PlaceV2Display[],
  selected: string,
  searchQuery: string,
): PlaceV2Display[] {
  if (selected === ALL_NEIGHBORHOODS || searchQuery.trim() !== '') return places;
  return places.filter((place) => place.neighborhood?.value === selected);
}

/**
 * Pills for the switcher: one per neighborhood in the API's order with its
 * place count from the loaded list, then "All". A neighborhood with no places
 * is left out unless it is the selected one, so no pill leads to an empty list.
 */
export function neighborhoodPills(
  neighborhoods: NeighborhoodSummary[],
  places: PlaceV2Display[],
  selected: string | null,
): NeighborhoodPill[] {
  const counts = new Map<string, number>();
  for (const place of places) {
    const value = place.neighborhood?.value;
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  const pills: NeighborhoodPill[] = [];
  for (const neighborhood of neighborhoods) {
    const count = counts.get(neighborhood.value) ?? 0;
    if (count === 0 && neighborhood.value !== selected) continue;
    pills.push({ value: neighborhood.value, label: neighborhood.display, count });
  }
  pills.push({ value: ALL_NEIGHBORHOODS, label: 'All', count: places.length });
  return pills;
}

/** The masthead title for a selection. Null when the name is not known yet. */
export function neighborhoodTitle(
  selected: string | null,
  neighborhoods: NeighborhoodSummary[] | undefined,
  places: PlaceV2Display[],
): string | null {
  if (selected === null) return null;
  if (selected === ALL_NEIGHBORHOODS) return 'All neighborhoods';
  const row = neighborhoods?.find((n) => n.value === selected);
  if (row) return row.display;
  const place = places.find((p) => p.neighborhood?.value === selected);
  return place?.neighborhood?.display ?? null;
}

/** "<street> · <neighborhood>", or whichever of the two exists; null when neither does. */
export function streetWithNeighborhood(
  place: Pick<PlaceV2Display, 'street' | 'neighborhood'>,
): string | null {
  const parts = [place.street, place.neighborhood?.display ?? null].filter(
    (part): part is string => typeof part === 'string' && part.trim() !== '',
  );
  return parts.length > 0 ? parts.join(' · ') : null;
}

/** Free-text query handed to the Maps app for a place. */
export function mapsQueryText(
  place: Pick<PlaceV2Display, 'name' | 'street' | 'neighborhood'>,
): string {
  const area = place.neighborhood?.display ?? 'New York';
  return place.street
    ? `${place.name}, ${place.street}, ${area}, New York, NY`
    : `${place.name}, ${area}, New York, NY`;
}

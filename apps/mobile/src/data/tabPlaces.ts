import type { TabKey } from '../components/TabBar';

/**
 * The places a tab counts and lists. Home works over every place; Saved works
 * over the saved ones only, so its count line, the filter sheet's "Show n
 * spots" button and the chip counts all describe the saved rows and not the
 * whole list.
 */
export function placesForTab<P extends { key: string }>(
  tab: TabKey,
  allPlaces: P[],
  savedKeys: ReadonlySet<string>,
): P[] {
  if (tab !== 'saved') return allPlaces;
  return allPlaces.filter((place) => savedKeys.has(place.key));
}

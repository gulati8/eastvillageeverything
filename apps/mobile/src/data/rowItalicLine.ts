import { collapseWhitespace, formatTagLabel } from '../format/text';
import type { PlaceV2Display } from './placeV2Display';

/** How many tag labels the fallback strings together (design spec: "first 2-3"). */
export const ROW_FALLBACK_TAG_COUNT = 3;

/**
 * Text for the italic line under a list row's name.
 *
 * Prefers the editorial `perfect` completion, collapsed to a single line.
 * Falls back to the first few tag labels joined with " · " so the line is
 * never blank for a tagged place. Returns null only when there is neither.
 */
export function rowItalicLine(place: Pick<PlaceV2Display, 'perfect' | 'tags'>): string | null {
  const perfect = place.perfect ? collapseWhitespace(place.perfect) : '';
  if (perfect) return perfect;

  const labels = (Array.isArray(place.tags) ? place.tags : [])
    .map((tag) => formatTagLabel(tag))
    .filter((label) => label.length > 0)
    .slice(0, ROW_FALLBACK_TAG_COUNT);

  return labels.length > 0 ? labels.join(' · ') : null;
}

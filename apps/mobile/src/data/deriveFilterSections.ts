import type { TagsStructuredResponse } from '@eve/shared-types';

export interface FilterChip {
  value: string;
  label: string;
  sectionKey: string;
}

export interface FilterSection {
  key: string;
  title: string;
  chips: FilterChip[];
}

export interface TaggablePlace {
  tags: string[];
}

const TAG_SECTION_KEY = 'tags';
const TAG_SECTION_TITLE = 'Tags';

function sortOrder(order: string | number | null | undefined): number {
  const parsed = Number(order);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

/**
 * Derive one flat mobile filter section from server tags.
 *
 * Mobile treats tags as the only descriptive filter taxonomy. Admin may group
 * tags for editing, but those groups are not mobile UI sections.
 */
export function deriveFilterSections(tags: TagsStructuredResponse): FilterSection[] {
  if (Array.isArray(tags)) {
    const chips = tags
      .slice()
      .sort((a, b) => sortOrder(a.order) - sortOrder(b.order))
      .map((tag) => ({
        value: tag.value,
        label: tag.display,
        sectionKey: TAG_SECTION_KEY,
      }));

    return chips.length > 0 ? [{ key: TAG_SECTION_KEY, title: TAG_SECTION_TITLE, chips }] : [];
  }

  if (!tags || typeof tags !== 'object') return [];
  const parents = (tags as { parents?: unknown }).parents;
  const standalone = (tags as { standalone?: unknown }).standalone;
  if (!Array.isArray(parents)) return [];

  const chips = [
    ...(Array.isArray(standalone) ? (standalone as TagsStructuredResponse['standalone']) : []),
    ...(parents as TagsStructuredResponse['parents']).flatMap((parent) =>
      Array.isArray(parent.children) ? parent.children : [],
    ),
  ]
    .slice()
    .sort((a, b) => sortOrder(a.order) - sortOrder(b.order))
    .map((tag) => ({
      value: tag.value,
      label: tag.display,
      sectionKey: TAG_SECTION_KEY,
    }));

  return chips.length > 0 ? [{ key: TAG_SECTION_KEY, title: TAG_SECTION_TITLE, chips }] : [];
}

export function filterSectionsForPlaces(
  sections: FilterSection[],
  places: TaggablePlace[],
): FilterSection[] {
  const placeTags = new Set(places.flatMap((place) => place.tags));

  return sections
    .map((section) => ({
      ...section,
      chips: section.chips.filter((chip) => placeTags.has(chip.value)),
    }))
    .filter((section) => section.chips.length > 0);
}

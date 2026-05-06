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

/**
 * Derive UI filter sections from the server's structured tag taxonomy.
 *
 * Each parent tag becomes a section. Standalone tags are dropped (not
 * rendered with no header in v1). Server-supplied sort order is honored
 * as-is — this function does not re-sort.
 *
 * Defensive against unexpected server shapes: a deployed server that
 * predates the `?structured=1` handler returns the legacy flat array
 * ([{value, display, order}, …]); rather than crash the screen, we
 * return [] and let filter chips remain hidden until the server ships
 * the structured response.
 */
export function deriveFilterSections(tags: TagsStructuredResponse): FilterSection[] {
  if (!tags || typeof tags !== 'object') return [];
  const parents = (tags as { parents?: unknown }).parents;
  if (!Array.isArray(parents)) return [];

  return (parents as TagsStructuredResponse['parents']).map((parent) => ({
    key: parent.value,
    title: parent.display,
    chips: (Array.isArray(parent.children) ? parent.children : []).map((child) => ({
      value: child.value,
      label: child.display,
      sectionKey: parent.value,
    })),
  }));
}

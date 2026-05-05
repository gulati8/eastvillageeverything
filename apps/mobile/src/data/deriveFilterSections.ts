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
 */
export function deriveFilterSections(tags: TagsStructuredResponse): FilterSection[] {
  return tags.parents.map((parent) => ({
    key: parent.value,
    title: parent.display,
    chips: parent.children.map((child) => ({
      value: child.value,
      label: child.display,
      sectionKey: parent.value,
    })),
  }));
}

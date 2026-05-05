/**
 * Tag as returned by the PostgreSQL driver — timestamps are Date objects.
 * Used internally by src/models/tag.ts.
 */
export interface Tag {
  id: string;
  value: string;
  display: string;
  sort_order: number;
  parent_tag_id: string | null;
  has_children: boolean;
  created_at: Date;
  updated_at: Date;
}

/** API projection of Tag for /api/tags flat response (trimmed, public-safe). */
export interface TagSummary {
  value: string;
  display: string;
  order: string;
}

/** API projection of Tag with nested children — used in structured API responses. */
export interface TagWithChildren extends TagSummary {
  children: TagSummary[];
}

/** The shape returned by the structured tags API (GET /api/tags?structured=1). */
export interface StructuredTags {
  parents: TagWithChildren[];
  standalone: TagSummary[];
}

/** DB-row Tag with its children nested — used by TagModel.findAllStructured internally. */
export interface TagWithChildrenRow extends Tag {
  children: Tag[];
}

/** The shape returned by TagModel.findAllStructured (DB rows, not API projection). */
export interface StructuredTagRows {
  parents: TagWithChildrenRow[];
  standalone: Tag[];
}

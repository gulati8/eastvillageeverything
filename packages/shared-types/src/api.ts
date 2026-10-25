import type { PlaceResponse } from './place.js';
import type { TagSummary, StructuredTags } from './tag.js';

/**
 * Response for GET /api/places (list).
 *
 * List rows carry the editorial `pitch` and `perfect` strings (the mobile row's
 * italic line shows `perfect`, falling back to tag labels); `insider`, `crowd`
 * and `vibe` are detail-only.
 */
export type PlacesListResponse = PlaceResponse[];

/**
 * Response for GET /api/places/:id.
 *
 * `photo_attribution` is the Google photo author's name when the photo fields
 * point at the server-side Google photo proxy (`/api/places/:id/photo`), and
 * null when the photo is an admin upload or there is no photo. Optional in the
 * type so a list row can seed the detail cache; the API always sets it.
 */
export type PlaceDetailResponse = PlaceResponse & {
  photo_attribution?: string | null;
};

/** Response for GET /api/tags (flat list) */
export type TagsFlatResponse = TagSummary[];

/** Response for GET /api/tags?structured=1 */
export type TagsStructuredResponse = StructuredTags;

import type { PlaceResponse } from './place.js';
import type { TagSummary, StructuredTags } from './tag.js';

/** Response for GET /api/places (list) */
export type PlacesListResponse = PlaceResponse[];

/** Response for GET /api/places/:id */
export type PlaceDetailResponse = PlaceResponse;

/** Response for GET /api/tags (flat list) */
export type TagsFlatResponse = TagSummary[];

/** Response for GET /api/tags?structured=1 */
export type TagsStructuredResponse = StructuredTags;

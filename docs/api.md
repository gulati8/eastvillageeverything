# EVE Public JSON API

Base path: `/api/`

No authentication required. All responses are `Content-Type: application/json; charset=utf-8`.

## Rate limiting

`/api/*` is rate-limited via `express-rate-limit`. Configuration:

| Environment | Limit |
|---|---|
| Production (`NODE_ENV=production`) | 100 requests / minute / IP |
| Dev | 1000 requests / minute / IP |

Responses include `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset` headers (RFC 9239 standard). When a client exceeds the limit, the server returns:

```
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: <seconds>

{ "error": "Too many requests" }
```

## Error shape

```json
{ "error": "message string" }
```

---

## GET /api/places

Returns a list of places, optionally filtered by neighborhood and/or tag, and optionally paginated.

**Query parameters**

| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `neighborhood` | string | no | — | Returns only places in the neighborhood with this `value` slug (see `GET /api/neighborhoods`). An unknown slug returns `[]` with 200. |
| `tag` | string | no | — | Returns only places that have this tag value |
| `limit` | integer | no | none | Page size, clamped to `[1, 200]`. When omitted, the whole list is returned (no limit). |
| `offset` | integer | no | 0 | Number of rows to skip, clamped to `>= 0`. Only applied together with `limit`. |

`neighborhood` and `tag` combine with AND. Non-numeric `limit` / `offset` values are silently ignored, as if omitted.

**Response 200**

Array of place objects. The list response includes a subset of fields suitable for rendering a directory:

```json
[
  {
    "key": "uuid",
    "name": "string",
    "address": "string | null",
    "phone": "string | null",
    "url": "string | null",
    "specials": "string | null",
    "categories": "string | null",
    "notes": "string | null",
    "tags": ["string"],
    "lat": "number | null",
    "lng": "number | null",
    "created_at": "ISO 8601 string",
    "updated_at": "ISO 8601 string",
    "pitch": "string | null",
    "perfect": "string | null",
    "crowd_level": "string | null",
    "price_tier": "string | null",
    "photo_url": "string | null",
    "photo_thumb_url": "string | null",
    "photo_hero_url": "string | null",
    "hours_json": "object | null",
    "cross_street": "string | null",
    "neighborhood_id": "uuid",
    "neighborhood": { "value": "string", "display": "string" }
  }
]
```

Notes:
- `key` is the place UUID (not `id`).
- `neighborhood` is the place's neighborhood: `value` is the slug accepted by `?neighborhood=`, `display` is the name to show (for example `{ "value": "east-village", "display": "East Village" }`). Every place has one; `neighborhood_id` is the same neighborhood's UUID.
- `phone` is stored as digits only; format for display on the client.
- `specials`, `categories`, `notes` store plain text with `\n` newlines. Render with `white-space: pre-wrap`.
- `lat` and `lng` are nullable. Currently always `null`; Phase 2 will populate via geocoding.
- `pitch`, `perfect`, `crowd_level`, `price_tier`, `photo_url`, `hours_json`, `cross_street` come from the editorial / Google Places enrichment columns (`scripts/enrich-places.ts`). They are nullable for places that have not been enriched.
- `perfect` is the editorial "Perfect when ..." completion (no prefix). The mobile list row shows it as the italic line under the name, falling back to tag labels when null.

---

## GET /api/places/:id

Returns a single place by UUID.

**Path parameter:** UUID of the place.

**Response 200** — superset of the list response, with additional editorial / enrichment fields:

```json
{
  "key": "uuid",
  "name": "string",
  "address": "string | null",
  "phone": "string | null",
  "url": "string | null",
  "specials": "string | null",
  "categories": "string | null",
  "notes": "string | null",
  "tags": ["string"],
  "created_at": "ISO 8601 string",
  "updated_at": "ISO 8601 string",
  "lat": "number | null",
  "lng": "number | null",
  "pitch": "string | null",
  "perfect": "string | null",
  "insider": "string | null",
  "crowd": "string | null",
  "vibe": "string | null",
  "crowd_level": "string | null",
  "price_tier": "string | null",
  "cross_street": "string | null",
  "neighborhood_id": "uuid",
  "neighborhood": { "value": "string", "display": "string" },
  "photo_url": "string | null",
  "photo_thumb_url": "string | null",
  "photo_hero_url": "string | null",
  "photo_credit": "string | null",
  "photo_attribution": "string | null",
  "photos": [
    {
      "id": "string | null",
      "url": "string",
      "thumb_url": "string | null",
      "hero_url": "string | null",
      "credit": "string | null",
      "position": "number",
      "attribution": "string | null"
    }
  ],
  "google_place_id": "string | null",
  "hours_json": "object | null",
  "google_price_level": "number | null",
  "enrichment_status": "string | null",
  "enriched_at": "ISO 8601 string | null"
}
```

Fields the detail returns that the list does not: `insider`, `crowd`, `vibe`, `photo_credit`, `photo_attribution`, `photos`, `google_place_id`, `google_price_level`, `enrichment_status`, `enriched_at`. Use the detail endpoint when rendering a single place page.

Photos:
- `photos` is every admin-uploaded photo of the place in `position` order. Position 0 is the list thumbnail, and the top-level `photo_url`, `photo_thumb_url`, `photo_hero_url` and `photo_credit` always describe that first entry, so clients that only show one photo can ignore `photos`.
- When a place has no uploaded photo but enrichment found a Google photo, `photos` holds one entry whose `id` is `null`, whose three URLs point at the photo proxy (`/api/places/:id/photo?size=orig|thumb|hero`), and whose `attribution` is the Google author's name (`credit` is `null`). The top-level `photo_attribution` carries the same name.
- When the place has no photo at all, `photos` is `[]` and the top-level photo fields are `null`.
- Uploaded entries have `attribution: null`; the editor's caption, if any, is in `credit`.

**Response 404**

```json
{ "error": "Place not found" }
```

Returned for both:
- A valid UUID that does not exist in the database.
- A syntactically invalid UUID (Postgres error code `22P02` is caught and translated to 404, not 500). Do not rely on this behavior as a client-side validation contract; treat it as a safe fallback.

---

## GET /api/tags

Returns tags.

**Query parameters**

| Param | Value | Notes |
|-------|-------|-------|
| `structured` | `1` | Return hierarchical shape. Any other value (or absent) returns flat array. |

### Flat response (default)

**Response 200**

```json
[
  { "value": "string", "display": "string", "order": "string" }
]
```

`order` is a string representation of the `sort_order` integer.

### Structured response (`?structured=1`)

**Response 200**

```json
{
  "parents": [
    {
      "value": "string",
      "display": "string",
      "order": "string",
      "children": [
        { "value": "string", "display": "string", "order": "string" }
      ]
    }
  ],
  "standalone": [
    { "value": "string", "display": "string", "order": "string" }
  ]
}
```

`parents` — tags that have child tags. Each child is a flat tag summary.
`standalone` — tags with no parent and no children.

Nesting is capped at 2 levels — parents never have parents themselves. (Server-side enforcement via `TagModel.assertCanBeParent`.)

An empty tag table returns `{ "parents": [], "standalone": [] }`.

---

## GET /api/neighborhoods

Returns every neighborhood, in `sort_order`. Use `value` for the `?neighborhood=` filter on `GET /api/places`; places carry the same `value` and `display` in their `neighborhood` field.

**Response 200**

```json
[
  {
    "id": "uuid",
    "value": "string",
    "display": "string",
    "is_default": "boolean",
    "order": "string"
  }
]
```

- `value` is the slug (for example `east-village`), derived from `display` on every save in the admin, so it changes when a neighborhood is renamed.
- `is_default` is `true` for exactly one neighborhood: the one a place gets when created without one.
- `order` is a string representation of the `sort_order` integer, as with tags.

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

Returns a paginated list of places, optionally filtered by tag.

**Query parameters**

| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `tag` | string | no | — | Returns only places that have this tag value |
| `limit` | integer | no | 100 | Page size, clamped to `[1, 200]` |
| `offset` | integer | no | 0 | Number of rows to skip, clamped to `>= 0` |

Non-numeric `limit` / `offset` values are silently ignored and the defaults are used.

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
    "crowd_level": "string | null",
    "price_tier": "string | null",
    "photo_url": "string | null",
    "hours_json": "object | null",
    "cross_street": "string | null"
  }
]
```

Notes:
- `key` is the place UUID (not `id`).
- `phone` is stored as digits only; format for display on the client.
- `specials`, `categories`, `notes` store plain text with `\n` newlines. Render with `white-space: pre-wrap`.
- `lat` and `lng` are nullable. Currently always `null`; Phase 2 will populate via geocoding.
- `pitch`, `crowd_level`, `price_tier`, `photo_url`, `hours_json`, `cross_street` come from the editorial / Google Places enrichment columns (`scripts/enrich-places.ts`). They are nullable for places that have not been enriched.

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
  "photo_url": "string | null",
  "photo_credit": "string | null",
  "google_place_id": "string | null",
  "hours_json": "object | null",
  "google_price_level": "number | null",
  "enrichment_status": "string | null",
  "enriched_at": "ISO 8601 string | null"
}
```

Fields the detail returns that the list does not: `perfect`, `insider`, `crowd`, `vibe`, `photo_credit`, `google_place_id`, `google_price_level`, `enrichment_status`, `enriched_at`. Use the detail endpoint when rendering a single place page.

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

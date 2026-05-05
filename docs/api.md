# EVE Public JSON API

Base path: `/api/`

No authentication required. All responses are `Content-Type: application/json; charset=utf-8`.

Error shape for all endpoints:

```json
{ "error": "message string" }
```

---

## GET /api/places

Returns all places, optionally filtered by tag.

**Query parameters**

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `tag` | string | no | Returns only places with this tag value |

**Response 200**

Array of place objects:

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
    "updated_at": "ISO 8601 string"
  }
]
```

Notes:
- `key` is the place UUID (not `id`).
- `phone` is stored as digits only; format for display on the client.
- `specials`, `categories`, `notes` store `<br/>` for newlines; replace for display.
- `lat` and `lng` are present on every response. Currently always `null` (Phase 2 will populate them via geocoding).

---

## GET /api/places/:id

**New in Phase 1.** Returns a single place by UUID.

**Path parameter:** UUID of the place.

**Response 200** — same shape as one element of the list response above.

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
| `structured` | `1` | Return hierarchical shape. Any other value returns flat array. |

### Flat response (default)

**Response 200**

```json
[
  { "value": "string", "display": "string", "order": "string" }
]
```

`order` is a string representation of the `sort_order` integer. This is the existing shape — existing consumers depend on it exactly. Do not change.

### Structured response (`?structured=1`)

**New in Phase 1.**

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

`parents` — tags that have child tags. Each child is a flat `TagSummary`.
`standalone` — tags with no parent and no children.

An empty tag table returns `{ "parents": [], "standalone": [] }`.

# @eve/shared-types

TypeScript-only type definitions shared between the EVE server (`src/`) and the mobile app (`apps/mobile/`).

## Import path

Both consumers import via the package name:

```ts
import type { Place, PlaceResponse, Tag } from '@eve/shared-types';
```

This is wired through tsconfig path mapping in the root `tsconfig.json`:

```json
{
  "paths": {
    "@eve/shared-types": ["packages/shared-types/src/index.ts"]
  }
}
```

The mobile app (`apps/mobile/`) carries the same path mapping in its own `tsconfig.json`.

## Metro bundler resolution

Metro does not follow tsconfig path mappings. `apps/mobile/metro.config.js`
adds `../../packages/shared-types` to `watchFolders` so the bundler can
resolve imports at runtime:

```js
watchFolders: [path.resolve(__dirname, '../../packages/shared-types')]
```

If you see a Metro "Unable to resolve module @eve/shared-types" error, verify
this entry is present.

## Type inventory

### DB-row types (used by `src/models/`)

| Type | Source | Notes |
|------|--------|-------|
| `Place` | `place.ts` | Matches the PostgreSQL driver output; `created_at`/`updated_at` are `Date`. Includes optional `lat?: number \| null` and `lng?: number \| null`. |
| `Tag` | `tag.ts` | Full tag row including `sort_order`, `parent_tag_id`, `has_children`. |
| `TagWithChildrenRow` | `tag.ts` | `Tag` with a nested `children: Tag[]` array. Returned by `TagModel.findAllStructured` internally. |
| `StructuredTagRows` | `tag.ts` | `{ parents: TagWithChildrenRow[], standalone: Tag[] }` — the raw DB result before API projection. |

### API-projection types (used by `src/routes/api.ts` and `apps/mobile/`)

| Type | Source | Notes |
|------|--------|-------|
| `PlaceResponse` | `place.ts` | Wire shape for place JSON. `key` instead of `id`, `created_at`/`updated_at` as ISO 8601 strings. |
| `TagSummary` | `tag.ts` | `{ value, display, order }` — the flat tag shape. `order` is a string. |
| `TagWithChildren` | `tag.ts` | `TagSummary` plus `children: TagSummary[]`. Used in structured response. |
| `StructuredTags` | `tag.ts` | `{ parents: TagWithChildren[], standalone: TagSummary[] }` — the `?structured=1` response shape. |

### API response aliases (in `api.ts`)

| Type | Resolves to |
|------|-------------|
| `PlacesListResponse` | `PlaceResponse[]` |
| `PlaceDetailResponse` | `PlaceResponse` |
| `TagsFlatResponse` | `TagSummary[]` |
| `TagsStructuredResponse` | `StructuredTags` |

## Date vs string split

- **DB row types** (`Place`, `Tag`, `TagWithChildrenRow`) use `Date` for `created_at` / `updated_at`. These types are what the PostgreSQL driver returns and what `src/models/` works with internally.
- **API response types** (`PlaceResponse`) use `string` (ISO 8601) for timestamps. These types describe the JSON that is serialised over the wire. The mobile app and any other consumer of the JSON API should use `PlaceResponse`, not `Place`.

## No runtime logic

This package exports types only. No functions, classes, or values are exported.

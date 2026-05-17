# Admin Places Search

Free-text search on `/admin/places`, shipped as of migration `1706457600008`.

---

## For operators

### Where the search box is

A "Search places…" input appears at the top of the Places list, directly below
the page heading and above the place entries. It is present whether the list is
empty or not.

### What it matches

Typing in the box filters the list to places where the search term appears
(case-insensitively, as a partial word or substring) in any of:

- Name
- Address
- Cross street
- Categories
- Notes
- Neighborhood display name
- Tag value or tag display name (either the slug or the human label)

Examples: "piz" matches "pizza" and "Pizzeria." "East" matches every place in
the East Village neighborhood. "bar" matches places tagged "bar" even if the
word "bar" does not appear in the name or address.

### Partial-word and case

The match is a substring match, not a word-boundary match. "aven" matches
"Avenue." Case does not matter — "PIZZA", "Pizza", and "pizza" all match the
same places.

### No-results state

When a search returns no places, the page shows:

> No places match "your query".

Clear the input (click the × button or press Escape) to return to the full
unfiltered list.

### Keyboard shortcuts

| Action | Shortcut |
|--------|----------|
| Clear search and return to full list | Escape |
| Clear via mouse | Click the × button (visible only when the input has text) |

### In-progress indicator

While the filtered list is loading, the input shows `aria-busy="true"` and a
small "Searching…" label appears next to the box. Both clear as soon as the
list updates.

### Deep linking

`/admin/places?q=your+search` opens the list pre-filtered. Share or bookmark
filtered views this way. The back button returns to the state before the search
began.

---

## For developers

### Overview

The search is implemented as a URL-driven server-component filter with no new
API route. The client writes `?q=` to the URL; the Next.js server component
reads it, passes it to `PlaceModel.findAll`, and re-renders the list.

**Files changed:**

| File | Change |
|------|--------|
| `migrations/1706457600008_places-search-trgm.js` | New — enables pg_trgm, creates GIN trigram index |
| `packages/db/src/models/place.ts` | `findAll` gains `q?: string` option |
| `apps/admin/components/SearchInput.tsx` | New client component |
| `apps/admin/app/places/page.tsx` | Reads `searchParams.q`, passes to model, renders SearchInput |

### PlaceModel.findAll — q option

```typescript
PlaceModel.findAll(options?: {
  tag?: string;
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<Place[]>
```

When `q` is `undefined`, `null`, or whitespace-only, behavior is identical to
the previous version (full list, `ORDER BY name ASC`). No join to `neighborhoods`
is added; `GROUP BY` shape is unchanged.

When `q` is a non-empty trimmed string, the query adds:

- `LEFT JOIN neighborhoods n ON p.neighborhood_id = n.id`
- `n.display` added to `GROUP BY`
- A single OR-group condition with three branches (see SQL shape below)

`tag` and `q` AND-compose via a conditions array. Both can be passed together.

### SQL shape (q branch)

```sql
WHERE (
  -- Branch (a): indexed. Expression MUST match the GIN index DDL exactly.
  (
    COALESCE(p.name,'') || ' ' ||
    COALESCE(p.address,'') || ' ' ||
    COALESCE(p.cross_street,'') || ' ' ||
    COALESCE(p.categories,'') || ' ' ||
    COALESCE(p.notes,'')
  ) ILIKE '%' || $1 || '%'
  -- Branch (b): neighborhood display. Separate OR-branch — NOT in the index.
  OR n.display ILIKE '%' || $1 || '%'
  -- Branch (c): tag value or display, via subquery.
  OR p.id IN (
    SELECT pt2.place_id FROM place_tags pt2
    JOIN tags t2 ON pt2.tag_id = t2.id
    WHERE t2.value ILIKE '%' || $1 || '%'
       OR t2.display ILIKE '%' || $1 || '%'
  )
)
```

### The index expression invariant — read this before touching the SQL

The GIN index `places_search_trgm_idx` is built on the expression in branch (a)
above. For the Postgres query planner to use the index on branch (a), the WHERE
expression must be **byte-identical** to the index DDL: same column order
(`name`, `address`, `cross_street`, `categories`, `notes`), same separator
(`' '` — a space character between each pair), same `COALESCE(col,'')` defaults.

If these two expressions drift from each other, the planner silently falls back
to a sequential scan. There is no compile-time check. The migration file header
comment and the JSDoc on `findAll` both call this out.

`n.display` (branch b) and tag values (branch c) are **deliberately outside**
the indexed expression. Including them there would break index alignment (the
planner matches the exact expression, not a superset) and would require rebuilding
the index whenever a neighborhood or tag is renamed.

### Why pg_trgm, not tsvector or bare ILIKE

- **tsvector/FTS:** tokenises on word boundaries and stems. "piz" does not match
  "pizza." Rejected because the spec requires partial-word matching.
- **Bare ILIKE `'%q%'`:** semantically correct but cannot use a btree index for
  leading-wildcard patterns. Degrades linearly with table size. Rejected because
  an indexed path is required.
- **pg_trgm + GIN:** ships with Postgres core (contrib, not an npm dependency).
  `gin_trgm_ops` accelerates `ILIKE '%q%'` patterns while preserving the
  forgiving substring semantics. The index does not require word boundaries.

### User input safety

`q` is passed to the database as a bound parameter (`params.push(trimmedQ)`,
referenced as `$N`). The `%` wildcards are written in the SQL string itself.
A user who types `%` or `_` gets a literal substring match on those characters —
they are not interpreted as SQL wildcards.

### SearchInput component

`apps/admin/components/SearchInput.tsx` — `'use client'` component.

**Props:**
```typescript
{ initialValue: string; paramName?: string /* default: 'q' */ }
```

**Behavior:**
- 250 ms debounce on every keystroke. After the debounce fires,
  `router.replace` updates the URL (not `push` — the back button is not
  polluted with every keystroke).
- The `router.replace` call is wrapped in `React.startTransition`. While the
  transition is pending, `aria-busy="true"` is set on the input and a
  "Searching…" hint renders adjacent to the box.
- Clearing the input (× button or Escape) cancels any pending debounce timer
  and immediately removes the `q` param from the URL.
- When the trimmed value is empty, the param is deleted rather than set to an
  empty string.
- Other URL params are preserved across edits (uses `useSearchParams()` as the
  base before modifying `q`).
- Does not autofocus on mount.

### places/page.tsx changes

Accepts `searchParams?: Promise<{ q?: string | string[] }>` (same pattern as
`app/places/new/page.tsx`). Resolves via `await`, takes the first element if
`q` arrives as an array, trims. Passes `{ q: q || undefined }` to
`PlaceModel.findAll`. Renders `<SearchInput initialValue={q} />` between the
heading row and the place list.

Empty-state copy: when `q` is non-empty and the list is empty, shows
`No places match "{q}".` When `q` is empty and there are no places, shows the
original `No places yet. Add one.` copy.

### Performance notes

The GIN trigram index accelerates branch (a) — text on the `places` row. The
planner uses the index when the query string is 3 or more characters; shorter
queries fall back to a sequential scan (still functionally correct; only relevant
if the table grows past ~10k rows). Branches (b) and (c) are not indexed but
operate against small reference tables (neighborhoods, tags).

No minimum character threshold is enforced in the UI or the model.

### No new dependencies

`pg_trgm` is a PostgreSQL contrib extension that ships with Postgres itself —
not an npm package. `package.json` at the root and in `apps/admin` are
unchanged.

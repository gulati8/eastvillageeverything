# EVE Redesign — Phase A: Data Model Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/design_handoff_eve_2/README.md` — full redesign brief. This plan covers Phase A only (data model). Subsequent phases get their own plans.

**Roadmap:** A = data model (this plan). B = image upload infra (Flydrive + S3). C = Next.js admin rebuild. D = mobile redesign spec-compliance pass. E = App Store ship.

---

## Goal

Add the four tag fields (`is_primary`, `tint`, `accent`, `fallback_image_url`) and the place field (`primary_tag_id`) the redesign needs, expose them through the existing models, API, and EJS admin, without breaking anything currently shipping in TestFlight build 6/7.

## Architecture

Single migration adds five columns. Models, types, and API responses extend in lock-step. The existing EJS admin gets minimum-viable form fields for the new attributes — no fancy UI yet (image upload, drag-reorder primary toggle, color pickers all come in Phase B/C). Mobile changes are limited to `shared-types` consumers — no UI work in this phase. Backward-compat: every new field is nullable / optional, so build 6/7 mobile clients continue to function unchanged.

## Tech Stack

- node-pg-migrate for the migration (existing pattern)
- TypeScript types in `packages/shared-types/`
- Direct SQL via `pg` in `src/models/`
- EJS forms + Bootstrap 5 in `src/views/admin/`
- Playwright e2e tests for API + admin (`tests/e2e/api/`, `tests/e2e/admin/`)
- Jest for any mobile tests (`apps/mobile/src/**/*.test.ts`)

---

## Current state (2026-05-06) — read this first

- Phase 1 (TestFlight build 6) is shipping. Server is on `main` at `b080200`. The `/api/tags?structured=1` and `/api/places` endpoints are deployed and returning data.
- Tag model has `id, value, display, sort_order, parent_tag_id, has_children, created_at, updated_at`. No `is_primary`, `tint`, `accent`, `fallback_image_url`.
- Place model has all editorial fields (`pitch`, `perfect`, `insider`, `crowd`, `vibe`, etc.) per migration `…04`. No `primary_tag_id`.
- Mobile app already imports `Tag`, `TagSummary`, `TagWithChildren`, `Place`, `PlaceResponse` from `@eve/shared-types`.
- AWS bucket `eastvillageeverything-uploads` exists (us-east-1, versioned, blocked public access). Will be used in Phase B; not used in Phase A.
- The 2-level tag-nesting cap is already enforced via `TagModel.assertCanBeParent`. Don't break that.

## Working Agreements

- **Each task ends with `npm run typecheck` passing** (root, which covers server + mobile + shared-types).
- **Each task ends with a commit.** Frequent commits, single-purpose, conventional commit messages (`feat:`, `fix:`, `chore:`, `test:`).
- **No claiming "done" without running the verify command.** Per `superpowers:verification-before-completion`.
- **Plan stays current** — when a task starts, mark `- [in-progress]`; when done, mark `- [x]`. Add notes inline if reality diverges.
- **Stop-and-ask gates** are marked `**GATE**` — do not proceed past them without user input.

## Status Legend

- `- [ ]` not started
- `- [in-progress]` started, mid-work
- `- [x]` done, verified
- `- [BLOCKED: <reason>]` paused

---

## File Map

**Created**
- `migrations/1706457600005_add-tag-and-place-redesign-columns.js`
- `tests/e2e/api/redesign-tag-fields.spec.ts`
- `tests/e2e/admin/redesign-tag-form.spec.ts`
- `tests/e2e/admin/redesign-place-primary-tag.spec.ts`

**Modified**
- `packages/shared-types/src/tag.ts` — add `is_primary`, `tint`, `accent`, `fallback_image_url` to `Tag`, `TagSummary`, `TagWithChildren`, `TagWithChildrenRow`
- `packages/shared-types/src/place.ts` — add `primary_tag_id` to `Place` and `PlaceResponse`
- `src/models/Tag.ts` — SELECT/INSERT/UPDATE the new columns; extend `TagInput`
- `src/models/Place.ts` — SELECT/INSERT/UPDATE `primary_tag_id`; extend `PlaceInput`
- `src/routes/api.ts` — surface new fields in `/api/tags` (flat + structured) and `/api/places` (list + detail)
- `src/routes/admin.ts` — accept new fields in tag and place POST handlers
- `src/views/admin/tags/form.ejs` — add UI for `is_primary`, `tint`, `accent`, `fallback_image_url`
- `src/views/admin/tags/index.ejs` — show `is_primary` indicator on tag list
- `src/views/admin/places/form.ejs` — add `primary_tag_id` dropdown filtered to is-primary tags

**Not touched in Phase A** (saved for later phases)
- `apps/mobile/**` — mobile UI unchanged in Phase A; only consumes the wider type via shared-types
- Image upload UI — Phase B
- Admin redesign / Next.js — Phase C

---

## Task List

### Task 1 — Setup: branch + dev stack

**Files:** none (setup only)

User decisions locked (2026-05-06):
- Branch: `phase-a-data-model` (feature branch, no auto-merge)
- Prod URL: `https://eastvillageeverything.nyc`
- Prod deploy: **DISALLOWED** in this run. Hard stop at Task 15. User previews locally and triggers deploy themselves.
- Admin login email per seed: `admin@eastvillageeverything.com`. Password is whatever the user set when seeding via `ADMIN_PASSWORD_HASH`. The agent does NOT know this password — admin e2e tests (Tasks 12-13) require user to export `ADMIN_PASS` before running.

- [ ] **Step 1: Create the feature branch**

```bash
git checkout -b phase-a-data-model
```

- [ ] **Step 2: Confirm dev stack is up**

```bash
docker compose ps
```
Expected: `postgres` and `redis` services up. If not:
```bash
npm run docker:dev
```
Wait for the `postgres` service to be healthy.

- [ ] **Step 3: Run pending migrations to baseline state**

```bash
npm run migrate
```
Expected: either "No migrations to run" or runs the existing `…04` migration if not yet applied. Database should be at the latest schema before adding the Phase A migration.

---

### Task 2 — Write the migration

**Files:**
- Create: `migrations/1706457600005_add-tag-and-place-redesign-columns.js`

- [ ] **Step 1: Create the migration file**

```javascript
/**
 * Phase A redesign columns.
 *
 * Tags get four columns to support primary-tag concept and design fallbacks:
 *   is_primary         — boolean flag, this tag can be a place's headline tag
 *   tint               — varchar(7), hex color (e.g. '#E07B3F') for fallback bg + accent
 *   accent             — varchar(7), hex color, for typographic-fallback hero accent
 *   fallback_image_url — text, CDN URL shown when a place with this primary tag has no photo
 *
 * Places get one column:
 *   primary_tag_id — uuid FK to tags(id), ON DELETE SET NULL.
 *                    Drives row meta line and fallback image in the mobile feed.
 */

exports.up = (pgm) => {
  pgm.addColumns('tags', {
    is_primary: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    tint: {
      type: 'varchar(7)',
      notNull: false,
    },
    accent: {
      type: 'varchar(7)',
      notNull: false,
    },
    fallback_image_url: {
      type: 'text',
      notNull: false,
    },
  });

  pgm.addColumn('places', {
    primary_tag_id: {
      type: 'uuid',
      notNull: false,
      references: 'tags(id)',
      onDelete: 'SET NULL',
    },
  });

  pgm.createIndex('places', 'primary_tag_id', { ifNotExists: true });
};

exports.down = (pgm) => {
  pgm.dropIndex('places', 'primary_tag_id', { ifExists: true });
  pgm.dropColumn('places', 'primary_tag_id');
  pgm.dropColumns('tags', ['is_primary', 'tint', 'accent', 'fallback_image_url']);
};
```

- [ ] **Step 2: Run the migration locally**

```bash
npm run migrate
```
Expected output: `> Migrating files: > 1706457600005_add-tag-and-place-redesign-columns ### MIGRATION 1706457600005_add-tag-and-place-redesign-columns (UP) ### ... Migrations complete!`

- [ ] **Step 3: Verify the schema with psql**

```bash
docker compose exec postgres psql -U eve -d eve_dev -c "\d tags" | grep -E "is_primary|tint|accent|fallback_image_url"
docker compose exec postgres psql -U eve -d eve_dev -c "\d places" | grep primary_tag_id
```
Expected: each column listed with the right type. (DB user/name match `.env.example` — adjust if local differs.)

- [ ] **Step 4: Test the down migration round-trip**

```bash
npm run migrate:down && npm run migrate
```
Expected: rollback succeeds, then re-applies cleanly.

- [ ] **Step 5: Commit**

```bash
git add migrations/1706457600005_add-tag-and-place-redesign-columns.js
git commit -m "feat: add tag (is_primary, tint, accent, fallback_image_url) and place (primary_tag_id) columns"
```

---

### Task 3 — Extend shared-types for tags

**Files:**
- Modify: `packages/shared-types/src/tag.ts`

- [ ] **Step 1: Add new fields to all four tag interfaces**

Replace the contents of `packages/shared-types/src/tag.ts` with:

```typescript
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
  is_primary: boolean;
  tint: string | null;
  accent: string | null;
  fallback_image_url: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * API projection of Tag for /api/tags flat response (trimmed, public-safe).
 *
 * is_primary / tint / accent / fallback_image_url are exposed publicly so the
 * mobile client can render fallback heroes and primary-tag pip dots without
 * a separate admin call. They are optional so older mobile builds that don't
 * read them stay backwards-compatible.
 */
export interface TagSummary {
  value: string;
  display: string;
  order: string;
  is_primary?: boolean;
  tint?: string | null;
  accent?: string | null;
  fallback_image_url?: string | null;
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
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```
Expected: PASS. (Server consumers of `Tag` will now require `is_primary` to be present in any object literal — but `src/models/Tag.ts` only constructs `Tag` from `query<Tag>` results, so no inline construction errors are expected. If errors surface, they're cases that need to be updated in Tasks 4-7.)

If typecheck fails because of missing `is_primary` in `query<Tag>` casts, that's expected — Tasks 4-5 will add the columns to the SELECT statements. For now, if the failing files are exclusively `src/models/Tag.ts` (and only complaining about narrowing), continue. If unrelated files fail, stop and reassess.

- [ ] **Step 3: Commit**

```bash
git add packages/shared-types/src/tag.ts
git commit -m "feat(types): extend Tag/TagSummary with is_primary, tint, accent, fallback_image_url"
```

---

### Task 4 — Extend shared-types for places

**Files:**
- Modify: `packages/shared-types/src/place.ts`

- [ ] **Step 1: Add `primary_tag_id` to `Place` and `PlaceResponse`**

In `packages/shared-types/src/place.ts`, add `primary_tag_id` to both interfaces. Find the `Place` interface and add after `tags: string[];`:

```typescript
  primary_tag_id?: string | null;
```

Find the `PlaceResponse` interface and add after `tags: string[];`:

```typescript
  primary_tag_id?: string | null;
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/shared-types/src/place.ts
git commit -m "feat(types): add primary_tag_id to Place and PlaceResponse"
```

---

### Task 5 — TagModel: read and write new columns

**Files:**
- Modify: `src/models/Tag.ts`

- [ ] **Step 1: Update the `TagInput` interface**

In `src/models/Tag.ts`, replace the `TagInput` interface:

```typescript
export interface TagInput {
  value: string;
  display: string;
  sort_order: number;
  parent_tag_id?: string | null;
  is_primary?: boolean;
  tint?: string | null;
  accent?: string | null;
  fallback_image_url?: string | null;
}
```

- [ ] **Step 2: Update every SELECT statement in TagModel**

Search for every `SELECT id, value, display, sort_order, parent_tag_id, has_children, created_at, updated_at` and replace with:

```sql
SELECT id, value, display, sort_order, parent_tag_id, has_children,
       is_primary, tint, accent, fallback_image_url,
       created_at, updated_at
```

There are five locations: `findAll`, `findById`, `findByValue`, `getPotentialParents`, and the SELECT inside `bulkSave`. Update all of them.

- [ ] **Step 3: Update the `create` method to insert new fields**

Replace the `INSERT INTO tags (...)` block in `create`:

```typescript
const result = await query<Tag>(
  `INSERT INTO tags (value, display, sort_order, parent_tag_id,
                     is_primary, tint, accent, fallback_image_url)
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
   RETURNING id, value, display, sort_order, parent_tag_id, has_children,
             is_primary, tint, accent, fallback_image_url,
             created_at, updated_at`,
  [
    data.value,
    data.display,
    data.sort_order,
    data.parent_tag_id || null,
    data.is_primary ?? false,
    data.tint ?? null,
    data.accent ?? null,
    data.fallback_image_url ?? null,
  ]
);
```

- [ ] **Step 4: Update the `update` method to update new fields**

Inside `update`, find the block of `if (data.X !== undefined) { updates.push(...); params.push(...); }` and after the `parent_tag_id` block, add four more:

```typescript
if (data.is_primary !== undefined) {
  updates.push(`is_primary = $${paramIndex++}`);
  params.push(data.is_primary);
}
if (data.tint !== undefined) {
  updates.push(`tint = $${paramIndex++}`);
  params.push(data.tint || null);
}
if (data.accent !== undefined) {
  updates.push(`accent = $${paramIndex++}`);
  params.push(data.accent || null);
}
if (data.fallback_image_url !== undefined) {
  updates.push(`fallback_image_url = $${paramIndex++}`);
  params.push(data.fallback_image_url || null);
}
```

Then update the RETURNING clause in the same method:

```sql
RETURNING id, value, display, sort_order, parent_tag_id, has_children,
          is_primary, tint, accent, fallback_image_url,
          created_at, updated_at
```

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/models/Tag.ts
git commit -m "feat(model): TagModel reads and writes is_primary/tint/accent/fallback_image_url"
```

---

### Task 6 — PlaceModel: read and write `primary_tag_id`

**Files:**
- Modify: `src/models/Place.ts`

- [ ] **Step 1: Update the `PlaceInput` interface**

In `src/models/Place.ts`, add to the `PlaceInput` interface (before the closing `}`):

```typescript
  primary_tag_id?: string | null;
```

- [ ] **Step 2: Update both SELECT statements**

Find the SELECT in `findAll` and add `p.primary_tag_id,` after `p.cross_street, p.photo_url, p.photo_credit,`:

```sql
p.crowd_level, p.price_tier, p.cross_street, p.photo_url, p.photo_credit, p.primary_tag_id,
```

Do the same in `findById`.

- [ ] **Step 3: Update the `create` method**

In `create`, replace the `INSERT INTO places (...)` block:

```typescript
const insertSql = `
  INSERT INTO places (name, address, phone, url, specials, categories, notes,
    pitch, perfect, insider, crowd, vibe, crowd_level, price_tier,
    cross_street, photo_url, photo_credit, primary_tag_id)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18)
  RETURNING id
`;

const placeResult = await client.query(insertSql, [
  data.name,
  data.address || null,
  normalizePhone(data.phone),
  validateUrl(data.url),
  data.specials || null,
  data.categories || null,
  data.notes || null,
  data.pitch || null,
  data.perfect || null,
  data.insider || null,
  data.crowd || null,
  data.vibe || null,
  data.crowd_level || null,
  data.price_tier || null,
  data.cross_street || null,
  validateUrl(data.photo_url),
  data.photo_credit || null,
  data.primary_tag_id || null,
]);
```

(Note: the existing `RETURNING` clause was a long list, but since we immediately re-fetch via `PlaceModel.findById(place.id)`, returning `id` only is sufficient and matches the existing pattern.)

- [ ] **Step 4: Update the `update` method**

In `update`, after the `if (data.photo_credit !== undefined)` block, add:

```typescript
if (data.primary_tag_id !== undefined) {
  updates.push(`primary_tag_id = $${paramIndex++}`);
  params.push(data.primary_tag_id || null);
}
```

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/models/Place.ts
git commit -m "feat(model): PlaceModel reads and writes primary_tag_id"
```

---

### Task 7 — API: surface new fields in `/api/tags`

**Files:**
- Modify: `src/routes/api.ts`

- [ ] **Step 1: Update the structured-tags response shape**

In `src/routes/api.ts`, replace the structured-response mapping in the `/tags` route:

```typescript
if (req.query.structured === '1') {
  const structuredRows = await TagModel.findAllStructured();
  const response: TagsStructuredResponse = {
    parents: structuredRows.parents.map(p => ({
      value: p.value,
      display: p.display,
      order: String(p.sort_order),
      is_primary: p.is_primary,
      tint: p.tint,
      accent: p.accent,
      fallback_image_url: p.fallback_image_url,
      children: p.children.map(c => ({
        value: c.value,
        display: c.display,
        order: String(c.sort_order),
        is_primary: c.is_primary,
        tint: c.tint,
        accent: c.accent,
        fallback_image_url: c.fallback_image_url,
      })),
    })),
    standalone: structuredRows.standalone.map(s => ({
      value: s.value,
      display: s.display,
      order: String(s.sort_order),
      is_primary: s.is_primary,
      tint: s.tint,
      accent: s.accent,
      fallback_image_url: s.fallback_image_url,
    })),
  };
  return res.json(response);
}
```

- [ ] **Step 2: Update the flat-tags response**

Replace the flat-response mapping in the same route:

```typescript
const rows = await TagModel.findAll();
const response: TagsFlatResponse = rows.map((t): TagSummary => ({
  value: t.value,
  display: t.display,
  order: String(t.sort_order),
  is_primary: t.is_primary,
  tint: t.tint,
  accent: t.accent,
  fallback_image_url: t.fallback_image_url,
}));
res.json(response);
```

- [ ] **Step 3: Update `/api/places` (list) to include `primary_tag_id`**

In `src/routes/api.ts`, in the `/places` route handler, in the response object, add after `cross_street: place.cross_street ?? null,`:

```typescript
primary_tag_id: place.primary_tag_id ?? null,
```

- [ ] **Step 4: Update `/api/places/:id` (detail) to include `primary_tag_id`**

Same edit in the `/places/:id` route response object (after `enriched_at` line, or anywhere — order is convention, not required):

```typescript
primary_tag_id: place.primary_tag_id ?? null,
```

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/routes/api.ts
git commit -m "feat(api): expose tag is_primary/tint/accent/fallback_image_url and place primary_tag_id"
```

---

### Task 8 — Admin route handlers accept new fields

**Files:**
- Modify: `src/routes/admin.ts`

- [ ] **Step 1: Locate the tag POST handlers**

Open `src/routes/admin.ts`. Search for `POST /tags` (the create handler) and the `PUT|POST /tags/:id` (update handler).

- [ ] **Step 2: Extract and pass new fields in the tag create handler**

Wherever the existing handler currently does something like:

```typescript
const { value, display, sort_order, parent_tag_id } = req.body;
const tag = await TagModel.create({ value, display, sort_order, parent_tag_id });
```

extend to:

```typescript
const { value, display, sort_order, parent_tag_id,
        is_primary, tint, accent, fallback_image_url } = req.body;

const tag = await TagModel.create({
  value,
  display,
  sort_order: parseInt(sort_order, 10) || 0,
  parent_tag_id: parent_tag_id || null,
  is_primary: is_primary === 'on' || is_primary === true || is_primary === '1',
  tint: tint || null,
  accent: accent || null,
  fallback_image_url: fallback_image_url || null,
});
```

(EJS forms send checkbox state as `'on'` when checked, absent when unchecked. The triple-check accommodates JSON API callers too.)

- [ ] **Step 3: Mirror the change for the tag update handler**

Same diff in the update path, calling `TagModel.update(id, { ... })` with the same fields.

- [ ] **Step 4: Locate the place POST handlers**

Search for `POST /places` and `PUT|POST /places/:id`.

- [ ] **Step 5: Extract and pass `primary_tag_id` in place handlers**

Add `primary_tag_id` to the destructured body and the `PlaceModel.create({...})` / `PlaceModel.update(id, {...})` calls. Treat empty string as `null`:

```typescript
primary_tag_id: req.body.primary_tag_id || null,
```

- [ ] **Step 6: Run typecheck**

```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/routes/admin.ts
git commit -m "feat(admin): accept new tag and place redesign fields in form handlers"
```

---

### Task 9 — Admin tag form: render new fields

**Files:**
- Modify: `src/views/admin/tags/form.ejs`
- Modify: `src/views/admin/tags/index.ejs`

- [ ] **Step 1: Add `is_primary`, `tint`, `accent`, `fallback_image_url` to `form.ejs`**

In `src/views/admin/tags/form.ejs`, inside the `<div class="col-md-6">` (after the parent-tag select, before the `</div>` that closes the column), add:

```html
<div class="mb-3 form-check">
  <input type="checkbox" class="form-check-input" id="is_primary" name="is_primary"
         <%= tag && tag.is_primary ? 'checked' : '' %>>
  <label class="form-check-label" for="is_primary">
    Primary-eligible
  </label>
  <div class="form-text">When checked, this tag can be a place's headline tag (drives row meta + fallback image in the mobile feed).</div>
</div>

<div class="mb-3">
  <label for="tint" class="form-label">Tint color (hex)</label>
  <div class="input-group" style="max-width: 220px;">
    <input type="color" class="form-control form-control-color" id="tint_picker"
           value="<%= tag && tag.tint ? tag.tint : '#1F1A14' %>"
           title="Pick tint color"
           style="max-width: 60px;">
    <input type="text" class="form-control" id="tint" name="tint"
           value="<%= tag && tag.tint ? tag.tint : '' %>"
           pattern="^#[0-9A-Fa-f]{6}$"
           placeholder="#E07B3F">
  </div>
  <div class="form-text">Hex color used for the typographic-fallback hero background and primary-tag pip dot. Leave blank for no tint.</div>
</div>

<div class="mb-3">
  <label for="accent" class="form-label">Accent color (hex)</label>
  <div class="input-group" style="max-width: 220px;">
    <input type="color" class="form-control form-control-color" id="accent_picker"
           value="<%= tag && tag.accent ? tag.accent : '#FBF6EE' %>"
           title="Pick accent color"
           style="max-width: 60px;">
    <input type="text" class="form-control" id="accent" name="accent"
           value="<%= tag && tag.accent ? tag.accent : '' %>"
           pattern="^#[0-9A-Fa-f]{6}$"
           placeholder="#FBF6EE">
  </div>
  <div class="form-text">Hex color for the typographic-fallback hero accent (place name text on tint background). Leave blank for no accent.</div>
</div>

<div class="mb-3">
  <label for="fallback_image_url" class="form-label">Fallback image URL</label>
  <input type="url" class="form-control" id="fallback_image_url" name="fallback_image_url"
         value="<%= tag && tag.fallback_image_url ? tag.fallback_image_url : '' %>"
         placeholder="https://...">
  <div class="form-text">CDN URL shown when a place with this primary tag has no photo. (Image upload UI ships in Phase B; for now paste any URL.)</div>
</div>
```

- [ ] **Step 2: Add color-picker → text-input sync script**

Just before the closing `</body>` tag (after the bootstrap script), add:

```html
<script>
  (function () {
    const wire = (pickerId, inputId) => {
      const picker = document.getElementById(pickerId);
      const input = document.getElementById(inputId);
      if (!picker || !input) return;
      picker.addEventListener('input', () => { input.value = picker.value.toUpperCase(); });
      input.addEventListener('input', () => {
        if (/^#[0-9A-Fa-f]{6}$/.test(input.value)) picker.value = input.value;
      });
    };
    wire('tint_picker', 'tint');
    wire('accent_picker', 'accent');
  })();
</script>
```

- [ ] **Step 3: Add a primary indicator to `index.ejs`**

In `src/views/admin/tags/index.ejs`, find where each tag's display name is rendered. Next to the display name, add (use whatever wrapping element fits the existing structure):

```html
<% if (tag.is_primary) { %>
  <span class="badge bg-warning text-dark ms-2" title="Primary-eligible tag">PRIMARY</span>
<% } %>
```

If the file structure makes that hard to localise, instead add a new column to the tag table showing a checkmark. Use whichever is less intrusive given the actual EJS structure — preserve existing layout.

- [ ] **Step 4: Manually verify in the browser**

```bash
npm run dev
```

Then open `http://localhost:3000/admin/tags` in a browser, log in, click "New Tag" or edit an existing tag. Verify:
- The four new fields render with correct labels and defaults.
- Color pickers update the text inputs and vice versa.
- Save creates / updates the tag without errors.
- The `is_primary` badge appears on saved primary tags in the index.

Stop the dev server when done.

- [ ] **Step 5: Commit**

```bash
git add src/views/admin/tags/form.ejs src/views/admin/tags/index.ejs
git commit -m "feat(admin-ui): tag form fields for is_primary, tint, accent, fallback_image_url"
```

---

### Task 10 — Admin place form: primary tag dropdown

**Files:**
- Modify: `src/routes/admin.ts` (pass primary-eligible tags to view)
- Modify: `src/views/admin/places/form.ejs`

- [ ] **Step 1: Pass primary-eligible tags from the route to the view**

In `src/routes/admin.ts`, find the GET handler that renders `places/form.ejs` (both for new place and edit place). It already passes a list of tags (or fetches them). Extend it to also pass `primaryTags`:

```typescript
const allTags = await TagModel.findAll();
const primaryTags = allTags.filter(t => t.is_primary);
res.render('admin/places/form', {
  // ...existing locals...
  primaryTags,
});
```

(If the existing handler already passes `tags`, you can derive `primaryTags` from it inline or in the view — pick whichever is more consistent with the existing route.)

- [ ] **Step 2: Add the dropdown to `places/form.ejs`**

Find a sensible location in `src/views/admin/places/form.ejs` (likely near the existing tag-association UI or in a "Taxonomy" section). Add:

```html
<div class="mb-3">
  <label for="primary_tag_id" class="form-label">Primary tag</label>
  <select class="form-select" id="primary_tag_id" name="primary_tag_id" style="max-width: 360px;">
    <option value="">— None —</option>
    <% primaryTags.forEach(function(t) { %>
    <option value="<%= t.id %>" <%= place && place.primary_tag_id === t.id ? 'selected' : '' %>>
      <%= t.display %>
    </option>
    <% }); %>
  </select>
  <div class="form-text">
    The headline tag for this place — drives the row meta line and fallback image in the mobile feed.
    Only tags marked primary-eligible appear here. Manage via <a href="/admin/tags">Tags</a>.
  </div>
</div>
```

- [ ] **Step 3: Manually verify in the browser**

```bash
npm run dev
```
Open `http://localhost:3000/admin/places/<some-id>/edit`. Verify:
- The primary tag dropdown renders with all `is_primary=true` tags.
- Saving sets `primary_tag_id` on the place; reload confirms persistence.
- Setting to "— None —" clears the field.

Stop the dev server when done.

- [ ] **Step 4: Commit**

```bash
git add src/routes/admin.ts src/views/admin/places/form.ejs
git commit -m "feat(admin-ui): primary tag dropdown on place form"
```

---

### Task 11 — E2E tests for tag fields in `/api/tags`

**Files:**
- Create: `tests/e2e/api/redesign-tag-fields.spec.ts`

- [ ] **Step 1: Write the e2e test**

Use the existing `tests/e2e/api/phase1-api.spec.ts` as a structural reference. Create `tests/e2e/api/redesign-tag-fields.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

const API = process.env.API_BASE_URL ?? 'http://localhost:3000';

test.describe('GET /api/tags — redesign fields', () => {
  test('flat response includes is_primary/tint/accent/fallback_image_url on every tag', async ({ request }) => {
    const res = await request.get(`${API}/api/tags`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);

    for (const tag of body) {
      expect(tag).toHaveProperty('value');
      expect(tag).toHaveProperty('display');
      expect(tag).toHaveProperty('order');
      // New redesign fields — present (may be null/false but key must exist)
      expect(tag).toHaveProperty('is_primary');
      expect(tag).toHaveProperty('tint');
      expect(tag).toHaveProperty('accent');
      expect(tag).toHaveProperty('fallback_image_url');
      expect(typeof tag.is_primary).toBe('boolean');
    }
  });

  test('structured response includes redesign fields on parents, children, and standalone', async ({ request }) => {
    const res = await request.get(`${API}/api/tags?structured=1`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('parents');
    expect(body).toHaveProperty('standalone');

    const checkTag = (t: any) => {
      expect(t).toHaveProperty('is_primary');
      expect(t).toHaveProperty('tint');
      expect(t).toHaveProperty('accent');
      expect(t).toHaveProperty('fallback_image_url');
    };

    for (const parent of body.parents) {
      checkTag(parent);
      for (const child of parent.children) checkTag(child);
    }
    for (const s of body.standalone) checkTag(s);
  });

  test('tags default to is_primary=false when unset', async ({ request }) => {
    const res = await request.get(`${API}/api/tags`);
    const body = await res.json();
    // At least one tag should be is_primary=false (this is the default for fresh data)
    const anyFalse = body.some((t: any) => t.is_primary === false);
    expect(anyFalse).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test against local dev**

In one terminal:
```bash
npm run dev
```

In another:
```bash
npx playwright test tests/e2e/api/redesign-tag-fields.spec.ts
```

Expected: 3 / 3 PASS. If "default false" test fails because all existing tags happen to be primary, that's OK — adjust by inserting a non-primary tag before the assertion or relax the assertion. Document any deviation inline in the test.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/api/redesign-tag-fields.spec.ts
git commit -m "test(api): /api/tags exposes is_primary/tint/accent/fallback_image_url"
```

---

### Task 12 — E2E test for admin tag form

**Files:**
- Create: `tests/e2e/admin/redesign-tag-form.spec.ts`

- [ ] **Step 1: Write the test**

Use `tests/e2e/admin/tags.spec.ts` as a structural reference (login flow, CSRF handling). Create `tests/e2e/admin/redesign-tag-form.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

const APP = process.env.APP_BASE_URL ?? 'http://localhost:3000';
// Admin login is required for these tests. Provide via env (no defaults — tests
// must fail loudly if creds are missing rather than silently against wrong account).
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@eastvillageeverything.com';
const ADMIN_PASS = process.env.ADMIN_PASS ?? '';

test.describe('Admin tag form — redesign fields', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${APP}/admin/login`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin/);
  });

  test('creating a primary tag with tint and accent persists all fields', async ({ page }) => {
    const value = `redesign-test-${Date.now()}`;
    await page.goto(`${APP}/admin/tags/new`);

    await page.fill('#value', value);
    await page.fill('#display', 'Redesign Test');
    await page.fill('#sort_order', '999');
    await page.check('#is_primary');
    await page.fill('#tint', '#E07B3F');
    await page.fill('#accent', '#FBF6EE');
    await page.fill('#fallback_image_url', 'https://example.com/fallback.jpg');

    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin\/tags/);

    // Verify via API
    const res = await page.request.get(`${APP}/api/tags`);
    const body = await res.json();
    const created = body.find((t: any) => t.value === value);
    expect(created).toBeTruthy();
    expect(created.is_primary).toBe(true);
    expect(created.tint).toBe('#E07B3F');
    expect(created.accent).toBe('#FBF6EE');
    expect(created.fallback_image_url).toBe('https://example.com/fallback.jpg');

    // Cleanup: delete via the admin UI to keep DB clean for repeat runs.
    // (If the existing test pattern uses a different cleanup mechanism, follow it.)
  });

  test('uncheck is_primary clears the flag', async ({ page }) => {
    // Create a primary tag, edit it, uncheck, save, verify
    const value = `redesign-toggle-${Date.now()}`;
    await page.goto(`${APP}/admin/tags/new`);
    await page.fill('#value', value);
    await page.fill('#display', 'Toggle Test');
    await page.fill('#sort_order', '998');
    await page.check('#is_primary');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin\/tags/);

    // Open edit, uncheck, save
    await page.click(`a[href*="/admin/tags/"][href*="${value}"], a:has-text("Toggle Test")`);
    await page.uncheck('#is_primary');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin\/tags/);

    const res = await page.request.get(`${APP}/api/tags`);
    const body = await res.json();
    const found = body.find((t: any) => t.value === value);
    expect(found.is_primary).toBe(false);
  });
});
```

(If the existing tag delete UX requires a different selector or confirm step, follow the patterns in `tests/e2e/admin/tags.spec.ts`.)

- [ ] **Step 2: Run the test**

```bash
npx playwright test tests/e2e/admin/redesign-tag-form.spec.ts
```
Expected: 2 / 2 PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/admin/redesign-tag-form.spec.ts
git commit -m "test(admin): tag form persists is_primary/tint/accent/fallback_image_url"
```

---

### Task 13 — E2E test for place primary tag dropdown

**Files:**
- Create: `tests/e2e/admin/redesign-place-primary-tag.spec.ts`

- [ ] **Step 1: Write the test**

This test seeds its own primary tag in `beforeAll` so it is deterministic regardless of dev DB state.

```typescript
import { test, expect } from '@playwright/test';

const APP = process.env.APP_BASE_URL ?? 'http://localhost:3000';
// Admin login is required for these tests. Provide via env (no defaults — tests
// must fail loudly if creds are missing rather than silently against wrong account).
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@eastvillageeverything.com';
const ADMIN_PASS = process.env.ADMIN_PASS ?? '';

const SEED_TAG_VALUE = `e2e-primary-${Date.now()}`;
const SEED_TAG_DISPLAY = 'E2E Primary';

async function login(page: any) {
  await page.goto(`${APP}/admin/login`);
  await page.fill('input[name="username"]', ADMIN_USER);
  await page.fill('input[name="password"]', ADMIN_PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin/);
}

test.describe('Admin place form — primary tag dropdown', () => {
  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page);
    await page.goto(`${APP}/admin/tags/new`);
    await page.fill('#value', SEED_TAG_VALUE);
    await page.fill('#display', SEED_TAG_DISPLAY);
    await page.fill('#sort_order', '997');
    await page.check('#is_primary');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin\/tags/);
    await ctx.close();
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('primary tag dropdown only shows is_primary tags', async ({ page }) => {
    await page.goto(`${APP}/admin/places/new`);
    const options = await page.locator('#primary_tag_id option').allTextContents();
    expect(options[0]).toContain('None');
    expect(options.length).toBeGreaterThan(1);

    const apiRes = await page.request.get(`${APP}/api/tags`);
    const allTags = await apiRes.json();
    const primaryDisplayNames = allTags
      .filter((t: any) => t.is_primary)
      .map((t: any) => t.display);

    for (const opt of options.slice(1)) {
      expect(primaryDisplayNames).toContain(opt.trim());
    }
    expect(primaryDisplayNames).toContain(SEED_TAG_DISPLAY);
  });

  test('selecting a primary tag persists primary_tag_id on the place', async ({ page }) => {
    await page.goto(`${APP}/admin/places`);
    const firstEditLink = page.locator('a:has-text("Edit")').first();
    await firstEditLink.click();
    await page.waitForURL(/\/admin\/places\/.+\/edit/);

    const url = page.url();
    const placeId = url.match(/\/places\/([^/]+)\/edit/)?.[1];
    expect(placeId).toBeTruthy();

    const select = page.locator('#primary_tag_id');
    await select.selectOption({ label: SEED_TAG_DISPLAY });
    const chosenValue = await select.inputValue();
    expect(chosenValue).toBeTruthy();

    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin\/places/);

    const res = await page.request.get(`${APP}/api/places/${placeId}`);
    const body = await res.json();
    expect(body.primary_tag_id).toBe(chosenValue);
  });
});
```

- [ ] **Step 2: Run the test**

```bash
npx playwright test tests/e2e/admin/redesign-place-primary-tag.spec.ts
```
Expected: 2 / 2 PASS. Each run uses a unique `SEED_TAG_VALUE` via `Date.now()`, so the seeded tag accumulates harmlessly in the dev DB. Add an `afterAll` that deletes via the admin UI only if cleanup matters.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/admin/redesign-place-primary-tag.spec.ts
git commit -m "test(admin): place form persists primary_tag_id from primary-tag dropdown"
```

---

### Task 14 — Verify mobile build still typechecks against new types

**Files:** none (verification only)

- [ ] **Step 1: Run root typecheck**

```bash
npm run typecheck
```
Expected: PASS (covers server, mobile, shared-types per CLAUDE.md).

- [ ] **Step 2: Run mobile-only test suite**

```bash
cd apps/mobile && npm test -- --watchAll=false
```
Expected: existing tests PASS unchanged. The mobile UI does not yet read `is_primary`, `tint`, `accent`, `fallback_image_url`, or `primary_tag_id` — those are wired in Phase D — so existing tests should be unaffected. If any test breaks because it asserts the exact shape of a Tag (e.g., an exhaustive `toEqual({...})`), update the assertion to match the wider shape or use `toMatchObject` instead.

- [ ] **Step 3: Run server e2e suite**

```bash
npx playwright test tests/e2e/api/ tests/e2e/admin/
```
Expected: all existing tests + the three new specs from Tasks 11-13 PASS. Pre-existing tests should not regress — the new fields are additive.

- [ ] **Step 4: Commit if any test required adjustment**

If you adjusted any pre-existing test in Step 2, commit:

```bash
git add <files>
git commit -m "chore(test): widen tag/place shape assertions for redesign fields"
```

---

### Task 15 — **HARD GATE**: Local preview, hand off to user (NO prod deploy by automation)

**Files:** none (handoff only)

> **Explicit user directive (2026-05-06):** "don't deploy to production, i need to preview the admin changes locally before you roll them out." Do not push to remote, do not merge to main, do not run prod migration. The agent's job ends with a clean local-verified branch.

- [ ] **Step 1: Push the feature branch (no merge, no PR by default)**

```bash
git push -u origin phase-a-data-model
```
This makes the branch available on GitHub but does NOT open a PR or trigger a deploy. The user opens the PR manually if/when they want it.

- [ ] **Step 2: Final local smoke-test**

```bash
npm run dev
```
Verify in a browser at `http://localhost:3000`:
- Public page (`/`) still renders place list — no regression.
- Admin (`http://admin.localhost:3000/admin/tags` or `http://localhost:3000/admin/tags` depending on host setup) shows the new tag form fields and the `is_primary` indicator on the index.
- Edit any place — the primary tag dropdown is present and saves.
- Curl: `curl -sS http://localhost:3000/api/tags | jq '.[0]'` — confirm new fields are in the response.

Stop the dev server.

- [ ] **Step 3: Write the handoff summary to chat**

Send the user a short report:
- Branch name + last commit SHA.
- All e2e test pass counts.
- Any deviations from the plan (and why).
- Explicit prompt: "Phase A is locally complete on `phase-a-data-model`. Ready for your local preview. When you're ready to deploy, prod URL is `https://eastvillageeverything.nyc`. Merge the branch to `main` to trigger the existing GitHub Action → SSM → EC2 deploy. The additive migration runs as part of the production start sequence — confirm by checking `Dockerfile` and `package.json` start scripts before merging."

- [ ] **Step 4: STOP**

Do not merge. Do not deploy. Do not modify CLAUDE.md's source-of-truth pointer until the user confirms they've previewed and accepted Phase A.

---

## Done definition

Phase A is complete when:
- All five new columns exist in prod DB.
- `/api/tags` and `/api/tags?structured=1` expose all four new tag fields publicly.
- `/api/places` and `/api/places/:id` expose `primary_tag_id` publicly.
- The EJS admin can set `is_primary`, `tint`, `accent`, `fallback_image_url` on tags.
- The EJS admin can set `primary_tag_id` on places (dropdown filtered to primary-eligible tags).
- All e2e tests pass against local and prod.
- The mobile app continues to build, typecheck, and run unchanged on TestFlight build 6/7.

The editor can now (a) mark some tags as primary, (b) tint them, (c) set primary tags on key places — manually populating the data Phase D's mobile redesign will consume. No editorial copy work is required in Phase A; that's a Phase E concern.

## Next

Once Phase A lands, draft Phase B (`docs/superpowers/plans/2026-05-XX-eve-redesign-phase-b-image-uploads.md`):
- Add Flydrive (`flydrive` v2) with `fs` driver locally and `s3` driver in prod, picking by `STORAGE_BACKEND` env var.
- Pre-signed PUT URL endpoint for browser uploads.
- IAM user / role for the app (root creds need to come out of the picture before prod uploads).
- CloudFront in front of the bucket so mobile can fetch images via a stable CDN URL.
- Drop-zone UI in the EJS tag form and place form for `fallback_image_url` and `photo_url` respectively.

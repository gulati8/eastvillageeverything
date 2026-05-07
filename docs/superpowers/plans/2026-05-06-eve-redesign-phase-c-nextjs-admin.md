# EVE Redesign — Phase C: Next.js Admin Rebuild

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/design_handoff_eve_2/README.md` — full redesign brief. This plan covers Phase C only (admin rebuild). Phases A and B landed the data model and image upload. Phases D (mobile redesign spec-compliance) and E (App Store ship) follow.

**Plan v2** (revised 2026-05-06 after code review found P0 blockers in v1: package build layout, session shape mismatch, CSRF on the upload proxy, UserModel API signature, lowercase filenames + .js suffixes). v2 fixes those and tightens P1/P2 issues. The sections that materially changed from v1: File Map, Tasks 4–7 (workspace build), Task 9.5 (new — storage package), Tasks 10–11 (Tailwind fonts + Next.js pinning), Tasks 12–13 (auth shape + login), Tasks 15–17 (upload route handler + stub strategy), Tasks 22/24/25 (delete button wrapping), Task 26 (dev orchestration), Task 32 (Dockerfile), Task 36 (cutover runbook ordering).

---

## Goal

Replace the EJS admin (`src/routes/admin.ts` + `src/views/admin/`) with a mobile-first Next.js admin at `apps/admin/`. Add neighborhoods as a first-class entity. The new admin gives a non-technical editor — operating mostly from his phone — clean CRUD pages for places, tags, and neighborhoods, plus inline-add of neighborhoods from the place form, drag-to-reorder of tags both globally and per place, and the photo upload widget from Phase B ported to React.

**Explicitly out of scope (per brainstorming):** the spec's desktop-only "live mobile preview pane" on the Edit Place screen. The editor lives on his phone; a 440px sticky preview is dead weight. He sees his work on the actual mobile app.

## Architecture

A new `apps/admin/` workspace runs Next.js 15 (App Router, TypeScript, Tailwind) alongside the existing Express app. Database access is shared: models move from `src/models/` to a new `packages/db/` workspace, imported by both Express and Next.js as `@eve/db`. The Phase B storage adapter moves from `src/storage/` to `packages/storage/`, imported by both as `@eve/storage`. Auth is shared: Next.js middleware reads the same `connect.sid` cookie and validates against the same Redis session store the Express app already uses. The new admin's photo upload is a Next.js route handler that calls `@eve/storage.putObject` directly — no proxy through Express, no CSRF round-trip. During the dev parallel-run window, both admins are reachable; at cutover (a follow-up the user runs manually), nginx routes `admin.*` to the Next.js port. EJS removal AND the data-model cleanup migration run as a separate prod step **after** cutover is verified — not as part of this branch's deploy.

The data model gains: a `neighborhoods` table (East Village seeded, default), `places.neighborhood_id` (NOT NULL, defaults to East Village), and `place_tags.sort_order` (per-place tag ordering — first tag becomes the meta-line headline on mobile). The data model loses (at cutover, in a separate migration): the Phase A tag visual-identity columns and `place.primary_tag_id`.

**Workspace build model.** All shared workspace packages (`@eve/db`, `@eve/storage`, `@eve/design-tokens`, plus the existing `@eve/shared-types`) compile to their own `dist/` directory and expose `main: ./dist/index.js`. This is required because the root tsconfig is `module: "NodeNext"` and the production Express build runs `tsc → dist/`; if a package's `main` pointed at raw TypeScript, Node would fail to load `@eve/db` after build. Dev runs `npm run build:packages` once at startup, then watches each package via its own `tsc --watch`. The Next.js admin uses `transpilePackages` so it can import workspace packages from source without needing a built `dist`.

## Tech Stack

- **Next.js 15** App Router, TypeScript, React 19, server actions, Node middleware runtime
- **Tailwind CSS 3** with design tokens from `packages/design-tokens/`
- **`@dnd-kit/sortable`** for drag-to-reorder (tags page + per-place tag picker)
- **`react-hook-form`** + **`zod`** available for forms (used selectively; simple forms use plain `<form action={...}>`)
- **`ioredis`** in Next.js for direct session lookups (same Redis as Express)
- **`@fontsource/*`** self-hosted Instrument Serif, Source Serif 4, Schibsted Grotesk
- **node-pg-migrate** migrations
- **Playwright** e2e
- **npm workspaces** for the monorepo (root `package.json` gains `workspaces`)
- **`concurrently`** to orchestrate dev (Express + Next.js + package tsc-watchers)

---

## Current state (2026-05-06) — read this first

- Phase A landed on `phase-a-data-model`, pushed, **NOT merged, NOT deployed**. Adds `tag.is_primary/tint/accent/fallback_image_url`, `place.primary_tag_id`. (`tag.parent_tag_id` predates Phase A — added by migration `…002`.) Phase C deprecates and ultimately drops all of these.
- Phase B landed on `phase-b-image-uploads`, pushed, **NOT merged, NOT deployed**. Adds `flydrive` storage adapter at `src/storage/`, multer middleware at `src/middleware/upload.ts`, `POST /admin/uploads` endpoint (CSRF-protected by `csrf-sync` mounted at `app.use('/admin', …)` in `src/server.ts`), EJS upload widget at `src/views/admin/partials/upload-widget.ejs`. Phase C reuses the storage adapter (moves it to `@eve/storage`) and keeps the existing Express upload endpoint untouched for the EJS parallel-run window. The Next.js admin builds its OWN upload endpoint at `apps/admin/app/api/admin/uploads/route.ts` (no CSRF — the route lives behind the same auth middleware) so it never crosses the Express CSRF boundary.
- Phase C branches off `phase-b-image-uploads` (so it inherits both A and B).
- AWS bucket `eastvillageeverything-uploads` exists in us-east-1 (versioned, all public access blocked). Not used in dev — `STORAGE_BACKEND=local` writes to `public/uploads/`. Same applies in Phase C.
- Migration sequence ends at `1706457600005`. Phase C migrations are `…006` (additive) and `…007` (destructive, applied at cutover **after** EJS code is removed).
- Existing root `package.json` is a flat single-package setup. Phase C introduces npm workspaces.
- Root `tsconfig.json` uses `module: "NodeNext"`, `moduleResolution: "NodeNext"`. All TS imports of local files use the `.js` extension (e.g. `from '../models/index.js'`). New code in `packages/db/`, `packages/storage/` follows the same convention.
- Existing models live at `src/models/place.ts`, `tag.ts`, `user.ts` (lowercase) with a barrel at `src/models/index.ts`. Routes import via `'../models/index.js'`. Phase C preserves this case + barrel pattern in the moved package.
- Existing `UserModel` API (Phase C uses `authenticate`, NOT `findByEmail` + `verifyPassword` directly):
  - `UserModel.authenticate(email, password): Promise<UserPublic | null>` — full flow.
  - `UserModel.verifyPassword(user, password)` — note arg order: user first, password second.
  - `UserModel.findByEmail(email): Promise<User | null>`.
- Existing Express session shape: `req.session.userId: string`, `req.session.user: UserPublic`. **No `isAdmin` flag exists** — being signed in IS being authorized for `/admin/*`. Phase C's auth middleware mirrors that: session exists → admit.
- Test admin user (dev only): `e2e-test@eve.local` / `e2etest1234`. Reuse for Playwright admin tests.

## Working Agreements

- **Each task ends with `npm run typecheck` passing** at the repo root (covers server, mobile, shared-types, and once admin exists, the admin app + new packages).
- **Each task ends with a commit.** Conventional commit messages (`feat:`, `fix:`, `chore:`, `test:`, `docs:`, `refactor:`).
- **No claiming "done" without verifying.** Per `superpowers:verification-before-completion`.
- **GATE checkpoints** are marked `**GATE**` — pause for user input.
- **Plan stays current** — `- [in-progress]` when started, `- [x]` when done, inline notes for divergences.
- **NO prod deploy** by automation. The user previews and ships themselves.
- **Don't break the EJS admin during dev parallel-run.** The destructive cleanup migration (`…007`) and EJS code deletion happen at cutover, not during build-out.
- **Workspace packages must build to `dist/` before the root `tsc` build runs** — enforced by `npm run build:packages` chained ahead of the existing `build`.

## Status Legend

- `- [ ]` not started · `- [in-progress]` mid-work · `- [x]` done · `- [BLOCKED: <reason>]` paused

---

## File Map

**Created**

Migrations & data:
- `migrations/1706457600006_add-neighborhoods-and-place-tag-order.js`
- `migrations/1706457600007_drop-phase-a-vestigial-columns.js` (applied at cutover, **after** EJS removal)

Shared packages (each with its own `package.json`, `tsconfig.json`, and `dist/` output):
- `packages/db/package.json`, `tsconfig.json`, `src/index.ts`, `src/pool.ts`, `src/models/place.ts`, `src/models/tag.ts`, `src/models/user.ts`, `src/models/neighborhood.ts`
- `packages/storage/package.json`, `tsconfig.json`, `src/index.ts`, `src/types.ts` (moved from `src/storage/`)
- `packages/design-tokens/package.json`, `tsconfig.json`, `src/index.ts`
- `packages/shared-types/src/neighborhood.ts` (existing package gains a file)
- `packages/shared-types/tsconfig.json`, `package.json` build scripts (existing package gets a build step)

Next.js admin app:
- `apps/admin/package.json`, `next.config.mjs`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `next-env.d.ts`, `.env.example`
- `apps/admin/middleware.ts`
- `apps/admin/app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `app/loading.tsx`, `app/error.tsx`, `app/not-found.tsx`
- `apps/admin/app/login/page.tsx`
- `apps/admin/app/places/page.tsx`, `app/places/new/page.tsx`, `app/places/[id]/edit/page.tsx`
- `apps/admin/app/tags/page.tsx`, `app/tags/new/page.tsx`, `app/tags/[id]/edit/page.tsx`
- `apps/admin/app/neighborhoods/page.tsx`, `app/neighborhoods/new/page.tsx`, `app/neighborhoods/[id]/edit/page.tsx`
- `apps/admin/app/api/admin/tags/route.ts`
- `apps/admin/app/api/admin/uploads/route.ts` (Next.js's OWN upload endpoint; no proxy)
- `apps/admin/components/Header.tsx`
- `apps/admin/components/PhotoUpload.tsx`
- `apps/admin/components/TagPicker.tsx`
- `apps/admin/components/NeighborhoodPicker.tsx`
- `apps/admin/components/PrevNextNav.tsx`
- `apps/admin/components/PlaceForm.tsx`
- `apps/admin/components/TagForm.tsx`
- `apps/admin/components/NeighborhoodForm.tsx`
- `apps/admin/components/SortableList.tsx`
- `apps/admin/components/DeleteButton.tsx` (small wrapper that confirms + posts to a `<form action={...}>`)
- `apps/admin/lib/auth.ts`, `lib/redis.ts`
- `apps/admin/lib/actions/login.ts`, `actions/places.ts`, `actions/tags.ts`, `actions/neighborhoods.ts`
- `apps/admin/public/.gitkeep`
- `apps/admin/Dockerfile`

Tests:
- `tests/e2e/api/redesign-neighborhoods.spec.ts`
- `tests/e2e/admin-next/auth.spec.ts`
- `tests/e2e/admin-next/places.spec.ts`
- `tests/e2e/admin-next/tags.spec.ts`
- `tests/e2e/admin-next/neighborhoods.spec.ts`
- `tests/e2e/admin-next/mobile.spec.ts`

**Modified**

- `package.json` (root) — add `workspaces`, add `build:packages` and dev orchestration scripts, add `concurrently` devDep
- `tsconfig.json` (root) — exclude packages/* and apps/admin (they have their own builds)
- `playwright.config.ts` — confirm `tests/e2e/admin-next/` is picked up; add admin test project if a separate base URL is needed
- `packages/shared-types/src/index.ts` — re-export Neighborhood types
- `packages/shared-types/src/place.ts` — add `neighborhood_id`
- `packages/shared-types/package.json` — add build script + main → dist (currently main → src)
- `src/server.ts` — imports use `@eve/db` and `@eve/storage`
- `src/routes/api.ts` — imports `@eve/db`/`@eve/storage`, add `/api/neighborhoods`, surface `neighborhood_id`, return per-place ordered tags
- `src/routes/admin.ts` — imports `@eve/db`/`@eve/storage` (Phase C keeps EJS admin running until cutover)
- `src/routes/public.ts` — imports `@eve/db`
- `src/middleware/auth.ts` — imports `@eve/db`
- `src/middleware/upload.ts` — unchanged (Express still uses it)
- `docker-compose.yml` — add `admin` service for the Next.js app
- `nginx/nginx.conf` (or whatever the prod config file is) — route `admin.*` to admin service (config landed in repo, **applied by user at cutover**)

**Deleted (by Task 5)**

- `src/db.ts` — moved to `packages/db/src/pool.ts`
- `src/models/place.ts`, `tag.ts`, `user.ts`, `index.ts` — moved to `packages/db/src/models/`
- `src/storage/index.ts`, `types.ts` — moved to `packages/storage/src/`

**Not touched in Phase C**

- `apps/mobile/**` — no changes. Mobile keeps reading whatever the API returns. The shape change (added `neighborhood_id`, ordered tags, eventually-dropped vestigial fields) is backward-compatible because all new fields are additive and the dropped fields were optional in `TagSummary`/`PlaceResponse`.
- The seed data tag named "Outside East Village" — left alone here. If the editor wants to retire it, he can delete via the admin once Phase C ships.

---

## Task List

### Task 1 — Setup: branch off Phase B + verify dev stack

**Files:** none (setup only)

- [ ] **Step 1: Create the feature branch**

```bash
git checkout phase-b-image-uploads
git checkout -b phase-c-nextjs-admin
```

- [ ] **Step 2: Verify dev stack is up**

```bash
docker compose ps
```

Expected: `app`, `postgres`, `redis` all running. If not, `npm run docker:dev`.

- [ ] **Step 3: Verify Phase A + B migrations applied**

```bash
docker compose exec -T postgres psql -U eve -d eve_development -c "\d places" | grep -E "primary_tag_id|photo_url"
docker compose exec -T postgres psql -U eve -d eve_development -c "\d tags" | grep is_primary
```

Expected: `primary_tag_id`, `photo_url`, `is_primary` all present (Phase A + B applied). If empty: `npm run migrate`.

---

### Task 2 — Migration: neighborhoods + place.neighborhood_id + place_tags.sort_order

**Files:**
- Create: `migrations/1706457600006_add-neighborhoods-and-place-tag-order.js`

- [ ] **Step 1: Create the migration file**

```javascript
/**
 * Phase C additive schema changes.
 *
 * 1. neighborhoods table:
 *    - id, value (slug, unique), display, sort_order, is_default
 *    - is_default has a partial unique index — only one row may be default at a time.
 *
 * 2. places.neighborhood_id  uuid NOT NULL FK to neighborhoods(id) ON DELETE RESTRICT
 *    - Backfilled to the default neighborhood (East Village) for all existing places.
 *
 * 3. place_tags.sort_order  integer not null default 0
 *    - Per-place ordering. Mobile feed's meta line uses tag at sort_order=0.
 */

exports.up = async (pgm) => {
  pgm.createTable('neighborhoods', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    value: { type: 'varchar(64)', notNull: true, unique: true },
    display: { type: 'varchar(128)', notNull: true },
    sort_order: { type: 'integer', notNull: true, default: 0 },
    is_default: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('neighborhoods', 'sort_order');

  pgm.sql(`
    CREATE UNIQUE INDEX neighborhoods_one_default_idx
      ON neighborhoods (is_default) WHERE is_default = true;
  `);

  pgm.sql(`
    INSERT INTO neighborhoods (value, display, sort_order, is_default)
    VALUES ('east-village', 'East Village', 0, true);
  `);

  pgm.addColumn('places', {
    neighborhood_id: {
      type: 'uuid',
      notNull: false,
      references: 'neighborhoods(id)',
      onDelete: 'RESTRICT',
    },
  });

  pgm.sql(`
    UPDATE places
    SET neighborhood_id = (SELECT id FROM neighborhoods WHERE is_default = true)
    WHERE neighborhood_id IS NULL;
  `);

  pgm.alterColumn('places', 'neighborhood_id', { notNull: true });
  pgm.createIndex('places', 'neighborhood_id');

  pgm.addColumn('place_tags', {
    sort_order: { type: 'integer', notNull: true, default: 0 },
  });

  pgm.sql(`
    WITH ordered AS (
      SELECT
        pt.place_id,
        pt.tag_id,
        ROW_NUMBER() OVER (PARTITION BY pt.place_id ORDER BY t.sort_order, t.value) - 1 AS new_order
      FROM place_tags pt
      JOIN tags t ON t.id = pt.tag_id
    )
    UPDATE place_tags pt
    SET sort_order = ordered.new_order
    FROM ordered
    WHERE pt.place_id = ordered.place_id AND pt.tag_id = ordered.tag_id;
  `);
};

exports.down = (pgm) => {
  pgm.dropColumn('place_tags', 'sort_order');
  pgm.dropIndex('places', 'neighborhood_id');
  pgm.dropColumn('places', 'neighborhood_id');
  pgm.sql('DROP INDEX IF EXISTS neighborhoods_one_default_idx;');
  pgm.dropTable('neighborhoods');
};
```

- [ ] **Step 2: Run + verify**

```bash
npm run migrate
docker compose exec -T postgres psql -U eve -d eve_development -c "\d neighborhoods"
docker compose exec -T postgres psql -U eve -d eve_development -c "\d places" | grep neighborhood_id
docker compose exec -T postgres psql -U eve -d eve_development -c "\d place_tags" | grep sort_order
docker compose exec -T postgres psql -U eve -d eve_development -c "SELECT value, display, is_default FROM neighborhoods;"
```

Expected: tables/columns exist; one row in neighborhoods (East Village, default).

- [ ] **Step 3: Round-trip**

```bash
npm run migrate:down && npm run migrate
```

- [ ] **Step 4: Commit**

```bash
git add migrations/1706457600006_add-neighborhoods-and-place-tag-order.js
git commit -m "feat: neighborhoods table, place.neighborhood_id, place_tags.sort_order"
```

---

### Task 3 — Shared types: Neighborhood + place neighborhood_id

**Files:**
- Create: `packages/shared-types/src/neighborhood.ts`
- Modify: `packages/shared-types/src/index.ts`
- Modify: `packages/shared-types/src/place.ts`

- [ ] **Step 1: Create `neighborhood.ts`**

```typescript
export interface Neighborhood {
  id: string;
  value: string;
  display: string;
  sort_order: number;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface NeighborhoodSummary {
  id: string;
  value: string;
  display: string;
  is_default: boolean;
  order: string;
}
```

- [ ] **Step 2: Add `neighborhood_id` to `Place` and `PlaceResponse`**

In `packages/shared-types/src/place.ts`, add after the `primary_tag_id` line in both `Place` and `PlaceResponse`:
```typescript
  neighborhood_id: string;
```

(Required, not optional. Every place has a neighborhood after Task 2's migration.)

- [ ] **Step 3: Re-export from `index.ts`**

In `packages/shared-types/src/index.ts`, add:
```typescript
export * from './neighborhood.js';
```

(`.js` suffix per the existing ESM/NodeNext convention in this package.)

- [ ] **Step 4: Typecheck and commit**

```bash
npm run typecheck
git add packages/shared-types/src/
git commit -m "feat(types): Neighborhood + place neighborhood_id"
```

---

### Task 4 — Configure npm workspaces + scaffold @eve/db (with build step)

**Files:**
- Modify: `package.json` (root)
- Modify: `tsconfig.json` (root) — exclude `packages/`, `apps/admin/`
- Modify: `packages/shared-types/package.json` — add a real build step
- Modify: `packages/shared-types/tsconfig.json` (create if missing) — emit to `dist/`
- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/src/index.ts` (placeholder)

> **Why a build step on every workspace package?** Root `tsconfig.json` is `module: "NodeNext"`. The production Express build runs `tsc` and writes `dist/`. After build, Node loads `dist/server.js`, which imports `@eve/db`. If `@eve/db`'s `main` points at raw TypeScript, Node can't load it. Every package that has runtime code (`@eve/db`, `@eve/storage`, `@eve/design-tokens` — and `@eve/shared-types`, even though it's currently type-only, gets the same treatment for consistency) builds to its own `dist/`.

- [ ] **Step 1: Add `workspaces` to root `package.json`**

In `package.json` (root), add after `"main"`:
```json
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
```

- [ ] **Step 2: Add build orchestration scripts to root `package.json`**

Replace the existing `"build"` script and add new ones:
```json
"build": "npm run build:packages && tsc",
"build:packages": "npm --workspaces --if-present run build",
"dev:packages": "npm --workspaces --if-present run dev",
```

(Keep the existing `"dev"` script — it remains the Express-only entrypoint until Task 26 wires `dev:all`.)

- [ ] **Step 3: Exclude workspace dirs from the root tsc**

In root `tsconfig.json`, ensure `exclude` covers them:
```json
"exclude": ["node_modules", "dist", "packages", "apps"]
```

(Adjust to merge with what's already there. The root tsc compiles only `src/`. Each package compiles its own source.)

- [ ] **Step 4: Give `packages/shared-types` a build step**

Modify `packages/shared-types/package.json`:
```json
{
  "name": "@eve/shared-types",
  "version": "0.0.2",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch --preserveWatchOutput",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.7.3"
  }
}
```

Create `packages/shared-types/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

Add `dist/` to the package's gitignore (create `packages/shared-types/.gitignore` if missing):
```
dist/
*.tsbuildinfo
```

- [ ] **Step 5: Create `packages/db/package.json`**

```json
{
  "name": "@eve/db",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch --preserveWatchOutput",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@eve/shared-types": "*",
    "bcryptjs": "^3.0.3",
    "pg": "^8.13.1"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/pg": "^8.11.10",
    "typescript": "^5.7.3"
  }
}
```

- [ ] **Step 6: Create `packages/db/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 7: Create placeholder `packages/db/src/index.ts`**

```typescript
// Models and pool re-exported here. Populated in Task 5.
export {};
```

- [ ] **Step 8: Add `packages/db/.gitignore`**

```
dist/
*.tsbuildinfo
```

- [ ] **Step 9: Reinstall to wire workspace symlinks**

```bash
npm install
```

(No need to delete `node_modules` or `package-lock.json`. `npm install` after editing `workspaces` is enough; it'll re-link.)

```bash
ls -l node_modules/@eve/db node_modules/@eve/shared-types
```

Expected: both are symlinks into `packages/`.

- [ ] **Step 10: Build the packages once, typecheck**

```bash
npm run build:packages
npm run typecheck
```

Expected: PASS. `packages/db/dist/index.js` exists. `packages/shared-types/dist/index.js` exists.

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json tsconfig.json packages/
git commit -m "chore: enable npm workspaces, scaffold @eve/db with proper build step"
```

---

### Task 5 — Move models + pool into @eve/db

**Files (renames):**
- `src/db.ts` → `packages/db/src/pool.ts`
- `src/models/index.ts` → `packages/db/src/models/index.ts`
- `src/models/place.ts` → `packages/db/src/models/place.ts`
- `src/models/tag.ts` → `packages/db/src/models/tag.ts`
- `src/models/user.ts` → `packages/db/src/models/user.ts`

**Files modified (Express imports swap):**
- `src/server.ts`, `src/routes/api.ts`, `src/routes/admin.ts`, `src/routes/public.ts`, `src/middleware/auth.ts`, any other consumer

> **Convention reminder:** existing files use lowercase names with `.js` import suffixes (`from '../models/index.js'`). Phase C preserves both — don't capitalize, don't drop suffixes.

- [ ] **Step 1: Move pool**

```bash
git mv src/db.ts packages/db/src/pool.ts
```

- [ ] **Step 2: Move models directory**

```bash
git mv src/models packages/db/src/models
```

- [ ] **Step 3: Fix relative imports inside the moved files**

Each model file currently imports from `'../db.js'`. After the move, update to `'../pool.js'`:

```bash
grep -l "from '\.\./db\.js'" packages/db/src/models/*.ts
```

For each match, replace `from '../db.js'` with `from '../pool.js'`. Confirm no other relative imports broke:
```bash
grep -rn "from '\.\./" packages/db/src/models/
```

Expected after fix: only `from '../pool.js'` in model files.

- [ ] **Step 4: Populate `packages/db/src/index.ts`**

```typescript
export { pool, query, getClient, withTransaction } from './pool.js';
export * from './models/index.js';
```

(`models/index.js` re-exports `PlaceModel`, `TagModel`, `UserModel` and their types — match the existing barrel.)

In Task 6 we'll add NeighborhoodModel to the same barrel.

- [ ] **Step 5: Update Express imports**

In every Express source file, replace local model/db imports:
- `from '../models/index.js'` → `from '@eve/db'`
- `from '../models/place.js'` (if any direct imports) → `from '@eve/db'`
- `from '../db.js'` → `from '@eve/db'` (only if a file imports the pool directly; most go through models)

Files to sweep: `src/server.ts`, `src/routes/api.ts`, `src/routes/admin.ts`, `src/routes/public.ts`, `src/middleware/auth.ts`, and anything else.

```bash
grep -rln "from '\.\./models/\|from '\.\./db\.js'\|from '\./models/\|from '\./db\.js'" src/
```

Expected output: empty after sweep.

```bash
grep -rln "from '@eve/db'" src/
```

Expected: every consumer now imports from `@eve/db`.

- [ ] **Step 6: Build packages, typecheck, smoke-test Express**

```bash
npm run build:packages
npm run typecheck
npm run dev
```

In another terminal:
```bash
curl -sS http://localhost:3000/api/places | jq '. | length'
curl -sS http://localhost:3000/api/tags | jq '. | length'
```

Expected: both > 0. Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: move models + db pool into @eve/db workspace package"
```

---

### Task 6 — NeighborhoodModel

**Files:**
- Create: `packages/db/src/models/neighborhood.ts` (lowercase)
- Modify: `packages/db/src/models/index.ts` (add to barrel)

- [ ] **Step 1: Create the model**

```typescript
import { query, withTransaction } from '../pool.js';
import type { Neighborhood } from '@eve/shared-types';

export interface NeighborhoodInput {
  value: string;
  display: string;
  sort_order?: number;
  is_default?: boolean;
}

const SELECT_COLUMNS = `
  id, value, display, sort_order, is_default, created_at, updated_at
`.trim();

export const NeighborhoodModel = {
  async findAll(): Promise<Neighborhood[]> {
    const result = await query<Neighborhood>(
      `SELECT ${SELECT_COLUMNS} FROM neighborhoods ORDER BY sort_order, display`
    );
    return result.rows;
  },

  async findById(id: string): Promise<Neighborhood | null> {
    const result = await query<Neighborhood>(
      `SELECT ${SELECT_COLUMNS} FROM neighborhoods WHERE id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  },

  async findByValue(value: string): Promise<Neighborhood | null> {
    const result = await query<Neighborhood>(
      `SELECT ${SELECT_COLUMNS} FROM neighborhoods WHERE value = $1`,
      [value]
    );
    return result.rows[0] ?? null;
  },

  async findDefault(): Promise<Neighborhood | null> {
    const result = await query<Neighborhood>(
      `SELECT ${SELECT_COLUMNS} FROM neighborhoods WHERE is_default = true LIMIT 1`
    );
    return result.rows[0] ?? null;
  },

  async countPlacesUsing(id: string): Promise<number> {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM places WHERE neighborhood_id = $1`,
      [id]
    );
    return parseInt(result.rows[0]?.count ?? '0', 10);
  },

  async create(data: NeighborhoodInput): Promise<Neighborhood> {
    return withTransaction(async (client) => {
      if (data.is_default) {
        await client.query(`UPDATE neighborhoods SET is_default = false WHERE is_default = true`);
      }
      const result = await client.query<Neighborhood>(
        `INSERT INTO neighborhoods (value, display, sort_order, is_default)
         VALUES ($1, $2, $3, $4)
         RETURNING ${SELECT_COLUMNS}`,
        [data.value, data.display, data.sort_order ?? 0, data.is_default ?? false]
      );
      return result.rows[0];
    });
  },

  async update(id: string, data: Partial<NeighborhoodInput>): Promise<Neighborhood | null> {
    return withTransaction(async (client) => {
      if (data.is_default === true) {
        await client.query(
          `UPDATE neighborhoods SET is_default = false WHERE is_default = true AND id <> $1`,
          [id]
        );
      }
      const updates: string[] = [];
      const params: unknown[] = [];
      let i = 1;
      if (data.value !== undefined) { updates.push(`value = $${i++}`); params.push(data.value); }
      if (data.display !== undefined) { updates.push(`display = $${i++}`); params.push(data.display); }
      if (data.sort_order !== undefined) { updates.push(`sort_order = $${i++}`); params.push(data.sort_order); }
      if (data.is_default !== undefined) { updates.push(`is_default = $${i++}`); params.push(data.is_default); }
      if (updates.length === 0) {
        const result = await client.query<Neighborhood>(
          `SELECT ${SELECT_COLUMNS} FROM neighborhoods WHERE id = $1`,
          [id]
        );
        return result.rows[0] ?? null;
      }
      updates.push(`updated_at = now()`);
      params.push(id);
      const result = await client.query<Neighborhood>(
        `UPDATE neighborhoods SET ${updates.join(', ')} WHERE id = $${i} RETURNING ${SELECT_COLUMNS}`,
        params
      );
      return result.rows[0] ?? null;
    });
  },

  async delete(id: string): Promise<void> {
    const def = await this.findDefault();
    if (def && def.id === id) {
      throw new Error('Cannot delete the default neighborhood. Set another as default first.');
    }
    const placeCount = await this.countPlacesUsing(id);
    if (placeCount > 0) {
      throw new Error(`Cannot delete: ${placeCount} place(s) are assigned to this neighborhood. Reassign them first.`);
    }
    await query(`DELETE FROM neighborhoods WHERE id = $1`, [id]);
  },
};
```

- [ ] **Step 2: Re-export from the models barrel**

In `packages/db/src/models/index.ts`, append:
```typescript
export { NeighborhoodModel, type NeighborhoodInput } from './neighborhood.js';
```

- [ ] **Step 3: Build + typecheck**

```bash
npm run build:packages
npm run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/models/neighborhood.ts packages/db/src/models/index.ts
git commit -m "feat(db): NeighborhoodModel with CRUD + delete pre-checks"
```

---

### Task 7 — PlaceModel: read/write neighborhood_id and ordered tags

**Files:**
- Modify: `packages/db/src/models/place.ts` (lowercase)

- [ ] **Step 1: Add `neighborhood_id` to `PlaceInput`**

```typescript
  neighborhood_id?: string | null;
```

- [ ] **Step 2: Update SELECT statements to include `neighborhood_id` and per-place ordered tags**

Find both SELECT statements (in `findAll` and `findById`). The current pattern reads tags as:
```sql
array_agg(t.value ORDER BY t.sort_order) FILTER (WHERE t.value IS NOT NULL)
```

Replace with per-place ordering:
```sql
array_agg(t.value ORDER BY pt.sort_order, t.sort_order) FILTER (WHERE t.value IS NOT NULL)
```

Add `p.neighborhood_id` to the SELECT column list.

- [ ] **Step 3: Update `create` to write `neighborhood_id`**

```typescript
let neighborhoodId = data.neighborhood_id;
if (!neighborhoodId) {
  const defaultRow = await client.query<{ id: string }>(
    `SELECT id FROM neighborhoods WHERE is_default = true LIMIT 1`
  );
  neighborhoodId = defaultRow.rows[0]?.id;
  if (!neighborhoodId) {
    throw new Error('No default neighborhood configured');
  }
}
```

Pass `neighborhoodId` as the corresponding placeholder in the INSERT.

- [ ] **Step 4: Add a `setTags(client, placeId, tagValues)` helper for ordered tag writes**

Inside the model object:
```typescript
async setTags(client, placeId: string, tagValues: string[]): Promise<void> {
  await client.query('DELETE FROM place_tags WHERE place_id = $1', [placeId]);
  for (let i = 0; i < tagValues.length; i++) {
    await client.query(
      `INSERT INTO place_tags (place_id, tag_id, sort_order)
       SELECT $1, t.id, $3 FROM tags t WHERE t.value = $2`,
      [placeId, tagValues[i], i]
    );
  }
},
```

(Type the `client` parameter as `import('pg').PoolClient`.)

Replace the existing tag-INSERT block in `create` (and `update`, if it has one) with `await PlaceModel.setTags(client, placeId, data.tags ?? [])`.

- [ ] **Step 5: Update `update` to handle `neighborhood_id`**

In the update's conditional block:
```typescript
if (data.neighborhood_id !== undefined) {
  updates.push(`neighborhood_id = $${paramIndex++}`);
  params.push(data.neighborhood_id);
}
```

(`neighborhood_id` is NOT NULL — never set to null in update.)

- [ ] **Step 6: Build + typecheck + smoke**

```bash
npm run build:packages
npm run typecheck
npm run dev
curl -sS http://localhost:3000/api/places | jq '.[0]'
```

Expected: response includes `neighborhood_id` (uuid) and `tags` (ordered array). Stop dev server.

- [ ] **Step 7: Commit**

```bash
git add packages/db/src/models/place.ts
git commit -m "feat(db): PlaceModel reads/writes neighborhood_id and per-place tag order"
```

---

### Task 8 — API: /api/neighborhoods + neighborhood_id surfaced

**Files:**
- Modify: `src/routes/api.ts`

- [ ] **Step 1: Add `/api/neighborhoods` handler**

Below the `/tags` handler:
```typescript
import { NeighborhoodModel } from '@eve/db';
import type { NeighborhoodSummary } from '@eve/shared-types';

router.get('/neighborhoods', async (_req, res) => {
  try {
    const rows = await NeighborhoodModel.findAll();
    const response: NeighborhoodSummary[] = rows.map((n) => ({
      id: n.id,
      value: n.value,
      display: n.display,
      is_default: n.is_default,
      order: String(n.sort_order),
    }));
    res.json(response);
  } catch (err) {
    console.error('GET /api/neighborhoods failed', err);
    res.status(500).json({ error: 'Internal error' });
  }
});
```

(Match the existing file's `router` vs `app` naming.)

- [ ] **Step 2: Surface `neighborhood_id` in `/api/places`**

In both `/places` (list) and `/places/:id` (detail) response object mappings, add:
```typescript
neighborhood_id: place.neighborhood_id,
```

- [ ] **Step 3: Verify**

```bash
npm run dev
curl -sS http://localhost:3000/api/neighborhoods | jq '.'
curl -sS http://localhost:3000/api/places | jq '.[0] | {neighborhood_id, tags}'
```

Stop the dev server.

- [ ] **Step 4: Typecheck and commit**

```bash
npm run typecheck
git add src/routes/api.ts
git commit -m "feat(api): /api/neighborhoods endpoint and neighborhood_id on places"
```

---

### Task 9 — E2E test: neighborhoods API + ordered tags

**Files:**
- Create: `tests/e2e/api/redesign-neighborhoods.spec.ts`

- [ ] **Step 1: Test**

```typescript
import { test, expect } from '@playwright/test';

const API = process.env.API_BASE_URL ?? 'http://localhost:3000';

test.describe('GET /api/neighborhoods', () => {
  test('returns at least the default East Village', async ({ request }) => {
    const res = await request.get(`${API}/api/neighborhoods`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    const def = body.find((n: any) => n.is_default === true);
    expect(def).toBeTruthy();
    expect(def.value).toBe('east-village');
    expect(def.display).toBe('East Village');
  });

  test('every entry has id, value, display, is_default, order', async ({ request }) => {
    const res = await request.get(`${API}/api/neighborhoods`);
    const body = await res.json();
    for (const n of body) {
      expect(n).toHaveProperty('id');
      expect(n).toHaveProperty('value');
      expect(n).toHaveProperty('display');
      expect(n).toHaveProperty('is_default');
      expect(n).toHaveProperty('order');
      expect(typeof n.is_default).toBe('boolean');
    }
  });
});

test.describe('GET /api/places — neighborhood_id and tag order', () => {
  test('every place has a neighborhood_id', async ({ request }) => {
    const res = await request.get(`${API}/api/places?limit=10`);
    const body = await res.json();
    for (const place of body) {
      expect(place.neighborhood_id).toBeTruthy();
      expect(typeof place.neighborhood_id).toBe('string');
    }
  });

  test('place tags are returned in per-place sort_order', async ({ request }) => {
    const list = await request.get(`${API}/api/places?limit=5`);
    const places = await list.json();
    const target = places.find((p: any) => Array.isArray(p.tags) && p.tags.length >= 2);
    if (!target) {
      test.skip(true, 'No places with 2+ tags in test fixture');
      return;
    }
    const detail = await request.get(`${API}/api/places/${target.id}`);
    const detailBody = await detail.json();
    expect(detailBody.tags).toEqual(target.tags);
  });
});
```

- [ ] **Step 2: Run + commit**

```bash
npm run dev   # in another terminal
npx playwright test tests/e2e/api/redesign-neighborhoods.spec.ts --project=desktop-chrome
git add tests/e2e/api/redesign-neighborhoods.spec.ts
git commit -m "test(api): /api/neighborhoods and per-place tag order"
```

---

### Task 10 — Extract @eve/storage workspace package

**Files (renames):**
- `src/storage/index.ts` → `packages/storage/src/index.ts`
- `src/storage/types.ts` → `packages/storage/src/types.ts`

**Files created:**
- `packages/storage/package.json`
- `packages/storage/tsconfig.json`
- `packages/storage/.gitignore`

**Files modified:**
- `src/routes/admin.ts` — import from `@eve/storage`
- `src/server.ts` — if it referenced storage
- Any other Express consumer of `src/storage/`

> **Why extract storage now?** The Next.js admin needs to upload images. Routing the upload through Express's `POST /admin/uploads` requires bypassing csrf-sync (it's mounted on `/admin/*`), or fetching a CSRF token first, or punching a hole in the middleware. All ugly. Cleaner: both apps depend on `@eve/storage`, and the Next.js admin gets its own thin upload route handler.

- [ ] **Step 1: Create the package**

`packages/storage/package.json`:
```json
{
  "name": "@eve/storage",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch --preserveWatchOutput",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.1043.0",
    "@aws-sdk/s3-request-presigner": "^3.1043.0",
    "flydrive": "^2.1.0"
  },
  "devDependencies": {
    "typescript": "^5.7.3"
  }
}
```

`packages/storage/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

`packages/storage/.gitignore`:
```
dist/
*.tsbuildinfo
```

- [ ] **Step 2: Move source files**

```bash
mkdir -p packages/storage/src
git mv src/storage/index.ts packages/storage/src/index.ts
git mv src/storage/types.ts packages/storage/src/types.ts
rmdir src/storage
```

(If `src/storage/` has more files, move them too. List with `ls src/storage/` first.)

- [ ] **Step 3: Verify imports inside the moved files**

`packages/storage/src/index.ts` should only import from `flydrive`, `@aws-sdk/*`, `node:*`, and `./types.js`. If it imports anything from elsewhere in the repo, fix.

- [ ] **Step 4: Update Express consumers**

```bash
grep -rln "from '\.\./storage/\|from '\./storage/" src/
```

For each match, replace with `from '@eve/storage'`. Likely only `src/routes/admin.ts` (the upload handler).

- [ ] **Step 5: Reinstall, build, smoke**

```bash
npm install
npm run build:packages
npm run typecheck
npm run dev
```

Smoke-test that the existing Express upload still works (use the EJS admin's drop zone, log in first):
```bash
curl -sS http://localhost:3000/admin/uploads -X POST \
  -H "Cookie: <session-cookie-from-browser>" \
  -F "file=@/path/to/test.png" -F "prefix=tag"
```

(For automation, the existing Phase B test `tests/e2e/admin/redesign-upload-endpoint.spec.ts` already exercises this — running it as part of regression at Task 35 covers this.)

Stop dev server.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: extract @eve/storage workspace package"
```

---

### Task 11 — Design tokens package (Tailwind-ready arrays)

**Files:**
- Create: `packages/design-tokens/package.json`
- Create: `packages/design-tokens/tsconfig.json`
- Create: `packages/design-tokens/.gitignore`
- Create: `packages/design-tokens/src/index.ts`

- [ ] **Step 1: Package files**

`packages/design-tokens/package.json`:
```json
{
  "name": "@eve/design-tokens",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch --preserveWatchOutput",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.7.3"
  }
}
```

`packages/design-tokens/tsconfig.json` — same shape as `packages/storage/tsconfig.json` (copy).

`packages/design-tokens/.gitignore`:
```
dist/
*.tsbuildinfo
```

- [ ] **Step 2: Token export — fonts as arrays (Tailwind-ready)**

`packages/design-tokens/src/index.ts`:
```typescript
/**
 * Visual tokens for EVE — pulled from docs/design_handoff_eve_2/eve-tokens.jsx
 * and the README's "Visual system" section.
 *
 * Font stacks are arrays so consumers (Tailwind, CSS) can either join them with
 * commas or hand them straight to a tool that expects array form. Multi-word
 * font names are pre-quoted so the join produces valid CSS.
 */

export const colors = {
  light: {
    paper: '#FBF6EE',
    paper2: '#F2EADC',
    ink: '#1F1A14',
    ink2: '#54483A',
    ink3: '#8C7E6C',
    hairline: 'rgba(31,26,20,0.08)',
    accent: '#E07B3F',
  },
  dark: {
    paper: '#1F1A14',
    paper2: '#2A2520',
    ink: '#FBF6EE',
    ink2: '#C9BEAB',
    ink3: '#8C7E6C',
    hairline: 'rgba(251,246,238,0.08)',
    accent: '#F09060',
  },
} as const;

export const fontStacks = {
  display: ['"Instrument Serif"', '"Iowan Old Style"', 'Georgia', 'serif'],
  body: ['"Source Serif 4"', '"Source Serif Pro"', 'Georgia', 'serif'],
  ui: ['"Schibsted Grotesk"', '"Inter"', 'system-ui', 'sans-serif'],
} as const;

export const spacing = {
  '1': '4px',
  '2': '8px',
  '3': '12px',
  '4': '16px',
  '5': '22px',
  '6': '28px',
  '7': '36px',
  '8': '48px',
} as const;

export const radii = {
  chip: '6px',
  input: '10px',
  card: '14px',
  sheet: '22px',
} as const;
```

- [ ] **Step 3: Reinstall, build, commit**

```bash
npm install
npm run build:packages
npm run typecheck
git add packages/design-tokens/
git commit -m "feat: @eve/design-tokens — colors, fontStacks (arrays), spacing, radii"
```

---

### Task 12 — Scaffold apps/admin/ Next.js app

**Files:**
- Create: `apps/admin/package.json`, `next.config.mjs`, `tsconfig.json`, `next-env.d.ts`, `.env.example`
- Create: `apps/admin/postcss.config.mjs`, `tailwind.config.ts`
- Create: `apps/admin/app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `app/loading.tsx`, `app/error.tsx`, `app/not-found.tsx`
- Create: `apps/admin/public/.gitkeep`

> **Pinning Next.js.** The reviewer flagged `^15.0.0` as too broad; minor versions of Next 15 have shifted server-action and middleware-runtime APIs. Pin to a specific minor at write time. The Node-runtime middleware behavior assumed by Task 13 is supported in Next.js 15.1+; the executor verifies before installing.

- [ ] **Step 1: `apps/admin/package.json`**

```json
{
  "name": "@eve/admin",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "@eve/db": "*",
    "@eve/design-tokens": "*",
    "@eve/shared-types": "*",
    "@eve/storage": "*",
    "@fontsource/instrument-serif": "^5.0.0",
    "@fontsource/source-serif-4": "^5.0.0",
    "@fontsource/schibsted-grotesk": "^5.0.0",
    "cookie-signature": "^1.2.1",
    "ioredis": "^5.4.2",
    "next": "15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/cookie-signature": "^1.1.0",
    "@types/node": "^22.10.7",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.7.3"
  }
}
```

(If `@types/cookie-signature` isn't published, drop it and add `apps/admin/cookie-signature.d.ts`:
```typescript
declare module 'cookie-signature' {
  export function unsign(value: string, secret: string): string | false;
  export function sign(value: string, secret: string): string;
}
```)

- [ ] **Step 2: `apps/admin/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: `apps/admin/next.config.mjs`**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Read workspace packages from source — no built dist required for admin dev.
  transpilePackages: ['@eve/db', '@eve/design-tokens', '@eve/shared-types', '@eve/storage'],
  experimental: {
    // Server actions accept multipart up to bodySizeLimit for the photo upload.
    serverActions: { bodySizeLimit: '12mb' },
    // Required to run middleware on the Node runtime (so ioredis works).
    // VERIFY against the pinned Next minor — earlier Next 15 minors used a
    // different config key. If the value name changed, update it; if Node
    // middleware is now default, drop this key.
    nodeMiddleware: true,
  },
};

export default nextConfig;
```

- [ ] **Step 4: `apps/admin/.env.example`**

```
# Used by the auth bridge — must match Express's session config exactly.
SESSION_COOKIE_NAME=connect.sid
SESSION_SECRET=<same as the Express app>
REDIS_URL=redis://localhost:6379

# Used by @eve/db pool.
DATABASE_URL=postgres://eve:eve@localhost:5432/eve_development

# Used by @eve/storage. Same env contract as the Express app — STORAGE_BACKEND
# defaults to 'local' which writes into the local FS path below.
STORAGE_BACKEND=local
STORAGE_LOCAL_DIR=public/uploads
STORAGE_LOCAL_URL_PREFIX=/uploads
```

- [ ] **Step 5: `apps/admin/postcss.config.mjs`**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 6: `apps/admin/tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss';
import { colors, fontStacks, spacing, radii } from '@eve/design-tokens';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: colors.light.paper,
        paper2: colors.light.paper2,
        ink: colors.light.ink,
        ink2: colors.light.ink2,
        ink3: colors.light.ink3,
        hairline: colors.light.hairline,
        accent: colors.light.accent,
      },
      fontFamily: {
        // Tailwind expects arrays of strings; fontStacks already gives that.
        // Multi-word names are pre-quoted in @eve/design-tokens.
        display: [...fontStacks.display],
        body: [...fontStacks.body],
        ui: [...fontStacks.ui],
      },
      spacing,
      borderRadius: {
        chip: radii.chip,
        input: radii.input,
        card: radii.card,
        sheet: radii.sheet,
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 7: `apps/admin/app/globals.css`**

```css
@import '@fontsource/instrument-serif/400.css';
@import '@fontsource/instrument-serif/400-italic.css';
@import '@fontsource/source-serif-4/400.css';
@import '@fontsource/source-serif-4/400-italic.css';
@import '@fontsource/schibsted-grotesk/600.css';
@import '@fontsource/schibsted-grotesk/700.css';

@tailwind base;
@tailwind components;
@tailwind utilities;

html, body {
  background: theme('colors.paper');
  color: theme('colors.ink');
  font-family: theme('fontFamily.body');
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

h1, h2, h3 {
  font-family: theme('fontFamily.display');
  font-style: italic;
  font-weight: 400;
}

.ui {
  font-family: theme('fontFamily.ui');
  letter-spacing: 0.04em;
}
```

- [ ] **Step 8: `apps/admin/app/layout.tsx` (placeholder; real header in Task 15)**

```tsx
import './globals.css';
import type { ReactNode } from 'react';

export const metadata = { title: 'EVE Admin' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 9: `apps/admin/app/page.tsx`**

```tsx
import { redirect } from 'next/navigation';
export default function Home() { redirect('/places'); }
```

- [ ] **Step 10: Stub error / loading / not-found**

`apps/admin/app/loading.tsx`:
```tsx
export default function Loading() { return <div className="p-5 ui text-ink3">Loading…</div>; }
```

`apps/admin/app/error.tsx`:
```tsx
'use client';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-5">
      <h2>Something went wrong.</h2>
      <pre className="ui text-ink3 text-sm">{error.message}</pre>
      <button onClick={reset} className="ui underline">Retry</button>
    </div>
  );
}
```

`apps/admin/app/not-found.tsx`:
```tsx
export default function NotFound() { return <div className="p-5">Not found.</div>; }
```

- [ ] **Step 11: Public folder gitkeep**

```bash
mkdir -p apps/admin/public
touch apps/admin/public/.gitkeep
```

- [ ] **Step 12: Install + update root typecheck**

```bash
npm install
```

Update root `package.json`:
```json
"typecheck": "tsc --noEmit && npm --prefix apps/mobile run typecheck && npm --prefix apps/admin run typecheck"
```

- [ ] **Step 13: Smoke**

```bash
npm run build:packages
npm run typecheck
npm --prefix apps/admin run dev
```

Open `http://localhost:3001` — expect redirect to `/places` and a 404. The Next.js error overlay should not show. Stop the dev server.

- [ ] **Step 14: Commit**

```bash
git add apps/admin/ package.json package-lock.json
git commit -m "feat(admin): scaffold Next.js 15 app at apps/admin with tokens + Tailwind"
```

---

### Task 13 — Auth bridge: Node-runtime middleware reads Redis session

**Files:**
- Create: `apps/admin/lib/redis.ts`
- Create: `apps/admin/lib/auth.ts`
- Create: `apps/admin/middleware.ts`

> **Session shape:** Express stores `req.session.userId: string` and `req.session.user: UserPublic`. There is no `isAdmin` flag in this codebase — being signed in is being authorized. The middleware just checks "session exists."

- [ ] **Step 1: Redis client**

`apps/admin/lib/redis.ts`:
```typescript
import Redis from 'ioredis';

const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
let client: Redis | null = null;

export function redis(): Redis {
  if (!client) {
    client = new Redis(url);
    client.on('error', (err) => console.error('redis error in admin:', err));
  }
  return client;
}
```

- [ ] **Step 2: Session reader (`lib/auth.ts`)**

```typescript
import { redis } from './redis.js';
import { unsign } from 'cookie-signature';
import type { UserPublic } from '@eve/shared-types';

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? 'connect.sid';
const SECRET = process.env.SESSION_SECRET ?? '';

export interface AdminSession {
  userId: string;
  user: UserPublic;
}

export async function readSession(rawCookie: string | undefined): Promise<AdminSession | null> {
  if (!rawCookie || !SECRET) return null;
  const trimmed = rawCookie.startsWith('s:') ? rawCookie.slice(2) : rawCookie;
  const sid = unsign(trimmed, SECRET);
  if (sid === false) return null;

  const raw = await redis().get(`sess:${sid}`);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data.userId !== 'string' || !data.user) return null;
    return { userId: data.userId, user: data.user as UserPublic };
  } catch {
    return null;
  }
}

export async function destroySession(rawCookie: string | undefined): Promise<void> {
  if (!rawCookie || !SECRET) return;
  const trimmed = rawCookie.startsWith('s:') ? rawCookie.slice(2) : rawCookie;
  const sid = unsign(trimmed, SECRET);
  if (sid === false) return;
  await redis().del(`sess:${sid}`);
}

export const SESSION_COOKIE = COOKIE_NAME;
```

(Confirm `UserPublic` is exported from `@eve/shared-types`. If not — it's currently in `packages/db/src/models/user.ts` — re-export it via `packages/db/src/index.ts` and import from `@eve/db` instead. Pick whichever matches the existing export structure.)

- [ ] **Step 3: Middleware**

`apps/admin/middleware.ts`:
```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { readSession, SESSION_COOKIE } from './lib/auth.js';

// Run on the Node runtime so ioredis works.
export const runtime = 'nodejs';

const PUBLIC_PATHS = ['/login', '/_next', '/favicon.ico'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await readSession(cookie);

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  const reqHeaders = new Headers(req.headers);
  reqHeaders.set('x-eve-user-id', session.userId);
  return NextResponse.next({ request: { headers: reqHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

- [ ] **Step 4: Typecheck + smoke**

```bash
npm run typecheck
npm --prefix apps/admin run dev   # in another terminal
curl -i http://localhost:3001/places
```

Expected: 307 redirect to `/login?next=%2Fplaces`. Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/lib/redis.ts apps/admin/lib/auth.ts apps/admin/middleware.ts
git commit -m "feat(admin): Node-runtime middleware reads Express's Redis session"
```

---

### Task 14 — Login + logout (UserModel.authenticate)

**Files:**
- Create: `apps/admin/lib/actions/login.ts`
- Create: `apps/admin/app/login/page.tsx`

> **Login flow:** the action validates credentials with `UserModel.authenticate(email, password)`, mints a session row in Redis with the SAME shape Express writes (`{ userId, user: UserPublic, cookie: { … } }`), signs a cookie with `cookie-signature` using `SESSION_SECRET`, sets it, then `redirect()`s. On failure, it `redirect()`s to `/login?error=…&next=…`. The action never returns a value to the form.

- [ ] **Step 1: Login + logout server actions**

`apps/admin/lib/actions/login.ts`:
```typescript
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { randomBytes } from 'node:crypto';
import { sign } from 'cookie-signature';
import { UserModel } from '@eve/db';
import { redis } from '../redis.js';
import { destroySession, SESSION_COOKIE } from '../auth.js';

const SECRET = process.env.SESSION_SECRET ?? '';
const SESSION_TTL_SECONDS = 24 * 60 * 60;

function bounceWithError(error: string, next: string): never {
  const params = new URLSearchParams({ error, next });
  redirect(`/login?${params.toString()}`);
}

export async function loginAction(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/places');

  if (!email || !password) bounceWithError('Email and password are required.', next);
  if (!SECRET) bounceWithError('Server misconfigured: SESSION_SECRET is empty.', next);

  const user = await UserModel.authenticate(email, password);
  if (!user) bounceWithError('Invalid email or password.', next);

  // Mirror the shape express-session/connect-redis writes so /admin (EJS) sees this user too.
  const sid = randomBytes(16).toString('hex');
  const sessionData = {
    cookie: {
      originalMaxAge: SESSION_TTL_SECONDS * 1000,
      expires: new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString(),
      httpOnly: true,
      path: '/',
    },
    userId: user.id,
    user,
  };

  await redis().set(`sess:${sid}`, JSON.stringify(sessionData), 'EX', SESSION_TTL_SECONDS);

  const signed = 's:' + sign(sid, SECRET);
  cookies().set(SESSION_COOKIE, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });

  redirect(next);
}

export async function logoutAction(): Promise<void> {
  const cookieStore = cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  await destroySession(raw);
  cookieStore.delete(SESSION_COOKIE);
  redirect('/login');
}
```

- [ ] **Step 2: Login page**

`apps/admin/app/login/page.tsx`:
```tsx
import { loginAction } from '../../lib/actions/login.js';

interface Props { searchParams: { next?: string; error?: string }; }

export default function LoginPage({ searchParams }: Props) {
  return (
    <main className="min-h-screen flex items-center justify-center p-5 bg-paper">
      <form action={loginAction} className="w-full max-w-sm space-y-4 bg-paper2 p-6 rounded-card">
        <h1 className="text-3xl">EVE Admin</h1>
        <p className="ui text-ink3 text-sm">Sign in to continue.</p>
        {searchParams.error && (
          <p className="ui text-sm" style={{ color: '#C44' }}>{searchParams.error}</p>
        )}
        <input type="hidden" name="next" value={searchParams.next ?? '/places'} />
        <label className="block">
          <span className="ui text-xs uppercase text-ink3">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full mt-1 p-3 rounded-input bg-paper border border-hairline focus:outline-none focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="ui text-xs uppercase text-ink3">Password</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full mt-1 p-3 rounded-input bg-paper border border-hairline focus:outline-none focus:border-accent"
          />
        </label>
        <button type="submit" className="w-full ui font-bold uppercase tracking-wider p-3 rounded-input bg-ink text-paper">
          Sign in
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Smoke-test**

Start Express + Next.js admin (Express on 3000, admin on 3001). Sign in at `http://localhost:3001/login` with `e2e-test@eve.local` / `e2etest1234`. Expect redirect to `/places` (404, no page yet — fine). Confirm Redis has the session:
```bash
docker compose exec -T redis redis-cli KEYS "sess:*"
```

Stop dev servers.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/app/login/ apps/admin/lib/actions/login.ts
git commit -m "feat(admin): login + logout sharing Express session via Redis"
```

---

### Task 15 — Layout shell with header nav

**Files:**
- Modify: `apps/admin/app/layout.tsx`
- Create: `apps/admin/components/Header.tsx`

- [ ] **Step 1: Header**

```tsx
import Link from 'next/link';
import { logoutAction } from '../lib/actions/login.js';

export function Header() {
  return (
    <header className="border-b border-hairline bg-paper">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-6">
        <Link href="/places" className="text-2xl">
          <span className="font-display italic">EVE</span>{' '}
          <span className="ui font-bold uppercase tracking-wider text-sm">Admin</span>
        </Link>
        <nav className="flex items-center gap-4 ui text-sm uppercase tracking-wider">
          <Link href="/places" className="hover:text-accent">Places</Link>
          <Link href="/tags" className="hover:text-accent">Tags</Link>
          <Link href="/neighborhoods" className="hover:text-accent">Neighborhoods</Link>
        </nav>
        <form action={logoutAction} className="ml-auto">
          <button type="submit" className="ui text-xs uppercase text-ink3 hover:text-ink">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Layout**

`apps/admin/app/layout.tsx`:
```tsx
import './globals.css';
import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { Header } from '../components/Header.js';

export const metadata = { title: 'EVE Admin' };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const userId = headers().get('x-eve-user-id');
  return (
    <html lang="en">
      <body>
        {userId ? <Header /> : null}
        <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Mobile sanity**

At 375×667, header wraps acceptably. Stop server.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/app/layout.tsx apps/admin/components/Header.tsx
git commit -m "feat(admin): header nav (Places / Tags / Neighborhoods / Sign out)"
```

---

### Task 16 — Upload route handler + PhotoUpload component

**Files:**
- Create: `apps/admin/app/api/admin/uploads/route.ts`
- Create: `apps/admin/components/PhotoUpload.tsx`

> **No Express proxy.** The Next.js admin's upload posts to `/api/admin/uploads` — its OWN route handler — which uses native `request.formData()` to read the multipart body, validates MIME + size, calls `@eve/storage.putObject`, returns JSON. Auth: the route inherits the global middleware (Task 13); requests without a session redirect to `/login`. There's no CSRF middleware, so no token round-trip.

- [ ] **Step 1: Route handler**

`apps/admin/app/api/admin/uploads/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { putObject } from '@eve/storage';

export const runtime = 'nodejs';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export async function POST(req: Request) {
  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = fd.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded under field "file"' }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 10MB).' }, { status: 413 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: `Unsupported MIME type: ${file.type}` }, { status: 415 });
  }

  const prefixRaw = String(fd.get('prefix') ?? 'misc');
  const prefix = prefixRaw.replace(/[^a-z0-9_-]/gi, '').toLowerCase().slice(0, 16) || 'misc';

  const ext = file.name.includes('.')
    ? file.name.split('.').pop()!.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)
    : (file.type.split('/')[1] ?? 'bin');

  const key = `${prefix}/${randomUUID()}.${ext}`;

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const result = await putObject(buf, { key, contentType: file.type });
    return NextResponse.json(result);
  } catch (err) {
    console.error('admin upload: storage write failed', err);
    return NextResponse.json({ error: 'Storage write failed' }, { status: 500 });
  }
}
```

- [ ] **Step 2: PhotoUpload component**

```tsx
'use client';

import { useRef, useState } from 'react';

interface Props {
  name: string;
  prefix: 'tag' | 'place';
  initialUrl?: string | null;
  label?: string;
  help?: string;
}

export function PhotoUpload({ name, prefix, initialUrl, label, help }: Props) {
  const [url, setUrl] = useState(initialUrl ?? '');
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPick = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) { setError('File too large (max 10MB).'); return; }
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('prefix', prefix);
      const res = await fetch('/api/admin/uploads', { method: 'POST', body: fd, credentials: 'same-origin' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `Upload failed (${res.status})` }));
        setError(body.error ?? 'Upload failed');
        return;
      }
      const { url: newUrl } = await res.json();
      setUrl(newUrl);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {label && <span className="ui text-xs uppercase text-ink3">{label}</span>}
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click(); } }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f) onPick(f); }}
        className="block border-2 border-dashed border-hairline rounded-card p-4 text-center cursor-pointer hover:border-accent"
      >
        {url ? (
          <img src={url} alt="" className="max-h-40 mx-auto rounded" />
        ) : (
          <div className="ui text-sm text-ink3">{uploading ? 'Uploading…' : 'Drop image or tap to browse (max 10MB)'}</div>
        )}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden
               onChange={(e) => { if (e.target.files?.[0]) onPick(e.target.files[0]); }} />
      </div>
      {error && <p className="ui text-sm" style={{ color: '#C44' }}>{error}</p>}
      <input type="url" name={name} value={url} onChange={(e) => setUrl(e.target.value)}
             placeholder="https://…"
             className="w-full p-3 rounded-input bg-paper border border-hairline focus:outline-none focus:border-accent" />
      {help && <p className="ui text-xs text-ink3">{help}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Smoke-test**

Sign in, hit `/api/admin/uploads` from a logged-in browser (DevTools console):
```javascript
const fd = new FormData();
fd.append('file', new Blob(['fake'], { type: 'image/png' }), 'test.png');
fd.append('prefix', 'tag');
fetch('/api/admin/uploads', { method: 'POST', body: fd, credentials: 'same-origin' }).then(r => r.json()).then(console.log);
```

Expected: `{ url: '/uploads/tag/<uuid>.png', key: 'tag/<uuid>.png' }`. The file is fetchable via the URL.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/app/api/admin/uploads/ apps/admin/components/PhotoUpload.tsx
git commit -m "feat(admin): /api/admin/uploads route handler + PhotoUpload (no Express proxy)"
```

---

### Task 17 — TagPicker (multi-select with drag-reorder + inline create stub)

**Files:**
- Create: `apps/admin/components/SortableList.tsx`
- Create: `apps/admin/components/TagPicker.tsx`

> **Stub strategy (single approach):** the inline-create button starts disabled. Task 19 wires the action and re-enables it. No "stub returns null" pattern — the button just doesn't appear functional until the action exists.

- [ ] **Step 1: Sortable primitive**

```tsx
'use client';

import { type ReactNode } from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props<T extends { id: string }> {
  items: T[];
  onReorder: (next: T[]) => void;
  renderItem: (item: T, dragHandleProps: React.HTMLAttributes<HTMLElement>) => ReactNode;
}

export function SortableList<T extends { id: string }>({ items, onReorder, renderItem }: Props<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(items, oldIndex, newIndex));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-1">
          {items.map((item) => (
            <SortableRow key={item.id} id={item.id}>
              {(handle) => renderItem(item, handle)}
            </SortableRow>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({ id, children }: { id: string; children: (handle: React.HTMLAttributes<HTMLElement>) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <li ref={setNodeRef} style={style} className="bg-paper2 rounded-input p-2 flex items-center gap-2">
      {children({ ...attributes, ...listeners, role: 'button' as const })}
    </li>
  );
}
```

- [ ] **Step 2: TagPicker (create button disabled until Task 19)**

```tsx
'use client';

import { useState } from 'react';
import { SortableList } from './SortableList.js';

interface Tag { id: string; value: string; display: string; }

interface Props {
  name: string;
  allTags: Tag[];
  initial: Tag[];
}

export function TagPicker({ name, allTags, initial }: Props) {
  const [selected, setSelected] = useState<Tag[]>(initial);
  const [query, setQuery] = useState('');
  // Inline-create wiring lands in Task 19; until then the button is disabled.
  const inlineCreateAvailable = false;

  const remaining = allTags.filter((t) => !selected.some((s) => s.id === t.id));
  const suggestions = remaining.filter((t) =>
    t.display.toLowerCase().includes(query.toLowerCase()) ||
    t.value.toLowerCase().includes(query.toLowerCase())
  );
  const exactMatch = remaining.some((t) => t.display.toLowerCase() === query.trim().toLowerCase());
  const showCreate = query.trim().length > 0 && !exactMatch;

  return (
    <div className="space-y-2">
      <span className="ui text-xs uppercase text-ink3">Tags</span>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Type to filter or add"
        className="w-full p-3 rounded-input bg-paper border border-hairline focus:outline-none focus:border-accent"
      />
      {(query.length > 0) && (
        <div className="border border-hairline rounded-input bg-paper2 max-h-48 overflow-auto">
          {suggestions.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setSelected([...selected, t]); setQuery(''); }}
              className="block w-full text-left px-3 py-2 hover:bg-paper"
            >
              {t.display} <span className="ui text-xs text-ink3">{t.value}</span>
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              disabled={!inlineCreateAvailable}
              className="block w-full text-left px-3 py-2 hover:bg-paper text-accent disabled:opacity-50 disabled:cursor-not-allowed"
              title={inlineCreateAvailable ? '' : 'Coming in Task 19'}
            >
              + Create "{query.trim()}"
            </button>
          )}
        </div>
      )}

      <SortableList
        items={selected}
        onReorder={setSelected}
        renderItem={(t, handle) => (
          <>
            <span {...handle} className="ui text-ink3 cursor-grab select-none px-2">⋮⋮</span>
            <span className="flex-1">{t.display}</span>
            <button
              type="button"
              onClick={() => setSelected(selected.filter((s) => s.id !== t.id))}
              className="ui text-xs text-ink3 hover:text-ink px-2"
            >
              ×
            </button>
          </>
        )}
      />

      <p className="ui text-xs text-ink3">First tag drives the place's meta line on the mobile feed. Drag to reorder.</p>

      <input type="hidden" name={name} value={JSON.stringify(selected.map((t) => t.id))} />
    </div>
  );
}
```

- [ ] **Step 3: Typecheck and commit**

```bash
npm run typecheck
git add apps/admin/components/SortableList.tsx apps/admin/components/TagPicker.tsx
git commit -m "feat(admin): SortableList + TagPicker (drag-reorder; inline-create wired in Task 19)"
```

---

### Task 18 — NeighborhoodPicker (combobox; inline-add stub)

**Files:**
- Create: `apps/admin/components/NeighborhoodPicker.tsx`

> Same stub strategy as Task 17 — the create button is disabled until Task 20 wires it.

- [ ] **Step 1: Component**

```tsx
'use client';

import { useState } from 'react';

interface Neighborhood { id: string; value: string; display: string; }

interface Props {
  name: string;
  options: Neighborhood[];
  initialId: string;
}

export function NeighborhoodPicker({ name, options, initialId }: Props) {
  const [selectedId, setSelectedId] = useState(initialId);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inlineCreateAvailable = false; // wired in Task 20

  const filtered = options.filter((n) => n.display.toLowerCase().includes(query.toLowerCase()));
  const exactMatch = options.some((n) => n.display.toLowerCase() === query.trim().toLowerCase());
  const showCreate = query.trim().length > 0 && !exactMatch;
  const selected = options.find((n) => n.id === selectedId);

  return (
    <div className="space-y-2 relative">
      <span className="ui text-xs uppercase text-ink3">Neighborhood</span>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full p-3 rounded-input bg-paper border border-hairline text-left flex items-center justify-between"
      >
        <span>{selected?.display ?? 'Select…'}</span>
        <span className="ui text-ink3">▾</span>
      </button>

      {open && (
        <div className="absolute z-10 left-0 right-0 mt-1 border border-hairline rounded-input bg-paper2 max-h-64 overflow-auto">
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to filter"
            className="w-full p-3 bg-paper border-b border-hairline focus:outline-none"
          />
          {filtered.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => { setSelectedId(n.id); setOpen(false); setQuery(''); }}
              className="block w-full text-left px-3 py-2 hover:bg-paper"
            >
              {n.display}
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              disabled={!inlineCreateAvailable}
              className="block w-full text-left px-3 py-2 hover:bg-paper text-accent disabled:opacity-50 disabled:cursor-not-allowed"
              title={inlineCreateAvailable ? '' : 'Coming in Task 20'}
            >
              + Create "{query.trim()}"
            </button>
          )}
        </div>
      )}

      <input type="hidden" name={name} value={selectedId} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/admin/components/NeighborhoodPicker.tsx
git commit -m "feat(admin): NeighborhoodPicker combobox (inline-add wired in Task 20)"
```

---

### Task 19 — Tag server actions (incl. inline create) + wire TagPicker

**Files:**
- Create: `apps/admin/lib/actions/tags.ts`
- Modify: `apps/admin/components/TagPicker.tsx` — wire `createTagInline`, set `inlineCreateAvailable = true`

- [ ] **Step 1: Server actions**

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { TagModel } from '@eve/db';

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64);
}

async function uniqueSlug(base: string): Promise<string> {
  let candidate = base;
  let i = 2;
  while (await TagModel.findByValue(candidate)) {
    candidate = `${base}-${i++}`;
  }
  return candidate;
}

export async function createTag(formData: FormData) {
  const display = String(formData.get('display') ?? '').trim();
  const valueRaw = String(formData.get('value') ?? '').trim();
  if (!display) return;
  const value = await uniqueSlug(valueRaw ? slugify(valueRaw) : slugify(display));
  await TagModel.create({ value, display, sort_order: 0 });
  revalidatePath('/tags');
  redirect('/tags');
}

export async function updateTag(id: string, formData: FormData) {
  const display = String(formData.get('display') ?? '').trim();
  const value = String(formData.get('value') ?? '').trim();
  await TagModel.update(id, { display, value });
  revalidatePath('/tags');
  redirect('/tags');
}

export async function deleteTag(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await TagModel.delete(id);
  revalidatePath('/tags');
  redirect('/tags');
}

export async function reorderTags(orderedIds: string[]) {
  for (let i = 0; i < orderedIds.length; i++) {
    await TagModel.update(orderedIds[i], { sort_order: i });
  }
  revalidatePath('/tags');
}

export async function createTagInline(display: string): Promise<{ id: string; value: string; display: string } | null> {
  const trimmed = display.trim();
  if (!trimmed) return null;
  const value = await uniqueSlug(slugify(trimmed));
  const tag = await TagModel.create({ value, display: trimmed, sort_order: 9999 });
  revalidatePath('/tags');
  return { id: tag.id, value: tag.value, display: tag.display };
}
```

> **TagModel.delete check:** confirm `TagModel` has a `delete(id)` method; if not, add one — `DELETE FROM tags WHERE id = $1`. The `place_tags` table has `ON DELETE CASCADE` per the initial schema, so deleting a tag automatically removes the join rows.

- [ ] **Step 2: Wire TagPicker to the inline action**

In `apps/admin/components/TagPicker.tsx`:
- Import `createTagInline`:
  ```typescript
  import { useTransition } from 'react';
  import { createTagInline } from '../lib/actions/tags.js';
  ```
- Set `const inlineCreateAvailable = true;`
- Add `useTransition` and onClick handler on the create button:
  ```typescript
  const [pending, startTransition] = useTransition();
  // ...
  onClick={() => {
    const display = query.trim();
    startTransition(async () => {
      const created = await createTagInline(display);
      if (created) {
        setSelected([...selected, created]);
        setQuery('');
      }
    });
  }}
  disabled={pending}
  ```

- [ ] **Step 3: Typecheck and commit**

```bash
npm run typecheck
git add apps/admin/lib/actions/tags.ts apps/admin/components/TagPicker.tsx
git commit -m "feat(admin): tag server actions + TagPicker inline create wired"
```

---

### Task 20 — Neighborhood server actions + wire NeighborhoodPicker

**Files:**
- Create: `apps/admin/lib/actions/neighborhoods.ts`
- Modify: `apps/admin/components/NeighborhoodPicker.tsx`

- [ ] **Step 1: Server actions**

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { NeighborhoodModel } from '@eve/db';

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64);
}

async function uniqueSlug(base: string): Promise<string> {
  let candidate = base;
  let i = 2;
  while (await NeighborhoodModel.findByValue(candidate)) {
    candidate = `${base}-${i++}`;
  }
  return candidate;
}

export async function createNeighborhood(formData: FormData) {
  const display = String(formData.get('display') ?? '').trim();
  const valueRaw = String(formData.get('value') ?? '').trim();
  const isDefault = formData.get('is_default') === 'on';
  if (!display) return;
  const value = await uniqueSlug(valueRaw ? slugify(valueRaw) : slugify(display));
  await NeighborhoodModel.create({ value, display, is_default: isDefault });
  revalidatePath('/neighborhoods');
  redirect('/neighborhoods');
}

export async function updateNeighborhood(id: string, formData: FormData) {
  const display = String(formData.get('display') ?? '').trim();
  const value = String(formData.get('value') ?? '').trim();
  const isDefault = formData.get('is_default') === 'on';
  await NeighborhoodModel.update(id, { display, value, is_default: isDefault });
  revalidatePath('/neighborhoods');
  redirect('/neighborhoods');
}

export async function deleteNeighborhood(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  // NeighborhoodModel.delete throws on attempts to delete the default OR a hood with places assigned.
  await NeighborhoodModel.delete(id);
  revalidatePath('/neighborhoods');
  redirect('/neighborhoods');
}

export async function createNeighborhoodInline(display: string): Promise<{ id: string; value: string; display: string } | null> {
  const trimmed = display.trim();
  if (!trimmed) return null;
  const value = await uniqueSlug(slugify(trimmed));
  const n = await NeighborhoodModel.create({ value, display: trimmed });
  revalidatePath('/neighborhoods');
  return { id: n.id, value: n.value, display: n.display };
}
```

- [ ] **Step 2: Wire NeighborhoodPicker**

Same pattern as Task 19 — import `createNeighborhoodInline`, set `inlineCreateAvailable = true`, wire onClick with `useTransition`. Also append the newly created hood to a local `list` state so it appears immediately in the picker.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/lib/actions/neighborhoods.ts apps/admin/components/NeighborhoodPicker.tsx
git commit -m "feat(admin): neighborhood server actions + NeighborhoodPicker inline-add wired"
```

---

### Task 21 — Place server actions

**Files:**
- Create: `apps/admin/lib/actions/places.ts`

- [ ] **Step 1: Actions**

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { PlaceModel, TagModel } from '@eve/db';

function readTagIds(formData: FormData): string[] {
  const raw = String(formData.get('tag_ids') ?? '[]');
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

async function tagValuesForIds(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const allTags = await TagModel.findAll();
  return ids
    .map((id) => allTags.find((t) => t.id === id)?.value)
    .filter((v): v is string => Boolean(v));
}

function readForm(formData: FormData) {
  return {
    name: String(formData.get('name') ?? '').trim(),
    address: String(formData.get('address') ?? '').trim() || null,
    cross_street: String(formData.get('cross_street') ?? '').trim() || null,
    phone: String(formData.get('phone') ?? '').trim() || null,
    url: String(formData.get('url') ?? '').trim() || null,
    neighborhood_id: String(formData.get('neighborhood_id') ?? '').trim(),
    photo_url: String(formData.get('photo_url') ?? '').trim() || null,
    photo_credit: String(formData.get('photo_credit') ?? '').trim() || null,
    specials: String(formData.get('specials') ?? '') || null,
    notes: String(formData.get('notes') ?? '') || null,
    pitch: String(formData.get('pitch') ?? '') || null,
    perfect: String(formData.get('perfect') ?? '') || null,
    insider: String(formData.get('insider') ?? '') || null,
    vibe: String(formData.get('vibe') ?? '') || null,
    crowd: String(formData.get('crowd') ?? '') || null,
  };
}

export async function createPlace(formData: FormData) {
  const f = readForm(formData);
  if (!f.name) return;
  const tags = await tagValuesForIds(readTagIds(formData));
  await PlaceModel.create({ ...f, tags });
  revalidatePath('/places');
  redirect('/places');
}

export async function updatePlace(id: string, formData: FormData) {
  const f = readForm(formData);
  const tags = await tagValuesForIds(readTagIds(formData));
  await PlaceModel.update(id, { ...f, tags });
  revalidatePath('/places');
  revalidatePath(`/places/${id}/edit`);
  redirect('/places');
}

export async function deletePlace(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await PlaceModel.delete(id);
  revalidatePath('/places');
  redirect('/places');
}
```

- [ ] **Step 2: Commit**

```bash
npm run typecheck
git add apps/admin/lib/actions/places.ts
git commit -m "feat(admin): place server actions (create / update / delete with ordered tags)"
```

---

### Task 22 — Places list page

**Files:**
- Create: `apps/admin/app/places/page.tsx`

- [ ] **Step 1: List page**

```tsx
import Link from 'next/link';
import { PlaceModel, NeighborhoodModel } from '@eve/db';

export default async function PlacesPage() {
  const [places, neighborhoods] = await Promise.all([
    PlaceModel.findAll(),
    NeighborhoodModel.findAll(),
  ]);
  const nameById = new Map(neighborhoods.map((n) => [n.id, n.display]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">Places</h1>
        <Link href="/places/new" className="ui text-sm uppercase bg-ink text-paper px-4 py-2 rounded-input">+ New</Link>
      </div>
      <ul className="divide-y divide-hairline">
        {places.map((p) => (
          <li key={p.id} className="py-3 flex items-center gap-3">
            <Link href={`/places/${p.id}/edit`} className="flex-1 min-w-0 block">
              <span className="block truncate">{p.name}</span>
              <span className="ui text-xs text-ink3 truncate block">
                {p.address ?? 'no address'} · {nameById.get(p.neighborhood_id) ?? '—'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {places.length === 0 && (
        <p className="ui text-sm text-ink3">No places yet. <Link href="/places/new" className="underline">Add one.</Link></p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/admin/app/places/page.tsx
git commit -m "feat(admin): places list page"
```

---

### Task 23 — Delete button helper + Place new/edit pages

**Files:**
- Create: `apps/admin/components/DeleteButton.tsx`
- Create: `apps/admin/components/PrevNextNav.tsx`
- Create: `apps/admin/components/PlaceForm.tsx`
- Create: `apps/admin/app/places/new/page.tsx`
- Create: `apps/admin/app/places/[id]/edit/page.tsx`

> **Delete buttons:** every delete in the admin (place, tag, neighborhood) goes through `<DeleteButton action={…} id={…} />`, which posts to a server action via a `<form>`. No `bind`, no bare onClick — keeps the redirect-throws-NEXT_REDIRECT behavior in a normal form-action context.

- [ ] **Step 1: DeleteButton**

`apps/admin/components/DeleteButton.tsx`:
```tsx
'use client';

import { useRef } from 'react';

interface Props {
  action: (formData: FormData) => void;
  id: string;
  label?: string;
  confirmText?: string;
}

export function DeleteButton({ action, id, label = 'Delete', confirmText = 'Delete this? This cannot be undone.' }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={action} className="inline">
      <input type="hidden" name="id" value={id} />
      <button
        type="button"
        onClick={() => { if (confirm(confirmText)) formRef.current?.requestSubmit(); }}
        className="ui text-sm uppercase"
        style={{ color: '#C44' }}
      >
        {label}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: PrevNextNav** — see v1 plan; unchanged.

```tsx
import Link from 'next/link';

interface Props { prevHref: string | null; nextHref: string | null; position: string; }

export function PrevNextNav({ prevHref, nextHref, position }: Props) {
  return (
    <div className="flex items-center justify-between text-sm ui text-ink3 mb-4">
      {prevHref ? <Link href={prevHref} className="hover:text-ink">← Previous</Link> : <span className="opacity-30">← Previous</span>}
      <span>{position}</span>
      {nextHref ? <Link href={nextHref} className="hover:text-ink">Next →</Link> : <span className="opacity-30">Next →</span>}
    </div>
  );
}
```

- [ ] **Step 3: PlaceForm**

```tsx
'use client';

import { useState } from 'react';
import { PhotoUpload } from './PhotoUpload.js';
import { TagPicker } from './TagPicker.js';
import { NeighborhoodPicker } from './NeighborhoodPicker.js';

interface Tag { id: string; value: string; display: string; }
interface Neighborhood { id: string; value: string; display: string; }

interface Props {
  action: (formData: FormData) => void;
  defaultValues?: Partial<{
    name: string; address: string; cross_street: string; phone: string; url: string;
    neighborhood_id: string; photo_url: string; photo_credit: string;
    specials: string; notes: string;
    pitch: string; perfect: string; insider: string; vibe: string; crowd: string;
  }>;
  allTags: Tag[];
  selectedTags: Tag[];
  neighborhoods: Neighborhood[];
}

export function PlaceForm({ action, defaultValues = {}, allTags, selectedTags, neighborhoods }: Props) {
  const [showEditorial, setShowEditorial] = useState(false);
  const v = defaultValues;
  const defaultNeighborhood =
    v.neighborhood_id ||
    neighborhoods.find((n) => n.value === 'east-village')?.id ||
    neighborhoods[0]?.id ||
    '';

  return (
    <form action={action} className="space-y-5">
      <Field label="Name" name="name" defaultValue={v.name ?? ''} required />
      <Field label="Address" name="address" defaultValue={v.address ?? ''} />
      <Field label="Cross street" name="cross_street" defaultValue={v.cross_street ?? ''} />
      <Field label="Phone" name="phone" defaultValue={v.phone ?? ''} />
      <Field label="Website" name="url" defaultValue={v.url ?? ''} />

      <NeighborhoodPicker name="neighborhood_id" options={neighborhoods} initialId={defaultNeighborhood} />

      <PhotoUpload name="photo_url" prefix="place" initialUrl={v.photo_url ?? null} label="Photo" />
      <Field label="Photo credit" name="photo_credit" defaultValue={v.photo_credit ?? ''} />

      <TagPicker name="tag_ids" allTags={allTags} initial={selectedTags} />

      <TextArea label="Specials" name="specials" defaultValue={v.specials ?? ''} rows={3} />
      <TextArea label="Notes" name="notes" defaultValue={v.notes ?? ''} rows={3} />

      <button
        type="button"
        onClick={() => setShowEditorial(!showEditorial)}
        className="ui text-xs uppercase text-ink3 hover:text-ink"
      >
        {showEditorial ? '− Hide' : '+ Show'} editorial fields
      </button>

      {showEditorial && (
        <section className="space-y-3 border-l-2 border-hairline pl-4">
          <TextArea label="Pitch" name="pitch" defaultValue={v.pitch ?? ''} rows={2} hint="2 sentences. Friend voice." />
          <Field label="Perfect when…" name="perfect" defaultValue={v.perfect ?? ''} hint="finishes 'Perfect when…'" />
          <TextArea label="Insider tip" name="insider" defaultValue={v.insider ?? ''} rows={2} hint="One sentence." />
          <Field label="Vibe" name="vibe" defaultValue={v.vibe ?? ''} hint="3 words separated by ' · '" />
          <Field label="Crowd" name="crowd" defaultValue={v.crowd ?? ''} hint="Who's there." />
        </section>
      )}

      <div className="flex items-center gap-3 pt-4 border-t border-hairline">
        <button type="submit" className="ui text-sm uppercase bg-ink text-paper px-4 py-2 rounded-input">Save</button>
      </div>
    </form>
  );
}

function Field({ label, name, defaultValue, required, hint }: { label: string; name: string; defaultValue: string; required?: boolean; hint?: string }) {
  return (
    <label className="block">
      <span className="ui text-xs uppercase text-ink3">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="w-full mt-1 p-3 rounded-input bg-paper border border-hairline focus:outline-none focus:border-accent"
      />
      {hint && <span className="ui text-xs text-ink3 block mt-1">{hint}</span>}
    </label>
  );
}

function TextArea({ label, name, defaultValue, rows, hint }: { label: string; name: string; defaultValue: string; rows: number; hint?: string }) {
  return (
    <label className="block">
      <span className="ui text-xs uppercase text-ink3">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        className="w-full mt-1 p-3 rounded-input bg-paper border border-hairline focus:outline-none focus:border-accent"
      />
      {hint && <span className="ui text-xs text-ink3 block mt-1">{hint}</span>}
    </label>
  );
}
```

- [ ] **Step 4: New page**

`apps/admin/app/places/new/page.tsx`:
```tsx
import { PlaceForm } from '../../../components/PlaceForm.js';
import { TagModel, NeighborhoodModel } from '@eve/db';
import { createPlace } from '../../../lib/actions/places.js';

export default async function NewPlacePage() {
  const [tags, neighborhoods] = await Promise.all([
    TagModel.findAll(),
    NeighborhoodModel.findAll(),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-3xl">New place</h1>
      <PlaceForm
        action={createPlace}
        allTags={tags.map((t) => ({ id: t.id, value: t.value, display: t.display }))}
        selectedTags={[]}
        neighborhoods={neighborhoods.map((n) => ({ id: n.id, value: n.value, display: n.display }))}
      />
    </div>
  );
}
```

- [ ] **Step 5: Edit page**

`apps/admin/app/places/[id]/edit/page.tsx`:
```tsx
import { notFound } from 'next/navigation';
import { PlaceForm } from '../../../../components/PlaceForm.js';
import { PrevNextNav } from '../../../../components/PrevNextNav.js';
import { DeleteButton } from '../../../../components/DeleteButton.js';
import { PlaceModel, TagModel, NeighborhoodModel } from '@eve/db';
import { updatePlace, deletePlace } from '../../../../lib/actions/places.js';

export default async function EditPlacePage({ params }: { params: { id: string } }) {
  const [place, tags, neighborhoods, allPlaces] = await Promise.all([
    PlaceModel.findById(params.id),
    TagModel.findAll(),
    NeighborhoodModel.findAll(),
    PlaceModel.findAll(),
  ]);
  if (!place) notFound();

  const idx = allPlaces.findIndex((p) => p.id === place.id);
  const prev = idx > 0 ? allPlaces[idx - 1] : null;
  const next = idx >= 0 && idx < allPlaces.length - 1 ? allPlaces[idx + 1] : null;

  const tagValueToTag = new Map(tags.map((t) => [t.value, t]));
  const selectedTags = (place.tags ?? [])
    .map((v: string) => tagValueToTag.get(v))
    .filter(Boolean) as typeof tags;

  const update = updatePlace.bind(null, place.id);

  return (
    <div className="space-y-4">
      <PrevNextNav
        prevHref={prev ? `/places/${prev.id}/edit` : null}
        nextHref={next ? `/places/${next.id}/edit` : null}
        position={`${idx + 1} of ${allPlaces.length}`}
      />
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">{place.name}</h1>
        <DeleteButton action={deletePlace} id={place.id} confirmText="Delete this place? This cannot be undone." />
      </div>
      <PlaceForm
        action={update}
        defaultValues={place}
        allTags={tags.map((t) => ({ id: t.id, value: t.value, display: t.display }))}
        selectedTags={selectedTags.map((t) => ({ id: t.id, value: t.value, display: t.display }))}
        neighborhoods={neighborhoods.map((n) => ({ id: n.id, value: n.value, display: n.display }))}
      />
    </div>
  );
}
```

- [ ] **Step 6: Smoke + commit**

Sign in, browse, edit, save, walk via prev/next, delete a test place. Stop server.

```bash
git add apps/admin/components/DeleteButton.tsx apps/admin/components/PrevNextNav.tsx apps/admin/components/PlaceForm.tsx apps/admin/app/places/
git commit -m "feat(admin): place new + edit pages with shared form, prev/next, delete"
```

---

### Task 24 — Tags list page (drag-reorder)

**Files:**
- Create: `apps/admin/app/api/admin/tags/route.ts`
- Create: `apps/admin/app/tags/page.tsx`

- [ ] **Step 1: Tags JSON route for client component**

```typescript
import { NextResponse } from 'next/server';
import { TagModel } from '@eve/db';

export const runtime = 'nodejs';

export async function GET() {
  const rows = await TagModel.findAll();
  return NextResponse.json(rows.map((t) => ({
    id: t.id, value: t.value, display: t.display, sort_order: t.sort_order,
  })));
}
```

- [ ] **Step 2: List page**

```tsx
'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { SortableList } from '../../components/SortableList.js';
import { reorderTags } from '../../lib/actions/tags.js';

interface Tag { id: string; value: string; display: string; sort_order: number; }

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    fetch('/api/admin/tags', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((rows: Tag[]) => setTags(rows));
  }, []);

  const onReorder = (next: Tag[]) => {
    setTags(next);
    startTransition(() => { void reorderTags(next.map((t) => t.id)); });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">Tags</h1>
        <Link href="/tags/new" className="ui text-sm uppercase bg-ink text-paper px-4 py-2 rounded-input">+ New</Link>
      </div>
      <SortableList
        items={tags}
        onReorder={onReorder}
        renderItem={(t, handle) => (
          <>
            <span {...handle} className="ui text-ink3 cursor-grab select-none px-2">⋮⋮</span>
            <Link href={`/tags/${t.id}/edit`} className="flex-1 hover:text-accent">
              {t.display} <span className="ui text-xs text-ink3">{t.value}</span>
            </Link>
          </>
        )}
      />
      {pending && <p className="ui text-xs text-ink3">Saving order…</p>}
      {tags.length === 0 && <p className="ui text-sm text-ink3">No tags yet.</p>}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/admin/app/api/admin/tags/route.ts apps/admin/app/tags/page.tsx
git commit -m "feat(admin): tags list with drag-to-reorder"
```

---

### Task 25 — Tag new + edit pages

**Files:**
- Create: `apps/admin/components/TagForm.tsx`
- Create: `apps/admin/app/tags/new/page.tsx`
- Create: `apps/admin/app/tags/[id]/edit/page.tsx`

- [ ] **Step 1: TagForm**

```tsx
interface Props {
  action: (fd: FormData) => void;
  defaultValues?: { display: string; value: string };
}

export function TagForm({ action, defaultValues = { display: '', value: '' } }: Props) {
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="ui text-xs uppercase text-ink3">Display name</span>
        <input
          name="display" required defaultValue={defaultValues.display}
          className="w-full mt-1 p-3 rounded-input bg-paper border border-hairline focus:outline-none focus:border-accent"
        />
      </label>
      <label className="block">
        <span className="ui text-xs uppercase text-ink3">Slug (auto from display)</span>
        <input
          name="value" defaultValue={defaultValues.value}
          placeholder="auto-generated"
          className="w-full mt-1 p-3 rounded-input bg-paper border border-hairline focus:outline-none focus:border-accent"
        />
      </label>
      <div className="pt-2 border-t border-hairline">
        <button type="submit" className="ui text-sm uppercase bg-ink text-paper px-4 py-2 rounded-input">Save</button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: New page**

```tsx
import { TagForm } from '../../../components/TagForm.js';
import { createTag } from '../../../lib/actions/tags.js';

export default function NewTagPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl">New tag</h1>
      <TagForm action={createTag} />
    </div>
  );
}
```

- [ ] **Step 3: Edit page**

```tsx
import { notFound } from 'next/navigation';
import { TagForm } from '../../../../components/TagForm.js';
import { DeleteButton } from '../../../../components/DeleteButton.js';
import { TagModel } from '@eve/db';
import { updateTag, deleteTag } from '../../../../lib/actions/tags.js';

export default async function EditTagPage({ params }: { params: { id: string } }) {
  const tag = await TagModel.findById(params.id);
  if (!tag) notFound();
  const update = updateTag.bind(null, tag.id);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">{tag.display}</h1>
        <DeleteButton action={deleteTag} id={tag.id} confirmText="Delete this tag? Places tagged with it lose the tag." />
      </div>
      <TagForm action={update} defaultValues={{ display: tag.display, value: tag.value }} />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/admin/components/TagForm.tsx apps/admin/app/tags/new/ apps/admin/app/tags/[id]/
git commit -m "feat(admin): tag new + edit pages"
```

---

### Task 26 — Neighborhoods list/new/edit pages

**Files:**
- Create: `apps/admin/app/neighborhoods/page.tsx`
- Create: `apps/admin/components/NeighborhoodForm.tsx`
- Create: `apps/admin/app/neighborhoods/new/page.tsx`
- Create: `apps/admin/app/neighborhoods/[id]/edit/page.tsx`

- [ ] **Step 1: List page**

```tsx
import Link from 'next/link';
import { NeighborhoodModel } from '@eve/db';

export default async function NeighborhoodsPage() {
  const rows = await NeighborhoodModel.findAll();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">Neighborhoods</h1>
        <Link href="/neighborhoods/new" className="ui text-sm uppercase bg-ink text-paper px-4 py-2 rounded-input">+ New</Link>
      </div>
      <ul className="divide-y divide-hairline">
        {rows.map((n) => (
          <li key={n.id} className="py-3 flex items-center gap-3">
            <Link href={`/neighborhoods/${n.id}/edit`} className="flex-1 hover:text-accent">
              {n.display}
              {n.is_default && <span className="ui text-xs text-accent ml-2 uppercase">Default</span>}
              <span className="ui text-xs text-ink3 block">{n.value}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: NeighborhoodForm**

```tsx
interface Props {
  action: (fd: FormData) => void;
  defaultValues?: { display: string; value: string; is_default: boolean };
}

export function NeighborhoodForm({ action, defaultValues = { display: '', value: '', is_default: false } }: Props) {
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="ui text-xs uppercase text-ink3">Display name</span>
        <input
          name="display" required defaultValue={defaultValues.display}
          className="w-full mt-1 p-3 rounded-input bg-paper border border-hairline focus:outline-none focus:border-accent"
        />
      </label>
      <label className="block">
        <span className="ui text-xs uppercase text-ink3">Slug</span>
        <input
          name="value" defaultValue={defaultValues.value} placeholder="auto-generated"
          className="w-full mt-1 p-3 rounded-input bg-paper border border-hairline focus:outline-none focus:border-accent"
        />
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="is_default" defaultChecked={defaultValues.is_default} />
        <span className="ui text-sm">Set as default neighborhood</span>
      </label>
      <div className="pt-2 border-t border-hairline">
        <button type="submit" className="ui text-sm uppercase bg-ink text-paper px-4 py-2 rounded-input">Save</button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: New + edit pages**

`apps/admin/app/neighborhoods/new/page.tsx`:
```tsx
import { NeighborhoodForm } from '../../../components/NeighborhoodForm.js';
import { createNeighborhood } from '../../../lib/actions/neighborhoods.js';

export default function NewNeighborhoodPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl">New neighborhood</h1>
      <NeighborhoodForm action={createNeighborhood} />
    </div>
  );
}
```

`apps/admin/app/neighborhoods/[id]/edit/page.tsx`:
```tsx
import { notFound } from 'next/navigation';
import { NeighborhoodForm } from '../../../../components/NeighborhoodForm.js';
import { DeleteButton } from '../../../../components/DeleteButton.js';
import { NeighborhoodModel } from '@eve/db';
import { updateNeighborhood, deleteNeighborhood } from '../../../../lib/actions/neighborhoods.js';

export default async function EditNeighborhoodPage({ params }: { params: { id: string } }) {
  const n = await NeighborhoodModel.findById(params.id);
  if (!n) notFound();
  const update = updateNeighborhood.bind(null, n.id);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">{n.display}</h1>
        <DeleteButton action={deleteNeighborhood} id={n.id} confirmText="Delete this neighborhood? Places assigned to it must be reassigned first." />
      </div>
      <NeighborhoodForm action={update} defaultValues={{ display: n.display, value: n.value, is_default: n.is_default }} />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/admin/app/neighborhoods/ apps/admin/components/NeighborhoodForm.tsx
git commit -m "feat(admin): neighborhoods list / new / edit pages"
```

---

### Task 27 — Concurrent dev orchestration

**Files:**
- Modify: `package.json` (root)

- [ ] **Step 1: Install `concurrently`**

```bash
npm install --save-dev concurrently
```

- [ ] **Step 2: Update root scripts**

```json
"dev": "tsx watch src/server.ts",
"dev:server": "tsx watch src/server.ts",
"dev:admin": "npm --prefix apps/admin run dev",
"dev:packages": "npm --workspaces --if-present run dev",
"dev:all": "npm run build:packages && concurrently -n db,storage,types,tokens,server,admin -c blue,cyan,gray,magenta,green,yellow \"npm --prefix packages/db run dev\" \"npm --prefix packages/storage run dev\" \"npm --prefix packages/shared-types run dev\" \"npm --prefix packages/design-tokens run dev\" \"npm run dev:server\" \"npm run dev:admin\""
```

(`build:packages` runs once before watchers start so `dist/` exists for Express's first import.)

- [ ] **Step 3: Smoke**

```bash
npm run dev:all
```

Expect 6 colored streams. Express on 3000 (green), admin on 3001 (yellow), package watchers idle. Edit a file in `packages/db/src/` → matching watcher logs `Found 0 errors`. Express does NOT auto-reload on package changes (tsx watches `src/`, not `packages/`); restart Express manually if needed. Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: dev:all orchestrates Express + admin + package watchers"
```

---

### Task 28 — E2E: admin auth + session sharing

**Files:**
- Modify: `playwright.config.ts`
- Create: `tests/e2e/admin-next/auth.spec.ts`

- [ ] **Step 1: Confirm Playwright picks up the new dir**

Open `playwright.config.ts`. If `testDir: './tests/e2e'`, the new `admin-next/` subfolder is auto-included; no diff required. If projects use explicit `testMatch` globs, extend `desktop-chrome` and `mobile-chrome` to include `admin-next/**/*.spec.ts`.

```bash
npx playwright test --list 2>&1 | grep admin-next || echo "NEW DIR NOT PICKED UP — adjust config"
```

After Task 28 Step 2 lands, this command should print at least one test path containing `admin-next/`.

- [ ] **Step 2: Auth e2e**

```typescript
import { test, expect } from '@playwright/test';

const ADMIN_BASE = process.env.ADMIN_BASE_URL ?? 'http://localhost:3001';
const EMAIL = process.env.ADMIN_EMAIL ?? 'e2e-test@eve.local';
const PASS = process.env.ADMIN_PASS ?? 'e2etest1234';

test.describe('Next.js admin auth', () => {
  test('redirects unauthenticated users to /login', async ({ page }) => {
    await page.goto(`${ADMIN_BASE}/places`);
    await expect(page).toHaveURL(/\/login/);
  });

  test('valid creds reach /places', async ({ page }) => {
    await page.goto(`${ADMIN_BASE}/login`);
    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', PASS);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/places/);
    await expect(page.locator('h1')).toContainText('Places');
  });

  test('invalid creds bounce back with error', async ({ page }) => {
    await page.goto(`${ADMIN_BASE}/login`);
    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('p').filter({ hasText: /invalid/i })).toBeVisible();
  });

  test('Sign out clears the session', async ({ page }) => {
    await page.goto(`${ADMIN_BASE}/login`);
    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/places/);
    await page.click('button:has-text("Sign out")');
    await expect(page).toHaveURL(/\/login/);
    await page.goto(`${ADMIN_BASE}/places`);
    await expect(page).toHaveURL(/\/login/);
  });
});
```

- [ ] **Step 3: Run + commit**

```bash
npm run dev:all   # in another terminal
npx playwright test tests/e2e/admin-next/auth.spec.ts --project=desktop-chrome
git add tests/e2e/admin-next/auth.spec.ts playwright.config.ts
git commit -m "test(admin-next): auth + session sharing"
```

---

### Task 29 — E2E: places CRUD

**Files:**
- Create: `tests/e2e/admin-next/places.spec.ts`

(Test body identical to v1 plan Task 28 — no behavior changed. Reproduced here for executor convenience.)

```typescript
import { test, expect } from '@playwright/test';

const ADMIN = process.env.ADMIN_BASE_URL ?? 'http://localhost:3001';
const API = process.env.API_BASE_URL ?? 'http://localhost:3000';
const EMAIL = process.env.ADMIN_EMAIL ?? 'e2e-test@eve.local';
const PASS = process.env.ADMIN_PASS ?? 'e2etest1234';

async function login(page: any) {
  await page.goto(`${ADMIN}/login`);
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/places/);
}

test.describe('Next.js admin — places', () => {
  test.beforeEach(async ({ page }) => login(page));

  test('list page renders all places', async ({ page, request }) => {
    const apiRes = await request.get(`${API}/api/places?limit=200`);
    const apiPlaces = await apiRes.json();
    await page.goto(`${ADMIN}/places`);
    const rows = page.locator('ul > li');
    await expect(rows).toHaveCount(apiPlaces.length);
  });

  test('create + edit + delete a place', async ({ page, request }) => {
    const name = `E2E place ${Date.now()}`;
    await page.goto(`${ADMIN}/places/new`);
    await page.fill('input[name="name"]', name);
    await page.fill('input[name="address"]', '123 Test St');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/places$/);

    const res1 = await request.get(`${API}/api/places?limit=200`);
    const list1 = await res1.json();
    const created = list1.find((p: any) => p.name === name);
    expect(created).toBeTruthy();
    expect(created.neighborhood_id).toBeTruthy();

    await page.goto(`${ADMIN}/places/${created.id}/edit`);
    await page.fill('input[name="address"]', '456 Updated Ave');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/places$/);

    const res2 = await request.get(`${API}/api/places/${created.id}`);
    const fresh = await res2.json();
    expect(fresh.address).toBe('456 Updated Ave');

    page.on('dialog', (d) => d.accept());
    await page.goto(`${ADMIN}/places/${created.id}/edit`);
    await page.click('button:has-text("Delete")');
    await page.waitForURL(/\/places$/);

    const res3 = await request.get(`${API}/api/places/${created.id}`);
    expect(res3.status()).toBe(404);
  });
});
```

```bash
npx playwright test tests/e2e/admin-next/places.spec.ts --project=desktop-chrome
git add tests/e2e/admin-next/places.spec.ts
git commit -m "test(admin-next): places list + CRUD"
```

---

### Task 30 — E2E: tags CRUD + drag-reorder

**Files:**
- Create: `tests/e2e/admin-next/tags.spec.ts`

(Same shape as v1 Task 29.)

```typescript
import { test, expect } from '@playwright/test';

const ADMIN = process.env.ADMIN_BASE_URL ?? 'http://localhost:3001';
const API = process.env.API_BASE_URL ?? 'http://localhost:3000';
const EMAIL = process.env.ADMIN_EMAIL ?? 'e2e-test@eve.local';
const PASS = process.env.ADMIN_PASS ?? 'e2etest1234';

async function login(page: any) {
  await page.goto(`${ADMIN}/login`);
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/places/);
}

test.describe('Next.js admin — tags', () => {
  test.beforeEach(async ({ page }) => login(page));

  test('create + edit + delete a tag', async ({ page, request }) => {
    const display = `E2E tag ${Date.now()}`;
    await page.goto(`${ADMIN}/tags/new`);
    await page.fill('input[name="display"]', display);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/tags$/);

    const res1 = await request.get(`${API}/api/tags`);
    const tags1 = await res1.json();
    expect(tags1.find((t: any) => t.display === display)).toBeTruthy();

    await page.goto(`${ADMIN}/tags`);
    await page.click(`a:has-text("${display}")`);
    await page.fill('input[name="display"]', `${display} (updated)`);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/tags$/);

    const res2 = await request.get(`${API}/api/tags`);
    const tags2 = await res2.json();
    expect(tags2.find((t: any) => t.display === `${display} (updated)`)).toBeTruthy();

    page.on('dialog', (d) => d.accept());
    await page.click(`a:has-text("${display} (updated)")`);
    await page.click('button:has-text("Delete")');
    await page.waitForURL(/\/tags$/);
  });

  test('drag-reorder persists', async ({ page }) => {
    await page.goto(`${ADMIN}/tags`);
    const items = page.locator('ul > li');
    const count = await items.count();
    if (count < 2) test.skip(true, 'Need at least 2 tags to test reorder');
    const before = await items.allTextContents();

    const first = items.nth(0).locator('span').first();
    const second = items.nth(1).locator('span').first();
    await first.dragTo(second);
    await page.waitForTimeout(500);

    await page.reload();
    const after = await page.locator('ul > li').allTextContents();
    expect(after[0]).not.toBe(before[0]);
  });
});
```

```bash
npx playwright test tests/e2e/admin-next/tags.spec.ts --project=desktop-chrome
git add tests/e2e/admin-next/tags.spec.ts
git commit -m "test(admin-next): tags CRUD + drag-reorder"
```

---

### Task 31 — E2E: neighborhoods CRUD + inline-add

**Files:**
- Create: `tests/e2e/admin-next/neighborhoods.spec.ts`

(Same shape as v1 Task 30. Inline-add selectors will need touching up to match the rendered DOM after Task 18 + 20 — confirm during execution.)

```typescript
import { test, expect } from '@playwright/test';

const ADMIN = process.env.ADMIN_BASE_URL ?? 'http://localhost:3001';
const API = process.env.API_BASE_URL ?? 'http://localhost:3000';
const EMAIL = process.env.ADMIN_EMAIL ?? 'e2e-test@eve.local';
const PASS = process.env.ADMIN_PASS ?? 'e2etest1234';

async function login(page: any) {
  await page.goto(`${ADMIN}/login`);
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/places/);
}

test.describe('Next.js admin — neighborhoods', () => {
  test.beforeEach(async ({ page }) => login(page));

  test('default East Village exists', async ({ page }) => {
    await page.goto(`${ADMIN}/neighborhoods`);
    await expect(page.locator('a:has-text("East Village")')).toBeVisible();
    await expect(page.locator('span:has-text("Default")')).toBeVisible();
  });

  test('create from dedicated page', async ({ page, request }) => {
    const display = `E2E hood ${Date.now()}`;
    await page.goto(`${ADMIN}/neighborhoods/new`);
    await page.fill('input[name="display"]', display);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/neighborhoods$/);
    const res = await request.get(`${API}/api/neighborhoods`);
    const list = await res.json();
    expect(list.find((n: any) => n.display === display)).toBeTruthy();
  });

  test('inline-add from place form persists', async ({ page, request }) => {
    const newHood = `Inline ${Date.now()}`;
    await page.goto(`${ADMIN}/places/new`);
    await page.click('button:has-text("Select"), button:has-text("East Village")');
    await page.fill('input[placeholder="Type to filter"]', newHood);
    await page.click(`button:has-text("Create \"${newHood}\"")`);
    await expect(page.locator(`button:has-text("${newHood}")`)).toBeVisible();

    const res = await request.get(`${API}/api/neighborhoods`);
    const list = await res.json();
    expect(list.find((n: any) => n.display === newHood)).toBeTruthy();
  });
});
```

```bash
npx playwright test tests/e2e/admin-next/neighborhoods.spec.ts --project=desktop-chrome
git add tests/e2e/admin-next/neighborhoods.spec.ts
git commit -m "test(admin-next): neighborhoods CRUD + inline-add"
```

---

### Task 32 — E2E: mobile viewport (iPhone 13)

**Files:**
- Create: `tests/e2e/admin-next/mobile.spec.ts`

```typescript
import { test, expect, devices } from '@playwright/test';

const ADMIN = process.env.ADMIN_BASE_URL ?? 'http://localhost:3001';
const API = process.env.API_BASE_URL ?? 'http://localhost:3000';
const EMAIL = process.env.ADMIN_EMAIL ?? 'e2e-test@eve.local';
const PASS = process.env.ADMIN_PASS ?? 'e2etest1234';

test.use({ ...devices['iPhone 13'] });

test.describe('Admin on mobile viewport', () => {
  test('login + nav fit one-handed', async ({ page }) => {
    await page.goto(`${ADMIN}/login`);
    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/places/);

    await expect(page.locator('a:has-text("Places")')).toBeVisible();
    await expect(page.locator('a:has-text("Tags")')).toBeVisible();
    await expect(page.locator('a:has-text("Neighborhoods")')).toBeVisible();

    const overflow = await page.evaluate(() => document.body.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(2);
  });

  test('place edit form has no horizontal overflow', async ({ page, request }) => {
    await page.goto(`${ADMIN}/login`);
    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/places/);

    const apiRes = await request.get(`${API}/api/places?limit=1`);
    const places = await apiRes.json();
    await page.goto(`${ADMIN}/places/${places[0].id}/edit`);

    const overflow = await page.evaluate(() => document.body.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(2);

    await expect(page.locator('span:has-text("Name")')).toBeVisible();
    await expect(page.locator('span:has-text("Specials")')).toBeVisible();
  });
});
```

(Run with `--project=mobile-chrome` since `test.use(devices[...])` overrides the base device. If your config requires a specific project, use whichever picks up the spec.)

```bash
npx playwright test tests/e2e/admin-next/mobile.spec.ts --project=mobile-chrome
git add tests/e2e/admin-next/mobile.spec.ts
git commit -m "test(admin-next): mobile viewport (iPhone 13) usability"
```

---

### Task 33 — Docker compose: admin service

**Files:**
- Create: `apps/admin/Dockerfile`
- Modify: `docker-compose.yml`

> **Workspace COPYs:** the Dockerfile must copy every workspace member's `package.json`, including `apps/mobile/package.json` (the `apps/*` glob picks up mobile, and `npm ci --workspaces` will fail without it). The mobile app's full source isn't needed in the image — just the manifest is enough to satisfy the workspace install.

- [ ] **Step 1: `apps/admin/Dockerfile`**

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/admin/package.json ./apps/admin/
COPY apps/mobile/package.json ./apps/mobile/
COPY packages/db/package.json ./packages/db/
COPY packages/storage/package.json ./packages/storage/
COPY packages/design-tokens/package.json ./packages/design-tokens/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN npm ci --workspaces --include-workspace-root

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# Source files for the build (excluding mobile and tests).
COPY tsconfig.json package.json package-lock.json ./
COPY packages ./packages
COPY apps/admin ./apps/admin
RUN npm run build:packages
RUN npm --prefix apps/admin run build

FROM node:20-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/admin/.next ./apps/admin/.next
COPY --from=build /app/apps/admin/public ./apps/admin/public
COPY --from=build /app/apps/admin/package.json ./apps/admin/package.json
COPY --from=build /app/package.json ./package.json
EXPOSE 3001
CMD ["npm", "--prefix", "apps/admin", "run", "start"]
```

- [ ] **Step 2: docker-compose.yml additions**

```yaml
  admin:
    build:
      context: .
      dockerfile: apps/admin/Dockerfile
    environment:
      DATABASE_URL: postgres://eve:eve@postgres:5432/eve_development
      REDIS_URL: redis://redis:6379
      SESSION_COOKIE_NAME: connect.sid
      SESSION_SECRET: ${SESSION_SECRET}
      STORAGE_BACKEND: ${STORAGE_BACKEND:-local}
      STORAGE_LOCAL_DIR: public/uploads
      STORAGE_LOCAL_URL_PREFIX: /uploads
      STORAGE_S3_BUCKET: ${STORAGE_S3_BUCKET:-}
      STORAGE_S3_REGION: ${STORAGE_S3_REGION:-us-east-1}
      STORAGE_S3_PREFIX: ${STORAGE_S3_PREFIX:-public}
      STORAGE_S3_URL_PATTERN: ${STORAGE_S3_URL_PATTERN:-}
      NODE_ENV: production
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - redis
      - app
```

- [ ] **Step 3: Build the image**

```bash
docker compose build admin
```

Don't `up` — that's part of cutover.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/Dockerfile docker-compose.yml
git commit -m "chore: docker setup for admin service"
```

---

### Task 34 — Nginx routing config (lands in repo, applied at cutover)

**Files:**
- Modify or create: `nginx/admin.conf` (or wherever the prod nginx config lives)

```bash
git ls-files | grep -i nginx
```

If prod config is in repo, modify it. Otherwise create `nginx/admin.conf` as a parked snippet:

```nginx
# admin.eastvillageeverything.nyc → Next.js admin (port 3001).
# The path-based EJS admin (https://eastvillageeverything.nyc/admin/*) keeps working
# during the parallel-run window; remove it together with migration …007 (Task 36 cutover).
server {
  listen 443 ssl http2;
  server_name admin.eastvillageeverything.nyc;

  ssl_certificate     /etc/letsencrypt/live/eastvillageeverything.nyc/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/eastvillageeverything.nyc/privkey.pem;

  location / {
    proxy_pass http://admin:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

```bash
git add nginx/
git commit -m "chore(nginx): admin.* routes to Next.js admin (applied at cutover)"
```

---

### Task 35 — Cleanup migration: drop Phase A vestigial columns

**Files:**
- Create: `migrations/1706457600007_drop-phase-a-vestigial-columns.js`

> **NOT run during Phase C dev.** Part of cutover, applied **after** EJS code is removed (Task 36 runbook step 5).

```javascript
exports.up = (pgm) => {
  pgm.dropColumns('tags', ['is_primary', 'tint', 'accent', 'fallback_image_url']);
  pgm.dropConstraint('tags', 'tags_parent_tag_id_fkey', { ifExists: true });
  pgm.dropColumn('tags', 'parent_tag_id');

  pgm.dropConstraint('places', 'places_primary_tag_id_fkey', { ifExists: true });
  pgm.dropIndex('places', 'primary_tag_id', { ifExists: true });
  pgm.dropColumn('places', 'primary_tag_id');
};

exports.down = (pgm) => {
  pgm.addColumn('places', {
    primary_tag_id: { type: 'uuid', references: 'tags(id)', onDelete: 'SET NULL' },
  });
  pgm.createIndex('places', 'primary_tag_id', { ifNotExists: true });
  pgm.addColumn('tags', {
    parent_tag_id: { type: 'uuid', references: 'tags(id)', onDelete: 'SET NULL' },
    is_primary: { type: 'boolean', notNull: true, default: false },
    tint: { type: 'varchar(7)' },
    accent: { type: 'varchar(7)' },
    fallback_image_url: { type: 'text' },
  });
};
```

(Confirm constraint and index names match what `1706457600005` actually created — `\d tags` and `\d places`. Adjust if the executor finds different.)

```bash
ls -1 migrations/ | tail -2   # confirm both …006 and …007 are present
git add migrations/1706457600007_drop-phase-a-vestigial-columns.js
git commit -m "feat(migration): drop Phase A vestigial columns at cutover"
```

---

### Task 36 — Verify no regressions

**Files:** none (verification only)

- [ ] **Step 1: Root typecheck**

```bash
npm run build:packages
npm run typecheck
```

Expected: PASS (server, mobile, admin, packages all clean).

- [ ] **Step 2: Mobile Jest**

```bash
cd apps/mobile && npm test -- --watchAll=false
```

Expected: same baseline as Phase B.

- [ ] **Step 3: Existing API + EJS admin e2e (regression)**

```bash
npx playwright test tests/e2e/api/ tests/e2e/admin/ --project=desktop-chrome
```

Expected: every pre-existing test still passes. Phase C's only Express-side changes were import refactors, the new `/api/neighborhoods` endpoint, and `neighborhood_id` on `/api/places`. The EJS upload + tag + place forms still work.

- [ ] **Step 4: New admin-next e2e**

```bash
npx playwright test tests/e2e/admin-next/ --project=desktop-chrome
npx playwright test tests/e2e/admin-next/mobile.spec.ts --project=mobile-chrome
```

Expected: all passing.

- [ ] **Step 5: Curl smoke**

```bash
npm run dev:all
curl -sS http://localhost:3000/api/neighborhoods | jq '.'
curl -sS http://localhost:3000/api/places | jq '.[0] | {neighborhood_id, tags}'
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:3001/places   # expect 307
```

- [ ] **Step 6: Commit if any pre-existing test required adjustment**

(Unlikely — Phase C is mostly additive on the server side.)

---

### Task 37 — **HARD GATE**: Push branch, hand off (NO prod deploy)

**Files:** none.

> Same hard gate as Phase A and B. Branch parks on origin, awaits user merge → main → existing GH Action → SSM → EC2 deploy. No PR, no merge, no deploy by automation.

- [ ] **Step 1: Push the feature branch**

```bash
git push -u origin phase-c-nextjs-admin
```

- [ ] **Step 2: Final smoke walkthrough**

```bash
npm run dev:all
```

Browser walk:
1. `/login` → sign in.
2. `/places` → click into one → edit specials → save.
3. Use prev/next to walk to next place.
4. `/tags` → drag a tag to reorder.
5. `/neighborhoods` → add a new one.
6. Back to a place → change neighborhood via picker (try inline-add a hood).
7. Sign out.
8. Verify `http://localhost:3000/admin/places` (EJS admin) still works — both admins coexist in dev.

Stop dev:all.

- [ ] **Step 3: Handoff summary to user**

Branch name + last commit SHA. Test pass counts. Deviations.

**Cutover checklist for the user (DO IN THIS EXACT ORDER):**

1. **Merge `phase-c-nextjs-admin` to `main`.** GH Action builds Express + admin Docker images.
2. **On EC2:** pull updated `docker-compose.yml`, run `docker compose up -d admin` (admin service joins running stack on port 3001).
3. **Update nginx config** (the snippet from Task 34), reload nginx. `https://admin.eastvillageeverything.nyc/login` should now reach the Next.js admin.
4. **Verify on prod:** sign in, walk through one place edit + one tag add + one neighborhood add. Confirm photo upload works. Confirm prev/next nav works.
5. **Open a follow-up commit on `main`** that:
   - deletes `src/routes/admin.ts`
   - deletes `src/views/admin/` (entire directory)
   - removes the `app.use('/admin', csrfSynchronisedProtection, …)` block from `src/server.ts` (or whatever still mounts the EJS admin)
   - removes any imports that pointed at the deleted files
   - keeps `POST /admin/uploads` only if anything else still depends on it (it shouldn't — the Next.js admin uses its own `/api/admin/uploads`); otherwise delete that handler too along with `src/middleware/upload.ts`
   - runs `npm run typecheck` to catch anything missed
   - deploy this commit. Express now has no EJS admin code, no path-based `/admin/*` routing.
6. **Apply migration `…007`:** `docker compose exec app npm run migrate`. Drops the Phase A vestigial columns. Safe now because nothing in code references them.
7. **Verify on prod again:** admin, public site, mobile app all still work.

- [ ] **Step 4: STOP**

Do not merge. Do not deploy. Do not delete EJS code. Do not run migration `…007`. Do not modify CLAUDE.md's source-of-truth pointer until the user confirms cutover is complete.

---

## Done definition

Phase C is complete when:
- `phase-c-nextjs-admin` branch is pushed to origin with all commits clean.
- npm workspaces are configured; `@eve/db`, `@eve/storage`, `@eve/design-tokens`, `@eve/shared-types`, `@eve/admin` all build and typecheck.
- The Next.js admin runs locally at `:3001`, fully functional: places list/new/edit, tags list/new/edit (with drag-reorder), neighborhoods list/new/edit (with inline-add from the place form), photo upload (via the admin's own route handler — no Express CSRF round-trip), prev/next single-record navigation.
- Auth shares the same Redis session as Express; `req.session.userId` and `req.session.user` are honored on both sides.
- Mobile-viewport e2e test passes (iPhone 13): no horizontal overflow on key pages.
- All existing API + EJS admin e2e tests still pass.
- New e2e tests pass: auth, places, tags, neighborhoods, mobile.
- Cleanup migration `…007` is in the branch but **not run**.
- Nginx routing config is in the branch but **not applied**.
- The Express EJS admin still functions during dev parallel run.

The user can now: (a) merge to main and follow the cutover checklist, (b) ship Phase C alongside the EJS admin, (c) run the EJS-removal commit + `…007` whenever ready, (d) start Phase D (mobile redesign spec-compliance) on a fresh branch — Phase D and the cleanup don't depend on each other.

## Next

**Phase D — mobile redesign spec-compliance.** Updates `apps/mobile/` to consume `neighborhood_id` (top-nav neighborhood switcher), per-place ordered tags (drives meta line), and the typographic-fallback hero treatment in neutral tokens (no per-tag tints). Uses `@eve/design-tokens` for the same palette the admin already loads. Drops mobile reads of the now-deleted `primary_tag_id` etc.

**Phase E — App Store ship.** TestFlight build refresh, marketing copy, store listing assets, public release.

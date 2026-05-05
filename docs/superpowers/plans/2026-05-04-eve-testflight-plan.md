# EVE TestFlight Phase 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-05-04-eve-testflight-design.md`

**Goal:** Ship a working EVE iOS app to a small private TestFlight beta after fixing the mobile data-flow rot, rate-limiting the public API, polishing nested-tag admin UX, and wiring EAS build env.

**Architecture:** Pure tag-driven mobile filters sourced from `/api/tags?structured=1`; transformPlace stops nulling fields the server returns; server gets rate-limit + pagination + dead-code delete; admin tag UI capped to 2 levels deep; EAS production profile wired with prod API URL.

**Tech Stack:** Express + TypeScript + EJS + PostgreSQL + Redis (server); Expo + React Native + TypeScript + TanStack Query (mobile); Playwright (server e2e); Jest (mobile unit); EAS Build + App Store Connect (delivery).

---

## Approach

Sequential, TDD-where-it-makes-sense. Server changes use Playwright e2e tests (existing pattern at `tests/e2e/api/`). Mobile changes use Jest (existing pattern at `apps/mobile/src/**/*.test.ts`). Procedural tasks (eas build, App Store Connect) have no test step but have an explicit verification command. The plan stays current — task statuses are updated in this file as work progresses.

## Working Agreements

- **Each task ends with `npm run typecheck` passing** (root), unless the task explicitly says otherwise.
- **Each task ends with a commit.** Frequent commits, single-purpose.
- **No claiming "done" without running the verify command.** Per `superpowers:verification-before-completion`.
- **Stop-and-ask gates** are marked `**GATE**` — do not proceed past them without user input.
- **Plan stays current** — when a task starts, mark `- [in-progress]`; when done, mark `- [x]`. Add notes inline if reality diverges from plan.

## Status Legend

- `- [ ]` not started
- `- [in-progress]` started, mid-work
- `- [x]` done, verified
- `- [BLOCKED: <reason>]` paused

---

## File Map

**Created**
- `apps/mobile/src/data/deriveFilterSections.ts`
- `apps/mobile/src/data/deriveFilterSections.test.ts`
- `apps/mobile/src/data/transformPlace.test.ts`
- `apps/mobile/src/state/useFilterState.test.ts`
- `tests/e2e/api/rate-limit.spec.ts`
- `tests/e2e/api/pagination.spec.ts`
- `tests/e2e/admin/nested-tags.spec.ts`
- `src/middleware/asyncHandler.ts`

**Modified**
- `apps/mobile/src/data/transformPlace.ts`
- `apps/mobile/src/data/placeV2Display.ts`
- `apps/mobile/src/state/useFilterState.ts`
- `apps/mobile/src/screens/PlaceList.tsx`
- `apps/mobile/src/data/filterSections.ts` *(emptied or deleted in Task 10)*
- `package.json` *(add express-rate-limit)*
- `package-lock.json`
- `src/server.ts` *(rate limit middleware)*
- `src/routes/api.ts` *(pagination on /api/places)*
- `src/routes/admin.ts` *(delete dead /api/* block + asyncHandler wrapping)*
- `src/models/tag.ts` *(2-level nesting validation, getPotentialParents tweak)*
- `src/views/admin/tags/index.ejs`
- `src/views/admin/tags/form.ejs`
- `eas.json`

**Deleted**
- `apps/mobile/src/components/PlaceListItem.tsx`
- *(possibly)* `apps/mobile/src/data/filterSections.ts`

---

## Task List

### Pre-flight

#### Task 1 — **GATE**: Verify backend reachability + CORS

**Files:** none (investigation only)

- [ ] **Step 1: Confirm prod backend URL with user**

Ask: "What is the production HTTPS URL of the deployed EVE backend?" Expected answer like `https://api.eastvillageeverything.com` or similar. Save for later tasks.

- [ ] **Step 2: Curl the prod API**

```bash
curl -sS -i "<PROD_URL>/api/places" | head -20
```

Expected: HTTP/2 200, `content-type: application/json`, JSON array body. If TLS fails or 5xx, **STOP** and surface to user.

- [ ] **Step 3: Verify CORS_ORIGINS env on backend allows mobile usage**

Mobile fetches do not send `Origin` from native code, so CORS is mostly a non-issue at runtime — but verify nginx or app-level CORS isn't sending a restrictive `Access-Control-Allow-Origin` that blocks legitimate browsers if anyone tests via web. Read the deployed `CORS_ORIGINS` value (ssh to EC2 / docker exec, OR ask user). Document the value in this plan inline.

- [ ] **Step 4: Confirm Sentry preference with user**

Ask: "For TestFlight beta builds, do you want Sentry enabled? If yes, paste DSN. If no, I'll wire `EXPO_PUBLIC_SENTRY_DSN=''` and the existing `initSentry()` no-ops on blank." Save answer.

**Acceptance:** Prod URL noted, prod returns places JSON, Sentry decision recorded.

**Commit:** none (no code changed).

---

### Mobile data flow

#### Task 2 — Delete dead `PlaceListItem.tsx`

**Files:**
- DELETE: `apps/mobile/src/components/PlaceListItem.tsx`

- [ ] **Step 1: Verify zero callers**

```bash
grep -rn "PlaceListItem" apps/mobile/src apps/mobile/app
```
Expected: only the file's own line `export function PlaceListItem(...)`. No imports.

- [ ] **Step 2: Delete the file**

```bash
git rm apps/mobile/src/components/PlaceListItem.tsx
```

- [ ] **Step 3: Verify**

```bash
npm run typecheck
grep -rn "PlaceListItem" apps/mobile/src apps/mobile/app
```
Expected: typecheck passes; grep returns nothing.

- [ ] **Step 4: Commit**

```bash
git commit -m "mobile: remove unreferenced PlaceListItem component"
```

---

#### Task 3 — Fix the fake `require()` workaround in `PlaceList.tsx`

**Files:**
- MODIFY: `apps/mobile/src/screens/PlaceList.tsx`

The current code at lines 163-184 uses `require('../data/filterSections')` mid-callback claiming a circular dep. There is no real cycle (`useFilterState.ts:2` already imports `FILTER_SECTIONS` statically). Replace with static top-of-file import; delete the lookup loop entirely by passing the chip's `sectionKey` through railChips. *(The full filter rewrite happens in Task 9; this task just kills the fake require so we don't carry the lie forward.)*

- [ ] **Step 1: Replace the body of `handleRailChipToggle`**

In `apps/mobile/src/screens/PlaceList.tsx`, replace lines 163-184:

```tsx
const handleRailChipToggle = useCallback(
  (value: string) => {
    const { FILTER_SECTIONS } = require('../data/filterSections') as {
      FILTER_SECTIONS: Array<{ key: string; chips: Array<{ value: string }> }>;
    };
    for (const section of FILTER_SECTIONS) {
      for (const chip of section.chips) {
        if (chip.value === value) {
          toggleFilter(section.key, value);
          return;
        }
      }
    }
    toggleFilter('move', value);
  },
  [toggleFilter],
);
```

with:

```tsx
const handleRailChipToggle = useCallback(
  (sectionKey: string, value: string) => {
    toggleFilter(sectionKey, value);
  },
  [toggleFilter],
);
```

- [ ] **Step 2: Update `FilterRail` props to pass `sectionKey` through**

Open `apps/mobile/src/components/FilterRail.tsx`. The `chips` prop should already carry, or be widened to carry, `sectionKey: string` per chip. If it doesn't:

1. Add `sectionKey: string` to the chip type in `FilterRail.tsx` and propagate to its `onChipToggle` callback.
2. Update `useFilterState.ts:railChips` (the memo at line 338-351) to include `sectionKey: section.key` on each chip:

```ts
const railChips = useMemo(() => {
  const chips: Array<{ value: string; label: string; active: boolean; sectionKey: string }> = [];
  for (const section of FILTER_SECTIONS) {
    const activeChips = activeFilters.get(section.key) ?? new Set<string>();
    for (const chip of section.chips) {
      chips.push({
        value: chip.value,
        label: chip.label,
        active: activeChips.has(chip.value),
        sectionKey: section.key,
      });
    }
  }
  return chips;
}, [activeFilters]);
```

3. Update the `UseFilterStateReturn.railChips` type accordingly.
4. Update `PlaceList.tsx`'s `<FilterRail onChipToggle={handleRailChipToggle} />` site to consume the new signature.

- [ ] **Step 3: Verify**

```bash
npm run typecheck
```
Expected: pass.

- [ ] **Step 4: Commit**

```bash
git commit -am "mobile: replace fake require() with sectionKey-on-chip plumb-through"
```

---

#### Task 4 — Update `PlaceV2Display` to plumb server fields

**Files:**
- MODIFY: `apps/mobile/src/data/placeV2Display.ts`

Add the fields that `transformPlace.ts` will now populate (Task 5). Today they exist on `PlaceV2Display` already but transformPlace nulls them — we'll keep the type as-is unless a field is missing. Verify each of these is present:

`pitch`, `perfect`, `insider`, `crowd`, `vibe`, `priceTier`, `crowdLevel`, `photo`, `photoCredit`, `cross`, `hours`.

- [ ] **Step 1: Read current type and identify gaps**

```bash
sed -n '14,40p' apps/mobile/src/data/placeV2Display.ts
```

Current shape (per audit) already has all these. **If true, skip to Step 4.** If any field is missing (the redesign plan proposed dropping some), add it back with the proper type.

- [ ] **Step 2: Hours type**

Confirm `hours: string | null` is the current type. We will set it to `string | null` derived from `hours_json?.weekdayDescriptions?.[(new Date()).getDay()] ?? null` in Task 5 (label-only; no openNow logic).

- [ ] **Step 3: Add `enrichmentStatus` field if useful**

Skip this — not used by any UI in Phase 1.

- [ ] **Step 4: Verify**

```bash
npm run typecheck
```
Expected: pass.

- [x] **Step 5: No commit needed**

Verified `PlaceV2Display` already covers all fields transformPlace will populate (`pitch`, `perfect`, `insider`, `crowd`, `vibe`, `crowdLevel`, `priceTier`, `photo`, `photoCredit`, `cross`, `hours`). No type change required.

---

#### Task 5 — Rewrite `transformPlace.ts` to plumb fields (TDD)

**Files:**
- MODIFY: `apps/mobile/src/data/transformPlace.ts`
- CREATE: `apps/mobile/src/data/transformPlace.test.ts`

The current implementation hardcodes `null` for fields the server returns. The fix: consume the fields.

- [ ] **Step 1: Write failing test**

Create `apps/mobile/src/data/transformPlace.test.ts`:

```ts
import { transformPlace } from './transformPlace';
import type { PlaceResponse } from '@eve/shared-types';

describe('transformPlace', () => {
  const baseInput: PlaceResponse = {
    key: 'k1',
    name: 'Test Bar',
    address: '123 Main St',
    phone: '5551234567',
    url: 'https://example.com',
    specials: null,
    categories: 'dive bar',
    notes: null,
    tags: ['dive', 'beer'],
    lat: 40.7,
    lng: -73.98,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    pitch: 'A real dive.',
    crowd_level: 'Steady',
    price_tier: '$',
    photo_url: 'https://img.example.com/a.jpg',
    hours_json: null,
    cross_street: 'between 1st and 2nd',
  };

  it('plumbs server fields instead of nulling them', () => {
    const out = transformPlace(baseInput);
    expect(out.pitch).toBe('A real dive.');
    expect(out.priceTier).toBe('$');
    expect(out.crowdLevel).toBe('Steady');
    expect(out.photo).toBe('https://img.example.com/a.jpg');
    expect(out.cross).toBe('between 1st and 2nd');
  });

  it('handles nulls without throwing', () => {
    const out = transformPlace({ ...baseInput, pitch: null, price_tier: null, photo_url: null });
    expect(out.pitch).toBeNull();
    expect(out.priceTier).toBeNull();
    expect(out.photo).toBeNull();
  });

  it('passes through tags array', () => {
    const out = transformPlace(baseInput);
    expect(out.tags).toEqual(['dive', 'beer']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm --prefix apps/mobile test -- transformPlace
```
Expected: FAIL — assertions on `pitch`, `priceTier`, `crowdLevel`, `photo`, `cross` will be `null` because current code hardcodes them to `null`.

- [ ] **Step 3: Rewrite `transformPlace.ts`**

Replace the contents of `apps/mobile/src/data/transformPlace.ts` with:

```ts
import type { PlaceResponse } from '@eve/shared-types';
import type { PlaceV2Display, CrowdLevel, PriceTier } from './placeV2Display';
import { inferCategory } from './categoryMap';

function isCrowdLevel(v: unknown): v is CrowdLevel {
  return v === 'Quiet' || v === 'Light' || v === 'Steady' || v === 'Filling up' || v === 'Booked till 11';
}

function isPriceTier(v: unknown): v is PriceTier {
  return v === '$' || v === '$$' || v === '$$$';
}

function deriveHoursLabel(hoursJson: PlaceResponse['hours_json']): string | null {
  if (!hoursJson || typeof hoursJson !== 'object') return null;
  const weekday = (hoursJson as { weekdayDescriptions?: string[] }).weekdayDescriptions;
  if (!Array.isArray(weekday)) return null;
  // Google's weekdayDescriptions is Mon-first per Places API v1; JS Date.getDay() is Sun=0
  const jsDay = new Date().getDay();
  const idx = jsDay === 0 ? 6 : jsDay - 1;
  return weekday[idx] ?? null;
}

export function transformPlace(p: PlaceResponse): PlaceV2Display {
  const firstLine = p.categories ? p.categories.split('\n')[0].trim() || null : null;

  return {
    key: p.key,
    name: p.name,
    kind: firstLine,
    category: inferCategory(p.categories), // stays styling-only; see spec §3
    street: p.address ?? null,
    cross: p.cross_street ?? null,
    tags: Array.isArray(p.tags) ? p.tags : [],
    phone: p.phone ?? null,
    url: p.url ?? null,
    lat: p.lat ?? null,
    lng: p.lng ?? null,
    photo: p.photo_url ?? null,
    photoCredit: p.photo_credit ?? null,
    pitch: p.pitch ?? null,
    perfect: p.perfect ?? null,
    insider: p.insider ?? null,
    crowd: p.crowd ?? null,
    vibe: p.vibe ?? null,
    crowdLevel: isCrowdLevel(p.crowd_level) ? p.crowd_level : null,
    priceTier: isPriceTier(p.price_tier) ? p.price_tier : null,
    hours: deriveHoursLabel(p.hours_json),
    open: null,         // not derived in Phase 1
    distance: null,     // not derived in Phase 1
    closesIn: null,     // not derived in Phase 1
    signal: null,       // not derived in Phase 1
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm --prefix apps/mobile test -- transformPlace
```
Expected: PASS.

- [ ] **Step 5: Verify typecheck across project**

```bash
npm run typecheck
```
Expected: PASS. If `PlaceV2Display` doesn't have any of these fields, fix Task 4 first.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/data/transformPlace.ts apps/mobile/src/data/transformPlace.test.ts
git commit -m "mobile: stop nulling server-provided fields in transformPlace"
```

---

#### Task 6 — Add `deriveFilterSections()` utility (TDD)

**Files:**
- CREATE: `apps/mobile/src/data/deriveFilterSections.ts`
- CREATE: `apps/mobile/src/data/deriveFilterSections.test.ts`

Pure function: takes the structured `/api/tags?structured=1` response, returns a `FilterSection[]` for the UI.

- [ ] **Step 1: Write failing test**

Create `apps/mobile/src/data/deriveFilterSections.test.ts`:

```ts
import { deriveFilterSections } from './deriveFilterSections';
import type { TagsStructuredResponse } from '@eve/shared-types';

describe('deriveFilterSections', () => {
  it('maps each parent to a section with children as chips', () => {
    const input: TagsStructuredResponse = {
      parents: [
        {
          value: 'type',
          display: 'Type',
          order: '1',
          children: [
            { value: 'dive', display: 'Dive', order: '1' },
            { value: 'cocktail', display: 'Cocktail', order: '2' },
          ],
        },
      ],
      standalone: [],
    };
    const out = deriveFilterSections(input);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      key: 'type',
      title: 'Type',
      chips: [
        { value: 'dive', label: 'Dive', sectionKey: 'type' },
        { value: 'cocktail', label: 'Cocktail', sectionKey: 'type' },
      ],
    });
  });

  it('returns empty array if no parents', () => {
    expect(deriveFilterSections({ parents: [], standalone: [] })).toEqual([]);
  });

  it('drops standalone tags (not rendered in v1)', () => {
    const out = deriveFilterSections({
      parents: [],
      standalone: [{ value: 'orphan', display: 'Orphan', order: '1' }],
    });
    expect(out).toEqual([]);
  });

  it('preserves server sort order', () => {
    const input: TagsStructuredResponse = {
      parents: [
        { value: 'b', display: 'B', order: '2', children: [] },
        { value: 'a', display: 'A', order: '1', children: [] },
      ],
      standalone: [],
    };
    const out = deriveFilterSections(input);
    // Server is responsible for sort order; we honor whatever order it sends.
    expect(out.map(s => s.key)).toEqual(['b', 'a']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm --prefix apps/mobile test -- deriveFilterSections
```
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write the implementation**

Create `apps/mobile/src/data/deriveFilterSections.ts`:

```ts
import type { TagsStructuredResponse } from '@eve/shared-types';

export interface FilterChip {
  value: string;
  label: string;
  sectionKey: string;
}

export interface FilterSection {
  key: string;
  title: string;
  chips: FilterChip[];
}

/**
 * Derive UI filter sections from the server's structured tag taxonomy.
 *
 * Each parent tag becomes a section. Standalone tags are dropped in v1
 * (no section header). Server-provided sort order is honored as-is.
 */
export function deriveFilterSections(tags: TagsStructuredResponse): FilterSection[] {
  return tags.parents.map((parent) => ({
    key: parent.value,
    title: parent.display,
    chips: parent.children.map((child) => ({
      value: child.value,
      label: child.display,
      sectionKey: parent.value,
    })),
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm --prefix apps/mobile test -- deriveFilterSections
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/data/deriveFilterSections.ts apps/mobile/src/data/deriveFilterSections.test.ts
git commit -m "mobile: add deriveFilterSections utility (tag-tree → UI sections)"
```

---

#### Task 7 — Rewrite `useFilterState.matchesChip` to pure tag-match (TDD)

**Files:**
- MODIFY: `apps/mobile/src/state/useFilterState.ts`
- CREATE: `apps/mobile/src/state/useFilterState.test.ts`

Replace the section-aware switch with a single strategy: `place.tags.includes(chip.value)`. Drop all hours/price/vibe/category special cases.

- [ ] **Step 1: Write failing test**

Create `apps/mobile/src/state/useFilterState.test.ts`:

```ts
import { matchesChipPure } from './useFilterState';
import type { PlaceV2Display } from '../data/placeV2Display';

const place = (tags: string[]): PlaceV2Display => ({
  key: 'k', name: 'X', kind: null, category: 'dive', street: null, cross: null,
  hours: null, open: null, vibe: null, photo: null, photoCredit: null,
  pitch: null, perfect: null, tags, insider: null, crowd: null,
  distance: null, closesIn: null, signal: null, crowdLevel: null,
  priceTier: null, phone: null, url: null, lat: null, lng: null,
});

describe('matchesChipPure', () => {
  it('matches when tag is in place.tags', () => {
    expect(matchesChipPure(place(['dive', 'beer']), 'dive')).toBe(true);
  });
  it('does not match when tag is absent', () => {
    expect(matchesChipPure(place(['cocktail']), 'dive')).toBe(false);
  });
  it('is case-sensitive', () => {
    expect(matchesChipPure(place(['Dive']), 'dive')).toBe(false);
  });
  it('does not substring-match', () => {
    expect(matchesChipPure(place(['happy-hour']), 'happy')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm --prefix apps/mobile test -- useFilterState
```
Expected: FAIL — `matchesChipPure` is not exported.

- [ ] **Step 3: Refactor `useFilterState.ts`**

In `apps/mobile/src/state/useFilterState.ts`:

(a) Remove the import of `FILTER_SECTIONS` from `../data/filterSections` at line 2.

(b) Add `import type { FilterSection } from '../data/deriveFilterSections';`

(c) Export the pure match function:

```ts
export function matchesChipPure(place: PlaceV2Display, chipValue: string): boolean {
  return place.tags.includes(chipValue);
}
```

(d) Replace the existing `matchesChip` (lines 56-97) with a delegation:

```ts
function matchesChip(place: PlaceV2Display, chipValue: string): boolean {
  return matchesChipPure(place, chipValue);
}
```

(e) Update `matchesSection` to drop the `sectionKey` parameter (no longer needed for matching):

```ts
function matchesSection(
  place: PlaceV2Display,
  activeChips: Set<string>,
): boolean {
  if (activeChips.size === 0) return true;
  for (const chip of activeChips) {
    if (matchesChip(place, chip)) return true;
  }
  return false;
}
```

(f) Update call sites of `matchesAllSections` to drop `sectionKey`:

```ts
function matchesAllSections(
  place: PlaceV2Display,
  activeFilters: Map<string, Set<string>>,
): boolean {
  for (const activeChips of activeFilters.values()) {
    if (!matchesSection(place, activeChips)) return false;
  }
  return true;
}
```

(g) Change the hook signature to take `sections: FilterSection[]` as a second arg:

```ts
export function useFilterState(
  allPlaces: PlaceV2Display[] = [],
  sections: FilterSection[] = [],
): UseFilterStateReturn {
  // Build the empty-filters map from sections, not the static FILTER_SECTIONS:
  const buildEmpty = useCallback((): Map<string, Set<string>> => {
    const map = new Map<string, Set<string>>();
    for (const s of sections) map.set(s.key, new Set<string>());
    return map;
  }, [sections]);
  // ...rest of body uses `sections` everywhere `FILTER_SECTIONS` was used
}
```

(h) Replace the standalone `buildEmptyFilters` helper at line 39 with the inline `buildEmpty` from (g) — the standalone helper depended on the static import.

(i) Update `chipCounts` and `railChips` memos to iterate `sections` instead of `FILTER_SECTIONS`. Remove the `default: return false` branch in the old switch (now unreachable).

(j) Add `useCallback` to imports if missing.

- [ ] **Step 4: Run test to verify it passes**

```bash
npm --prefix apps/mobile test -- useFilterState
```
Expected: PASS.

- [ ] **Step 5: Run full mobile test suite**

```bash
npm --prefix apps/mobile test
```
Expected: all PASS (existing tests still green).

- [ ] **Step 6: Verify typecheck**

```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/state/useFilterState.ts apps/mobile/src/state/useFilterState.test.ts
git commit -m "mobile: pure tag-match filter; useFilterState takes sections as parameter"
```

---

#### Task 8 — Wire `PlaceList.tsx` to consume `useTagsStructured` + `deriveFilterSections`

**Files:**
- MODIFY: `apps/mobile/src/screens/PlaceList.tsx`

- [ ] **Step 1: Add imports and consume the hook**

In `apps/mobile/src/screens/PlaceList.tsx`, add imports near the top:

```tsx
import { useTagsStructured } from '../api/tags';
import { deriveFilterSections } from '../data/deriveFilterSections';
```

Inside the component body, after `usePlacesList()`:

```tsx
const { data: tagsData } = useTagsStructured();
const filterSections = React.useMemo(
  () => (tagsData ? deriveFilterSections(tagsData) : []),
  [tagsData],
);
```

- [ ] **Step 2: Pass sections to `useFilterState`**

```tsx
const filterState = useFilterState(allPlaces, filterSections);
```

(All existing destructured fields stay the same.)

- [ ] **Step 3: If `FilterSheet` consumes `FILTER_SECTIONS` directly, switch it to consume the prop**

Open `apps/mobile/src/components/FilterSheet.tsx` and check whether it imports `FILTER_SECTIONS`. If yes:

1. Add a `sections: FilterSection[]` prop.
2. Remove the import.
3. Update its render to iterate `props.sections`.
4. In `PlaceList.tsx`, pass `sections={filterSections}` on the `<FilterSheet>` element.

- [ ] **Step 4: Verify typecheck**

```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -am "mobile: drive filter sections from /api/tags?structured=1 in PlaceList"
```

---

#### Task 9 — Empty (or delete) `filterSections.ts`

**Files:**
- DELETE or EMPTY: `apps/mobile/src/data/filterSections.ts`

After Task 8, nothing should import `FILTER_SECTIONS` anymore.

- [ ] **Step 1: Confirm zero callers**

```bash
grep -rn "FILTER_SECTIONS\|from '../data/filterSections'\|from './filterSections'" apps/mobile/src apps/mobile/app
```
Expected: zero hits except the file itself.

- [ ] **Step 2: Delete the file**

```bash
git rm apps/mobile/src/data/filterSections.ts
```

- [ ] **Step 3: Verify**

```bash
npm run typecheck && npm --prefix apps/mobile test
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git commit -m "mobile: delete static filterSections — sections now derived from /api/tags"
```

---

### Tag taxonomy alignment

#### Task 10 — **GATE**: Audit live DB tags vs UX needs

**Files:** none (investigation only).

The previous static `FILTER_SECTIONS` had ~24 chips. The DB may have very different tags. Decide with the user.

- [ ] **Step 1: Fetch the live structured taxonomy**

```bash
curl -sS "<PROD_URL>/api/tags?structured=1" | jq .
```

- [ ] **Step 2: Compare to UX intent and report to user**

Produce a short table to show the user:

| Server parent | Children | Notes |
|---|---|---|

For each parent, list its children. Then ask:

1. Are these the chips you want testers to see?
2. Are any obviously missing? (If yes, user adds via admin UI before TestFlight build.)
3. Any tags that should be removed? (Same.)
4. Sort order acceptable?

- [ ] **Step 3: Record decisions**

Add a `## Tag taxonomy decision` block to this plan file with the agreed-upon final taxonomy and any admin UI work that must happen before Task 22.

**Acceptance:** User has explicitly approved (or amended) the live taxonomy. Decisions written into this plan.

**Commit:** none.

---

### Server gates

#### Task 11 — Install `express-rate-limit`

**Files:**
- MODIFY: `package.json`, `package-lock.json`

- [ ] **Step 1: Install**

```bash
npm install express-rate-limit@7
```

- [ ] **Step 2: Verify version**

```bash
node -e "console.log(require('express-rate-limit/package.json').version)"
```
Expected: `7.x.x`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add express-rate-limit@7"
```

---

#### Task 12 — Add rate limit middleware on `/api/*` (TDD via Playwright)

**Files:**
- MODIFY: `src/server.ts`
- CREATE: `tests/e2e/api/rate-limit.spec.ts`

- [ ] **Step 1: Write failing Playwright test**

Create `tests/e2e/api/rate-limit.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

test('rate-limit: /api/places returns 429 after the cap', async ({ request }) => {
  // Cap is 100/min; do 110 in a tight loop and expect at least one 429.
  let saw429 = false;
  for (let i = 0; i < 110; i++) {
    const res = await request.get(`${BASE_URL}/api/places?limit=1`);
    if (res.status() === 429) { saw429 = true; break; }
  }
  expect(saw429).toBe(true);
});

test('rate-limit: returns Retry-After header on 429', async ({ request }) => {
  // Hammer until 429
  for (let i = 0; i < 110; i++) {
    const res = await request.get(`${BASE_URL}/api/places?limit=1`);
    if (res.status() === 429) {
      expect(res.headers()['retry-after']).toBeDefined();
      return;
    }
  }
  throw new Error('Never received 429');
});
```

- [ ] **Step 2: Run the test against a running dev server**

```bash
# Terminal A
npm run docker:dev
# Terminal B
npx playwright test tests/e2e/api/rate-limit.spec.ts --project=desktop-chrome
```
Expected: FAIL (no rate limiting yet).

- [ ] **Step 3: Implement middleware**

Edit `src/server.ts`. Add import near the top:

```ts
import rateLimit from 'express-rate-limit';
```

Just before `app.use('/api', apiRoutes);` (line 97), add:

```ts
const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});
app.use('/api', apiLimiter);
```

- [ ] **Step 4: Re-run tests**

```bash
npx playwright test tests/e2e/api/rate-limit.spec.ts --project=desktop-chrome
```
Expected: PASS. *(Note: tests use 110 in a tight loop. In dev with cap 1000, this won't trigger. Set `NODE_ENV=production` for the test run, OR temporarily lower the dev cap to 100, OR have the test override the cap via a header — easiest: gate the test on NODE_ENV=production, run with `NODE_ENV=production npm run dev` in terminal A.)*

- [ ] **Step 5: Verify typecheck**

```bash
npm run typecheck
```

- [ ] **Step 6: Commit**

```bash
git add src/server.ts tests/e2e/api/rate-limit.spec.ts
git commit -m "server: add express-rate-limit on /api (100/min in prod, 1000/min in dev)"
```

---

#### Task 13 — Add pagination to `/api/places` (TDD via Playwright)

**Files:**
- MODIFY: `src/routes/api.ts`, `src/models/place.ts`
- CREATE: `tests/e2e/api/pagination.spec.ts`

- [ ] **Step 1: Write failing test**

Create `tests/e2e/api/pagination.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

test('pagination: ?limit=5 returns at most 5', async ({ request }) => {
  const res = await request.get(`${BASE_URL}/api/places?limit=5`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body)).toBe(true);
  expect(body.length).toBeLessThanOrEqual(5);
});

test('pagination: limit clamped at 200', async ({ request }) => {
  const res = await request.get(`${BASE_URL}/api/places?limit=999`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.length).toBeLessThanOrEqual(200);
});

test('pagination: offset works', async ({ request }) => {
  const all = await (await request.get(`${BASE_URL}/api/places?limit=200`)).json();
  if (all.length < 2) test.skip();
  const offsetRes = await request.get(`${BASE_URL}/api/places?limit=200&offset=1`);
  const offset = await offsetRes.json();
  expect(offset[0]?.key).toBe(all[1]?.key);
});

test('pagination: invalid limit ignored, returns default', async ({ request }) => {
  const res = await request.get(`${BASE_URL}/api/places?limit=foo`);
  expect(res.status()).toBe(200);
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx playwright test tests/e2e/api/pagination.spec.ts --project=desktop-chrome
```
Expected: FAIL on `?limit=5` returning 5 items if DB has more (today returns all).

- [ ] **Step 3: Update `PlaceModel.findAll` to accept limit/offset**

In `src/models/place.ts`, find the `findAll` signature and add optional `limit`/`offset` to its options:

```ts
static async findAll(opts: { tag?: string; limit?: number; offset?: number } = {}): Promise<PlaceWithTags[]> {
  // ... existing query construction ...
  const limit = Math.min(Math.max(1, opts.limit ?? 100), 200);
  const offset = Math.max(0, opts.offset ?? 0);
  // append ` LIMIT $N OFFSET $M` to the SQL with parameters
}
```

(Implementer: read the existing `findAll` body and adapt the SQL builder. Add `LIMIT $N OFFSET $M` at the end. Push `limit` and `offset` into `params`.)

- [ ] **Step 4: Pass through from the route**

In `src/routes/api.ts:13-17`, parse query params:

```ts
router.get('/places', async (req: Request, res: Response) => {
  const tag = typeof req.query.tag === 'string' ? req.query.tag : undefined;
  const limitRaw = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : NaN;
  const offsetRaw = typeof req.query.offset === 'string' ? parseInt(req.query.offset, 10) : NaN;
  const limit = Number.isFinite(limitRaw) ? limitRaw : undefined;
  const offset = Number.isFinite(offsetRaw) ? offsetRaw : undefined;

  try {
    const places = await PlaceModel.findAll({ tag, limit, offset });
    // ...rest unchanged
```

- [ ] **Step 5: Run tests**

```bash
npx playwright test tests/e2e/api/pagination.spec.ts --project=desktop-chrome
```
Expected: PASS.

- [ ] **Step 6: Verify**

```bash
npm run typecheck
```

- [ ] **Step 7: Commit**

```bash
git add src/routes/api.ts src/models/place.ts tests/e2e/api/pagination.spec.ts
git commit -m "server: add limit/offset pagination on /api/places (default 100, max 200)"
```

---

#### Task 14 — Trim dead `/admin/api/*` endpoints (NOT delete the whole block)

**Note from execution:** The audit was wrong about the entire block being dead. `src/views/admin/tags/index.ejs:194` calls `PATCH /admin/api/tags/:id` for drag-drop reorder, with the CSRF token round-tripped via `<%= csrfToken %>` + `x-csrf-token` header. That one endpoint stays. The other 9 (GET /me, GET/POST/PUT/DELETE places, GET tags variants, DELETE tags) were truly unused and were deleted. See commit `0f852ad`.

**Files:**
- MODIFY: `src/routes/admin.ts`

- [ ] **Step 1: Confirm scope of delete**

In `src/routes/admin.ts`, the dead block is everything from the comment `// ====== Admin API endpoints (for potential AJAX use)` (around line 402) through `router.delete('/api/tags/:id', ...)` (around line 488). The very last line `export default router;` stays.

- [ ] **Step 2: Delete lines 402-488**

Open `src/routes/admin.ts` and remove that entire block — both the comment header and all routes underneath. Last surviving line above the deleted block should be the closing `});` of the previous form-based route.

- [ ] **Step 3: Verify nothing references the deleted routes**

```bash
grep -rn "'/admin/api/'\|'/admin/api/" src/ apps/ tests/
```
Expected: zero hits.

- [ ] **Step 4: Verify typecheck and tests**

```bash
npm run typecheck
npx playwright test --project=desktop-chrome
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -am "server: remove unreachable /admin/api/* JSON sub-block (CSRF-blocked, no callers)"
```

---

#### Task 15 — Add `asyncHandler` wrapper for admin routes

**Files:**
- CREATE: `src/middleware/asyncHandler.ts`
- MODIFY: `src/routes/admin.ts`

The admin form routes have no try/catch and dump errors into the global JSON handler. Wrap them so errors render an EJS error page.

- [ ] **Step 1: Create `asyncHandler.ts`**

`src/middleware/asyncHandler.ts`:

```ts
import type { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncHandler<P = any, ReqBody = any, ReqQuery = any> = (
  req: Request<P, any, ReqBody, ReqQuery>,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

export function asyncHandler<P = any, ReqBody = any, ReqQuery = any>(
  fn: AsyncHandler<P, ReqBody, ReqQuery>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req as any, res, next)).catch(next);
  };
}
```

- [ ] **Step 2: Add an HTML-aware error handler in `server.ts`**

Replace the existing global error handler (`src/server.ts:111-118`) with:

```ts
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }
  // If the request was for the admin HTML site, render an error page.
  // Otherwise return JSON (matches existing behavior for /api/*).
  if (req.path.startsWith('/admin') && req.accepts(['html', 'json']) === 'html') {
    res.status(500).render('error', { message: 'Internal server error' });
    return;
  }
  res.status(500).json({ error: 'Internal server error' });
});
```

- [ ] **Step 3: Create the error EJS template**

If `src/views/error.ejs` doesn't exist, create it:

```html
<!DOCTYPE html>
<html><head><title>Error</title></head>
<body><h1>Something went wrong</h1><p><%= message %></p></body></html>
```

(Or use the admin layout — implementer's call. Keep it minimal.)

- [ ] **Step 4: Wrap admin routes**

In `src/routes/admin.ts`, add `import { asyncHandler } from '../middleware/asyncHandler.js';` and wrap each `async (req, res) => { ... }` handler in `asyncHandler(...)`. There are roughly 14 of these.

Pattern:

```ts
// Before:
router.post('/places', async (req, res) => { ... });

// After:
router.post('/places', asyncHandler(async (req, res) => { ... }));
```

- [ ] **Step 5: Verify**

```bash
npm run typecheck
npx playwright test tests/e2e/admin --project=desktop-chrome
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/middleware/asyncHandler.ts src/routes/admin.ts src/server.ts src/views/error.ejs
git commit -m "server: asyncHandler for admin routes; HTML error page on /admin failures"
```

---

### Admin nested-tag UI (cap at 2 levels)

#### Task 16 — Server-side validation: reject 3-deep nesting (TDD via Playwright)

**Files:**
- MODIFY: `src/models/tag.ts`
- CREATE: `tests/e2e/admin/nested-tags.spec.ts`

- [ ] **Step 1: Write failing test**

Create `tests/e2e/admin/nested-tags.spec.ts`. Use the existing admin e2e fixture pattern (read `tests/e2e/admin/admin-api.spec.ts` for login + CSRF helpers — copy what's needed).

The test logs in as admin, creates a parent tag P, creates a child tag C (parent=P), then attempts to update P to set its parent_tag_id=C. This would create a cycle and is also 3-deep when chained. Expect rejection (HTTP 4xx or rendered error).

(Skeleton — adapt to existing admin test fixture):

```ts
import { test, expect } from '@playwright/test';
import { adminLogin } from '../utils/adminLogin'; // existing helper if any

test('admin: blocks creating a tag whose parent already has a parent', async ({ page }) => {
  await adminLogin(page);
  // create P (top-level)
  // create C (parent=P)
  // attempt to create G with parent=C
  // expect form to render an error, OR for the POST to 4xx
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx playwright test tests/e2e/admin/nested-tags.spec.ts --project=desktop-chrome
```
Expected: FAIL — today the model accepts it.

- [ ] **Step 3: Add validation in `TagModel.create` and `TagModel.update`**

In `src/models/tag.ts`, before insert/update, when `parent_tag_id` is provided, verify that the target parent has no parent of its own:

```ts
private static async assertCanBeParent(parentTagId: string): Promise<void> {
  const parent = await TagModel.findById(parentTagId);
  if (!parent) {
    throw new Error('Parent tag not found');
  }
  if (parent.parent_tag_id !== null) {
    throw new Error('Nesting limited to 2 levels: chosen parent already has a parent');
  }
}
```

Call `assertCanBeParent` from inside `create` (when `data.parent_tag_id`) and from inside `update` (when `data.parent_tag_id !== undefined && data.parent_tag_id !== null`).

- [ ] **Step 4: Surface the error in the form**

In `src/routes/admin.ts`, the tag create/update routes catch model errors. Adapt them to render the form with the error message instead of dropping to the 500 path:

```ts
// In the tag POST handler:
try {
  await TagModel.create(...);
  res.redirect('/admin/tags');
} catch (err) {
  if (err instanceof Error && err.message.includes('Nesting limited')) {
    res.status(400).render('admin/tags/form', {
      tag: null,
      parents: await TagModel.getPotentialParents(),
      errors: [err.message],
      csrfToken: res.locals.csrfToken,
    });
    return;
  }
  throw err; // let asyncHandler funnel to error page
}
```

(Implementer: adapt to the actual current shape of the route handler — names of locals, where the form view expects `errors`, etc.)

- [ ] **Step 5: Run test to verify it passes**

```bash
npx playwright test tests/e2e/admin/nested-tags.spec.ts --project=desktop-chrome
```
Expected: PASS.

- [ ] **Step 6: Verify**

```bash
npm run typecheck
```

- [ ] **Step 7: Commit**

```bash
git add src/models/tag.ts src/routes/admin.ts tests/e2e/admin/nested-tags.spec.ts
git commit -m "admin: cap tag nesting at 2 levels (reject parents that already have a parent)"
```

---

#### Task 17 — Hide grandchild parents from form dropdown

**Files:**
- MODIFY: `src/models/tag.ts` (`getPotentialParents`)
- MODIFY: `src/views/admin/tags/form.ejs` (verify it iterates the new list cleanly)

- [ ] **Step 1: Modify `getPotentialParents`**

Currently at `src/models/tag.ts:214-234`. Add a clause that excludes tags whose `parent_tag_id IS NOT NULL` (so already-children aren't shown as parent options). Update SQL:

```ts
static async getPotentialParents(excludeTagId?: string): Promise<Tag[]> {
  let sql = `
    SELECT id, value, display, sort_order, parent_tag_id, has_children, created_at, updated_at
    FROM tags
    WHERE parent_tag_id IS NULL
  `;
  // (already filters for top-level only) — but verify and keep this behavior.
  // existing exclude-self logic stays.
}
```

(The existing SQL already filters `WHERE parent_tag_id IS NULL`, which is exactly what we want — top-level only. Verify and add a comment confirming the 2-level cap.)

- [ ] **Step 2: Verify the form view uses this list**

```bash
grep -n "parents" src/views/admin/tags/form.ejs
```

Confirm the `<select>` for parent renders the `parents` array passed by the controller. No change should be needed if it already does.

- [ ] **Step 3: Verify e2e**

```bash
npx playwright test tests/e2e/admin/nested-tags.spec.ts --project=desktop-chrome
```
Expected: PASS (still).

- [ ] **Step 4: Commit (if any change)**

```bash
git commit -am "admin: confirm getPotentialParents enforces 2-level cap; comment for clarity"
```

---

#### Task 18 — Render admin tags index hierarchically

**Note from execution:** This was already done in the codebase before Phase 1 started. `GET /admin/tags` calls `TagModel.findAllStructured()` and `src/views/admin/tags/index.ejs` renders standalone tags first, then a "Tag Groups" section with parents and indented children. No change was needed; this task was a no-op.

**Files:**
- MODIFY: `src/views/admin/tags/index.ejs`
- (possibly) `src/routes/admin.ts` to pass the structured shape

- [ ] **Step 1: Inspect current render**

```bash
sed -n '1,80p' src/views/admin/tags/index.ejs
```

If the page currently renders a flat list, change the controller to pass `TagModel.findAllStructured()` (returns `{parents, standalone}`) and update the EJS to render parents as `<h3>` followed by their children indented. Standalone tags get their own section at the bottom.

- [ ] **Step 2: Update the controller**

In `src/routes/admin.ts`, find the `GET /tags` (or `GET /tags/'`) handler. Replace the call to `TagModel.findAll()` with `TagModel.findAllStructured()`. Pass `{ parents, standalone }` to the view.

- [ ] **Step 3: Update the EJS**

Render:

```html
<% parents.forEach(function(p) { %>
  <h3><%= p.display %></h3>
  <ul>
    <% p.children.forEach(function(c) { %>
      <li><%= c.display %> <a href="/admin/tags/<%= c.id %>/edit">edit</a></li>
    <% }) %>
  </ul>
<% }) %>

<h3>Standalone</h3>
<ul>
  <% standalone.forEach(function(t) { %>
    <li><%= t.display %> <a href="/admin/tags/<%= t.id %>/edit">edit</a></li>
  <% }) %>
</ul>
```

(Adapt to the existing admin layout/styling. Don't introduce new CSS unless trivially needed.)

- [ ] **Step 4: Smoke-test in browser**

```bash
npm run docker:dev
# open http://admin.localhost:3000/tags, verify hierarchy renders
```

- [ ] **Step 5: Verify e2e**

```bash
npx playwright test tests/e2e/admin --project=desktop-chrome
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git commit -am "admin: render tags index hierarchically (parents → children, then standalone)"
```

---

### EAS / TestFlight

#### Task 19 — Wire `EXPO_PUBLIC_API_BASE_URL` and Sentry DSN into `eas.json`

**Note from execution:** The plan assumed a single `eas.json` at the repo root needed wiring. In fact `apps/mobile/eas.json` is the live one (EAS uses the eas.json in the working directory it's invoked from, and `eas build` will be run from `apps/mobile/`). It is **already fully configured** with:
- `EXPO_PUBLIC_API_BASE_URL: "https://eastvillageeverything.nyc"` for both preview and production
- A real `EXPO_PUBLIC_SENTRY_DSN` for both preview and production
- `EXPO_PUBLIC_SENTRY_ENVIRONMENT` per profile
- iOS submit credentials (Apple ID, Apple team ID, ASC app ID)

**No changes needed for Task 19.** The root `eas.json` is a stale/empty artifact and was left alone (not deleted, since deletion wasn't explicitly authorized).

**Files:**
- MODIFY: `eas.json`

Use the URL recorded in Task 1, and the Sentry DSN decision recorded in Task 1.

- [ ] **Step 1: Update `eas.json`**

Replace the contents of `eas.json` with:

```json
{
  "cli": {
    "version": ">= 18.10.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "<PROD_OR_STAGING_URL>",
        "EXPO_PUBLIC_SENTRY_DSN": "<DSN_OR_EMPTY>"
      }
    },
    "production": {
      "autoIncrement": true,
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "<PROD_URL>",
        "EXPO_PUBLIC_SENTRY_DSN": "<DSN_OR_EMPTY>"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

Substitute the actual values recorded in Task 1.

- [ ] **Step 2: Verify Sentry sentry.ts no-ops on empty DSN**

```bash
grep -n "EXPO_PUBLIC_SENTRY_DSN\|dsn" apps/mobile/src/observability/sentry.ts
```

If the DSN is read from env and `initSentry()` short-circuits on empty string, fine. If not, edit `sentry.ts` to:

```ts
export function initSentry() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({ dsn, enableInExpoDevelopment: false });
}
```

- [ ] **Step 3: Commit**

```bash
git add eas.json apps/mobile/src/observability/sentry.ts
git commit -m "eas: wire EXPO_PUBLIC_API_BASE_URL + EXPO_PUBLIC_SENTRY_DSN into preview/production"
```

---

#### Task 20 — Build production iOS via EAS

**Files:** none (EAS-managed).

- [ ] **Step 1: Login to EAS if needed**

```bash
eas whoami
# if not logged in:
eas login
```

- [ ] **Step 2: Run the build**

```bash
cd apps/mobile && eas build --profile production --platform ios
```

- [ ] **Step 3: Wait for the build to complete**

EAS Build runs in the cloud. Output URL is printed; build runs ~15-25 minutes. **STOP** here and wait for completion before next task. Save the build URL/artifact ID.

- [ ] **Step 4: Verify the build succeeded**

The EAS dashboard shows a green checkmark. Click into the build, verify the artifact (`.ipa`) is downloadable.

**Acceptance:** A green production iOS build at the EAS dashboard.

**Commit:** none.

---

#### Task 21 — Submit build to App Store Connect

**Files:** none.

- [ ] **Step 1: Submit**

```bash
cd apps/mobile && eas submit --profile production --platform ios --latest
```

EAS will ask for App Store Connect credentials if not previously stored. Use the Apple ID associated with the developer account. The build will upload to ASC; export-compliance is already declared via `app.json:19` (`ITSAppUsesNonExemptEncryption: false`).

- [ ] **Step 2: Verify in App Store Connect**

Open `https://appstoreconnect.apple.com` → My Apps → East Village Everything → TestFlight tab. The new build appears as "Processing" within ~10 minutes, then "Ready to Test" once Apple processes it (~5-30 min).

**Acceptance:** Build is "Ready to Test" in TestFlight.

**Commit:** none.

---

#### Task 22 — **GATE**: Configure internal testers

**Files:** none.

- [ ] **Step 1: Get tester Apple IDs from user**

Ask: "Which Apple IDs (emails) should I add as internal TestFlight testers?" Save the list.

- [ ] **Step 2: Add testers in App Store Connect**

App Store Connect → Users and Access → invite each tester to the team as "App Manager" or "Developer" (internal testers must be team members). Then back in TestFlight tab → Internal Testing → add testers to the group.

(Internal testers receive an email invite. They install TestFlight, redeem the invite, and see the build.)

- [ ] **Step 3: Confirm testers received invites**

Ask the user to confirm at least one tester received and accepted.

**Acceptance:** Internal tester group populated; at least one tester confirmed.

**Commit:** none.

---

#### Task 23 — Real-device smoke test

**Files:** none.

- [ ] **Step 1: Install on personal iPhone via TestFlight**

Open TestFlight on iPhone, install the build. Open the app.

- [ ] **Step 2: Verify the golden path**

1. App launches (splash → directory).
2. Directory loads at least one place (proves it hit the prod API).
3. At least one filter chip is visible (proves `/api/tags?structured=1` returned something with parents).
4. Tapping a filter chip changes the list (proves filtering works against real tag values).
5. Tapping a place opens the detail screen.
6. Detail screen shows fields previously nulled — at least `pitch` or `cross_street` or `crowd_level` if any place has them populated.

- [ ] **Step 3: Note any regressions**

If something doesn't work, capture a screenshot and the steps. **STOP** and triage with user before declaring Phase 1 done.

**Acceptance:** All 6 golden-path checks pass on a real device.

**Commit:** none.

---

## Tag taxonomy decision

*To be filled in during Task 10.*

---

## Phase 1 completion checklist

- [ ] All tasks 1-23 marked `[x]`
- [ ] `npm run typecheck` passes clean
- [ ] `npm --prefix apps/mobile test` passes clean
- [ ] `npx playwright test --project=desktop-chrome` passes clean
- [ ] TestFlight build is `Ready to Test` and at least one external tester has confirmed install + golden-path
- [ ] This plan file's task statuses are accurate

---

## Phase 2 (deferred — not part of this plan)

For reference only. Track in a separate plan when Phase 1 ships:

- Silent URL/phone scrubbing in `src/models/place.ts:29-47` → move to route boundary with real errors.
- Sort-in-JS at admin places index → push to SQL with column whitelist.
- `TagModel.delete` and `updateHasChildren` not transactional → wrap in `withTransaction`.
- `req.body` schema validation across mutation routes → introduce zod.
- `DATABASE_URL` startup validation in `src/db.ts`.
- Graceful shutdown on SIGTERM/SIGINT.
- Request logging (morgan).
- Delete dead top-level `e2e/` directory.
- Add root `npm test` script that runs Playwright + mobile Jest.
- Replace `String.substr` in `src/routes/public.ts:38-40`.
- `Dockerfile` `--only=production` → `--omit=dev`.
- `req.session.user` refresh on login.
- Decision on `categoryMap.ts` — delete (per redesign plan) or keep as styling-only.

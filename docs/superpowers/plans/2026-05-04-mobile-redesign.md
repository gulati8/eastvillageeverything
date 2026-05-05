# Implementation Plan — EVE Mobile Directory-Style Redesign

**Run:** `run_a1b9d2e7`
**Spec (approved):** `/Users/amitgulati/Projects/eastvillageeverything/docs/superpowers/specs/2026-05-04-mobile-redesign-design.md`
**Scope:** `apps/mobile/` only. No server, admin, API, or web-public changes.
**Blocks:** App Store submission of paused run `run_e8c4a91d` (T1.10).

## Approach

Single cohesive UI rewrite executed bottom-up: test infra → data plumbing → tokens → primitives (Fallback) → list row → list screen polish → detail screen → final integration sweep. TDD per task; failing test first, then implementation, then commit.

## Architectural Decisions

1. **Drop `category` from `PlaceV2Display`.** Spec makes the fallback art hash-driven, not category-driven. `inferCategory` and `categoryMap` were the only consumers in the rendering path. Both are deleted; `PlaceV2Display` loses `category`. The `useFilterState` "type" section currently reads `place.category` — that branch is rewritten in Task 4b to fall through to `place.kind` + `place.tags` only.

2. **Hairline overlay = generated SVG `<Rect>` pattern, not a binary PNG asset.** Cyborg agents committing 4×4 binary PNGs is fragile; switching to a programmatic overlay (a `<View>` with a low-opacity tiled `<Image>` generated from a base64 data URI emitted at module scope, OR a single inline 1px `<View>` grid) keeps the repo text-only. Final choice: a single `<View>` with `backgroundColor: 'rgba(255,255,255,0.012)'` (no pattern). The diagonal hairline texture is downgraded to a flat tint for v1; documented as a known deviation. (See Risks #5.)

3. **Fallback art uses inline SVG `<Text>` for `cA` (caps sans) and `cC` (italic serif).** RN cannot reliably render very large native `<Text>` with the exact letter-spacing and centring the spec demands inside an irregular-aspect box. SVG `<Text>` from `react-native-svg` gives deterministic layout. `cB` (initials) uses plain RN `<Text>` since it's centred. **Runtime fallback:** if `react-native-svg` fails to load on Expo SDK 54 + React 19.1, all three compositions fall back to plain RN `<Text>` with `letterSpacing` approximations — explicit alternative path, not aspirational (see Task 6 acceptance).

4. **Jest preset switch + RN component test stack.** Current jest config is `ts-jest` + `testEnvironment: 'node'` — fine for pure data tests but cannot render RN components. Two component-test approaches considered:
   - (a) Adopt `jest-expo` preset + install `@testing-library/react-native` + `react-test-renderer`.
   - (b) Stay on `ts-jest`+node, add virtual mocks for new packages (`expo-linear-gradient`, `react-native-svg`) matching the existing `expo-blur` / `expo-haptics` pattern, render via `react-test-renderer` only.
   **Decision: (b).** It preserves existing tests, avoids a preset rewrite, and matches the existing pattern in `jest.setup.ts`. We add `react-test-renderer` (matching React 19.1) and virtual mocks. Component "tests" are thin: assert `toJSON()` tree shape, no behaviour beyond render-without-throw + prop branching. This is widened in Task 2.

5. **No new top-level state, no new hooks beyond a memoized `useFallbackArt(id, name)`.** Everything is pure derivation. No changes to `usePlacesList`, `usePlace`, query persistence, AsyncStorage cache, or device-ID flow — those remain identical.

6. **`Fallback` replaces `PhotoFallback` entirely.** `PhotoFallback` is currently coupled to `category` and to a distance pill; both go away. New component is `<Fallback id name photo size variant onPhotoError? />` where `variant` is `'thumb' | 'hero'`. Photo precedence (use `photo_url` if present, else fallback) is handled inside `<Fallback>`, including `onError` swap to typographic art when the photo URL 404s — no broken-image regression.

7. **Type weights load order.** Schibsted 800 ExtraBold (used by `cA` composition) is added to `useFontsLoaded` in Task 2, BEFORE any task that renders Fallback. This is moved up from the original Task 14 position because the splash screen gate requires every used family to resolve before render.

## Data Flow

```
API /api/places  →  transformPlace()  →  PlaceV2Display (slimmed)
                                          │
                            ┌─────────────┴─────────────┐
                            ▼                           ▼
                     PlaceRow (list)           PlaceDetail (screen)
                            │                           │
                            └──────► <Fallback id name photo variant /> ◄──── derives composition + palette via simpleHash(id)
```

**Untouched:** `usePlacesList`, `usePlace`, TanStack Query cache, AsyncStorage persister, anonymous device ID flow, Sentry init, splash screen gate, expo-router stack. Verified by Task 17 (regression sweep).

## File Map

**Created**
- `apps/mobile/src/components/Fallback.tsx` — new fallback art component
- `apps/mobile/src/components/Fallback.test.tsx`
- `apps/mobile/src/data/fallbackArt.ts` — hash + selection + palettes + initials derivation
- `apps/mobile/src/data/fallbackArt.test.ts`
- `apps/mobile/src/icons/BookmarkIcon.tsx` — SVG bookmark glyph
- `apps/mobile/src/icons/BookmarkIcon.test.tsx`
- `apps/mobile/src/components/ContactRow.tsx` — labelled bordered row used in detail
- `apps/mobile/src/components/ContactRow.test.tsx`
- `apps/mobile/src/components/SpecialsCard.tsx` — detail specials card
- `apps/mobile/src/components/SpecialsCard.test.tsx`
- `apps/mobile/src/theme/tokens.test.ts` — replaces removed light-token assertions

**Modified**
- `apps/mobile/package.json` (deps via `expo install` + `react-test-renderer`)
- `apps/mobile/jest.config.js` (testMatch widened)
- `apps/mobile/jest.setup.ts` (virtual mocks for `expo-linear-gradient` + `react-native-svg`)
- `apps/mobile/src/theme/useFontsLoaded.ts` (load Schibsted 800 ExtraBold)
- `apps/mobile/src/data/placeV2Display.ts` (drop `category`, drop unused fields)
- `apps/mobile/src/data/transformPlace.ts` (drop `inferCategory` call; populate `specials`, `notes`, `hours_json`)
- `apps/mobile/src/state/useFilterState.ts` (drop reads of removed fields; preserve OR semantics)
- `apps/mobile/src/theme/tokens.ts` (drop light + getSignalColors boolean param)
- `apps/mobile/src/theme/ThemeProvider.tsx` (single palette, no `useColorScheme`)
- `apps/mobile/src/components/Skeleton.tsx` (remove `lightColors` import + fallback)
- `apps/mobile/src/components/PlaceRow.tsx` (rewrite per spec)
- `apps/mobile/src/screens/PlaceList.tsx` (search-row + filter-rail alignment polish)
- `apps/mobile/src/screens/PlaceDetail.tsx` (rewrite per spec)
- `apps/mobile/README.md` (design contract note)

**Deleted**
- `apps/mobile/src/components/PlaceListItem.tsx` (unreferenced)
- `apps/mobile/src/components/PhotoFallback.tsx` (replaced by `Fallback`)
- `apps/mobile/src/components/PlaceHero.tsx` (replaced by inline hero in `PlaceDetail`)
- `apps/mobile/src/data/categoryMap.ts` + any test
- Any `useColorScheme` / `Appearance` callsites (search-and-destroy in Task 8)

## PlaceV2Display Shape (after Task 4)

```ts
export interface PlaceV2Display {
  key: string;
  name: string;
  kind: string | null;       // first line of categories field
  street: string | null;
  tags: string[];
  phone: string | null;
  url: string | null;
  lat: number | null;
  lng: number | null;
  photo: string | null;
  specials: string | null;   // sourced from PlaceResponse.specials
  notes: string | null;      // sourced from PlaceResponse.notes
  hours: HoursSummary | null;// derived from PlaceResponse.hours_json (label-only for v1; openNow may be null)
  signal: PlaceSignal | null;
}
```

Removed: `category`, `cross`, `open`, `vibe`, `photoCredit`, `pitch`, `perfect`, `insider`, `crowd`, `distance`, `closesIn`, `crowdLevel`, `priceTier`. They are dead. `transformPlace` no longer reads them.

`HoursSummary` = `{ openNow: boolean | null; label: string | null }`. For v1 we set `label = hours_json?.weekdayDescriptions?.[(new Date()).getDay()] ?? null` and `openNow = null`. No "open now" computation in this run.

---

## Task List (19 tasks)

Each task: failing test first → implementation → typecheck → commit. Each task is 2–5 minutes of focused work for a single Cyborg.

### Task 1 — Delete unreferenced `PlaceListItem.tsx`

**Parallel group:** group_A_seq

**Files**
- DELETE `apps/mobile/src/components/PlaceListItem.tsx`

**Test first**
- Verify zero callers: `grep -r "PlaceListItem" apps/mobile/src apps/mobile/app` returns no matches.

**Implementation**
- `git rm apps/mobile/src/components/PlaceListItem.tsx`

**Acceptance**
- `npm --prefix apps/mobile run typecheck` passes.
- `grep -rn "PlaceListItem" apps/mobile/src apps/mobile/app` returns nothing.

**user_impact:** None — file was dead.
**edge_cases:** None.
**rollback_strategy:** `git revert` the commit.

**Commit:** `mobile: remove unreferenced PlaceListItem component`

---

### Task 2 — Test infra: install deps, widen Jest testMatch, add virtual mocks, load Schibsted 800

**Parallel group:** group_A_seq

**Files**
- MODIFY `apps/mobile/jest.config.js`
- MODIFY `apps/mobile/jest.setup.ts`
- MODIFY `apps/mobile/package.json` (via `expo install` + `npm i -D`, do not hand-edit versions)
- MODIFY `apps/mobile/src/theme/useFontsLoaded.ts`
- CREATE `apps/mobile/src/__sanity__/tsx-test-discovery.test.tsx` (kept; small smoke test)

**Test first**
1. Confirm current jest does NOT discover `.tsx`: place `apps/mobile/src/__sanity__/tsx-test-discovery.test.tsx` with one trivial assertion. Run `npm --prefix apps/mobile test -- --listTests` and confirm absence.
2. Confirm `react-test-renderer` is not in `package.json` before install.
3. Confirm `SchibstedGrotesk_800ExtraBold` is not in `useFontsLoaded.ts` imports.

**Implementation**
1. From `apps/mobile`, run:
   ```
   npx expo install expo-linear-gradient react-native-svg
   npm i -D react-test-renderer@19.1
   ```
   Use whatever version Expo selects for SDK 54. If `react-test-renderer@19.1` does not exist, install the highest-numbered 19.x available.
2. Edit `jest.config.js`:
   - `testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}']`
   - Add `transformIgnorePatterns: ['node_modules/(?!(react-native|@react-native|expo(nent)?|@expo|expo-modules-core|react-native-svg|expo-linear-gradient)/)']` if ts-jest chokes on the new packages.
3. Edit `jest.setup.ts` — add virtual mocks AFTER existing ones:
   ```ts
   jest.mock('expo-linear-gradient', () => {
     const RN = require('react-native');
     return {
       __esModule: true,
       LinearGradient: ({ children, ...rest }: any) =>
         require('react').createElement(RN.View, rest, children),
     };
   }, { virtual: true });

   jest.mock('react-native-svg', () => {
     const RN = require('react-native');
     const stub = (name: string) => ({ children, ...rest }: any) =>
       require('react').createElement(RN.View, { testID: name, ...rest }, children);
     return {
       __esModule: true,
       default: stub('Svg'),
       Svg: stub('Svg'),
       Path: stub('SvgPath'),
       Text: stub('SvgText'),
       TSpan: stub('SvgTSpan'),
       Rect: stub('SvgRect'),
       G: stub('SvgG'),
     };
   }, { virtual: true });
   ```
4. Edit `useFontsLoaded.ts`: import `SchibstedGrotesk_800ExtraBold` and add to the `useSchibstedGroteskFonts` call.
5. Add to `tokens.ts` typography: `ui800: { fontFamily: 'SchibstedGrotesk_800ExtraBold' }`. Update `TypographyTokens` interface.

**Acceptance**
- `apps/mobile/package.json` lists `expo-linear-gradient`, `react-native-svg`, and devDependency `react-test-renderer`.
- `npm --prefix apps/mobile test -- --listTests` now lists the sanity `.tsx` file.
- `npm --prefix apps/mobile test src/__sanity__/tsx-test-discovery.test.tsx` passes.
- `grep -n "SchibstedGrotesk_800ExtraBold" apps/mobile/src/theme/useFontsLoaded.ts apps/mobile/src/theme/tokens.ts` returns matches in both files.
- `npm --prefix apps/mobile run typecheck` passes.

**user_impact:** None at runtime; enables component-test workflow + new visual primitives + the 800-weight fallback art.
**edge_cases:**
- If `expo install` resolves a `react-native-svg` version that crashes on import even with the virtual mock, escalate. Do not pin older versions.
- If `react-test-renderer@19.x` does not exist, escalate — do NOT downgrade React.
**rollback_strategy:** Revert this commit. The other commits in the run depend on this one; if Task 2 fails, the whole run pauses until resolved. Do not attempt later tasks.

**Commit:** `mobile: install gradient+svg, widen jest, mock RN deps, load Schibsted 800`

---

### Task 3 — Theme cleanup: drop light tokens, simplify provider

**Parallel group:** group_A_seq

**Files**
- MODIFY `apps/mobile/src/theme/tokens.ts`
- MODIFY `apps/mobile/src/theme/ThemeProvider.tsx`
- MODIFY `apps/mobile/src/components/Skeleton.tsx`
- CREATE `apps/mobile/src/theme/tokens.test.ts`

**Test first** (`tokens.test.ts`)
- `colors.paper === '#16110C'`
- `colors.ink === '#F5EBDA'`
- `signalColors.happy.fg === '#E07B3F'`
- `typography.ui800.fontFamily === 'SchibstedGrotesk_800ExtraBold'` (asserts Task 2 landed)
- A separate `.ts` file `tokens.types-test.ts` (NOT a jest test; just exists for `tsc`) contains:
  ```ts
  // @ts-expect-error lightColors should no longer exist
  import { lightColors } from './tokens';
  // @ts-expect-error getSignalColors should no longer exist
  import { getSignalColors } from './tokens';
  ```
  This file is only checked by `tsc --noEmit`, not jest. Document this convention in the file header.

**Implementation**
1. In `tokens.ts`: delete `lightColors`, `lightSignalColors`. Rename `darkColors` → `colors`, `darkSignalColors` → `signalColors`. Delete `getSignalColors(kind, isDark)`. Export `colors` and `signalColors` directly. Export a constant `PAPER2_FALLBACK = '#1F1812'` for defensive consumers.
2. In `ThemeProvider.tsx`: remove `useColorScheme` import + call. Context default + provider value are constant (memoized once with `[]` deps). `signalColors` callback becomes `(kind) => signalColors[kind]`. Drop `isDark` from the context value.
3. In `Skeleton.tsx`: replace `import { lightColors } from '../theme/tokens'` with `import { PAPER2_FALLBACK } from '../theme/tokens'`. Replace `theme?.colors?.paper2 ?? lightColors.paper2` with `theme?.colors?.paper2 ?? PAPER2_FALLBACK`.

**Acceptance**
- `tokens.test.ts` passes.
- `tsc --noEmit` passes (the `@ts-expect-error` directives in `tokens.types-test.ts` confirm the symbols are gone).
- `grep -rn "lightColors\|useColorScheme\|Appearance.addChangeListener" apps/mobile/src apps/mobile/app` returns no matches.
- `npm --prefix apps/mobile run typecheck` passes.

**user_impact:** App always renders dark — matches feedback rule #1.
**edge_cases:** Any consumer destructuring `isDark` from the theme context will fail at compile time. Task 8 audits.
**rollback_strategy:** Revert this commit; nothing else depends on it yet (Task 4 follows but is independent of theme).

**Commit:** `mobile: drop light theme; single dark palette only`

---

### Task 4 — Slim `PlaceV2Display` + rewrite `transformPlace`

**Parallel group:** group_A_seq

**Files**
- MODIFY `apps/mobile/src/data/placeV2Display.ts`
- MODIFY `apps/mobile/src/data/transformPlace.ts`
- DELETE `apps/mobile/src/data/categoryMap.ts`
- DELETE `apps/mobile/src/data/categoryMap.test.ts` if it exists
- CREATE `apps/mobile/src/data/transformPlace.test.ts`

**Test first** (`transformPlace.test.ts`)
- Sparse: `{ key, name, address }` populated → returns `{ key, name, kind: null, street: address, tags: [], phone: null, url: null, lat: null, lng: null, photo: null, specials: null, notes: null, hours: null, signal: null }`. (Exact shape match.)
- Name-only: `{ key, name, address: null }` → `street: null`, all other fields null/empty.
- 60-char name preserved verbatim.
- Three-line address `"100 Ave A\nApt 2\nNew York"` → `street` is the full string (no truncation in transform; UI clamps).
- `categories: "Dive bar\nLate night"` → `kind === 'Dive bar'`.
- `categories: "\n\n"` → `kind === null`.
- `specials: "Happy hour 4–7\n$5 wells"` → `specials` preserved verbatim.
- `notes: "Cash only."` → `notes === 'Cash only.'`.
- `photo_url: "https://..."` → `photo` is the URL.
- `hours_json: { weekdayDescriptions: [...] }` → `hours.label` matches the index for the current day; `hours.openNow === null`.
- `hours_json: undefined` → `hours === null`.

**Implementation**
1. `placeV2Display.ts`: collapse interface to the shape in "PlaceV2Display Shape" above. Drop `CategoryKey`, `CrowdLevel`, `PriceTier` exports. Keep `SignalKind`, `PlaceSignal`, `SortMode`. Add `HoursSummary` interface.
2. `transformPlace.ts`: remove `inferCategory` import. Read `p.specials`, `p.notes`, `p.photo_url` from `PlaceResponse` (verified to exist in `packages/shared-types/src/place.ts`). Set `signal: null`. Derive `hours` from `p.hours_json` per spec above.
3. Delete `categoryMap.ts` (and any test).

**Acceptance**
- `transformPlace.test.ts`: all 11 cases pass.
- `grep -rn "categoryMap\|inferCategory\|CategoryKey\|crowdLevel\|priceTier" apps/mobile/src apps/mobile/app` returns no matches.
- `npm --prefix apps/mobile run typecheck` will FAIL at this point because consumers (`useFilterState`, `PlaceRow`, `PlaceHero`, `PlaceDetail`) still read removed fields. **Acceptable failure mode** — Task 4b immediately fixes the filter consumer; Tasks 9 + 13 fix the rendering consumers; until those land, typecheck stays red. Document in commit body.

**user_impact:** Data layer now matches the API contract; no more aspirational nulls.
**edge_cases:**
- Verify field names against `packages/shared-types/src/place.ts` during implementation. Confirmed present: `specials`, `notes`, `photo_url`, `hours_json`. Do NOT add fields server-side.
- Day-index test must be deterministic — mock `Date` in the test with `jest.useFakeTimers().setSystemTime(new Date('2026-05-04T12:00:00-04:00'))` (Mon).
**rollback_strategy:** Reverting this commit is clean ONLY if Tasks 4b, 9, 13 are also reverted (they depend on the slimmed shape). Treat Tasks 4 → 4b → 9 → 13 as an atomic revert unit.

**Commit:** `mobile: slim PlaceV2Display to data we actually have (typecheck red until task 4b)`

---

### Task 4b — Fix `useFilterState` to compile against slimmed `PlaceV2Display`

**Parallel group:** group_A_seq (immediately follows Task 4)

**Files**
- MODIFY `apps/mobile/src/state/useFilterState.ts`
- CREATE `apps/mobile/src/state/useFilterState.test.ts` (focused on the changed branches)

**Test first**
- `matchesChip(place, 'type', 'bar')` matches when `place.kind === 'Dive bar'` (case-insensitive).
- `matchesChip(place, 'type', 'bar')` matches when `place.tags` contains `'Dive bar'`.
- `matchesChip(place, 'price', '$$')` returns `false` for any place (price section is now a no-op until enrichment lands).
- `matchesChip(place, 'vibe', 'cozy')` matches via tags only (vibe field is gone).
- `applySort(places, 'nearest')` falls back to A–Z (distance is gone — the early-exit is unconditional).
- `applySort(places, 'closing')` falls back to A–Z (closesIn is gone).

**Implementation**
1. In `matchesChip`:
   - `'type'` branch: drop the `place.category?.toLowerCase()` check. Keep the `place.kind` and `tagsContain(place.tags, ...)` checks.
   - `'price'` branch: `return false;` (no data source). Add comment: `// TODO: re-enable when price_tier enrichment lands`.
   - `'vibe'` branch: drop the `place.vibe?.toLowerCase()` check. Keep `tagsContain` only.
2. In `applySort`:
   - `'nearest'` branch: replace entire body with `sorted.sort((a, b) => a.name.localeCompare(b.name)); break;`. Add comment: `// TODO: re-enable when distance enrichment lands`.
   - `'closing'` branch: same. Add `// TODO: re-enable when closesIn enrichment lands`.
   - `'smart'` branch: keep — only reads `place.signal`, which is preserved.
3. Confirm no other reads of removed fields remain anywhere in `useFilterState.ts`.

**Acceptance**
- All `useFilterState.test.ts` cases pass.
- `grep -rn "place\.category\|place\.priceTier\|place\.crowdLevel\|place\.vibe\|place\.distance\|place\.closesIn" apps/mobile/src` returns matches ONLY in `PlaceRow.tsx`, `PlaceHero.tsx`, `PlaceDetail.tsx` (those are fixed in Tasks 9, 13).
- `npm --prefix apps/mobile run typecheck` for `useFilterState.ts` specifically (whole-project still red until Task 9/13).

**user_impact:** Filter UI continues to function. Price-section chips become no-ops (will show 0 counts) — acceptable; flagged in Task 17 manual sweep.
**edge_cases:** A user with a Price chip already toggled when this ships will see 0 results; `clearFilters` recovers. Acceptable.
**rollback_strategy:** Revert as part of the Task 4 atomic unit.

**Commit:** `mobile: rewire useFilterState to slimmed PlaceV2Display (price/distance/closing → no-op)`

---

### Task 5 — Fallback art logic (pure data, no rendering)

**Parallel group:** group_B_par (after group_A)

**Files**
- CREATE `apps/mobile/src/data/fallbackArt.ts`
- CREATE `apps/mobile/src/data/fallbackArt.test.ts`

**Test first** (`fallbackArt.test.ts`)
- `simpleHash` is deterministic for the same input; differs for distinct UUIDs.
- `pickComposition('<uuid>')` returns one of `'cA' | 'cB' | 'cC'`.
- `pickPalette('<uuid>')` returns an index in `0..5`.
- Same `id` → same `(composition, palette)` across calls.
- Distribution sanity: across 1000 random UUIDs, each composition appears at least 200×, each palette at least 100×. (Loose bounds; just smoke-checks the hash isn't pathological.)
- `deriveInitials('Jimmy\'s No. 43') === 'J'`
- `deriveInitials('Doc Holliday\'s') === 'DH'`
- `deriveInitials('Otto\'s Shrunken Head') === 'OSH'`
- `deriveInitials('The Library') === 'L'`
- `deriveInitials('B&H Dairy') === 'BH'`
- `deriveInitials('a') === 'A'`
- `deriveInitials('') === '?'`
- `deriveInitials('   ') === '?'`
- `deriveInitials('Café Mogador')` returns a non-empty string starting with `C` (Unicode handling — accept best-effort).
- Long name `'A B C D E F G'` → returns at most 3 chars.

**Implementation**
- `simpleHash(s)`: `let h = 0; for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; } return h >>> 0;`
- `PALETTES`: array of 6 palettes per the spec table.
- `pickComposition(id)`: `(['cA','cB','cC'] as const)[simpleHash(id) % 3]`.
- `pickPalette(id)`: `(simpleHash(id) >>> 8) % 6`.
- `deriveInitials(name)`:
  1. Trim. Empty → `'?'`.
  2. Strip leading article (`/^(the|a|an)\s+/i`).
  3. Split on `&` first, then on whitespace.
  4. For each token, strip non-letter chars (`token.replace(/[^A-Za-zÀ-ɏ]/g,'')`); take first char.
  5. Filter empty.
  6. Join up to 3, uppercase.
  7. Empty after all that → `'?'`.

**Acceptance**
- All test cases pass.
- File has no React/RN imports — pure TS.

**user_impact:** Determinism — same place always shows the same fallback. **Hash collisions:** with 18 (composition, palette) pairs, two adjacent rows can match. Acceptable for v1; documented at top of file.
**edge_cases:**
- Place ID changes (moderation re-create) → fallback art changes for that place. Acceptable; documented.
- Unicode names — best-effort via the extended Latin range; further scripts (CJK, Cyrillic) collapse to `'?'`. Acceptable for v1.
**rollback_strategy:** Revert; no consumer depends yet.

**Commit:** `mobile: hash-driven fallback art selection + initials derivation`

---

### Task 6 — `<Fallback>` component (renders gradient + typographic element)

**Parallel group:** group_C_seq (after group_B)

**Files**
- CREATE `apps/mobile/src/components/Fallback.tsx`
- CREATE `apps/mobile/src/components/Fallback.test.tsx`

**Test first** (`Fallback.test.tsx`)
- Renders without throwing for `{ id: 'abc', name: 'Test Bar', variant: 'thumb' }`.
- When `photo` prop is non-empty, renders an `<Image>` and not the gradient typographic element (assert via `toJSON()` traversal — find a node with `type === 'Image'` and no `LinearGradient` ancestor).
- When `photo` is null, renders LinearGradient (find testID `'fallback-gradient'`).
- `cA` (forced via `_compositionOverride`): renders an `SvgText` node containing the name (uppercased).
- `cB` (forced): renders the derived initials in a plain RN `<Text>` (no `SvgText`).
- `cC` (forced): renders `SvgText` with italic style.
- `_paletteOverride: 0` produces gradient stops matching `PALETTES[0]` (assert on the LinearGradient `colors` prop).
- `onPhotoError` callback: when `<Image onError>` fires, the component re-renders the typographic fallback (test by simulating `onError` on the rendered tree).
- Empty name: renders without crashing; initials `'?'`.

**Implementation**
- Props: `{ id: string; name: string; photo?: string | null; variant: 'thumb' | 'hero'; style?: ViewStyle; _compositionOverride?: 'cA'|'cB'|'cC'; _paletteOverride?: number }`. The `_*` props are testing only, prefixed with underscore.
- Internal state: `const [photoFailed, setPhotoFailed] = useState(false);` Photo path takes precedence only when `photo && !photoFailed`.
- If photo path: render `<Image source={{ uri: photo }} onError={() => setPhotoFailed(true)} style={...} />`.
- Else (typographic):
  - Container `<View>` with `borderRadius` (10 thumb, 14 hero), `overflow: 'hidden'`, `aspectRatio` or fixed dims controlled by parent.
  - `<LinearGradient testID="fallback-gradient" colors={[stop1, stop2, stop3]} start={[0.3, 0.3]} end={[1, 1]} />`. Document at file head: RN has no native radial gradient — diagonal LinearGradient is the established cross-platform approximation.
  - Hairline overlay: a `<View>` filling absolute with `backgroundColor: 'rgba(255,255,255,0.012)'`. (Per architectural decision #2.)
  - Composition rendering:
    - `cA`: `<Svg>` with `<SvgText>` (`fontFamily: typography.ui800.fontFamily`, anchored bottom-left, padding 10/18 by variant). For names > 12 chars, split into `<TSpan>` children at word boundaries.
    - `cB`: plain RN `<Text>` centred (`flex:1, alignItems:'center', justifyContent:'center'`), Instrument Serif Regular, size 38 (thumb) / 120 (hero).
    - `cC`: `<Svg>` with `<SvgText>` (Instrument Serif Italic, centred, 16/32 by variant).
- `useFallbackArt(id, name)` hook (defined in this file, exported for tests) memoises `{ composition, paletteIndex, initials }` via `useMemo` keyed on `[id, name]`.
- **SVG-failure fallback path:** wrap the `cA` and `cC` branches in `try { require('react-native-svg') } catch { /* render plain RN Text instead */ }` at module load. If SVG is unavailable, both compositions degrade to a plain RN `<Text>` with `letterSpacing` and `textTransform: 'uppercase'` (cA) or `fontStyle: 'italic'` (cC). Document the deviation in the file header.

**Acceptance**
- All Fallback tests pass.
- Manual visual smoke: import `<Fallback />` into a temporary screen and verify thumb + hero variants for at least 5 sample places (both photo-present and photo-absent) on iOS simulator before committing. Capture screenshots in PR description.
- `npm --prefix apps/mobile run typecheck` passes.
- File contains a top-of-file comment documenting: gradient approximation, hairline-tint deviation, SVG fallback path, hash-collision acceptability.

**user_impact:** The visual floor of the app — every place looks intentional even with no photo, and a 404 photo URL gracefully degrades.
**edge_cases:**
- LinearGradient on Android may render slightly banded — acceptable for v1.
- Initials of `'?'` (empty name) — render the `?` glyph; do not crash.
- Photo URL 404 → onError fires → typographic fallback renders.
- Reduce Motion: no animations in this component, so unaffected. Skeleton's pulse animation already respects RN's reduced-motion behaviour by default.
- Dynamic Type: SVG `<Text>` does NOT scale with iOS Dynamic Type. Plain RN `<Text>` (cB) does. Acceptable for v1; documented.
- Landscape: variant prop fixes dimensions; no rotation handling needed.
- Small screens (SE) vs Pro Max: thumb variant is fixed 72×72 regardless of screen width; hero variant fills width at 320px height. Verified during manual smoke.
**rollback_strategy:** Revert; no consumer depends yet.

**Commit:** `mobile: add Fallback component with gradient + typographic art`

---

### Task 7 — `<BookmarkIcon>` SVG component

**Parallel group:** group_B_par (after group_A; can run parallel to Task 5)

**Files**
- CREATE `apps/mobile/src/icons/BookmarkIcon.tsx`
- CREATE `apps/mobile/src/icons/BookmarkIcon.test.tsx`

**Test first**
- Renders an `<Svg>` with `viewBox="0 0 14 18"`.
- Default `filled={false}` produces stroke-only (no `fill` attribute on the path, or `fill="none"`).
- `filled={true}` produces `fill={color}`.
- Custom `size` propagates to width and height.

**Implementation**
- Path: `M2 1 H12 A1 1 0 0 1 13 2 V17 L7 13 L1 17 V2 A1 1 0 0 1 2 1 Z`.
- Props: `{ size?: number; color: string; filled?: boolean }`. Default `size = 16`.
- Stroke width 1.5; strokeLinejoin `round`.
- Same SVG-failure fallback path as Fallback: if `react-native-svg` is unavailable, return a plain RN `<View>` with a CSS bookmark approximation (the existing `bookmark`/`bookmarkNotch` pattern in current PlaceRow). Document.

**Acceptance**
- Both tests pass.
- Component imports cleanly into PlaceRow and PlaceDetail.

**user_impact:** Replaces the broken constructed-shape bookmark; renders correctly on both platforms.
**edge_cases:** None beyond SVG availability.
**rollback_strategy:** Revert; no consumer yet.

**Commit:** `mobile: add BookmarkIcon SVG component`

---

### Task 8 — Search-and-destroy `useColorScheme` / `Appearance` callsites

**Parallel group:** group_B_par (after group_A; can run parallel to Tasks 5 and 7)

**Files**
- AUDIT all of `apps/mobile/src/` and `apps/mobile/app/`. Modify any file that imports `useColorScheme` from `react-native` or `Appearance.addChangeListener`.

**Test first**
- `grep -rn "useColorScheme\|Appearance\." apps/mobile/src apps/mobile/app` — list all hits.
- For each hit, write or extend a test that asserts the file's exported component still renders correctly after removal.

**Implementation**
- For each file: remove the `useColorScheme()` call; replace any `isDark` ternary with the dark-mode branch directly.

**Acceptance**
- `grep -rn "useColorScheme\|Appearance\." apps/mobile/src apps/mobile/app` returns zero matches.
- Existing test suite still passes.

**user_impact:** Removes dead code paths, prevents regression of light mode.
**edge_cases:** Only touch app source, not `node_modules`.
**rollback_strategy:** Revert this commit.

**Commit:** `mobile: remove all useColorScheme/Appearance references`

---

### Task 9 — `<ContactRow>` component

**Parallel group:** group_B_par (after group_A; parallel to Tasks 5, 7, 8)

**Files**
- CREATE `apps/mobile/src/components/ContactRow.tsx`
- CREATE `apps/mobile/src/components/ContactRow.test.tsx`

**Test first**
- Renders label (uppercased) + value.
- Pressable calls `onPress` if provided; renders as a `<View>` (not `<Pressable>`) when `onPress` undefined.
- Long URL value gets `numberOfLines={1}` and `ellipsizeMode="tail"` when prop `truncate={true}`.
- `value === null` returns `null` (no row rendered).

**Implementation**
- Props: `{ label: string; value: string | null; onPress?: () => void; truncate?: boolean }`.
- Early return `null` if `value === null` or `value.trim() === ''`.
- Layout: `flexDirection: 'row'`, fixed-width 72px label column, value flex 1.
- Bottom border: `borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line`.
- Label: Schibsted 600, 10px, `letterSpacing: 0.8`, `textTransform: 'uppercase'`, `color: ink3`.
- Value: Schibsted 500, 14px, `color: ink`.
- Wrap in `<Pressable>` only if `onPress`; else `<View>`.

**Acceptance**
- All tests pass.

**user_impact:** Reusable bordered row primitive for the detail screen.
**edge_cases:** Self-conditional null behaviour means callers don't need to guard.
**rollback_strategy:** Revert; no consumer yet.

**Commit:** `mobile: add ContactRow component`

---

### Task 10 — `<SpecialsCard>` component

**Parallel group:** group_B_par (after group_A; parallel to Tasks 5, 7, 8, 9)

**Files**
- CREATE `apps/mobile/src/components/SpecialsCard.tsx`
- CREATE `apps/mobile/src/components/SpecialsCard.test.tsx`

**Test first**
- Returns `null` when `specials` is null or whitespace-only.
- Renders the `SPECIALS` label + body when populated.
- Body preserves line breaks: pass `"line1\nline2"`, assert rendered text contains both lines (split on newline, each a separate `<TSpan>`-ish search in `toJSON()`).

**Implementation**
- Props: `{ specials: string | null }`.
- Early return `null` for null/empty/whitespace-only.
- Card: `paper2` bg, `borderRadius: 14`, padding 18.
- Label: `SPECIALS`, Schibsted 700 / 10.5px / `letterSpacing: 1.26` / `color: accent`.
- Body: Source Serif 4, 15.5px, `lineHeight: 22`, `color: ink`. Render with `<Text>` and pass `specials` directly — RN respects `\n` natively.

**Acceptance**
- All tests pass.

**user_impact:** Encapsulates the conditional specials block.
**edge_cases:** Whitespace-only input renders nothing.
**rollback_strategy:** Revert.

**Commit:** `mobile: add SpecialsCard component`

---

### Task 11 — Rewrite `PlaceRow.tsx` (list row)

**Parallel group:** group_C_seq (after Tasks 5, 6, 7)

**Files**
- MODIFY `apps/mobile/src/components/PlaceRow.tsx`
- DELETE `apps/mobile/src/components/PhotoFallback.tsx` (after confirming no callers other than soon-to-be-deleted PlaceHero)
- CREATE `apps/mobile/src/components/PlaceRow.test.tsx`

**Test first** (`PlaceRow.test.tsx`)
- Sparse case: place with only `name` + `street` → name, meta line `street`, no specials, no signal pip, bookmark present.
- Name-only: only `name` (no street, no kind, no anything else) → name renders, meta line absent (no testID), specials absent, signal absent, bookmark present.
- With kind: `kind: 'Dive bar', street: '128 Ave A'` → meta line is `Dive bar · 128 Ave A`.
- No street: `kind: 'Dive bar', street: null` → meta line is `Dive bar` (no trailing dot).
- No kind, no street → meta line `<Text>` is NOT rendered (assert testID absence).
- `specials: "Happy hour 4–7\n$5 wells"` → renders specials excerpt with newlines collapsed to single spaces, clamped to 2 lines (`numberOfLines={2}`).
- `specials` whitespace-only → no specials line.
- 60-char `name` → renders with `numberOfLines={1}` and ellipsis (assert prop, not visual).
- 3-line address → meta line clamped to 1 line.
- Tags but no description: just renders the meta + name, no other lines.
- With `signal != null` → renders `<SignalPip>`; else not.
- Pressing the bookmark calls `onSave` and triggers `Haptics.impactAsync`.
- Tapping the row calls `onPress`.

**Implementation**
- Replace `<PhotoFallback>` with `<Fallback id={place.key} name={place.name} photo={place.photo} variant="thumb" />` at fixed 72×72.
- Remove `category` prop usage and the distance pill entirely.
- `metaLine` derivation:
  ```ts
  const metaParts = [place.kind, place.street].filter(Boolean);
  const metaLine = metaParts.length > 0 ? metaParts.join(' · ') : null;
  ```
- Name: Schibsted 600, 20px, `letterSpacing: -0.1`, `numberOfLines={1}`.
- Specials excerpt:
  ```ts
  const specialsExcerpt = (place.specials ?? '').replace(/\s+/g, ' ').trim();
  const specialsLine = specialsExcerpt.length > 0 ? specialsExcerpt : null;
  ```
- Source Serif 4, 13.5px, `numberOfLines={2}`, `color: ink2`.
- SignalPip: render only when `place.signal != null`. Drop the `pitch`/`perfect` line and `capitalizePitch` helper entirely.
- Bookmark: `<BookmarkIcon size={16} color={colors.ink3} />` inside a 44×44 `<Pressable>` for hit area.
- Row container styles: `flexDirection: 'row'`, `paddingVertical: 14`, `gap: 14`, `alignItems: 'center'`. Top row inside info column: `alignItems: 'flex-start'`, bookmark container `justifyContent: 'center'`.

**Acceptance**
- All `PlaceRow.test.tsx` cases pass.
- `grep -rn "PhotoFallback\|capitalizePitch\|place\.pitch\|place\.perfect\|place\.priceTier\|place\.crowdLevel\|place\.distance" apps/mobile/src apps/mobile/app` returns no matches (PhotoFallback file is deleted in this task).
- Visual smoke test: list of 5 places with varied data renders without dead space or alignment glitches on iOS simulator.
- Typecheck: project-wide should pass IF Task 13 has also landed; otherwise still red on PlaceHero/PlaceDetail. Run scoped: `npx tsc --noEmit src/components/PlaceRow.tsx` should be clean.

**user_impact:** Direct delivery of the list-row part of the redesign; sparse rows look intentional.
**edge_cases:**
- Very long name → truncates; bookmark stays right-pinned.
- Whitespace-only specials → don't render.
- Network failure mid-scroll: untouched (FlatList + TanStack Query handle this; PlaceRow is purely render).
**rollback_strategy:** Part of the Tasks 4 → 4b → 11 → 13 atomic unit. Reverting this commit alone leaves `PhotoFallback.tsx` deleted, which breaks `PlaceHero.tsx`. Either revert the cluster or restore `PhotoFallback.tsx` from git history first.

**Commit:** `mobile: rewrite PlaceRow per directory-style spec; delete PhotoFallback`

---

### Task 12 — Polish PlaceList chrome (search row + filter rail centring)

**Parallel group:** group_C_seq (after Task 11)

**Files**
- MODIFY `apps/mobile/src/screens/PlaceList.tsx`
- MODIFY `apps/mobile/src/components/FilterRail.tsx` (only if vertical alignment fix is needed there)

**Test first**
- Add a render test for `PlaceList` with a stubbed `usePlacesList` (5 fake places, plus zero-place case, plus error case) — `apps/mobile/src/screens/PlaceList.test.tsx`. Test cases:
  - Renders list when 5 places returned.
  - Renders `EmptyState` when 0 places returned.
  - Renders `ErrorState` when query errors.
  - Renders skeleton during initial load.
  - `getEyebrowText` ignores its `count` parameter (regression — confirms unused param wasn't accidentally wired).
- Stub `usePlacesList` via jest module mock; do not hit real network.
- No snapshot test (snapshots are brittle and would break on every styling tweak).

**Implementation**
- `PlaceList.tsx` `filterButton` style is already `alignItems: 'center', justifyContent: 'center'` — verify the inner `filterIcon` View has no extra `marginTop` and that the three lines are stacked centred. Add `paddingVertical: 0` if necessary.
- In `FilterRail.tsx`: ensure chip text uses explicit `lineHeight` equal to font size (e.g. `fontSize: 13, lineHeight: 13`), and the chip container has `alignItems: 'center'`. Count badge inside an active chip should have `lineHeight` matching its font size for baseline alignment.
- Optional cleanup: remove the unused `count` parameter from `getEyebrowText` since it's not part of any contract. Out of scope but flagged.
- Masthead text is unchanged.

**Acceptance**
- All `PlaceList.test.tsx` cases pass.
- Visual: filter button's three lines visually centred in the 40px circle; chip count badges baseline-aligned with chip labels (verified on iOS simulator with screenshots in PR).

**user_impact:** Resolves two of the spec's named alignment complaints. Empty-list and error states explicitly verified.
**edge_cases:** Fonts rendering with non-zero leading on Android — explicit `lineHeight` mitigates.
**rollback_strategy:** Revert.

**Commit:** `mobile: align search-row filter button and filter-rail chips`

---

### Task 13 — Rewrite `PlaceDetail.tsx` + delete `PlaceHero.tsx`

**Parallel group:** group_D_seq (after group_C)

**Files**
- MODIFY `apps/mobile/src/screens/PlaceDetail.tsx`
- DELETE `apps/mobile/src/components/PlaceHero.tsx` (definitively — its hero logic moves inline)
- CREATE `apps/mobile/src/screens/PlaceDetail.test.tsx`

**Test first** (`PlaceDetail.test.tsx`, with stubbed `usePlace`)
- **Sparse: name + street only** — fallback hero, back button, title, kicker (= street), one ContactRow (Address), single CTA "Get directions". No SpecialsCard, no notes, no tags rail, no Call CTA.
- **Name only** — fallback hero, back button, title, NO kicker, NO contact rows at all (or contact-rows container hidden), single CTA disabled or hidden (`Get directions` requires street).
- **Tags but no description / specials / notes** — tags rail renders; specials/notes/etc. absent.
- **Full**: name/street/phone/url/specials/notes/tags/photo + hours → all sections render in correct order.
- **Phone present** → "Call" secondary CTA shows; pressing calls `Linking.openURL("tel:...")`.
- **Defensive injection**: even if `pitch/perfect/insider/crowd` are present in a stub response (e.g. cached old-shape data), they are NOT rendered. (TS prevents reading them; test asserts rendered tree contains none of the literal strings "PERFECT WHEN", "THE MOVE", "WHO'S THERE".)
- **404 error**: stub `usePlace` returning `{ isError: true, error: new ApiError(404, ...) }` → existing "Can't find that spot" UI still renders.
- **500 error**: stub `usePlace` returning a non-404 error → existing generic error UI still renders.
- **Loading**: stub `usePlace` returning `{ isLoading: true, data: undefined }` → skeleton renders (existing logic preserved).
- **Photo URL 404**: stub a place with `photo_url`, simulate `<Image onError>` on the hero — Fallback's typographic art appears.

**Implementation** — rewrite top-to-bottom per spec section "Detail screen":

1. **Hero (320px).** `<Fallback id={place.key} name={place.name} photo={place.photo} variant="hero" />`. Wrap in `<View style={{ height: 320 }}>`. Add `<LinearGradient>` overlay `colors={['transparent', colors.paper]}` from `start={{x:0,y:0.5}}` to `end={{x:0,y:1}}`. Floating buttons in absolute-positioned top corners — both 40px circles using `<BlurView intensity={50} tint="dark">`. Left = back chevron (small SVG; reuse a stub `BackIcon` component or inline `<Path>`), right = `<BookmarkIcon>`.
2. **Hero text.** Beneath the hero. Optional `<SignalPip>` if `place.signal`. Title: Schibsted 700 / 32px / `letterSpacing: -0.32` / `color: ink`. Kicker line: Schibsted 600 / 12px / `letterSpacing: 0.96` / `textTransform: 'uppercase'` / `color: ink3`. Kicker text = `[place.kind, place.street].filter(Boolean).join(' · ')`; render only if non-empty.
3. **`<SpecialsCard specials={place.specials} />`** — self-conditional.
4. **Notes block.** `place.notes ? <Text style={{ fontFamily: bodyItalic, fontSize: 14.5, color: ink2 }}>{place.notes}</Text> : null`. No label.
5. **Contact rows.** Wrap in a `<View>` with rounded border. Use `<ContactRow>` (which is null-safe internally). Render in order:
   - `<ContactRow label="Address" value={place.street} onPress={openMaps} />`
   - `<ContactRow label="Phone" value={place.phone ? formatPhone(place.phone) : null} onPress={() => place.phone && Linking.openURL('tel:'+place.phone)} />`
   - `<ContactRow label="Hours" value={place.hours?.label ?? null} />`
   - `<ContactRow label="Web" value={place.url} onPress={() => place.url && Linking.openURL(place.url)} truncate />`
   - If ALL four return null, hide the wrapper `<View>` entirely (no orphan border).
6. **Tags rail.** Existing tag pill code — keep, but ensure background is `paper2`, text `ink2`, height 28px. Hidden when `tags.length === 0`.
7. **Sticky CTA bar.** Primary "Get directions" white-on-black, only enabled if `place.street`. Secondary "Call" only if `place.phone`. If both absent, hide the bar entirely.

Delete the four cut sections (`pitch`, `perfect`, `insider`, `crowd`). Delete the `kindStreetLabel` block. Delete emoji icon prefixes on contact rows. Delete the `<PlaceHero>` import and the file `apps/mobile/src/components/PlaceHero.tsx`.

**Acceptance**
- All `PlaceDetail.test.tsx` cases pass.
- `grep -rn "PERFECT WHEN\|THE MOVE\|WHO'S THERE\|place\.pitch\|place\.perfect\|place\.insider\|place\.crowd\|PlaceHero\|PhotoFallback" apps/mobile/src apps/mobile/app` returns no matches.
- Visual smoke on iOS simulator: detail screen for (1) sparse place name+street only, (2) name-only, (3) full place all-fields-populated, (4) place where photo URL returns 404. All four render without empty placeholders or orphan labels. Screenshots in PR.
- Typecheck passes (whole project now green).

**user_impact:** Direct delivery of the detail-screen part of the redesign; sparse-data contract met; photo-error path handled.
**edge_cases:**
- Photo URL fails → Fallback's `onError` swap shows typographic art. Verified by test.
- Place with hours but no other contact info → renders the Hours row plus an empty-CTA bar (hidden).
- Very long URL → truncates with ellipsis via `numberOfLines={1}`.
- Reduce Motion: no animations beyond the existing skeleton pulse.
- Dynamic Type: title and kicker scale with iOS Dynamic Type (plain RN `<Text>`); SVG hero text does not. Acceptable for v1; documented.
- Landscape orientation: hero collapses to 320px height regardless; content scrolls. Acceptable.
- iPhone SE width (375pt): hero, kicker, contact rows render without clipping. Verified manually.
- iPhone 16 Pro Max width (430pt): hero stretches; contact rows have generous padding. Verified.
**rollback_strategy:** Part of Tasks 4 → 4b → 11 → 13 atomic unit. Reverting Task 13 alone is safe ONLY if Tasks 11 + 4b + 4 are also reverted in reverse order, OR if PlaceHero.tsx is restored from git.

**Commit:** `mobile: rewrite PlaceDetail per directory-style spec; delete PlaceHero`

---

### Task 14 — Verify all fonts load + smoke-boot the app

**Parallel group:** group_D_seq (after Task 13)

**Files**
- READ `apps/mobile/src/theme/useFontsLoaded.ts` (Task 2 already added 800ExtraBold; this task verifies)
- READ `apps/mobile/src/theme/tokens.ts` (Task 2 already added `ui800` token; this task verifies)
- No source changes expected unless the smoke boot reveals a missing weight.

**Test first**
- `grep -n "SchibstedGrotesk_800ExtraBold\|SourceSerif4_400Regular_Italic" apps/mobile/src/theme/useFontsLoaded.ts` — both must match (proves Task 2 landed).
- Add a unit test on `tokens.ts` asserting `typography.ui800.fontFamily === 'SchibstedGrotesk_800ExtraBold'`.

**Implementation**
- If Task 2 missed any family that the new components actually reference, add it here. Otherwise this task is a verification-only checkpoint.
- Boot iOS simulator (`npx expo start` then press `i`) and watch for missing-font warnings in the console. Fix any.

**Acceptance**
- All fonts referenced by `<Fallback>`, `PlaceRow`, `PlaceDetail` load without console warnings on app boot.
- App boots on iOS simulator in <5s with no crashes.

**user_impact:** Without this, text falls back to system fonts and the redesign loses its character.
**edge_cases:** Font loader race conditions — keep the existing splash-screen gate untouched.
**rollback_strategy:** Revert (most likely a no-op revert if no changes made).

**Commit:** `mobile: verify font loading for redesign families`

---

### Task 15 — Accessibility + responsive verification pass

**Parallel group:** group_E_seq (after Task 14)

**Files**
- No source changes unless the verification reveals a defect. If a defect is found, fix in-place and document.

**Test first**
- N/A — manual + checklist.

**Implementation (manual on simulator + Settings)**
1. Reduce Motion ON (Settings > Accessibility): launch app, scroll list, open detail. Verify no animations beyond Skeleton's opacity pulse (which respects reduced-motion via OS).
2. Dynamic Type at largest setting (Accessibility > Display & Text Size > Larger Text): launch app, verify list rows do not clip; detail screen kicker and title scale; SVG hero text does not (acceptable). Document any clipping.
3. iPhone SE simulator (375×667): list and detail render without horizontal scroll; bookmark stays right-pinned; CTA bar visible.
4. iPhone 16 Pro Max simulator (430×932): same.
5. Landscape orientation on iPhone 16 Pro Max: list rotates and remains usable; detail hero collapses; content scrolls.
6. VoiceOver smoke (10 minutes): swipe through list — each row reads place name, kind, street, signal label. Bookmark button announces "Save, button". Detail screen reads title, kicker, contact rows. Document any missing labels.

**Acceptance**
- Checklist 1–6 documented in PR description with screenshots/notes.
- Any defect found is either fixed in this task's commit or filed as a follow-up issue with explicit justification for deferral.

**user_impact:** Accessibility + responsive baseline.
**edge_cases:** Fix-or-defer is the explicit decision per defect.
**rollback_strategy:** Revert any in-place fixes.

**Commit:** `mobile: a11y + responsive verification (and fixes)`

---

### Task 16 — Network resilience + cache verification

**Parallel group:** group_E_seq (after Task 14; can run parallel to Task 15)

**Files**
- No source changes expected. Verification only.

**Test first**
- N/A — manual + existing test suite.

**Implementation**
1. Verify TanStack Query persistence: with app cold-start, network ON, populate list. Kill app. Toggle airplane mode ON. Cold-start app. List should render from AsyncStorage cache within the 24h window (existing behaviour).
2. Mid-scroll network drop: with list open, toggle airplane mode ON, scroll, tap a place. Detail screen should either render from cache (if previously visited) or show ErrorState. Existing behaviour, but verify the redesign's PlaceDetail handles the error path identically to the prior version.
3. 500 from server: temporarily point `EXPO_PUBLIC_API_BASE` at a URL that 500s; verify ErrorState renders on list and detail.
4. Anonymous device ID flow: with `expo-secure-store` cleared (uninstall + reinstall app), cold-start app, verify a new device ID is minted (existing behaviour, untouched).
5. Run `npm --prefix apps/mobile test` — every test (data, components, screens) passes.

**Acceptance**
- All five verifications pass; each documented in PR.
- Full test suite green: `npm --prefix apps/mobile test` exits 0.

**user_impact:** Confirms no regressions in caching, offline, error, or device-ID paths — the gates that block App Store submission.
**edge_cases:** None.
**rollback_strategy:** Revert any in-place fixes.

**Commit:** `mobile: verify network resilience + cache + device-id intact`

---

### Task 17 — End-to-end smoke + visual regression sweep

**Parallel group:** group_F_seq (last)

**Files**
- No source changes. Run-only.

**Test first**
- `npm --prefix apps/mobile run typecheck` — must pass.
- `npm --prefix apps/mobile test` — must pass.
- `npm --prefix apps/mobile run lint` if a lint script exists.

**Implementation (manual on simulator)**
1. `cd apps/mobile && npx expo start` → boot iOS simulator.
2. List screen: scroll, verify no broken rows; tap 5 random places.
3. For each detail page: no empty placeholders; none of "PERFECT WHEN", "THE MOVE", "WHO'S THERE", emoji contact icons, sepia/cream colours.
4. Pick one place known to have only `name` + `address` → confirm sparse contract.
5. Pick one place with `photo_url` → confirm photo renders; one without → fallback art renders.
6. Pick one place with deliberately broken `photo_url` (modify a stub if needed) → typographic fallback appears via `onError` swap.
7. Confirm app boot time on simulator < 5s.
8. Confirm filter chips for `price` section show 0 counts (Task 4b no-op) — acceptable; documented as "v2: enable when enrichment lands".

**Acceptance**
- All automated tests green.
- Manual sweep checklist 1–8 documented in PR with screenshots.

**user_impact:** Final gate — protects the App Store submission of `run_e8c4a91d`.
**edge_cases:** If any Expo SDK 54 / React 19 incompatibility surfaces in `react-native-svg` or `expo-linear-gradient`, the SVG fallback path in Task 6 + Task 7 should already cover. If it doesn't, escalate.
**rollback_strategy:** Revert the entire branch.

**Commit:** `mobile: smoke + visual regression sweep`

---

### Task 18 — Update `apps/mobile/README.md` redesign note

**Parallel group:** group_F_seq (last; can run parallel to Task 17)

**Files**
- MODIFY `apps/mobile/README.md`

**Test first**
- N/A — documentation.

**Implementation**
- Add a section under "Design" describing: dark-only theme, hash-driven fallback art system, the data fields the UI consumes (`name`, `address`, `phone`, `url`, `specials`, `notes`, `tags`, `photo_url`, `hours_json`), the explicit list of ignored fields (`pitch`, `perfect`, `insider`, `crowd`, `vibe`, `crowd_level`, `price_tier`, `cross_street`, `photo_credit`), and known deviations (no radial gradient, hairline tint flat, SVG Text not Dynamic-Type-scalable).
- Reference the spec at `docs/superpowers/specs/2026-05-04-mobile-redesign-design.md`.

**Acceptance**
- README updated; no other changes.

**user_impact:** Future contributors find the design contract without re-reading the spec.
**edge_cases:** None.
**rollback_strategy:** Revert.

**Commit:** `mobile: document directory-style design contract in README`

---

### Task 19 — Final commit-stack rebase + PR opening

**Parallel group:** group_F_seq (last; after Tasks 17 + 18)

**Files**
- N/A — branch hygiene only.

**Test first**
- `git log --oneline run_a1b9d2e7..HEAD` — verify commit messages are clean and ordered.

**Implementation**
1. Rebase the branch on `master` if behind.
2. Squash any fix-up commits (`git rebase -i`).
3. Open PR with title `mobile: directory-style redesign (run_a1b9d2e7)` and body containing:
   - Spec link
   - Run ID
   - Screenshots from Tasks 6, 11, 13, 15, 17
   - Manual checklist outcomes from Tasks 14–17
   - Explicit note: "Unblocks run_e8c4a91d App Store submission. Screenshots/metadata for the App Store may need re-shooting."

**Acceptance**
- PR open, all CI checks green, reviewers tagged.

**user_impact:** Ship gate.
**edge_cases:** Merge conflicts on `package-lock.json` are routine — regenerate.
**rollback_strategy:** Close PR; revert branch.

**Commit:** N/A (rebase + PR action, no new commit).

---

## Parallelization

- **group_A_seq (sequential, Tasks 1, 2, 3, 4, 4b):** bedrock; each modifies the type system, build config, or filter logic that downstream tasks depend on. Task 4 leaves typecheck red; Task 4b restores it for the filter consumer; rendering consumers stay red until Tasks 11 and 13.
- **group_B_par (parallel after group_A; Tasks 5, 7, 8, 9, 10):** pure new components/data, disjoint files. Five Cyborgs can run concurrently.
- **group_C_seq (sequential after group_B; Tasks 6, 11, 12):** Task 6 (Fallback) needs Tasks 5+7. Task 11 (PlaceRow) needs Tasks 6+7. Task 12 needs Task 11 to be visually integrated.
- **group_D_seq (sequential after group_C; Tasks 13, 14):** Task 13 needs Tasks 6, 7, 9, 10. Task 14 verifies Task 2's font additions held through to detail.
- **group_E_seq (parallel after group_D; Tasks 15, 16):** verification passes, disjoint focus areas.
- **group_F_seq (sequential, last; Tasks 17, 18, 19):** final sweep, docs, ship.

In practice a single agent runs them in order 1→19. The grouping is documentation for orchestration if multi-agent execution is later attempted.

## Atomic-Revert Units

Some tasks cannot be reverted in isolation:

- **Type-slim cluster (4, 4b, 11, 13):** Reverting any one alone leaves typecheck red. Revert the cluster as a unit, reverse order: 13 → 11 → 4b → 4.
- **PhotoFallback deletion (Task 11):** Reverting Task 11 alone re-imports `PhotoFallback`, which is deleted in the same commit. Restore the file from `git show HEAD~N:apps/mobile/src/components/PhotoFallback.tsx > ...` first.
- **PlaceHero deletion (Task 13):** Same as above for `PlaceHero.tsx`.
- **Test infra (Task 2):** Required by every later task. Revert ONLY if rolling back the entire run.

Other tasks (1, 3, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16, 17, 18) can each be reverted in isolation safely.

## Risks Flagged

1. **`react-native-svg` + Expo SDK 54 + React 19.1 compatibility.** Fresh dependency on a fresh stack. If `expo install` resolves a version that crashes at runtime on iOS, Task 6 stalls. **Mitigation:** explicit SVG-failure fallback path in Tasks 6 + 7 (degrade `cA`/`cC`/BookmarkIcon to plain RN primitives with `letterSpacing` approximations). Document the deviation in the PR.

2. **`react-test-renderer@19.x` may not exist or may not match React 19.1 exactly.** **Mitigation:** install whatever is available; if mismatch causes runtime errors in tests, escalate. Do not downgrade React.

3. **`testMatch` widening picks up an unintended `.test.tsx` file.** **Mitigation:** Task 2 confirms current state has zero `.test.tsx` matches before widening.

4. **Server `PlaceResponse` shape verified.** `specials`, `notes`, `photo_url`, `hours_json` all present in `packages/shared-types/src/place.ts`. No server changes needed.

5. **Hairline overlay downgraded.** Spec called for a 4×4 PNG diagonal hairline texture. We chose a flat 1.2% white tint instead — Cyborg agents committing binary assets is fragile. Visual outcome: a flat warming wash instead of a textured one. Acceptable for v1; documented in README and PR.

6. **`useFilterState` price-section becomes a no-op.** Users with an active price chip when this ships see 0 results until they clear filters. Acceptable; will be restored when `price_tier` enrichment lands server-side.

7. **Hash collisions in fallback art.** 18 (composition × palette) combinations means adjacent rows can match. Acceptable for v1; documented.

8. **App Store screenshots / metadata for `run_e8c4a91d` were captured against the old UI.** Out of scope here; flag to user that screenshots need re-shooting before submission.

9. **SVG Text doesn't scale with iOS Dynamic Type.** Hero typographic art stays a fixed visual weight regardless of user's text-size preference. Acceptable; documented.

10. **Reduce Motion.** Skeleton's opacity pulse is unconditional; current behaviour. Not changed in this run; flagged for a future pass.

11. **`getEyebrowText` accepts an unused `count` parameter.** Cosmetic; Task 12 may remove it; not load-bearing.

12. **Ship-gate dependency.** This run blocks `run_e8c4a91d` (T1.10). Any escalation here delays App Store submission. Communicate any escalation to the user immediately.

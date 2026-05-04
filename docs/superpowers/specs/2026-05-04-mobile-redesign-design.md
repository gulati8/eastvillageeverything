# EVE Mobile — Directory-Style Redesign

**Date:** 2026-05-04
**Scope:** `apps/mobile/` only — server, admin, and web-public views are untouched.
**Mockup:** [`docs/mockups/2026-05-04-mobile-redesign.html`](../../mockups/2026-05-04-mobile-redesign.html)

## Problem

The current mobile UI is built around a "warm editorial" framing — Instrument
Serif Italic place names, paper/sepia palette, "PERFECT WHEN / THE MOVE /
WHO'S THERE" framed sections, and a 96×124 photo slot in every list row.
That framing reads as "Paperless Post invite from 2012" and, more importantly,
**it depends on data we do not have and will not get**:

- The editorial fields in the schema (`pitch`, `perfect`, `insider`, `crowd`,
  `vibe`, `crowd_level`, `price_tier`, `cross_street`, `photo_credit`) live in
  a separate "Editorial" card on the legacy admin form (`src/views/admin/places/form.ejs:89-166`)
  and are not being filled in. They will not be filled in.
- `photo_url` is also unreliable. Most places have no photo. Pro photography
  is not coming.
- The light/sepia colour theme looks bad and is not used.

The result today: list rows look broken when their fields are empty, the
detail page is mostly empty placeholders, and the few places with rich data
look over-art-directed.

## Goal

Rebuild the mobile UI as a **directory** that looks intentional with the
data that actually exists: name, address, phone, url, specials, notes, tags,
plus Google enrichment when present. Use the existing dark theme tokens.
Drop everything that depends on data we don't have.

## Non-goals

- Editing the database schema or the admin form. The editorial fields stay in
  the schema; they're just never read by the mobile app.
- Re-running Google Places enrichment or adding new data sources.
- Changing the Map screen (Phase 2+) or Saved/bookmarks behaviour.
- Touching the public web site (`src/views/public/`) or the admin portal.

## Reliable data

| Field             | Reliability             | Source                         |
|-------------------|-------------------------|--------------------------------|
| `name`            | Always                  | Admin form (required)          |
| `address`         | Almost always           | Admin form                     |
| `phone`           | Often                   | Admin form                     |
| `url`             | Sometimes               | Admin form                     |
| `specials`        | Often (the editorial content) | Admin form              |
| `categories`      | Sometimes (free text)   | Admin form                     |
| `notes`           | Sometimes               | Admin form                     |
| `tags`            | Often (from tag tree)   | Admin form                     |
| `hours_json`      | When enrichment ran     | Google Places (`scripts/enrich-places.ts`) |
| `lat` / `lng`     | When enrichment ran     | Google Places                  |
| `google_price_level` | When enrichment ran  | Google Places                  |
| `photo_url`       | Rare                    | Admin form (manual)            |

**Treated as if always empty (do not render):** `pitch`, `perfect`, `insider`,
`crowd`, `vibe`, `crowd_level`, `price_tier`, `cross_street`, `photo_credit`.

## Design system

**Theme: dark only.** Drop light mode entirely. Existing dark tokens stay
unchanged: `paper #16110C`, `paper2 #1F1812`, `card #231C15`, `ink #F5EBDA`,
`ink2 #C4B49C`, `ink3 #8B7E69`, `accent #F09060`, plus the dark signal
palette. No theme switching, no system-preference following.

**Type stack unchanged:** Instrument Serif (display + italic), Source Serif 4
(body), Schibsted Grotesk (UI). Usage rules change:

- **Place names render in Schibsted Grotesk** — list rows at 600/20px, detail
  hero at 700/32px. Never italic display. Never Instrument Serif.
- **Display serif (Instrument Serif) is reserved for two contexts:** the
  list-screen masthead ("142 spots.") and the initials inside fallback art.
  Nothing else.
- **Body serif (Source Serif 4)** is used for specials body, notes paragraph,
  and any future long-form copy.
- **Schibsted Grotesk** is used for everything else: titles, meta lines, UI
  chrome, contact rows, tags, CTAs.

## Screen-by-screen

### List screen (`apps/mobile/src/screens/PlaceList.tsx`)

Persistent chrome unchanged in structure: masthead, search row, filter rail,
list, tab bar. Visual changes within each block.

**Masthead.** Unchanged. Display serif title here is allowed.

**Search row.** Search input (40px pill, paper2 bg) + circular filter button.
Audit alignment — currently the filter icon's three lines are visually off-
centre vertically inside the 40px circle. Fix with `justifyContent: 'center'`
and equal vertical padding.

**Filter rail.** Unchanged behaviour. Audit chip vertical centring; the
current 32px chip can render with the count badge slightly above the label
baseline. Use `alignItems: 'center'` and explicit `lineHeight: 1` on the
inner text.

**List rows (`PlaceRow.tsx`).** Major rewrite. New structure:

```
[ thumbnail 72×72 ]   Name (Schibsted 600 / 20px)            [ bookmark ]
                      Meta line (kind · address) [13px ink3]
                      Specials excerpt [Source Serif 13.5px, clamp 2]
                      [ Signal pip if computable ]
```

Specifics:

- **Thumbnail is always present** at 72×72, `borderRadius: 10`, on the left.
  When `photo_url` exists and loads, show the image. Otherwise show fallback
  art (see below).
- **Name** in Schibsted Grotesk 600 / 20px / `letterSpacing: -0.005em`.
- **Meta line** falls back gracefully:
  - Has `categories` text → `categories · address`
  - No categories → `address` only
  - No address → omit the line entirely
- **Specials excerpt** — single line, Source Serif 4 13.5px, clamped to 2
  lines, only rendered when `specials` is non-empty. The line breaks in the
  source `specials` are collapsed to spaces for the excerpt; the full
  multi-line text shows on the detail screen.
- **Signal pip** — rendered only when a signal can be computed (open now,
  happy hour, last call, etc.) from `hours_json` + tags. Hidden otherwise.
- **Bookmark** — replace the constructed shape (rect + rotated notch)
  currently in `PlaceRow.tsx:166-183` with a proper bookmark glyph from
  `react-native-svg`. The current shape has `overflow: 'hidden'` masking
  issues that contribute to the alignment complaints.
- **Row vertical alignment** changes from `alignItems: 'stretch'` (currently
  causes the info column to expand to the photo's height, leaving dead space
  on bare rows) to `alignItems: 'center'`. Photo height becomes 72px to match
  thumbnail, fixed. Info column is content-driven.

**Tab bar.** Unchanged structurally. Audit the active-tab indicator vertical
alignment.

### Detail screen (`apps/mobile/src/screens/PlaceDetail.tsx`)

Major rewrite. New structure (top to bottom):

1. **Hero (320px).** Real photo if `photo_url` present and loads, otherwise
   fallback art using composition `cC` (full name italic serif centred) at
   hero scale. Linear-gradient fade from transparent → paper at the bottom
   so the title is legible. Floating back button + bookmark (top corners,
   blurred-glass circles).
2. **Hero text.** Optional signal pip on top, then title in Schibsted Grotesk
   700 / 32px, then meta line in caps Schibsted 600 / 12px / 0.08em letter
   spacing (`categories · address` if categories present, else just address).
3. **Specials card.** Rendered only when `specials` is non-empty.
   `paper2` background, `borderRadius: 14`, 18px padding, label `SPECIALS`
   in Schibsted 700 / 10.5px / 0.12em / `accent` colour, body in Source Serif
   4 / 15.5px / `whiteSpace: 'pre-line'` so the source line breaks render as
   line breaks. **No header is rendered when specials is empty** — the entire
   card div is conditional.
4. **Notes block.** Rendered only when `notes` is non-empty. Source Serif 4
   italic / 14.5px / `ink2`. No label. No card chrome. Just a paragraph.
5. **Contact rows.** Bordered rows with a fixed-width 72px label column
   (caps Schibsted 600 / 10px / `ink3`) and a value column (Schibsted 500 /
   14px / `ink`). Render order:
   - Address (always, since address is almost always populated; if missing,
     skip).
   - Phone (if present, tap → tel link).
   - Hours (if `hours_json` present — render computed open/closed status).
   - Web (if `url` present).

   Each row hidden when its field is empty.
6. **Tags rail.** Pill chips (28px height, `paper2` bg, `ink2` text). Hidden
   when no tags.
7. **Sticky CTA bar.** Always shows "Get directions" (primary, white-on-black
   pill). Shows "Call" secondary button when phone is present. CTAs use the
   ink/paper colours; no orange accent.

**Cut sections (no longer rendered):**

- The `pitch` paragraph (was `PlaceDetail.tsx:114-124`).
- The `perfect` framed eyebrow block ("PERFECT WHEN", `tsx:127-151`).
- The `insider` section ("THE MOVE", `tsx:154-173`).
- The `crowd` section ("WHO'S THERE", `tsx:176-195`).

These remain in the data model and the API response. The mobile app simply
ignores them.

### Sparse-data behaviour (the contract)

For any place with only `name` + `address`, the detail screen renders:
- Fallback hero art (composition `cC`).
- Back button.
- Title + kicker (kicker = "Bar · East Village" or just "East Village" if no
  category text).
- Single contact row: address.
- Single CTA: "Get directions".

No empty placeholders, no "no info available" copy, no empty section labels.
The page looks deliberate. This is the floor the design must hit.

For any place with the maximum reliable data (name, address, phone, url,
specials, notes, tags, photo, Google hours), the detail screen renders the
full layout described above. Every block in between renders only its
populated subset. There is no layout switch — the same template scales from
floor to ceiling.

## Fallback art system

**Inputs:** place id (UUID) and place name. Nothing else. Category metadata,
if available, is not used — the fallback must work without it.

**Output:** a square (or 16:9 for hero) coloured panel containing one
typographic element.

**Composition variants** (single typographic element each, no overlays):

- **`cA` — name in caps sans, anchored bottom-left.** Schibsted Grotesk 800,
  letter-spacing 0.02em, line-height 1.05, `text-transform: uppercase`,
  `color: rgba(255,255,255,0.92)`. Padding 10px (list thumb) / 18px (gallery
  / hero). Wraps to multiple lines for long names.
- **`cB` — initials in serif, centred.** Instrument Serif Regular,
  letter-spacing -0.04em, `color: rgba(255,255,255,0.95)`. Size 38px at 72px
  thumb / 84px in gallery / 120-140px at hero scale. Initials derivation:
  drop leading articles ("The", "A", "An"), take the first letter of each
  significant word, max 3 letters, all uppercase. Examples:
  - `"Jimmy's No. 43"` → `J` (numbers and apostrophe-words are skipped)
  - `"Doc Holliday's"` → `DH`
  - `"Otto's Shrunken Head"` → `OSH`
  - `"The Library"` → `L`
  - `"B&H Dairy"` → `BH`
- **`cC` — name in italic serif, centred.** Instrument Serif Italic, mixed
  case as given (do not uppercase), `color: rgba(255,255,255,0.94)`,
  letter-spacing -0.01em. Size 16px at thumb / 28px gallery / 32px hero.

**Palettes** — six dark warm gradients, each a `radial-gradient(120% 100% at
30% 30%, …)`:

| Index | Stop 1   | Stop 2   | Stop 3   |
|-------|----------|----------|----------|
| 1     | `#4a2818` | `#2a160b` | `#14080a` |
| 2     | `#2a3a26` | `#16241c` | `#0a140f` |
| 3     | `#3d2a1f` | `#251810` | `#120a06` |
| 4     | `#3a1a3a` | `#20102a` | `#0e0820` |
| 5     | `#3a1416` | `#20080c` | `#0e0408` |
| 6     | `#2a3346` | `#161e2c` | `#0a0f18` |

A 1px-pitch 45° hairline overlay (rgba 1.2% white) is applied as `::before`
to add subtle texture without depending on a raster asset.

**Selection rule:**

```
const hash = simpleHash(place.id);  // any stable integer hash of the UUID
const compositionIndex = hash % 3;       // 0 → cA, 1 → cB, 2 → cC
const paletteIndex = (hash >> 8) % 6;    // 0..5
```

The hash is computed once per place; the same place always gets the same
fallback. Two places with the same hash modulo are vanishingly rare; if it
becomes a visible problem, mix in a second hash of the name.

In React Native this is implemented as a single `<Fallback>` component that
takes `{ id, name }` and `{ size: 'thumb' | 'hero' }` and renders a `<View>`
with a `LinearGradient` background plus the typographic element. The
hairline overlay is drawn with a second absolutely-positioned `<View>` using
a small `react-native-svg` `<Pattern>` (or, simpler, an inline image-uri
data URL of a 4×4 png — TBD during implementation, lower-impact decision).

## Theme cleanup

- Remove `lightColors` and `lightSignalColors` from
  `apps/mobile/src/theme/tokens.ts`. Keep only the dark variants and rename
  `darkColors` → `colors`, `darkSignalColors` → `signalColors`.
- Simplify `useTheme()` in `apps/mobile/src/theme/useTheme.ts` to return the
  single colour palette directly. Remove any `useColorScheme()` references.
- Remove the `getSignalColors(kind, isDark)` boolean parameter — it's always
  dark.
- Remove any `Appearance.addChangeListener` or `useColorScheme` callsites in
  the app.

## Alignment audit

Specific known issues:

- `PlaceRow.tsx:50` — `alignItems: 'baseline'` on the top row mixes a 22px
  text element with a 14×16 bookmark box; baseline alignment is undefined for
  this combination. Switch to `alignItems: 'flex-start'` and pin the bookmark
  to the row's centre via `justifyContent: 'center'` on its container.
- `PlaceRow.tsx:139` — `alignItems: 'stretch'` on the row container forces
  the info column to match the photo height, creating dead space in bare
  rows. Switch to `alignItems: 'center'`.
- `PlaceRow.tsx:166-183` — the constructed bookmark shape (rectangle with a
  rotated square notch) doesn't render cleanly on Android. Replace with an
  SVG bookmark icon.
- The `FilterRail` chip/count badge baseline — verify caption "61" inside an
  active chip aligns to the same baseline as "Open now".
- The search row's filter button — the three lines should be vertically
  centred in the 40px circle; today they sit slightly above centre.

These are addressed as part of the rewrite, not as a separate workstream.

## Spec self-review

(Inline notes from a fresh read.)

- ✅ No placeholders / TBDs (the hairline overlay implementation choice is
  flagged but doesn't block the work).
- ✅ Internal consistency: design system, screens, fallback all reference the
  same token set and the same data-reliability table.
- ✅ Scope: focused on `apps/mobile/`. Single implementation cycle.
- ✅ Sparse-data contract is explicit and falsifiable ("name + address
  renders cleanly with no empty labels").
- ✅ Each cut is named: which fields are not rendered, which sections of
  `PlaceDetail.tsx` get deleted, which theme exports get removed.

## Open implementation questions (to resolve in the plan, not the spec)

- Initials derivation edge cases (numbers, all-caps acronyms, hyphenated
  words). Pick a deterministic rule in the plan; doesn't affect the design.
- Hairline overlay implementation in RN (svg pattern vs data-uri png). Both
  are visually equivalent; pick the simpler one.
- Whether `PlaceListItem.tsx` (a second list row component that exists
  alongside `PlaceRow.tsx`) should be deleted or unified — depends on what
  references it; check during planning.

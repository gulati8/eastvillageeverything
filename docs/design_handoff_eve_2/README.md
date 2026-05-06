# East Village Everything — Build Prompt for Claude Code

You are building **East Village Everything (EVE)** — a lifestyle-directory app for the East Village neighborhood in Manhattan. There is an existing app (web + admin) that needs a complete UX/visual overhaul. This document is the spec.

**Read this entire file before writing code.** Then look at the eight HTML reference files in this folder. They render in any browser — open `00-index.html` for an index. The HTML files are the design source of truth; this document is the *behavioral* source of truth.

---

## TL;DR — what to build

1. A **mobile feed** (React Native or Expo) where neighborhood locals open the app and immediately see "what should I do tonight" — a list of bars/restaurants/cafes with friend-voice editorial, live signals, and tag-driven filters.
2. A **web admin** (Next.js or similar) where the editor (one person, eventually a small team) writes editorial content, manages tags, and assigns primary tags to places.

The current build is generic-CMS feeling. The new version is **a magazine that happens to be a database** — warm, opinionated, written, hand-set.

---

## The single most important architectural rule

> **The data model is the design system. No client-side groupings, no hardcoded categories, no taxonomies that aren't editable from the admin.**

Specifically:
- There is **no** hardcoded `categories` enum, no hardcoded list of filter sections, no hardcoded color or photo per category in the client code.
- Every category, filter, and pip on the mobile UI is **derived from the tag table** at runtime.
- If the admin retires a tag, it disappears from the app the same day. If the admin adds a tag, it appears the same day. No code deploy required.

This rule has been violated in past iterations. Don't violate it again.

---

## Data model

### `tags` table

Single flat table with self-referential parent/child:

```ts
type Tag = {
  id: string;              // 't-dive'
  value: string;           // 'dive' — slug used in URLs/filters
  label: string;           // 'Dive bar' — display name
  parent: string | null;   // FK to another tag.id, null for top-level
  sortOrder: number;
  isPrimary: boolean;      // can this tag be a place's headline tag?
  fallbackImage: string | null;  // CDN URL — shown when a place with this primary tag has no photo
  tint: string | null;     // hex color, used for fallback bg + accent moments
  accent: string | null;   // hex color, for typographic-fallback hero accent
}
```

**Top-level tags act as filter-sheet sections.** In the seed data: `When`, `Vibe`, `Type`, `Outside East Village`. Their children are the chips inside each section.

**`isPrimary`** is the leverage point. A tag can be both a section-organizer AND primary-eligible. In practice, `Type` children (Dive bar, Pub, Cocktail bar, Coffee, Diner, Live music, Pizza) are the primary-eligible tags today. But the admin decides — don't bake `Type` into anything.

See `eve-data.jsx` for the full seed table (~40 tags).

### `places` table

```ts
type Place = {
  id: number;
  // Identity (required)
  name: string;
  address: string;
  cross: string | null;       // 'btwn Aves A & B'
  phone: string | null;
  website: string | null;

  // Taxonomy
  primaryTagId: string | null;   // FK to a tag where isPrimary=true. Drives row meta + fallback image.
  tagIds: string[];               // FKs to other tags. Drive filters and pips.

  // Editorial (ALL OPTIONAL — graceful fallback when missing)
  pitch: string | null;           // ~2 sentences. Friend voice. The reason to go.
  perfectWhen: string | null;     // finishes "Perfect when..." — keep specific
  insiderTip: string | null;      // one sentence — the thing you'd text a friend
  vibe: string | null;            // 3 words separated by " · ". e.g. "Loud · Cash only · No frills"
  crowd: string | null;           // who's there. e.g. "Locals, NYU grads who never left"
  specials: string | null;        // free text
  photoUrl: string | null;        // CDN URL of submitted real photo
  photoCredit: string | null;     // e.g. "Submitted by @username"

  // Live state (computed or admin-edited)
  hours: string | null;           // friendly display string. e.g. "Open till 4am"
  open: boolean;
}
```

**Critical:** every editorial field is optional. **>95% of the database starts empty** and gets filled in over time. The mobile UI must look intentional even when a row has only `name + primaryTagId + address`. See screen 05 for what that looks like.

---

## Visual system (use the same tokens for mobile + admin)

### Colors

```
Light:                              Dark:
  paper      #FBF6EE                paper      #1F1A14
  paper2     #F2EADC                paper2     #2A2520
  ink        #1F1A14                ink        #FBF6EE
  ink2       #54483A                ink2       #C9BEAB
  ink3       #8C7E6C                ink3       #8C7E6C
  hairline   rgba(31,26,20,0.08)    hairline   rgba(251,246,238,0.08)
  accent     #E07B3F                accent     #F09060
```

The accent is used **sparingly** — for the friend-voice hero opener, for primary-tag pip dots, for active filter chips on detail. Never for body text, never for borders.

### Type

- **Display** (place names, hero, section titles): `Instrument Serif`, italic, weight 400. Slightly oversized — 26-44px.
- **Body / editorial copy**: `Source Serif 4`, weight 400. 14-16px, line-height 1.5.
- **UI / labels / chips / pips**: `Schibsted Grotesk`, weight 600/700. 11-13px, often `letter-spacing: 0.04-0.12em`, often uppercase.

The italic-display + grotesk-UI combo is the brand. Don't substitute.

### Spacing & radii

- 4px scale: 4 / 8 / 12 / 16 / 22 / 28 / 36 / 48
- Radii: 6 (small chips), 10 (inputs), 14 (cards), 22 (sheets)
- Row gutter on mobile: 22px outer padding

### Voice rules (mobile copy + editorial)

1. Talk like a friend who lives here, not a marketer. *"Trust me, the cortado."* not *"Award-winning espresso experience."*
2. Specific > general. "$4 PBR on Tuesdays" beats "great drink specials."
3. Lowercase the second-person openers. "you want to talk for hours" not "You want to..."
4. Em-dashes are encouraged. So is sentence fragments. So is dropping articles.
5. Time in human terms: "till 4am" not "04:00", "20 min walk" not "0.9 mi".
6. The hero opener rotates. See `EVE_OPENERS` in `eve-data.jsx`.

---

## Mobile screens

### List feed (screens 01, 02)

**Header (sticky, hides on scroll):**
- Wordmark: *East Village* Everything (italic + roman)
- Single rotating opener line below: "Tonight, you want something" / "It's Tuesday. Make it count."
- Filter chip row: horizontally-scrolling chips. The first 4-5 are quick filters (Tonight, Happy Hours, Late, $$); the trailing chip is a dark "All filters" button that opens the sheet.

**Feed:**
- Vertical scroll, one place per row.
- Row anatomy (see section below).
- ~6-8 rows visible above the fold on a 6.1" phone.

**Sort:**
- Default: a curated mix the editor controls (boost recent editorial, demote no-editorial, ties broken by distance).
- User can change to "Closing soon" / "Distance" via a small sort indicator in the chip row.

### Row anatomy

Each row is a horizontal flex with these regions:

| Region | What | Fallback when missing |
|---|---|---|
| **Photo** (96×124px) | `place.photoUrl` cropped center | `primaryTag.fallbackImage` if set; else `primaryTag.tint` solid color |
| **Distance pill** (top-left of photo) | `"4 min"` | walk-time minutes from user location, never miles |
| **Name** (italic display 22-24px) | `place.name` | required |
| **Meta line** (UI 11px, ink3) | `primaryTag.label · price · crowd` | drops segments that are null. Never blank. |
| **Signal pip** | computed from active tags + time of day (see below) | row omits the pip silently if nothing applies |
| **Italic line** (body 13px italic, ink2) | `place.perfectWhen` rendered as "you want to..." | **falls back to the first 2-3 tag labels strung together** — never blank |
| **Save icon** (top-right) | bookmark toggle | always present |

The whole row is tappable → detail screen. The save icon is its own hit target.

### The signal pip

This is the leverage point. The pip is computed at render time from the tags + current time. Logic:

1. If the place has `t-hh` (Happy Hours) AND it's currently 4-7pm → render amber pip, copy: "Happy hour till 7"
2. If the place's `hours` indicates closing in <60 min → render red pip with pulse animation, copy: "Closes in 28 min"
3. If the place has `t-livem` (Live Music) AND today is one of its scheduled music nights → violet pip, copy: "Trad session at 11"
4. If none → no pip rendered (don't show a fake "Open now" — that's noise)

Color codes (sync with admin tag tints when possible, otherwise these defaults):
- amber `#E07B3F` — happy hour / time-bound deal
- red `#C44` — urgency (closing soon, last orders)
- violet `#7B5BA8` — event (music, trivia, DJ)
- green `#3FB871` — friendly status (walk-ins now)

### Filter sheet (screen 03)

- Bottom sheet, ~75% viewport height.
- **Sections derived from tag tree:** iterate `EVE_TAG_PARENTS`, render each as a section header. For each parent, render its children as toggleable chips.
- "Apply N filters" button at bottom. Live count.
- Multi-select within a section = OR. Across sections = AND. ("dive OR pub" AND "happy hour" AND "till 8pm")
- Active count badge on the trigger chip in the main feed.

### Place detail (screens 04, 05)

**Top region (varies by photo state):**
- **Has photo:** full-bleed hero image, ~280px tall, gradient overlay at bottom. Place name italic-displayed at the bottom of the hero in cream over the gradient.
- **No photo, primary tag has fallbackImage:** same layout but with the fallback image. A small "※ category fallback" badge sits in the corner so it doesn't pretend to be the actual place.
- **No photo, primary tag has tint only:** typographic hero — solid `tint` background, place name set HUGE (60-80px) in italic, primary-tag label as eyebrow. See screen 05.

**Below the hero:**
- **Hours/distance row** — "Open till 4am · 4 min walk · 507 E 5th St"
- **Pitch** (if present) — body serif, larger than feed-row.
- **"Perfect when..." card** (if present) — accent-tinted card, italic, friend voice.
- **"Insider tip" card** (if present) — accent-tinted card.
- **Vibe + Crowd** strip (only segments that exist).
- **Tag pip cluster** — every `place.tagIds` tag rendered as a small chip. Tappable → opens the feed pre-filtered to that tag.
- **Action row** — Call, Website, Directions (only buttons whose data exists).

**Graceful empty state (screen 05):** when most fields are null:
- Hero is the typographic fallback OR primary-tag fallback.
- Body shows: hours + distance + tag chips + actions.
- A muted line below: "We haven't written this one up yet. *Want to?*" → opens a "submit a tip" form. Don't pad with auto-generated content.

---

## Admin web screens

### Admin nav (every page)

- Wordmark "EVE Admin" top-left, italic display.
- Two top-level pages: **Places** | **Tags**. (No more.)
- User name + Logout top-right.

### Places list (screen 06)

**Triage view, not alphabetical.** Default sort: "Least complete first" — places with the most missing editorial fields surface to the top, so the editor knows what to write next.

**Header chips** (count badges):
- All (352)
- Missing pitch (348) — warning tone
- No photo (350) — warning tone
- No primary tag (2) — alert tone (this is broken state, must fix)
- Ready to publish (4) — success tone

**Table columns:**
1. Photo thumbnail (44px, falls back to primary-tag tint or image)
2. Name (italic display) + address (UI gray)
3. Primary tag — pill chip if set; **"None — set one"** in red if missing
4. **Editorial completeness** — `2/6` ratio + 6 little pips colored green/gray for each editorial field (`pitch`, `perfectWhen`, `insiderTip`, `vibe`, `crowd`, `photoUrl`)
5. Updated date
6. Edit / overflow actions

The completeness pip row is the most important UI on this screen. It's how the editor decides what to write today.

### Edit a place (screen 07)

**Two-column layout, 1fr | 440px:**
- Left: form
- Right: **live mobile preview** — sticky, shows exactly how this place's row + detail will look in the app. Updates as the editor types.

**Form sections (top to bottom):**
1. **Identity** — name, address, cross, phone, website
2. **Taxonomy** — primary tag dropdown (filtered to `isPrimary` tags, links to `/admin/tags`), status dropdown, then a `<TagTreePicker>` showing all non-primary tags grouped by their parent. Sections in this picker are derived from `EVE_TAG_PARENTS`, not hardcoded.
3. **Editorial** (accent-tinted, this is the friend-voice section) — pitch, perfectWhen, insiderTip, vibe, crowd. Each field has:
   - A friend-voice placeholder
   - A `hint` line in italic UI gray below
   - A **"What good looks like" example block** in accent-tint — quoted real example. This is the editor's brand-voice training.
4. **Photo** — drop-zone on the left, "Until you upload, this shows" preview on the right (renders the primary tag's `fallbackImage` or `tint`).

**Footer:** Save changes / Cancel / [right-aligned] Delete place (red).

### Tags (screen 08)

**Grouped tree:** parent tags as sections, children indented underneath. Drag handles on every row.

**Each row has columns:**
1. Drag handle
2. Label + monospace `value` chip + a small dot if `isPrimary` (orange #E07B3F)
3. **Primary toggle** — switch + "Primary" label
4. **Fallback image** — only renders for `isPrimary` rows. Shows: 56×36 thumbnail, "Fallback set" (green) or "Upload fallback →" (red).
5. Edit / overflow

Top of page has a legend explaining the orange dot = primary-eligible, plus a "+ New tag" button.

**Editing a tag** opens an inline editor (or modal) with: label, value (slug, auto-generated, editable), parent selector, sortOrder, isPrimary toggle, and if primary: fallback image upload + tint color picker + accent color picker.

---

## Build order (recommended 2-3 day plan)

**Day 1 — foundation**
1. Set up the project: Expo (mobile) + Next.js (admin) in a monorepo, OR separate repos if simpler.
2. Build the data layer: `Tag` and `Place` models, seed with `eve-data.jsx` content.
3. Build the **token + font setup** in both apps. Get Instrument Serif + Source Serif 4 + Schibsted Grotesk loading from Google Fonts (or self-host for RN).
4. Build the **mobile row component** — this is the unit. Get it working with the seed data including all edge cases (no photo, no editorial, missing tags). Match screen 01 pixel-by-pixel against `eve-list.jsx`.

**Day 2 — mobile**
5. List screen (header + chip row + scrollable feed). Match screens 01, 02.
6. Filter sheet, derived from tag tree. Match screen 03.
7. Detail screen, both states (full editorial + empty editorial). Match screens 04, 05.
8. Signal pip logic — implement the 4 rules above.

**Day 3 — admin**
9. Admin shell + nav. Match screens 06-08.
10. Places list with triage filters + completeness pips. Match screen 06.
11. Edit-place form with live preview pane. Match screen 07.
12. Tags tree with drag-reorder + primary toggle + fallback upload. Match screen 08.

---

## What to lift directly from the JSX files

The reference files are React components rendered with Babel-standalone. **They are NOT the production code** — they're a pixel-accurate spec. You can:
- **Lift the visual values** — colors, font sizes, paddings, radii, gradient stops, shadow values
- **Lift the JSX structure** as a starting point for your real components
- **Lift the text strings** for placeholders, hints, examples, hero copy

You should NOT:
- Use Babel-standalone in production
- Copy the inline-style approach into RN — translate to StyleSheet (mobile) or your CSS-in-JS choice (admin)
- Treat `EVE_PLACES` or `EVE_TAGS` as production data — they're seed examples for the design

Source files reference:
- `eve-tokens.jsx` — colors + font stacks
- `eve-data.jsx` — tag table + place seed + helper functions
- `eve-list.jsx` — list screen, row component, filter sheet, signal pip, states
- `eve-detail.jsx` — detail screen including all hero modes + empty state
- `eve-admin-web.jsx` — all three admin screens
- `eve-phone.jsx` / `ios-frame.jsx` / `browser-window.jsx` — chrome only, ignore for production

---

## Open questions to resolve with the design partner before shipping

1. **Auth & user identity on mobile.** Does the user have an account? Save state synced or local?
2. **Photo submission flow.** Currently the design assumes admin-uploaded photos. Should regular users be able to submit photos for review?
3. **"Submit a tip" flow** referenced in the empty-detail state — what does it actually do?
4. **Map view** — not designed yet. Some users will want it. Defer to v2 or scope here?
5. **Search** — currently no global search bar in the mobile design. Confirm this is intentional (filter sheet is the primary discovery surface).
6. **Editorial publishing model** — every change live immediately, or draft → review → publish?

---

## What success looks like

A user opens the app on a Tuesday at 7:15pm. They see a hero that says "It's Tuesday. Make it count." They see Sophie's at the top of their feed with an amber pip pulsing "Happy hour till 8". They tap the row. They see the italic-display name, the photo, and one line: *"The jukebox is the whole personality."* They smile. They close the app and walk to Sophie's.

That's the entire product.

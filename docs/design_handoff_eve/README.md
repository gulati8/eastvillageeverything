# Handoff: East Village Everything (EVE) — iOS app

## Overview

EVE is a neighborhood directory iOS app for the East Village in Manhattan. It lists local bars, restaurants, and venues with practical info — address, phone, hours, what's good — happy hour deals, live music, trivia nights, brunch, etc. Anonymous browse only: no accounts, no reviews, no reservations, no delivery, no maps in v1. The bet is that **most decisions happen in the list view, not the detail view** — so the list is dense, opinionated, and decision-quality.

The audience is 25-40, downtown NYC sensibility. The visual identity is a warm, photo-led editorial style — think Apartamento or Eater, with friend-voice copy. Not Yelp. Not OpenTable. Not corporate.

## About the Design Files

The files in this bundle are **design references created in HTML** — interactive prototypes built with React + Babel showing intended look, behavior, and component structure. They are **not production code to copy directly**.

Your task is to **recreate these designs in React Native (iOS-first)**, using Expo, Expo Google Fonts, and the project's existing patterns (or establish them if starting fresh). You may use any well-supported RN libraries you like for layout, animations, and bottom sheets (e.g. `@gorhom/bottom-sheet`, `react-native-reanimated`).

## Fidelity

**High-fidelity.** Final colors, typography, spacing, and component anatomy are all settled. Recreate pixel-faithfully where possible; minor mobile-platform deviations are fine where iOS conventions demand them (e.g. native pull-to-refresh, native keyboard, safe-area insets).

## Tech & Platform

- **React Native** (Expo) — iOS-first, Android later
- **Phones only** — no tablet, no web
- **Light + dark mode** — both first-class, follow OS by default with manual override later
- **Accessibility** — WCAG AA contrast (verified), supports Dynamic Type
- **No paid font licenses** — Google Fonts only via `@expo-google-fonts/*`
- **No required user-uploaded imagery** — design works with photos OR fallbacks

---

## Design Tokens

### Colors — Light

| Token | Hex | Use |
|---|---|---|
| `paper` | `#FBF6EE` | Primary background (warm cream) |
| `paper2` | `#F2EADC` | Recessed surfaces, skeletons |
| `card` | `#FFFFFF` | Elevated cards, search bar |
| `ink` | `#1F1A14` | Primary text (espresso) |
| `ink2` | `#54483A` | Secondary text |
| `ink3` | `#8C7E6C` | Tertiary / meta text |
| `line` | `rgba(31,26,20,0.12)` | Hairlines, dividers |
| `accent` | `#E07B3F` | Sunset peach — accent / save state |
| `accentDeep` | `#B85420` | Pressed accent, signal-pip-on-amber text |
| `chip` | `#FFFFFF` | Inactive filter chip |
| `chipActive` | `#1F1A14` | Active filter chip (ink invert) |

### Colors — Dark

| Token | Hex |
|---|---|
| `paper` | `#16110C` |
| `paper2` | `#1F1812` |
| `card` | `#231C15` |
| `ink` | `#F5EBDA` |
| `ink2` | `#C4B49C` |
| `ink3` | `#8B7E69` |
| `line` | `rgba(245,235,218,0.14)` |
| `accent` | `#F09060` |
| `accentDeep` | `#E07B3F` |
| `chip` | `#231C15` |
| `chipActive` | `#F5EBDA` |

### Signal Pip Colors (used by `<SignalPip>`)

These render as `bg + fg` in light mode and as `dot@13%opacity` background + `dot` text in dark mode.

| Kind | bg (light) | fg (light) | dot |
|---|---|---|---|
| `happy` (happy hour) | `#FFF1E5` | `#B85420` | `#E07B3F` |
| `closing` (closing soon) | `#FFE8E0` | `#A8341A` | `#D04A28` |
| `music` (event/live music) | `#EFEAF7` | `#5B3A8A` | `#7A5BB8` |
| `walkin` (walk-ins) | `#E8F1EC` | `#2D6A47` | `#3FB871` |
| `always` (24h, neutral) | `#F2EADC` | `#54483A` | `#8C7E6C` |

### Typography

Three families, all free via Google Fonts / Expo Google Fonts:

- **Display:** `Instrument Serif` — used in italic for place names, mastheads, large numerals. Single weight (Regular 400). Set in italic for warmth.
- **Body:** `Source Serif 4` — opsz 8–60, weights 300–700. Used for "perfect when…" lines, body copy, descriptions. Often italic for warmth.
- **UI:** `Schibsted Grotesk` — weights 400–900. Used for meta lines, eyebrow labels, distance pills, button labels. Tight letter-spacing on uppercase eyebrows (`0.06em`–`0.12em`).

Expo packages:
- `@expo-google-fonts/instrument-serif`
- `@expo-google-fonts/source-serif-4`
- `@expo-google-fonts/schibsted-grotesk`

### Spacing & Radius

- **Spacing scale:** 4 / 8 / 12 / 14 / 16 / 22 / 28 / 40px. Horizontal screen padding is **22px**.
- **Radius scale:** `sm: 8`, `md: 14`, `lg: 22`, `xl: 30`, `pill: 999`. Place-row photo uses `14`. Chips and pills use `999`.
- **Hairlines:** `1px` solid in `line` token. Prefer hairlines over shadows everywhere; the design avoids drop shadows except on the filter sheet (`0 -16px 40px rgba(0,0,0,0.18)`).

### Animation

Two named keyframes:

- `eve-spin` — 0.9s linear infinite — spinner border rotation
- `eve-pulse` — 1.4s–1.6s ease-in-out infinite — opacity 0.55 → 0.95 → 0.55. Used on signal pip dot (when `urgent: true`) and on skeleton placeholders.

---

## Screens

### 1. List Screen (`Tonight feed`) — primary

This is where 90% of decisions happen. Every row should answer "should I go?" without a tap.

**Layout (top to bottom):**
1. **Status bar** (54px reserved, native).
2. **Compact masthead** — `22px` horizontal padding, `12px` top.
   - Eyebrow: UI face, 11px, weight 600, color `ink3`, uppercase, letter-spacing `0.06em`. Format: `Tue · 6:38pm · East Village`.
   - Title: Display face, 32px, line-height 1.0, letter-spacing `-0.02em`. Format: `<italic>47 spots</italic> open near you.` (`47 spots` is italic, the rest roman.)
3. **Search + filter bar** — flex row, gap 8px, top padding 14px.
   - Search input: flex 1, height 40, radius pill, bg `card`, `1px line` border, padding `0 14px`. Magnifier glyph + placeholder `"Search a name or a feeling"` (UI face 13px, color `ink3`).
   - Filter button: 40×40 pill, same surface. Three-line glyph (3-2-1 width). When active filter count > 1, shows badge: top-right, min-width 16px, height 16px, radius pill, bg `accent`, white UI 10/700.
4. **Filter rail** — top padding 14px, bottom 12px.
   - Horizontal scroll of chips, gap 8px, padding `0 22px`. Whitespace nowrap. Each chip: 8/14 padding, radius pill, UI 13/600. Active = bg `chipActive` + color `paper`. Inactive = bg `chip` + `1px line` border + color `ink`. Active chip shows `×` glyph at right, opacity 0.6.
   - Below chips, a meta row at `22px` padding: left side `<bold>6 of 47</bold> match · within 10 min walk` (UI 11/600, color `ink3`, bold count in `ink`). Right side: sort label uppercase 11/700 in `ink2` with chevron (e.g. `SMART ▾`, `NEAREST ▾`, `CLOSING SOON ▾`, `A–Z ▾`).
5. **List rows** — see Row Anatomy below. Padding `0 22px` horizontal, `100px` bottom (clears tab bar).
6. **Tab bar** — fixed bottom, 76px tall (8/22/24 padding), bg `paper @ 92%` with `12px backdrop-blur`, top border `1px line`. Four tabs: **Tonight · Saved · Map · You**. Each: 6×6 dot indicator (active = `accent`, else transparent) above UI 11/600 label (active = `ink`, else `ink3`). Map and You are placeholders for v2.

#### Row Anatomy (`<PlaceRow>`)

The single most important component. Vertical padding 16, hairline border-bottom (skip on last). Flex row, gap 14, align stretch.

**Left — photo or fallback (96 × 124, radius 14, overflow hidden):**

- **If `place.photo` exists**: `background: url() center/cover`.
- **Category fallback** (no photo): solid `category.tint` bg + repeating-linear-gradient at 135° in `category.accent + 11` opacity for hairline texture, plus the place's first word in 16px Instrument Serif italic at bottom-left, white with 0/1/2 black text-shadow.
- **Distance pill** (always present): absolute top:6, left:6. 3/7 padding, radius pill, bg `rgba(255,255,255,0.92)` with backdrop-blur 8px, UI 10/700 in `#1F1A14`. Format: `4 min walk` — never miles.

**Right — info column (flex 1, min-width 0):**

1. **Top row** (flex justify-between, baseline aligned, gap 8):
   - Place name: Display 22px italic, line-height 1.0, letter-spacing `-0.01em`, color `ink`. Truncate with ellipsis on overflow.
   - Save bookmark icon: 14×16 outlined `<svg>` path, stroke `ink3` weight 1.4. Active state: filled with `accent`.
2. **Meta line** (margin-top 4): UI 11/600, color `ink3`. Format: `{categoryLabel} · {priceTier} · {crowdLevel}`. Examples: `Dive bar · $ · Light`, `Ukrainian diner · $$ · Steady`, `Cocktail bar · $$$ · Booked till 11`.
3. **Signal pip** (`<SignalPip>`, margin-top 8): inline-flex self-start, gap 6, padding 4/9, radius pill. Bg per `signal.kind` table above. Inside: 6×6 dot in `dot` color (animates `eve-pulse` when `signal.urgent`), then UI 11/700 label.
4. **Pitch line** (margin-top 8): Body 13px italic, line-height 1.4, color `ink2`. **2-line clamp** via `display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden`. Content is `place.perfect` capitalized + period. Examples: `"You want to talk for hours and not look at a menu."`, `"You ended up here at 3am and you're not mad about it."`.

**Crowd-level is fuzzy on purpose.** Never show numbers. Use: `Quiet`, `Light`, `Steady`, `Filling up`, `Booked till 11`. Locals don't think in headcounts.

**Distance is walk-time, not miles.** Locals think in minutes.

#### Filter Sheet (`<FilterSheet>`)

Triggered by the 40×40 filter button. Bottom sheet, 76% screen height. Bg `paper`, top corners radius 24, shadow `0 -16px 40px rgba(0,0,0,0.18)`.

- **Grabber**: 36×4 pill, color `ink3 @ 50%`, top padding 10.
- **Header row** (flex space-between, padding `4px 22px 16px`): left `Clear all` (UI 13/600, `ink2`); center `What are you in the mood for?` (Display 22 italic); right `Done` (UI 13/700, `accentDeep`).
- **Sections** — each `marginBottom: 18`, padding `0 22px`:
  - Eyebrow (UI 11/700, `ink3`, uppercase, letter-spacing `0.12em`, marginBottom 10).
  - Wrapped chips (flex wrap, gap 6). Each chip: 8/12 padding, radius pill, UI 13/600. Active = `chipActive` bg + `paper` text. Inactive = `card` bg + `1px line` border + `ink` text. Each chip ends with a count in UI 10/600 (`ink3` inactive, `paper@70%` active).
- **Five sections**, in order: `What's the move`, `Type`, `When`, `Price`, `Vibe`. See `eve-list.jsx` for full chip list.
- **Footer** (padding `14/18/28`, top border hairline, bg `paper`): full-width 14px-padded button, radius pill, bg `ink`, color `paper`, UI 14/700. Label updates: `Show 23 spots`.

### 2. Detail Screen — secondary

Story-style. Not in scope for this iteration's deep doc — see `eve-detail.jsx` for the implementation. Hero photo or category/typographic fallback at top, then italic display name, italic pitch paragraph, hours block, address/phone/website rows, "Insider" callout, tag rail, "perfect when…" footer.

### 3. States

- **Loading skeleton** (`<EveListSkeleton>`): same shell as list — masthead, search, chip rail — but content blocks are `paper2` rectangles animating `eve-pulse`. Four placeholder rows (124px photo, then 5 stacked text bars).
- **Pull-to-refresh** (`<PullRefresh>`): centered above first row. 18×18 spinner ring (`accent` border, 2px, right border transparent, animation `eve-spin`). Below: Body 14 italic in `ink2` — `"Checking what's open…"`
- **Empty state**: padding `48px 22px`, centered. Display 32 italic across 2 lines: `"Nothing's matching\nthat vibe right now."` Body 15/`ink2` line-height 1.5: `"Try a different mood — or pull down to check again."` Then a 10/18-padded pill button, bg `ink`, color `paper`, UI 13/600: `"Show me everything"`.
- **Error state**: same layout. Display 28 italic: `"We lost the signal somewhere on Avenue B."` Body: `"Check your connection and pull to try again. We'll be here."` Friend voice everywhere — no error codes.

### 4. Photo Fallbacks

Each place has a `category` key (`dive | pub | coffee | diner | punk | cocktail`). Categories define a representative `photo` (drinks/food/atmosphere — never the place itself), a `tint` color, an `accent` color, and a `label`.

Three fallback modes for any hero/row:
- **`auto`** (default): use `place.photo` if present, else category photo, else typographic.
- **`category`**: force category photo. Always credited *"※ {category.label} · stock"* on detail.
- **`typographic`**: no image. Solid `category.tint` block + 135° hairline pattern + place name italic.

Real submitted photos must be credited on detail: *"📷 Submitted by @username"*.

---

## Data Model

```ts
type Place = {
  id: number;
  name: string;
  kind: string;           // human-readable, e.g. "Dive bar"
  category: 'dive' | 'pub' | 'coffee' | 'diner' | 'punk' | 'cocktail';
  street: string;
  cross: string;          // e.g. "btwn Aves A & B"
  hours: string;          // e.g. "Open till 4am"
  open: boolean;
  vibe: string;           // short comma-separated tags
  photo: string | null;
  photoCredit?: string;
  pitch: string;          // 1-2 sentences, friend voice
  perfect: string;        // "you want to talk for hours…" — used as 2nd-person prompt
  tags: string[];
  insider: string;
  crowd: string;
  distance: string;       // "4 min walk"
  closesIn: string;       // "7h 19m" or "Always open"
  signal: {
    kind: 'happy' | 'closing' | 'music' | 'walkin' | 'always';
    label: string;        // "Happy hour ends at 8"
    urgent: boolean;      // animates the dot
    eta?: string;         // "22 min"
  };
  crowdLevel: 'Quiet' | 'Light' | 'Steady' | 'Filling up' | 'Booked till 11';
  priceTier: '$' | '$$' | '$$$';
};
```

See `eve-data.jsx` for the full seed data (6 places). Tag list and category map live in the same file.

### Live Signal Logic (server-side or client-side)

The signal pip is the single most important piece of business logic. It must be **computed live, not stored static**:

1. If `now < closeTime - 15min` and place has happy hour: emit `happy` with countdown to happy-hour end. `urgent: true` if `<60min` remaining.
2. Else if `now > closeTime - 60min`: emit `closing` with `urgent: true`.
3. Else if place has an event starting in next 4 hours: emit `music` (or generic event), `urgent: false`.
4. Else if open 24h: emit `always`, never urgent.
5. Else if place is known for late walk-ins: emit `walkin`.

Recompute every 60s while screen is foregrounded.

### Sort Modes

- **Smart** (default): weighted by signal urgency + distance. Urgent signals float, then nearest.
- **Nearest**: by `distance` ascending.
- **Closing soon**: by `closesIn` ascending, infinite for `always`.
- **A–Z**: alphabetical.

### Filters

Multi-select with counts. Filters AND across sections, OR within a section. Sections:
- **What's the move** — happy / music / date / closing / walkin
- **Type** — cocktail / dive / wine / beer / coffee / food
- **When** — now / late / 24h / brunch
- **Price** — $ / $$ / $$$
- **Vibe** — loud / quiet / cash / solo / group

Filter button badge shows total active filter count.

---

## Interactions

- **Tap row** → push detail screen (native iOS push transition).
- **Tap save bookmark** → toggle save, optimistic; haptic light.
- **Tap chip in rail** → toggle filter; rail scrolls to keep tapped chip visible.
- **Tap filter button** → present filter sheet from bottom (spring animation).
- **Tap chip in sheet** → toggle. Footer button label updates live.
- **Tap "Done"** → dismiss sheet, apply filters, scroll list to top.
- **Tap "Clear all"** → reset all filters in sheet (don't dismiss).
- **Pull list down past threshold** → refresh; show `<PullRefresh>` indicator; recompute signals.
- **Tap sort label** → dropdown / action sheet with the four sort modes.
- **Tab bar** — Tonight (active), Saved/Map/You all coming-soon for v1.

### Haptics

- Light tap on chip toggle, save, filter clear.
- Medium tap on "Done" sheet dismiss.
- Selection on sort change.

---

## Accessibility

- All text passes WCAG AA against its background (verified for both modes — `ink/paper` contrast 12.7:1; `ink3/paper` 4.7:1).
- Support **Dynamic Type**. Use RN's `allowFontScaling` (default true) and design for ~130% scale before truncation kicks in. The 2-line clamp on the pitch line is intentional — let it truncate gracefully at large sizes.
- All taps targets ≥ 44×44 (chips, save icon, sort label).
- Signal pip animation respects `prefers-reduced-motion` — disable the pulse, keep the color.

---

## Voice & Copy Rules

- Friend voice. Second person. Lowercase fragments OK in italic ("when you want to start a night that will end somewhere you can't predict").
- Never use error codes, "oops," or "something went wrong."
- Prefer warmth + specifics over corporate cheer. *"We lost the signal somewhere on Avenue B"* not *"Network error"*.
- Crowd levels are vibes, never numbers.
- Distance is walk-time in minutes, never miles or feet.

---

## Files in This Bundle

- `East Village Everything.html` — top-level prototype, open this first
- `eve-tokens.jsx` — color, font, radius tokens
- `eve-data.jsx` — seed data (6 places), tag list, category map, masthead openers
- `eve-list.jsx` — **list screen, filter rail, filter sheet, place row, signal pip, tab bar, pull-to-refresh, empty/error states, skeleton** (the bulk of v1)
- `eve-detail.jsx` — detail screen
- `eve-hero.jsx` — hero image + fallback logic (`auto | category | typographic`)
- `eve-admin.jsx` — admin photo upload sheet (out of scope for v1; flag-gated)
- `eve-spec.jsx` — design system spec page (rationale + tokens + sample components)
- `eve-anatomy.jsx` — labeled anatomy diagram of the place row (reference only)
- `eve-phone.jsx`, `ios-frame.jsx`, `design-canvas.jsx` — prototype framing only; ignore for production

To preview, open `East Village Everything.html` in a modern browser.

---

## Suggested Implementation Order (one weekend)

1. **Day 1 morning** — Set up Expo project. Install Google Fonts. Wire up theme provider with `light`/`dark` token objects. Build `<PlaceRow>` and `<SignalPip>` against the static seed data. Verify pixel-fidelity in both modes.
2. **Day 1 afternoon** — Build the list screen shell: masthead, search + filter button, filter rail, sort label. Wire up the seed data and filter chip toggle state. Add tab bar (placeholder routes).
3. **Day 2 morning** — Filter sheet via `@gorhom/bottom-sheet`. Wire multi-select state + counts. Implement sort modes. Hook up live-signal computation.
4. **Day 2 afternoon** — Skeleton, pull-to-refresh, empty + error states. Detail screen. Polish: haptics, reduced-motion, Dynamic Type checks.

Future (v2): map view, location-aware sort, favorites persistence, push for special events, admin photo upload.

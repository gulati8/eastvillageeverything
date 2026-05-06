# EVE Mobile — UX Audit (post Phase 1)

**Date:** 2026-05-06
**App build at audit time:** TestFlight `1.0.0 (6)`
**Server:** main @ `be997d4` (deployed; `/api/places/:id`, `/api/tags?structured=1`, opt-in pagination, editorial+enrichment columns all live)
**User's stated design preferences (from memory):** dark-only, type-forward, no sepia/Paperless-Post; design must work when only `name + address` are populated.

This audit is a focused punch-list — *not* the full `design-audit` skill ceremony (no Playwright crawl, no 3-direction mockups, no decision matrix). If/when you want the full thing, ask for "do the full audit" and the rest of the skill runs.

Source for findings: chat-driven inspection of `apps/mobile/src/screens/PlaceList.tsx`, `PlaceDetail.tsx`, `PlaceRow.tsx`, `tokens.ts`, plus user-supplied screenshots of the 404 detail-screen state on iPhone 17 Pro / iOS 26.3.1.

---

## Critical — actively broken UX

### 1. (✅ FIXED in build 6) Detail screen had no escape

`PlaceDetail.tsx` set `headerShown:false` for the photo-overlay aesthetic but didn't render its own dismiss control. A 404 (every place during the pre-deploy window) trapped users with no way back. Fixed by adding an always-visible back chevron pinned top-left across all render branches (loading / success / 404 / network error). Falls through to `router.replace('/')` when there's no back stack.

**Files:** `apps/mobile/src/screens/PlaceDetail.tsx` (commit `be997d4`).

### 2. (✅ FIXED by server deploy on 2026-05-06) Every detail screen 404'd in production

Mobile called `GET /api/places/:id`; deployed server didn't have that route. Resolved by deploying the structured server commits to `main`. Document here as evidence of the cost of mobile-server deployment ordering: mobile shipped expecting endpoints that hadn't deployed yet.

---

## Major — degraded but shippable

### 3. Light theme exists despite "dark-only" preference, and its palette is sepia

Direct violation of saved memory. `apps/mobile/src/theme/tokens.ts:66-78` defines `lightColors` with `paper: #FBF6EE` (sepia) and `paper2: #F2EADC`. The light signal map at `:98-104` follows. The full theme switch lives at `ThemeProvider.tsx` / `useTheme.ts`.

**Action:** delete `lightColors`, `lightSignalColors`, and the conditional in `useTheme()` so dark is the only path. Removes ~30 LOC and forecloses a future drift back into sepia.

**Effort:** ~15 min.

### 4. Bookmark icon is a tap-target with no behavior

`PlaceRow.tsx:81-89` renders a bookmark, fires `Haptics.impactAsync` on press, calls `onSave?.()` — but `PlaceList` never passes `onSave`. Users get tactile feedback that suggests something happened; nothing did.

**Choices:**
- **Wire it up** → store saved place keys in SecureStore (with the `keychainService` we now pin) or AsyncStorage. Add a "Saved" tab to TabBar. ~2 hrs of work.
- **Hide it for v1** → drop the bookmark from `PlaceRow` until the saved-list feature is real. ~10 min.

Recommend hiding for v1. Wire it up in a later phase when there's a saved-list screen to navigate to.

### 5. Filter rail is empty / sparse with no signal why

Post-deploy, `/api/tags?structured=1` returns `{parents: 1, standalone: 31}`. Mobile's `deriveFilterSections` drops standalone tags ("not rendered in v1"), so the rail will show only one section with the children of `outside-east-village`. The 31 standalone tags (days of the week, mostly) won't appear.

**Choices:**
- **Render standalone tags as a final unlabeled section** — change `deriveFilterSections` to include them.
- **Don't render them in chips, render them in a separate "Days" filter** — bigger UX change.
- **Curate the taxonomy in admin** → make day-of-week tags children of a "Open today" parent so they render naturally.

Recommend last option (data fix, no code change) but the admin UI for parenting tags is functional now.

### 6. Detail-screen error has back, but no retry for transient failures

Now that the 404 path has a back button (item 1), the non-404 branch (line 59-68 of `PlaceDetail.tsx`) still leaves the user without a retry. `usePlace` exposes `refetch` but it's not wired into a button.

**Action:** add a "Try again" `Pressable` under the body text in the non-404 branch, calling `refetch()`.

**Effort:** ~10 min.

### 7. Hero is 380px tall regardless of `photo_url` presence

`PlaceDetail.tsx:97` renders `<PlaceHero place={place} height={380} />` always. With prod data, most places have no `photo_url` yet, so every detail screen wastes nearly half the viewport on a `PhotoFallback` gradient. Type sits below the fold on smaller phones.

**Action:** when `place.photo` is null, render a smaller hero (say 120-160px) — a textured banner with the place name overlaid in display serif, no fallback gradient. When `place.photo` exists, keep 380px.

**Effort:** ~30 min plus visual review.

---

## Minor — polish

### 8. Emoji contact icons (📍 📞 🔗)

`PlaceDetail.tsx:201, 218, 235` use emoji for contact-row icons. Renders inconsistently across iOS versions (color emoji on most, monochrome on some), clashes with the type-forward serif aesthetic.

**Action:** replace with inline SVGs at ~14-16px. Or use Unicode glyphs at controlled weight. Keep the icons monochromatic in `colors.ink2`.

### 9. Hand-rolled bookmark shape is fragile

`PlaceRow.tsx:167-183` builds a bookmark from a 14×16 `View` with an absolutely-positioned rotated triangle as the notch. Hard to read at scale, brittle across screen densities. (Moot if item 4 hides the bookmark.)

**Action:** if keeping, replace with an SVG. Otherwise hide.

### 10. Eyebrow typography is inconsistent

- `kindStreetLabel` (PlaceDetail): `ui600`, no letterSpacing.
- `sectionLabel` (PlaceDetail): `ui700`, `letterSpacing: 1.1`.
- `perfectEyebrow` (PlaceDetail): `ui600`, `letterSpacing: 0.66`.
- `eyebrow` (PlaceList masthead): `ui600`, `letterSpacing: 0.66`.

**Action:** standardise on one weight (`ui700`) and one tracking (`letterSpacing: 0.08em` ≈ `0.88` at 11px) for all eyebrows. Promote to a shared text style in tokens/typography.

### 11. TabBar shows static "tonight" with no other working tabs

`TabBar.tsx`, used at `PlaceList.tsx:332`. Other tabs are dead. Promises navigation that doesn't exist; visual noise.

**Action:** either populate the other tabs (Saved, Map, Profile) or remove the bar entirely for v1.

### 12. List item heights are heavy with fallback photos

Every `PlaceRow` carries a 96×124 photo column even when `place.photo` is null. With 352 places and almost no photos populated, the list is mostly identical-looking gradient slabs. Stack is dense in pixels but information-thin.

**Action:** introduce a no-photo variant of `PlaceRow` that drops the photo column and lets type breathe. Or compress the photo column to ~64×64 and let name/meta/pitch take more horizontal space.

### 13. 404 copy is misleading when the cause is "endpoint not deployed"

"Can't find that spot. It may have moved or closed." reads as "we have data and chose not to show it." This was wrong during the pre-deploy window; with the deploy, real 404s are now legitimate "place was deleted" signals, so the copy is mostly fine *now*. Worth keeping in mind for future schema drift between mobile and server.

---

## Notes you may want to act on later

- **Layout-with-only-name+address** is a stated requirement and is mostly satisfied: every section in `PlaceDetail` is conditional, `PlaceRow.metaLine` and `pitchLine` are conditional. The visual issues above (heavy hero, fallback photos) are about *what fills the space when text is sparse*, not whether layout breaks.
- **Tag rail ordering and label casing** will need attention once the taxonomy renders broadly. Right now we honor whatever the server sends; lowercase `monday/tuesday/...` may not be the casing you want for chips.
- **Sentry was disabled in build 6 and re-enabled in build 7** (DSN restored to `eas.json:production.env`). `SENTRY_DISABLE_AUTO_UPLOAD=true` left in place because we don't have a `SENTRY_AUTH_TOKEN` configured for sourcemap upload. Consider generating one in Sentry → set as an EAS secret → drop `SENTRY_DISABLE_AUTO_UPLOAD` so future crashes get fully-symbolicated stacks.

---

## Suggested sequence

If picking this up in a later session, here's a low-risk order that produces a single clean build:

1. **Re-enable Sentry, ship build 7.** (already done in this session; `eas.json` restored, `app.json` bumped to `buildNumber: 7`. Build + submit have not been run yet.)
2. **Fast wins for build 8** (1-2 hrs total):
   - Item 3: delete light theme + sepia palette.
   - Item 4: hide bookmark icon.
   - Item 11: trim TabBar to one tab or remove.
   - Item 6: add retry button to non-404 detail-error state.
3. **Visual polish for build 9** (~half day):
   - Item 7: smaller hero when no photo.
   - Item 12: lighter list-row variant when no photo.
   - Item 8: SVG contact icons.
   - Item 10: standardise eyebrow type scale.
4. **Server-side, separately:**
   - Item 5: decide on standalone-tag rendering — easiest path is curating taxonomy in admin (no code change).

Each numbered group is independent; you can reorder freely.

---

## What's deliberately NOT in this audit

- Full visual mockups for 3 design directions.
- Decision matrix scoring trust / emotional / usability / etc.
- Mobile-redesign work tracked separately at `docs/superpowers/plans/2026-05-04-mobile-redesign.md` — that plan has its own resume notes and was paused before Phase 1.
- Anything outside `apps/mobile/`. The web (EJS) site was untouched by Phase 1 and is out of scope.

If you want any of those run as a follow-up, ask.

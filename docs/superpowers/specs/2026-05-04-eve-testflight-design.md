# EVE TestFlight Phase 1 — Design Spec

**Date:** 2026-05-04
**Owner:** Amit Gulati
**Companion plan:** `docs/superpowers/plans/2026-05-04-eve-testflight-plan.md`

---

## Goal

Get the EVE mobile app into the hands of a small private TestFlight beta (≤25 invited testers, internal distribution, no Apple Beta App Review), after fixing the structural code-quality issues that block honest behavior.

This is **Phase 1** of a phased plan. Phase 2 (deferred cleanup) is out of scope here and tracked separately in the plan.

---

## Scope (Phase 1)

### In scope

**Mobile data-flow correctness:**
- `transformPlace.ts` stops nulling fields the server already returns. Server-supplied `price_tier`, `crowd_level`, `vibe`, `pitch`, `photo_url`, `hours_json`, `cross_street`, etc. are plumbed into `PlaceV2Display`.
- Filter system rewritten to be **purely tag-driven**, sourced from `/api/tags?structured=1`. No client-side hardcoded taxonomy.
- All chips backed by real tags in the DB. Chips that have no real tag backing get cut.
- `useFilterState.matchesChip` becomes a single strategy: tag exact-match against `place.tags`. No substring match. No price/hours/vibe special cases (those filters are dropped from Phase 1).
- `categoryMap.ts` becomes styling-only or is deleted, depending on what the redesign plan already specifies (see "Coordination" below).
- Dead component `apps/mobile/src/components/PlaceListItem.tsx` deleted.
- The fake-`require()` workaround in `PlaceList.tsx:163-184` replaced with a normal static import; the lookup loop deleted.

**Server gates:**
- `express-rate-limit` middleware on `/api/*`. 100 req/min per IP, configurable via env.
- `/api/places` accepts `?limit=` (default 100, max 200) and `?offset=`. Mobile passes neither initially.
- Dead `/admin/api/*` block at `src/routes/admin.ts:407-488` deleted.
- Async-error wrapper applied across `src/routes/admin.ts` so admin errors render an EJS error page, not JSON. (`src/routes/api.ts` already has try/catch on every handler — left alone.)

**Admin UI:**
- Polish the existing nested-tag form so a parent tag can be picked cleanly. **Cap nesting at 2 levels deep** — the form blocks selecting a parent that already has a parent (no grandchildren).
- The admin tags index page renders the parent → children hierarchy in a way that's actually usable, not a flat list.

**TestFlight delivery:**
- `eas.json` `preview` and `production` profiles get an `env` block: `EXPO_PUBLIC_API_BASE_URL` and Sentry DSN.
- `eas build --profile production --platform ios` succeeds.
- Build uploaded to App Store Connect via `eas submit` (or upload manually).
- Internal testers configured in App Store Connect.
- One end-to-end smoke test on a real device: the app launches, fetches places from prod API, shows the directory, filtering by a tag chip works, place detail loads.

### Out of scope (deferred to Phase 2)

- Silent URL/phone scrubbing in `place.ts` model (move validation to route boundary).
- Sort-in-JS at admin places index (push to SQL).
- `TagModel.delete` and `updateHasChildren` not transactional.
- `req.body` schema validation (zod) at every mutation route.
- `DATABASE_URL` startup validation.
- Graceful shutdown on SIGTERM/SIGINT.
- Request logging (morgan).
- Dead top-level `e2e/` directory.
- Root-level `npm test` script.
- `String.substr` / `--only=production` / other deprecated APIs.
- Hours-based filters (open now, closing soon, late, 24h) — dropped entirely; not deferred to Phase 2 either, per user decision.
- Price-based filters (`$/$$/$$$`) — dropped entirely; same reason.

---

## Architectural decisions

### 1. Pure tag-driven filter taxonomy
The mobile filter system reads `/api/tags?structured=1` and renders the resulting tree directly:
- Each parent tag (with children) becomes a filter section. Section title = parent's `display`. Section chips = parent's children.
- Standalone tags (no parent, no children) become chips in a top-level "More" section, or are excluded — TBD during implementation based on what the actual taxonomy looks like.
- Sort order from server is honored.
- A chip filters places by exact-match against `place.tags` array (case-sensitive on `value`).

There is no `filterSections.ts` constant. There is no client-side notion of sections like `'move'`/`'type'`/`'when'`/`'price'`/`'vibe'`. Sections come from parents.

### 2. Hours and price filters dropped
The current chips for "Open now," "Closing soon," "Open after 12," "24 hours" are removed from Phase 1 entirely. Same for `$ / $$ / $$$`. Reason: they don't have data backing across the existing place set, and the user has decided not to invest in either the enrichment data or the real-time hours computation in this phase. They may return in a later phase as a separate non-tag filter dimension; that's a future decision, not a deferred Phase-2 item.

### 3. Relationship to the paused mobile redesign plan
A separate plan exists at `docs/superpowers/plans/2026-05-04-mobile-redesign.md`. It was authored for the Justice League factory and has been **paused** by the user (the factory is not running in this engagement). This Phase 1 plan is the active plan; it supersedes any overlapping work from the redesign plan.

The directory-style UI (`PlaceList.tsx` with masthead, `FilterRail`, `FilterSheet`, `EveListSkeleton`, `SearchBar`, `TabBar`, `PlaceRow`) is **already in the codebase** — partially executed. What remains broken from that work is the data-flow rot this Phase 1 plan fixes (`transformPlace.ts` nulling fields, `useFilterState.ts` dead chips, the `require()` workaround in `PlaceList.tsx`). The redesign plan also proposed:
- deleting `categoryMap.ts` + `category` from `PlaceV2Display`,
- adding `Fallback.tsx` + `fallbackArt.ts`,
- replacing `PhotoFallback.tsx`,
- adding `BookmarkIcon.tsx`, `ContactRow.tsx`, `SpecialsCard.tsx`,
- a Jest preset migration and component-test stack.

**None of those are in this Phase 1 spec.** They are out of scope. If the user wants any of them, it's a separate Phase 2 (or a re-activation of the redesign plan as its own track). This Phase 1 plan touches `categoryMap.ts` only if needed by the data-flow work; otherwise it is left alone.

### 4. Server changes are minimal and additive
No DB schema changes. No new endpoints. The server already returns every field mobile needs in `/api/places` and `/api/tags`. Server work in Phase 1 is gating (rate limit, pagination cap, dead-code delete, async error wrapper) and admin-UI polish for nested tags.

### 5. Admin nested-tag UI cap at 2 levels
The DB supports arbitrary nesting via `parent_tag_id`. The admin form is constrained to 2 levels (parent OR child, not grandchild) by:
- Hiding tags that already have a parent from the "Parent tag" dropdown.
- Server-side validation rejecting an UPDATE that would create a 3-deep chain.

The existing `place_tags` join is unchanged.

### 6. eas.json env wiring
Build-time `EXPO_PUBLIC_API_BASE_URL` injected per profile:
- `preview` → staging URL (or omit if no staging exists)
- `production` → prod URL the user provides
- Sentry DSN: `EXPO_PUBLIC_SENTRY_DSN` injected per profile if Sentry is wanted in beta. Otherwise Sentry is disabled in production by leaving the DSN blank — the existing `initSentry()` in `apps/mobile/src/observability/sentry.ts` already no-ops on a blank DSN (verified during implementation).

### 7. Build profile choice for TestFlight
Use the `production` profile for the TestFlight upload, with `autoIncrement: true` already set in `eas.json:15`. The `preview` profile is reserved for internal-distribution dev builds installed via QR code, not TestFlight.

---

## Open questions to resolve at implementation time

These are flagged as stop-and-ask gates in the plan; not blockers for spec approval.

1. **Tag taxonomy alignment.** During implementation, query the live DB's tags via the deployed `/api/tags?structured=1` and decide with the user: which existing tags map to which mobile chip; which existing tags are noise; which new tags need to be added via admin to back planned chips. End-state of this gate is the canonical Phase-1 tag set.
2. **Production API URL** for `EXPO_PUBLIC_API_BASE_URL`. User provides.
3. **Sentry DSN** for production builds. User provides or says "no Sentry in beta."
4. **TestFlight tester emails** (Apple IDs). User provides ahead of the upload step.

---

## Data flow (target state)

```
Server                                    Mobile
──────                                    ──────
GET /api/places   ──────────────────►   placesApi.list()
   (returns full enrichment fields)     ├─ TanStack Query cache
                                        ├─ transformPlace()  ◄── now plumbs ALL fields
                                        │  → PlaceV2Display (no nulls where server has data)
                                        ▼
                                        PlaceList screen
                                        ├─ FilterRail / FilterSheet
                                        │  ▲
                                        │  │ chips derived from:
GET /api/tags?structured=1 ──────────►  │  └─ tagsApi.structured()
   (returns parents + children)        │     ├─ TanStack Query cache
                                        │     └─ rendered as section tree
                                        ▼
                                        useFilterState.matchesChip(place, chip)
                                        = place.tags.includes(chip.value)
                                          (exact-match, no substring, no special-case)

GET /api/places/:id ─────────────────►  placesApi.byId()
                                        └─ PlaceDetail screen
```

Untouched: TanStack Query persistence, AsyncStorage, anonymous device ID, Sentry init, splash gate, expo-router stack, all admin form routes, login flow, EJS templates, Redis sessions.

---

## Risks

1. **Tag taxonomy may not match the redesign UX.** The mockups in `docs/design_handoff_eve/` were drawn against an aspirational chip set. Once we audit live DB tags (gate #1 above), we may discover the visual design assumes filters that aren't backed. Mitigation: gate is the first step; if the gap is large, the user decides whether to add tags or accept a smaller chip set in v1.
2. **The paused redesign plan.** The factory-authored redesign plan is on disk but not being executed. This Phase 1 plan owns the files that overlap (`useFilterState.ts`, `transformPlace.ts`, `placeV2Display.ts`). If the user later re-activates the redesign plan, it will need to be reconciled against the post-Phase-1 state — that's a future-Amit problem, not a Phase 1 concern.
3. **Rate limit too aggressive in dev.** `express-rate-limit` at 100/min could trip Expo Go reload cycles on the dev server. Mitigation: rate limit middleware is gated to `NODE_ENV === 'production'` initially, or has a higher dev cap. Decided in implementation.
4. **EAS Build failure on first cold build.** If the EAS project hasn't built before, signing certs may need to be generated. Mitigation: plan budgets time for first-build credential setup; user is on hand for any device-attestation prompts.
5. **CORS on the deployed backend.** The mobile app sets `credentials: true` only when applicable, but if the prod backend's `CORS_ORIGINS` doesn't include the mobile app's origin (mobile fetches don't send an Origin header in some configs), this is a nothingburger; if it does, we need to whitelist appropriately. Verified during implementation gate #2.

---

## Acceptance (what "Phase 1 done" means)

- A TestFlight build is live, downloadable by invited internal testers.
- That build, on a real iPhone, can:
  - Launch and reach the production API.
  - Render the directory.
  - Show filter chips driven entirely by the server's tag taxonomy.
  - Filter the list by tapping a chip; the filter actually filters (no dead UI).
  - Open a place detail.
- Server has rate limiting on `/api/*` and pagination caps on `/api/places`.
- The dead admin JSON sub-block is gone.
- Admin can create / edit a child tag under a parent in the admin UI without falling into a broken state. 3-deep nesting is blocked.
- `npm run typecheck` passes clean (server + mobile).
- Existing tests pass (`npm test:e2e:desktop`, `npm --prefix apps/mobile test`).

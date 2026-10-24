# App Store listing: East Village Everything

Source of truth for the App Store Connect listing of the iOS app in
`apps/mobile/` (bundle id `com.eastvillageeverything.app`, ASC app id
`6765464747`, version 1.0.0). Task 5.7 generates the fastlane `metadata/en-US/`
tree from this file; task 5.8 copies the questionnaire answers by hand.

Every claim below is checked against the app as built. If a feature changes,
update this file in the same commit.

Character limits are App Store Connect's. Counts are given so a copy change can
be checked without pasting into the console.

## Name

```
East Village Everything
```

23 of 30 characters.

## Subtitle

```
Bars, happy hours, late nights
```

30 of 30 characters.

## Promotional text

Editable without a new build. 170 character limit.

```
Every bar in the East Village in one list. Happy hours, pool tables, trivia, live music and late-night eats, with hours and what's on right now.
```

144 of 170 characters.

## Description

4000 character limit. Blank lines are paragraph breaks; App Store Connect keeps
them.

```
East Village Everything is a guide to the bars and late-night spots of the East Village, Manhattan. Over 350 places in one list, with the details that matter when you're already out: where the happy hour is still going, who has a pool table or a dart board, where there's trivia tonight, and what's open late.

BROWSE AND SEARCH
Scroll the whole neighborhood or search by name. Each place shows its address, hours, phone number, website and tags, plus the current specials and our notes on what it's good for.

FILTER BY WHAT YOU'RE IN THE MOOD FOR
Tap tags to narrow the list: Happy Hours, Late Night Eats, Live Music, Trivia Night, Pool Tables, Darts, Skeeball, Ping Pong, Karaoke, Dancing, Sports Bars, Wine Bar, BYOB, Brunch and more. Combine them. Sort A to Z or by what's closing soonest.

KNOW BEFORE YOU GO
Places with hours show whether they're open now and when they close. Rows call out live music tonight, late closes and happy hours so you can pick at a glance.

SAVE YOUR SPOTS
Tap the bookmark on any place to keep it in your Saved list. Saved places stay on your phone and survive relaunches.

WORKS WITHOUT A SIGNAL
The list is cached on your device, so it opens instantly and still works in a basement bar with no reception. Pull down to refresh when you're back online.

ONE TAP TO CALL, VISIT OR GET THERE
Phone numbers dial. Websites open in your browser. Tap the address for directions in Apple Maps.

NO ACCOUNT, NO TRACKING
There is nothing to sign up for. The app does not ask for your location, does not show ads and does not use third-party analytics. Details in the privacy policy at https://eastvillageeverything.nyc/privacy.

East Village Everything is made in the East Village and covers the East Village only. If your favorite spot is missing or something is wrong, tell us at https://eastvillageeverything.nyc/support.
```

About 1,900 of 4000 characters.

Facts the description relies on, and where they come from:

- Over 350 places: 352 rows in the production `places` table (progress.txt,
  "before 0.1").
- Tag names: the production `GET /api/tags` response. Spelled as the tags
  display, not as the slugs.
- Open now, closes in, live music tonight, late close: `src/signals/signal.ts`
  and `src/signals/hours.ts`. These only show for places with `hours_json`,
  which is populated by Phase 2 enrichment. Do not ship this description
  before 2.7 has run or the claim is empty.
- Sort A to Z and by closing: `SortMode` in `src/state/useFilterState.ts`
  (`az`, `smart`, `closing`; `nearest` falls back to A to Z because the app
  has no location).
- Saved list on device: `src/state/useSavedPlaces.ts` writes keys to
  AsyncStorage only.
- Offline cache: TanStack Query with an AsyncStorage persister, 24 hour
  `gcTime` (`src/state/queryClient.ts`, `persister.ts`).
- Address, hours, phone, website, tags, specials, notes: the fields
  `src/screens/PlaceDetail.tsx` renders. It does not render `pitch` or
  `cross_street` even though the API returns them, so the copy does not
  mention them.
- Call, website and Apple Maps links: `Linking.openURL` in
  `src/screens/PlaceDetail.tsx` (`openMaps` uses a `maps://?q=` search, not
  stored coordinates).
- No location, ads or analytics: `apps/mobile/package.json` has no location,
  ads or analytics SDK, and `app.json` declares no usage-description strings.
- Privacy and support URLs: tasks 5.2 and 5.3. Both must be live before this
  description is uploaded.

Do not mention a map. The tab bar shows Map and You tabs, but
`handleTabPress` in `src/screens/PlaceList.tsx` ignores both; only Home and
Saved switch. Reviewers tap every tab. See the review notes below.

## Keywords

100 character limit, comma separated, no spaces after commas. Do not repeat
words already in the name or subtitle (Apple indexes those separately).

```
nyc,manhattan,bar,pub,dive,drinks,nightlife,trivia,karaoke,pool,darts,live music,late night,brunch
```

98 of 100 characters.

## Category

- Primary: Food & Drink
- Secondary: Travel

Lifestyle is the alternative secondary. Travel is chosen because the app is a
neighborhood guide and most visitors to the East Village are not residents.

## URLs

| Field | Value | Source |
| --- | --- | --- |
| Privacy Policy URL | `https://eastvillageeverything.nyc/privacy` | task 5.2 |
| Support URL | `https://eastvillageeverything.nyc/support` | task 5.3 |
| Marketing URL | `https://eastvillageeverything.nyc` | live |
| Copyright | `2026 Gulati Labs` | `app.json` owner `gulati_labs` |

Support email: see task 5.1 in `scripts/ralph/plan.md`; not decided yet. Add
it here when it is.

## Age rating

Apple's age rating is computed from a questionnaire, not picked. Since 2025
the tiers are 4+, 9+, 13+, 16+ and 18+ (12+ and 17+ were retired). Answers for
every question, based on what the app shows:

| Question | Answer | Why |
| --- | --- | --- |
| Cartoon or Fantasy Violence | None | |
| Realistic Violence | None | |
| Prolonged Graphic or Sadistic Realistic Violence | None | |
| Profanity or Crude Humor | None | Editorial pitch text is written by us and kept clean |
| Mature or Suggestive Themes | None | |
| Horror or Fear Themes | None | |
| Medical or Treatment Information | None | |
| Alcohol, Tobacco, or Drug Use or References | **Infrequent or Mild** | See below |
| Simulated Gambling | None | |
| Sexual Content or Nudity | None | |
| Graphic Sexual Content and Nudity | None | |
| Contests | None | |
| Gambling | No | |
| Unrestricted Web Access | No | Links open in Safari, there is no in-app browser |
| Parental Controls | No | |
| Age Assurance | No | |
| Messaging and Chat | No | |
| User-Generated Content | No | All content is published by the admin |
| Advertising | No | |
| Loot Boxes | No | |
| Made for Kids | No | |

**Resulting rating: 13+.**

The plan for this task (5.5) asked for 4+ answers. A 4+ rating requires
answering None to the alcohol question, and this app is a bar directory: the
tag list includes Happy Hours, Wine Bar and BYOB, and place specials describe
drink prices. Answering None would misstate the content, and Guideline 2.3.6
lets review reject an app whose rating does not match. Infrequent or Mild is
the same answer Yelp gives for the same kind of content and yields 13+. If
review pushes back and asks for Frequent or Intense, the rating becomes 18+;
accept it rather than argue, since the app still ships.

## App Privacy questionnaire

Answer "Yes, we collect data from this app." Then declare exactly two data
types. Everything else is "not collected."

### Identifiers: Device ID

| Question | Answer |
| --- | --- |
| Collected | Yes |
| Used for | App Functionality |
| Linked to the user's identity | No |
| Used for tracking | No |

Why: on first launch the app generates a random UUID, stores it in SecureStore
and sends it as `X-Device-Id` on every API request
(`src/identity/deviceId.ts`). There are no accounts, so it cannot be linked to
a person. It is never shared with another company and is scrubbed from Sentry
breadcrumbs (`src/observability/sentry.ts`), so it is not tracking under
Apple's definition.

### Diagnostics: Crash Data

| Question | Answer |
| --- | --- |
| Collected | Yes |
| Used for | App Functionality |
| Linked to the user's identity | No |
| Used for tracking | No |

Why: Sentry (`@sentry/react-native`) receives crash reports in production
builds with the device model, OS version and app version. Sentry also runs
performance tracing at a 10 percent sample rate (`tracesSampleRate: 0.1`),
which Apple classes as Diagnostics: Performance Data. Declare it the same way
as Crash Data (App Functionality, not linked, not tracking) to be exact.

### Not collected

Name, email, phone, address, payment info, precise or coarse location, health,
contacts, photos, audio, search history, browsing history, purchases,
advertising data, product interaction, user content, sensitive info, and all
other categories. Saved places and the list cache live only in AsyncStorage on
the device and never leave it.

Privacy nutrition label as it will render: "Data Not Linked to You:
Identifiers, Diagnostics." No "Data Used to Track You" section.

## Review notes

Paste into App Review Information > Notes. There is no login, so leave the
demo account fields blank.

```
East Village Everything is a read-only directory of bars and restaurants in the East Village neighborhood of Manhattan. No account is needed; all content loads from our public API at https://eastvillageeverything.nyc/api/places. The app sends a random per-install identifier so we can rate-limit and debug; it is not linked to any person. Crash reports go to Sentry.

The tab bar has four tabs. Home and Saved work. Map and You are visible but not yet active in 1.0; tapping them does nothing. They will be enabled in a later release.

The age rating answers Infrequent or Mild for alcohol references because the app lists bars and their happy hours. It does not sell or deliver alcohol.
```

Disclosing the inactive tabs up front is cheaper than a "placeholder content"
rejection under Guideline 2.1. If the Map and You tabs are hidden before the
release build, delete that paragraph.

## What's New (version 1.0.0)

```
First release.
```

## Open items from other tasks

- 5.1: support email. Add to the URLs section and to the support page.
- 5.2, 5.3: privacy and support pages must return 200 before upload.
- 5.4: screenshots, 6.9" and 6.5" sets, under `docs/app-store/screenshots/`.
- 2.7: hours and coordinates must be live or the "open now" copy is false.

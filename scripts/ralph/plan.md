# Launch plan: East Village Everything iOS

Tasks to get the iOS app into the App Store with the content right. This file is
the work queue. The checkboxes are the only record of progress. Facts a later
iteration needs go in `scripts/ralph/progress.txt`, not here.

Each task has a `Done when` line, which is the verification the agent must run
before ticking it. Tasks tagged `[HUMAN]` are done by a person, who ticks them.
`Blocked by` lists tasks that must be ticked first.

## Phase 0: housekeeping

- [ ] **0.2 Remove the stale root-level `eas.json` and `app.json`.** They predate the move to `apps/mobile/` and disagree with the real config. Confirm nothing references them first (`grep -rn "eas.json\|app.json" package.json .github scripts`).
  Done when: both files are gone and `npm run typecheck` passes. Prefix: `chore(mobile)`.
- [ ] **0.3 Delete the old `.ipa` files in `apps/mobile/`** except `build-11.ipa`. Confirm `apps/mobile/build-*.ipa` is in `.gitignore`.
  Done when: `ls apps/mobile/*.ipa` shows only build-11. No commit if nothing tracked changes.
- [ ] **0.4 Fix `CORS_ORIGINS` in `.github/workflows/deploy.yml`** to list `https://eastvillageeverything.nyc` and `https://www.eastvillageeverything.nyc` instead of the `.com` domains. Push to deploy and wait for the workflow to pass.
  Done when: the workflow passed and `ssh ec2-user@100.29.233.41 'grep CORS /srv/eve/.env'` shows the `.nyc` origins. Prefix: `fix(deploy)`.

## Phase 1: production uploads (S3) and image sizes

Today `STORAGE_BACKEND` is `local` on prod with no volume, and the admin runs in a different container from the app that serves `/uploads`, so an uploaded photo is unreachable and lost on the next deploy. The spec is `docs/aws-setup.md`.

- [ ] **1.1 Create the S3 bucket and IAM user with the AWS CLI**, following `docs/aws-setup.md` sections 1 to 4 exactly: bucket `eastvillageeverything-uploads` in `us-east-1`, bucket policy granting public read on `public/*` only, IAM user `eve-uploads` with the inline least-privilege policy from section 2, one access key pair. Save the key pair to the root `.env` as `STORAGE_AWS_ACCESS_KEY_ID` and `STORAGE_AWS_SECRET_ACCESS_KEY`. Never print the secret.
  Done when: `aws s3api head-bucket --bucket eastvillageeverything-uploads` succeeds, `aws iam list-access-keys --user-name eve-uploads` shows one key, and a test object put with those keys to `public/test.txt` is readable by `curl` without auth, then deleted. No commit.
- [ ] **1.2 Write a host-only storage env file on the EC2 box.** The deploy workflow rewrites `/srv/eve/.env` on every run, so storage secrets go in a separate `/srv/eve/.env.storage` written once over SSH (mode 600): `STORAGE_BACKEND=s3`, `STORAGE_S3_BUCKET=eastvillageeverything-uploads`, `STORAGE_S3_REGION=us-east-1`, `STORAGE_S3_PREFIX=public`, `STORAGE_S3_URL_PATTERN=https://eastvillageeverything-uploads.s3.us-east-1.amazonaws.com/{key}`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`. The last two take their values from the local `.env` entries `STORAGE_AWS_ACCESS_KEY_ID` and `STORAGE_AWS_SECRET_ACCESS_KEY`; the names differ on purpose, because `@eve/storage` reads no AWS variable itself and relies on the AWS SDK's default credential chain, which looks for the `AWS_` names. Pipe the values over the SSH session; do not echo them.
  Done when: `ssh ec2-user@100.29.233.41 'sudo cut -d= -f1 /srv/eve/.env.storage; sudo stat -c %a /srv/eve/.env.storage'` lists the seven keys and prints 600. No commit.
- [ ] **1.3 Make both containers read the storage env file.** In `deploy/docker-compose.prod.yml`, add `env_file: [.env, .env.storage]` to the `app` and `admin` services (admin is where uploads happen). Neither service uses `env_file` today; injecting the whole `.env` into both is intended. Remove the now-redundant `STORAGE_*` `environment:` lines from `admin` (they are on `admin`, not `app`). Also add a line to the SSM deploy step in `deploy.yml` that creates an empty `/srv/eve/.env.storage` if it does not exist, because compose fails on a missing `env_file`. Push to deploy.
  Done when: the deploy workflow passes and `ssh ec2-user@100.29.233.41 'sudo docker exec eve-admin env | grep -c "^STORAGE_\|^AWS_"'` prints 7, same for `eve-app`. Prefix: `feat(deploy)`.
- [ ] **1.4 [HUMAN] Verify an upload end to end on prod** per `docs/aws-setup.md` section 7: log in to `https://eastvillageeverything.nyc/admin`, upload a test image to a place, confirm the returned URL is on S3, loads unauthenticated, and survives `ssh ec2-user@100.29.233.41 'cd /srv/eve && docker compose -f docker-compose.prod.yml up -d --force-recreate admin'`.
  Done when: all three checks pass and the test image is removed from the place afterward.
- [ ] **1.5 Generate list and detail image sizes on upload.** In `apps/admin/app/api/admin/uploads/route.ts`, after validating the file, add `sharp` to `apps/admin/package.json` as a direct dependency (today it is only a transitive dependency of Next at the repo root, so the admin Docker image may not have it) and use it to write three objects: the original, a `thumb` variant (400px wide, JPEG quality 80) and a `hero` variant (1200px wide, JPEG quality 85), under keys `<prefix>/<uuid>.<ext>`, `<prefix>/<uuid>.thumb.jpg`, `<prefix>/<uuid>.hero.jpg`. Return all three URLs. Add a migration adding `photo_thumb_url` and `photo_hero_url` to `places`, extend the Place model, `PlaceResponse`, and the API conversion in `src/routes/api.ts`, and have the admin place form save all three. Existing `photo_url` keeps meaning the original.
  Done when: a local upload through the admin produces three objects, `GET /api/places/:id` returns all three URLs, `npm run typecheck` and `cd apps/mobile && npm test` pass. Prefix: `feat(admin)`.
- [ ] **1.6 Mobile uses the sized images.** List rows load `photo_thumb_url`, the detail screen loads `photo_hero_url`, both falling back to `photo_url`, then to `PhotoFallback`.
  Done when: `cd apps/mobile && npx tsc --noEmit && npm test` pass, with a unit test covering the fallback order. Visual confirmation is part of 3.2. Prefix: `feat(mobile)`.
- [ ] **1.7 Fix the legacy admin body limit.** `eve-app` logs show repeated `request entity too large` and `invalid csrf token` from the EJS admin in `src/routes/admin.ts`. Remove the photo upload from the EJS admin and link to the Next admin's place form instead. Push to deploy and wait for the workflow to pass.
  Done when: `grep -rc 'type="file"' src/views/admin/ | grep -v ':0$'` prints nothing, `npm run typecheck` passes, and the deploy workflow passed. Prefix: `fix(admin)`.

## Phase 2: enrichment (Google Places)

`scripts/enrich-places.ts` resolves each place to a Google Place ID by text search, then fetches `regularOpeningHours` and `priceLevel`. It writes `google_place_id`, `hours_json`, `google_price_level`, `enriched_at`, `enrichment_status`. It does not fetch coordinates today. It has never run against prod: all 352 places are `pending` with no hours, coordinates, or Place ID.

- [ ] **2.1 Install the Google Cloud CLI.** `brew install --cask google-cloud-sdk`.
  Done when: `gcloud --version` prints. No commit.
- [ ] **2.2 [HUMAN] Log in to gcloud and pick the project.** Run `gcloud auth login` (opens a browser) and `gcloud config set project <id>`. The project must have billing enabled; Places API (New) will not serve requests without it. Write the project id in `progress.txt`.
  Done when: `gcloud auth list` shows an active account and `gcloud beta billing projects describe $(gcloud config get-value project)` shows `billingEnabled: true`.
- [ ] **2.3 Enable the API and mint a restricted key.** Blocked by: 2.2. `gcloud services enable places-backend.googleapis.com`, then `gcloud services api-keys create --display-name eve-enrich --api-target=service=places-backend.googleapis.com`. Read the key string with `gcloud services api-keys get-key-string <name>` and write it to the root `.env` as `GOOGLE_PLACES_API_KEY`. Never print it.
  Done when: `grep -c '^GOOGLE_PLACES_API_KEY=.' .env` prints 1 and a single `places:searchText` request with the key returns 200. No commit.
- [ ] **2.4 Extend the enrichment script to also fetch `location`** (lat/lng) in the details field mask and write `lat`, `lng`. Blocked by: 2.3.
  Done when: a run against the local dev DB with `--limit 3` sets `lat`, `lng`, and `hours_json` on those rows. Prefix: `feat(enrich)`.
- [ ] **2.5 Add `--limit N` and `--dry-run` flags** to the script so a prod run can be tested on a handful of rows first. Blocked by: 2.3.
  Done when: `npx tsx scripts/enrich-places.ts --dry-run --limit 3` prints what it would write and changes nothing (verify with a before/after `select count(*) from places where enriched_at is not null`). Prefix: `feat(enrich)`.
- [ ] **2.6 Run enrichment against production, 5 places first.** Blocked by: 2.3, 2.4, 2.5. Run locally with `DATABASE_URL` pointed at prod through an SSH tunnel to the `eve-db` container (publish 5432 to the host's localhost only, or run the script inside the `eve-app` container with the key passed as an env var). Inspect the 5 rows in the admin. Record the method in `progress.txt`.
  Done when: 5 places show hours and coordinates in the admin. No commit.
- [ ] **2.7 Run enrichment against all 352 places.** Blocked by: 2.6. Then list the failures in `progress.txt` by name.
  Done when: `select enrichment_status, count(*) from places group by 1` shows `enriched` for at least 300 rows and every `failed` row is listed in `progress.txt`. No commit.
- [ ] **2.8 Confirm the public API serves the new data.** Blocked by: 2.7. `curl -s 'https://eastvillageeverything.nyc/api/places?limit=5'` returns `hours_json` and `lat`/`lng` on enriched rows and `null` on failed rows, and the mobile transform tests cover both shapes.
  Done when: the curl check passes and `cd apps/mobile && npm test` passes. Commit only if a test or fix was added, prefix `fix(mobile)`.

## Phase 3: content

- [ ] **3.1 Build a content-gaps report.** `scripts/content-report.ts` lists, per place: has photo, has pitch, tag count, has hours, enrichment status. Sorted so the worst gaps are first. Takes `DATABASE_URL` from the environment.
  Done when: running it against prod prints a table and the counts match ad hoc SQL. Prefix: `feat(scripts)`.
- [ ] **3.2 [HUMAN] Verify mobile rendering against real prod data.** Blocked by: 1.6, 2.7. Walk the list and at least 20 detail screens in the simulator against prod, including a place with all three photo sizes and one with no photo. Any place that renders blank space, a broken image, or overlapping text is a bug.
  Done when: findings are in `progress.txt`. Each one becomes a `fix(mobile)` task added under this phase for the loop.
- [ ] **3.3 [HUMAN] Review the enrichment failures and fix or remove them.** Blocked by: 2.7. For each place listed as failed in `progress.txt`: correct the address in the admin, or delete the place if it is closed or a duplicate.
  Done when: `select count(*) from places where enrichment_status = 'failed'` is 0, after a re-run of the script on those rows.
- [ ] **3.4 [HUMAN] Populate the editorial text.** Write the `pitch` for every place in the admin. Use the report from 3.1 to track which are left.
  Done when: the report shows every place has a pitch.
- [ ] **3.5 [HUMAN] Add photos.** Upload a photo for every place through the admin.
  Done when: the report shows every place has a photo.

## Phase 4: mobile release build

- [ ] **4.1 Align build numbering.** Set `cli.appVersionSource` to `local` in `apps/mobile/eas.json` and keep `ios.buildNumber` in `app.json` as the source of truth. Update the mobile README to say so (today it describes `autoIncrement`, which is not configured).
  Done when: README and `eas.json` agree and `cd apps/mobile && eas build:configure --platform ios --non-interactive` reports nothing to change. Prefix: `chore(mobile)`.
- [ ] **4.2 Bring Expo packages to the SDK-expected patch versions.** `npx expo install --check` in `apps/mobile` listed expo, expo-constants, expo-font, expo-router as a patch behind.
  Done when: `npx expo-doctor` passes 18 of 18 checks and `npm test` passes. Prefix: `chore(mobile)`.
- [ ] **4.3 Release candidate build.** Blocked by: 1.6, 2.8, 3.2, 3.3, 3.4, 3.5. Bump `ios.buildNumber`, export `SENTRY_AUTH_TOKEN` from root `.env` `SENTRY_KEY`, run `eas build --local --profile production --platform ios --output ./build-<n>.ipa`, then `eas submit --profile production --platform ios --path ./build-<n>.ipa`.
  Done when: EAS reports the submission accepted and the Sentry project has a new artifact bundle. Prefix: `chore(mobile)`.
- [ ] **4.4 [HUMAN] Device pass on the release candidate.** Blocked by: 4.3. Install from TestFlight. Cold launch, offline launch (cached list shows), pull to refresh, search, tag filters, saved places persist across relaunch, detail screen for 10 places, phone and website links open.
  Done when: all pass. Bugs go in `progress.txt` and become `fix(mobile)` tasks, then 4.3 repeats.

## Phase 5: App Store listing

- [ ] **5.1 [HUMAN] Decide the support email** and write it in `progress.txt`. Used by 5.2, 5.3, and the listing.
- [ ] **5.2 Privacy policy page at `/privacy`.** Blocked by: 5.1. On the Express public site, matching the existing site's look. Content: anonymous device ID sent with API requests; crash reports via Sentry including device model and OS version; saved places stored on device only; no accounts, no location, no ads, no third-party analytics. Contact email from 5.1.
  Done when: `curl -s -o /dev/null -w '%{http_code}' https://eastvillageeverything.nyc/privacy` prints 200 after deploy. Prefix: `feat(site)`.
- [ ] **5.3 Support page at `/support`.** Blocked by: 5.1. Contact email and a one-paragraph description.
  Done when: `curl -s -o /dev/null -w '%{http_code}' https://eastvillageeverything.nyc/support` prints 200. Prefix: `feat(site)`.
- [ ] **5.4 Screenshots.** Blocked by: 4.3. Capture from the iOS Simulator (`xcrun simctl io booted screenshot`) on iPhone 17 Pro Max (6.9") and an iPhone with a 6.5" display, against prod data: list, detail, search, filters, saved. Save to `docs/app-store/screenshots/<size>/`.
  Done when: the files exist at the pixel sizes App Store Connect requires. Prefix: `docs(app-store)`.
- [ ] **5.5 Listing copy.** Write `docs/app-store/listing.md`: name, subtitle, description, keywords, category, age rating answers (4+), and the App Privacy questionnaire answers (Identifiers: Device ID, used for app functionality, not linked to identity, not used for tracking; Diagnostics: crash data, not linked).
  Done when: the file exists. Prefix: `docs(app-store)`.
- [ ] **5.6 [HUMAN] Create an App Store Connect API key for fastlane.** App Store Connect > Users and Access > Integrations > App Store Connect API > generate a key with the App Manager role. Download the `.p8` once. Save it outside the repo (for example `~/.appstoreconnect/AuthKey_<KEYID>.p8`) and put `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_PATH` in the root `.env`.
  Done when: the three vars are in `.env`.
- [ ] **5.7 Upload metadata and screenshots with fastlane deliver.** Blocked by: 5.2, 5.3, 5.4, 5.5, 5.6. Add `apps/mobile/fastlane/` with a `Deliverfile` and a `metadata/en-US/` tree generated from `listing.md`, plus the screenshots. Run `fastlane deliver --skip_binary_upload --skip_app_version_update` using the key from 5.6. Set privacy policy URL and support URL.
  Done when: App Store Connect shows the copy, URLs, and screenshots on version 1.0.0. Prefix: `feat(app-store)`.
- [ ] **5.8 [HUMAN] Finish the parts fastlane cannot set.** Blocked by: 5.7. App Privacy questionnaire answers (from `listing.md`), age rating, pricing (free), availability, and the EU Digital Services Act trader question under Business > Compliance.
  Done when: App Store Connect shows the version as ready to submit with no missing-item warnings.

## Phase 6: submit

- [ ] **6.1 [HUMAN] Select the release candidate build and submit for review** in App Store Connect. Blocked by: 4.4, 5.8. Choose manual release.
- [ ] **6.2 Watch review.** Blocked by: 6.1. If rejected, add the rejection reason as a task under the relevant phase in this file and resolve it.
  Done when: status is Pending Developer Release.
- [ ] **6.3 [HUMAN] Release.** Blocked by: 6.2.

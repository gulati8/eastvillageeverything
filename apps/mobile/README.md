# eve-mobile

React Native + Expo client for East Village Everything.

## Quick start

```bash
cd apps/mobile
npm install
cp .env.example .env
# Edit .env: set EXPO_PUBLIC_API_BASE_URL to a URL your phone can reach
npx expo start
```

Press `i` for iOS Simulator or scan the QR with the Expo Go app on a
physical device. Note that `localhost` only works from the iOS Simulator.

## Environments

| Profile | EXPO_PUBLIC_API_BASE_URL | Defined in |
| --- | --- | --- |
| dev (local) | per-machine, set in `apps/mobile/.env` | `.env` |
| preview (EAS internal distribution) | `https://eastvillageeverything.nyc` | `eas.json` |
| production (TestFlight) | `https://eastvillageeverything.nyc` | `eas.json` |

There is no separate staging environment yet. Both `preview` and `production`
profiles point at the live production API. When staging is provisioned, change
the `preview` profile's `EXPO_PUBLIC_API_BASE_URL` in `eas.json`.

## API contract

The mobile app consumes the public JSON API at:
- `GET /api/places` — list of places (optional `?tag=` filter)
- `GET /api/places/:id` — single place
- `GET /api/tags` — flat tags
- `GET /api/tags?structured=1` — parent/child structured tags

Types live in `packages/shared-types/` (consumed via the `@eve/shared-types`
import alias, configured in `apps/mobile/tsconfig.json` and `metro.config.js`).

## Self-signed TLS in dev

`expo start` does not trust self-signed certificates over HTTPS. If your
local server uses TLS, use ngrok instead:

```bash
ngrok http 3000
# then paste the https URL into apps/mobile/.env
```

## Build pipeline

Build profiles in `apps/mobile/eas.json`:
- `development` — for `expo-dev-client` (debugger attached, internal distribution)
- `preview` — internal distribution, points at the prod API
- `production` — TestFlight / App Store distribution

### Build numbering

`cli.appVersionSource` is `local` in `eas.json`, so EAS reads the version and
build number from `app.json` and never changes them itself. `expo.version`
(`1.0.0`) is the marketing version and `expo.ios.buildNumber` is the App Store
build number. Both are the source of truth; nothing is stored remotely on EAS
and there is no `autoIncrement`.

Before each release build, bump `expo.ios.buildNumber` by hand in `app.json`
and commit it. App Store Connect rejects a build whose number it has already
seen for the same version, so a forgotten bump fails at submit time, not at
build time. `scripts/ralph/progress.txt` records which numbers are used.

### Local build (recommended)

```bash
cd apps/mobile
eas build --local --profile production --platform ios
```

Produces a signed `.ipa` on disk. Pass `--output ./build-<buildNumber>.ipa` so the
file name matches `expo.ios.buildNumber` (otherwise EAS names it `build-<timestamp>.ipa`). ~10–15 min on an Apple Silicon Mac. Bypasses EAS Cloud build quota.

Local prerequisites:
- Xcode 16.1+ (`xcodebuild -version`)
- Fastlane (`brew install fastlane`)
- An Apple distribution certificate + provisioning profile registered with the EAS project (the first run prompts to reuse or create them)
- `SENTRY_AUTH_TOKEN` exported in the shell. The Xcode build uploads source maps and dSYMs to Sentry and fails without it. EAS stores the token as a secret for cloud builds, but secrets are never delivered to local builds, so export it yourself (the root `.env` holds it as `SENTRY_KEY`):

  ```bash
  export SENTRY_AUTH_TOKEN="$(grep '^SENTRY_KEY=' ../../.env | cut -d= -f2- | sed -E 's/^"//; s/"$//')"
  ```

  The value in `.env` is wrapped in double quotes; the `sed` strips them. A
  quoted token is rejected by Sentry as `Invalid token`. Check with
  `npx sentry-cli info` before a long build.

### Submit to App Store Connect

```bash
eas submit --profile production --platform ios --path apps/mobile/build-<buildNumber>.ipa
```

The first run interactively prompts for App Store Connect auth (Apple ID + 2FA, or an ASC API key). EAS caches the credential for future runs, so subsequent submits can run non-interactively.

### App Store listing (metadata and screenshots)

The listing copy lives in `docs/app-store/listing.md` and the screenshots in `docs/app-store/screenshots/`. Neither is edited in App Store Connect by hand; regenerate the fastlane inputs and upload with `fastlane deliver` (Homebrew `fastlane`, config in `fastlane/Deliverfile`):

```bash
# from the repo root
node scripts/app-store-metadata.mjs            # writes apps/mobile/fastlane/metadata and screenshots/
cd apps/mobile
export ASC_KEY_ID=... ASC_ISSUER_ID=... ASC_KEY_PATH=...   # from the root .env (never commit these)
fastlane deliver --skip_binary_upload --skip_app_version_update
```

`fastlane/verify_listing.rb` prints what App Store Connect currently holds. App Review contact and notes are entered by hand in App Store Connect because the API requires a phone number that is not kept in the repo; the generator emits `metadata/review_information/` only once a `Phone` row exists in `listing.md`.

### TestFlight internal testers

Internal testers live in the `Team (Expo)` group in App Store Connect. The `submit.production.ios.groups` field in `eas.json` references this group exactly so future submits auto-attach the new build. The group itself must be created manually in App Store Connect once. Add testers to it via TestFlight → Internal Testing → `Team (Expo)` → + Testers.

See [Expo EAS docs](https://docs.expo.dev/build/introduction/).

## Android

Android store builds run on EAS's servers (`eas build --platform android`, no
`--local`). The JDK and SDK below exist only so the Android emulator can run
the APK for smoke tests and the device pass; nothing in the release pipeline
needs them.

### Install (Homebrew, one time)

```bash
brew install openjdk@17                      # JDK 17, keg-only, no sudo
brew install --cask android-commandlinetools # sdkmanager, avdmanager
```

The plan called for `brew install --cask temurin@17`, but that cask runs a
system `.pkg` installer under `sudo`; the `openjdk@17` formula is the same
JDK 17 and installs into Homebrew's prefix without a password. Nothing here
edits your shell rc files. Export these in every shell that runs Android
tools (or prefix each command with them):

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
```

`/usr/libexec/java_home -v 17` only finds this JDK after the optional symlink
Homebrew prints in its caveats (`sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk`).
Without it, use the `JAVA_HOME` above.

Then accept the licenses and install the SDK pieces and a Google APIs system
image (API 37 was the newest `google_apis;arm64-v8a` image on 2026-11-06):

```bash
yes | sdkmanager --licenses
sdkmanager --install "platform-tools" "emulator" "platforms;android-36" "build-tools;36.0.0" \
  "system-images;android-37.0;google_apis;arm64-v8a"
avdmanager create avd -n eve-pixel -k "system-images;android-37.0;google_apis;arm64-v8a" -d pixel_8 --force
```

`avdmanager` may print `Could not load devices from .../devices.xml`; the AVD
is still created (check `emulator -list-avds`). `eve-pixel` is a Pixel 8
profile, 1080x2400 at 420 dpi, which is also the Play Store screenshot size.

### Run the emulator

```bash
emulator -avd eve-pixel                                  # with a window
emulator -avd eve-pixel -no-window -no-audio -no-boot-anim &   # headless, for scripts
adb wait-for-device shell 'while [ "$(getprop sys.boot_completed)" != "1" ]; do sleep 2; done; echo booted'
adb install -r build-1.apk
adb shell am start -n com.eastvillageeverything.app/.MainActivity
adb exec-out screencap -p > shot.png
adb emu kill
```

A cold headless boot takes about 25 s on an Apple Silicon Mac. Inside the
emulator, the Mac's `localhost` is `10.0.2.2`, so a local API is
`http://10.0.2.2:3000` (set `EXPO_PUBLIC_API_BASE_URL` to that). The
emulator installs APKs
only, so use the `preview` profile (`buildType: apk`) for emulator builds;
`production` builds an app bundle for Play.

## State management

TanStack Query (`@tanstack/react-query`) with an AsyncStorage persistor. On cold
launch, the persisted cache hydrates synchronously before the first network
response arrives.

Key defaults (see `src/state/queryClient.ts`):
- `staleTime`: 60 000 ms
- `gcTime`: 24 h (cache survives across launches)
- `retry`: 2, exponential backoff capped at 30 s

The cache buster is derived from the app version (`Constants.expoConfig.version`).
A version bump invalidates the persisted cache, preventing a stale schema from
surviving an update. AsyncStorage key: `eve.tanstack-cache`.

## Anonymous device ID

On first launch, `src/identity/deviceId.ts` generates a UUID v4 and stores it
in SecureStore under the key `eve.device_id`. It is never rotated by the client
(only cleared on reinstall or a future "Reset device" support flow). The ID is
cached in module memory after the first read to avoid repeated SecureStore calls.

Every API request carries the header `X-Device-Id: <uuid>`. This is how the
server correlates requests across sessions for future phases (favorites, push).
There is no authentication; the device ID is anonymous.

## Error reporting

Sentry is initialized at module load (in `app/_layout.tsx`) when
`EXPO_PUBLIC_SENTRY_DSN` is set. If the variable is absent (typical for local
dev), the SDK is a no-op — no error is thrown.

The `beforeBreadcrumb` hook scrubs any breadcrumb data keys matching
`lat`, `lng`, `latitude`, `longitude`, or `coord`. This is forward-defensive
for Phase 3 (location features); Phase 1 generates no location data.

Set `EXPO_PUBLIC_SENTRY_DSN` in `.env` to enable crash reporting locally. See
`.env.example` for the variable name.

## Tests

`jest` with the `ts-jest` preset (Node test environment, no React Native runtime mock — most tests are pure data/logic). See `apps/mobile/jest.config.js` and `apps/mobile/jest.setup.ts` for setup, including the virtual mocks for `expo-secure-store`, `expo-haptics`, `react-native-reanimated`, and `react-native-gesture-handler`.

```bash
cd apps/mobile && npm test
```

## CI

`.github/workflows/typecheck.yml` runs `tsc --noEmit` on both the server and
the mobile app on every push and pull request. This catches type drift across
the `packages/shared-types/` boundary before it reaches a build.

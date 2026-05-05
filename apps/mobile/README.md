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
- `production` — TestFlight / App Store distribution; `autoIncrement: true` bumps the build number on every build

### Local build (recommended)

```bash
cd apps/mobile
eas build --local --profile production --platform ios
```

Produces a signed `.ipa` on disk at `apps/mobile/build-<timestamp>.ipa`. ~10–15 min on an Apple Silicon Mac. Bypasses EAS Cloud build quota.

Local prerequisites:
- Xcode 16.1+ (`xcodebuild -version`)
- Fastlane (`brew install fastlane`)
- An Apple distribution certificate + provisioning profile registered with the EAS project (the first run prompts to reuse or create them)

### Submit to App Store Connect

```bash
eas submit --profile production --platform ios --path apps/mobile/build-<timestamp>.ipa
```

The first run interactively prompts for App Store Connect auth (Apple ID + 2FA, or an ASC API key). EAS caches the credential for future runs, so subsequent submits can run non-interactively.

### TestFlight internal testers

Internal testers live in the `Team (Expo)` group in App Store Connect. The `submit.production.ios.groups` field in `eas.json` references this group exactly so future submits auto-attach the new build. The group itself must be created manually in App Store Connect once. Add testers to it via TestFlight → Internal Testing → `Team (Expo)` → + Testers.

See [Expo EAS docs](https://docs.expo.dev/build/introduction/).

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

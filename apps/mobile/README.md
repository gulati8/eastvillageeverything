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
| preview (EAS internal build) | `https://staging.eastvillageeverything.com` | `eas.json` |
| production (TestFlight / Play) | `https://eastvillageeverything.com` | `eas.json` |

If staging is not yet provisioned, the preview build talks to production.
That is acceptable for v1. Update `eas.json` once staging exists.

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

EAS Build profiles in `eas.json`:
- `development` — for `expo-dev-client`
- `preview` — internal distribution
- `production` — store distribution

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

`jest` + `ts-jest` via the `jest-expo` preset.

```bash
cd apps/mobile && npm test
```

## CI

`.github/workflows/typecheck.yml` runs `tsc --noEmit` on both the server and
the mobile app on every push and pull request. This catches type drift across
the `packages/shared-types/` boundary before it reaches a build.

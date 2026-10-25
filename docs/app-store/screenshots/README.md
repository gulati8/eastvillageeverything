# App Store screenshots

Captured for task 5.4 from the iOS Simulator against production data
(`EXPO_PUBLIC_API_BASE_URL=https://eastvillageeverything.nyc`), running the
app in Expo Go with Metro in production mode (`npx expo start --no-dev --minify`).

| Folder | Simulator | Pixels | App Store Connect slot |
| --- | --- | --- | --- |
| `6.9/` | iPhone 17 Pro Max, iOS 26.3 | 1320 x 2868 | iPhone 6.9" display |
| `6.5/` | iPhone 11 Pro Max, iOS 18.3 | 1242 x 2688 | iPhone 6.5" display |

Five shots per size, in upload order:

1. `01-list.png` — Home list, no filters.
2. `02-detail.png` — Ace Bar detail (photo, pitch, Perfect when, The move, specials).
3. `03-search.png` — search for "pool" (11 of 313 match).
4. `04-filters.png` — filter sheet with Happy Hours and Pool Tables selected.
5. `05-saved.png` — Saved tab with four bookmarked places.

Status bar is overridden with `xcrun simctl status_bar <udid> override --time 9:41
--batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3`.
The PNGs are re-encoded without an alpha channel (App Store Connect rejects
screenshots that have one); `sips -g hasAlpha file.png` must print `no`.

To recapture: boot the simulator, install Expo Go, open
`exp://127.0.0.1:8081` (list) or `exp://127.0.0.1:8081/--/place/<key>`
(detail) with `xcrun simctl openurl`, drive taps with `cliclick` against the
Simulator window set to Window > Point Accurate with device bezels hidden, then
`xcrun simctl io <udid> screenshot out.png`.

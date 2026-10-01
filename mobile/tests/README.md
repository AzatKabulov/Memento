# Gesture regression checks

The regular unit suite is `npm test`. Browser regressions run separately against
a credential-free Expo static export with synthetic sample memories. They use a
fresh mobile-sized browser context, real browser touch events, and no existing
cookies or sessions.

From `mobile`, export the sample app in PowerShell:

```powershell
$env:EXPO_NO_DOTENV='1'
$env:EXPO_PUBLIC_SUPABASE_URL=''
$env:EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=''
npx expo export --platform web --clear --output-dir dist-preview
```

`--clear` is required: Metro can otherwise reuse previously inlined environment
values. Use a separate shell for subsequent production builds.

With Playwright available, run:

```powershell
node --test tests/gestures.browser.mjs
```

If Playwright or the browser is supplied by external tooling rather than local
dependencies, set `MEMENTO_PLAYWRIGHT_PATH` to its `index.mjs` file and
`MEMENTO_BROWSER_PATH` to the browser executable. `MEMENTO_TEST_DIST` can point to
a different static export. The server binds only to localhost and returns the
Expo entry point for app routes.

These checks cover returning to the browsed month, retaining a decoded incoming
photo through navigation, repeated touch swipes, calendar month swipes, persistent
preview expansion/dismissal, drag reversal, and visible account action surfaces.
Boundary swipes and reduced-motion navigation are also covered.
Free preview dragging is checked in both coordinates, including diagonal reversals,
horizontal drags with vertical drift, smooth spring return, boundary overswipes,
and a second touch that interrupts the return. The backdrop check verifies a real
blur filter with translucent color, so the calendar remains visible underneath.
A short quick drag held still before release must also spring back without using
the earlier movement's stale velocity to navigate or dismiss.
Free-flow preview checks hold diagonal drags, reverse direction without lifting,
follow both coordinates during horizontal browsing, and verify intermediate
spring-return positions after a short drag. The backdrop check requires a real
blur filter with a translucent fill so the calendar remains visible.
The video check generates a tiny synthetic clip locally, chooses it through the
existing sample diary's library picker, then verifies inline playback and player
center taps that mute/unmute. It creates no cloud account or cloud media.
The dismissal interruption check retouches the moving preview to ensure closing
cannot leave an invisible overlay intercepting calendar taps.
They do not establish frame rates on physical Android or iPhone hardware.

Run the synthetic thumbnail checks with:

```powershell
node --test tests/thumbnails.browser.mjs
```

They verify preview size, account isolation, reuse, sign-out cleanup, and deletion
during a blocked image decode. The decode-race check reloads afterward to verify
persistent storage as well as the in-memory cache.

For a repeatable desktop frame-timing comparison under four-times CPU throttling:

```powershell
node scripts/profile-gestures.mjs path/to/baseline-export path/to/new-export
```

This profiles three already decoded next/previous photo round trips under the
same browser conditions, reporting frame gaps and sample-photo transfer sizes.
It does not simulate iPhone Safari's renderer or native Android performance.

For preview dragging and backdrop composition under the same conditions:

```powershell
node scripts/profile-preview.mjs path/to/baseline-export path/to/new-export
```

This records three runs of three warm-photo diagonal drag/reversal/return gestures.
Run it after builds and other browser suites finish to avoid compilation or test
contention. RAF gaps measure browser scheduling, not physical-device display FPS.

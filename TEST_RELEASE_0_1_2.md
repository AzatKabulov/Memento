# Memento 0.1.2 — free-flow previews

## Changes

- A held preview follows both coordinates of the finger, including diagonal movement and reversals. It decides whether to browse or dismiss when the finger lifts.
- Short drags settle with a damped spring. A swipe dismissal continues along the release direction instead of forcing the photo onto a vertical path.
- Pausing a short drag before lifting the finger clears stale swipe velocity, so the preview returns to center instead of unexpectedly browsing or closing.
- The calendar remains visible behind a translucent, gently blurred backdrop. Blur strength stays fixed during movement; only the backdrop opacity and photo transforms animate.
- Hold-to-open, tap outside to close, left/right browsing, circular video playback, and on-player audio controls remain available on Android and the PWA.

The shared pager and preview motion run without React state updates on every gesture frame. Android uses Expo SDK 57's explicit blur target and the efficient Android 12+ blur method; older Android versions use a translucent fallback. The PWA uses a 6px backdrop filter on the fading element itself, including Safari's prefixed filter.

## Verification

The added browser regressions first fail on release 0.1.1: diagonal movement loses its horizontal coordinate, horizontal movement loses its vertical coordinate, and the backdrop is opaque. The new checks also require intermediate spring-return positions and a persistent preview after a short drag. Tests use synthetic sample memories and no account credentials.

A separate regression reproduces a quick 45px diagonal drag followed by a stationary 150ms hold. The earlier web handler retained the last move's velocity and closed the preview. The fixed handler recognizes release from rest while preserving normal flicks and distance thresholds.

- TypeScript, ESLint, source formatting, and 18 unit tests pass.
- All 22 isolated mobile-browser regressions pass, including video audio taps, thumbnail deletion races, paused release, boundary drags, and interrupted spring return. No browser runtime errors were recorded.
- Three warm preview gesture runs per build in desktop Chromium at four-times CPU throttling: baseline p95 frame gaps 5.2–5.3ms; updated p95 5.3ms. Maximum gaps were 5.6ms before and 10.1ms after; neither build recorded a gap above 50ms. Each drag was checked to retain and center the same photo. This is a browser scheduling check, not a physical-phone or GPU frame-rate claim.
- Production PWA export and Android release build succeed. The APK keeps the existing signing certificate, uses version code 3, and includes arm64-v8a and x86_64 binaries.
- Android emulator checks pass: persistent hold preview, visible native blur, held diagonal movement and reversal, spring return, next/previous browsing, diagonal dismissal, and retention of September. No Android or React Native runtime errors were recorded. A separate sample APK is used for gesture testing; the configured production APK is restored afterward.
- The final hosted PWA opens the email sign-in screen in a fresh browser with no runtime errors and the expected theme background.

Desktop browser checks do not establish physical iPhone or Android frame rates. Gesture feel and video playback still need testing on the owner's phones.

## Installation

Install the new APK over the existing Memento installation. Do not uninstall it or clear its data. Close and reopen the existing Home Screen PWA after deployment. No account reset or diary migration is needed.

[Download Android 0.1.2](https://github.com/AzatKabulov/Memento/releases/download/v0.1.2/Memento-0.1.2.apk) · [Open Memento PWA](https://memento.expo.app)

APK SHA-256: `5bb27cf0815c911465a7eaa437d33e8db880397861d1c54c3d217bf99987f091`.

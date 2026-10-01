# Memento 0.1.1 — phone feedback update

## Changes

- Returning from a moment keeps the calendar month you were browsing.
- Swipe left/right to change months or saved moments. Adjacent pages move together with the finger and settle according to swipe velocity.
- Hold a calendar photo to expand it into a persistent preview. Tap outside to shrink it back, or swipe vertically to dismiss it. Reversing a held drag updates its position directly.
- Preview and full-view photos retain their decoded image when becoming the selected page, avoiding the previous image handoff and fade.
- Video audio uses an on-player speaker icon. A tap changes audio immediately; neighboring videos pause.
- Separate email sign-in, account creation, and password-reset screens replace the photo welcome page. Form entrance and button feedback respect reduced-motion settings.
- The calendar, root background, and safe-area background use the same theme color.
- Web calendars reuse account-scoped 512px JPEG previews. Background preparation is capped at 128 recent photos; mounted calendar pages prepare older photos as needed. Deletion/replacement invalidates immutable media paths immediately, including pending decodes. Sign-out clears that account's previews.

Android and web use the same calendar, preview, carousel, and account components. Native gestures use Reanimated worklets on the UI thread; web gestures update transforms without React state changes on every frame. Only three neighboring pages are mounted, and full-screen blur was removed from the preview transition to reduce compositing cost.

## Verification

- TypeScript, ESLint, formatting, and 18 unit tests.
- 15 isolated mobile-browser regression checks, using real touch events and synthetic sample memories. The original build failed month retention, stable incoming-image identity, full-view swiping, and month swiping checks. New tests also reproduce interrupted preview dismissal, deletion during a blocked thumbnail decode, and a disabled photo-control ancestor blocking video sound taps.
- Synthetic 2400×1800 photo: original data URI 5,264,898 characters; cached 512×384 preview 5,003 characters. Persistence, account isolation, sign-out removal, and deletion races are checked in a real browser.
- Same desktop browser at four-times CPU throttling, three decoded next/previous round trips: longest frame gap 95.1ms before / 54.1ms after; gaps over 50ms 6 before / 1 after. Median remained 6ms; p95 was 6.1ms before / 6.3ms after. These measurements concern desktop scheduling and do not establish frame rates on an iPhone or Android phone.
- Production web export and local Android release build. Expo Doctor: 21/21 checks after SDK 57 patch updates.
- Android emulator smoke checks: redesigned account screens open; a separate credential-free sample APK exercises calendar and preview gestures. Production and sample artifacts are kept separate.
- A synthetic MP4 saved through the sample library flow plays inline in a circular frame. Center taps mute and unmute the real browser player without pausing it.

Physical-device photo/video playback, audio, and perceived smoothness still need the owner's testing. Browser photo tests do not verify Safari's video autoplay policies. The APK is an internal test build signed with the existing debug key, with arm64-v8a and x86_64 support.

The dependency audit reports 16 moderate findings and no high/critical findings in the current Expo dependency tree. The proposed forced audit repair downgrades Expo and Router across SDK generations; it is not compatible with this release.

## Installation and rollback

Install the updated APK over Memento without uninstalling it. Open the existing PWA at https://memento.expo.app; close and reopen its Home Screen window after deployment. No diary schema migration or account reset is needed.

For a web rollback, redeploy the last known-good EAS Hosting deployment. For Android, keep the previous APK and rebuild that commit with a higher version code if a rollback is necessary; do not clear diary data to downgrade.

Browser reproduction commands and environment isolation are documented in `mobile/tests/README.md`.

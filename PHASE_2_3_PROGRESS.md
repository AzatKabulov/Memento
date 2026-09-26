# Phase 2–3 progress

## Phase 2 — design

The owner selected the **matte photo album** direction as an aesthetic reference, then clarified that Memento should have only a calendar view. The [visual reference](design/matte-album-concept.png) is a mood guide, not a second view or literal layout. `DESIGN.md` records the palette, type, media treatment, interaction rules, and states.

A clickable Expo prototype now connects welcome → monthly calendar → date → camera or library → editor → viewer → edit. The current month opens first. Photos fill their calendar dates; the date label covers only a small corner. Rounded translucent controls and a floating blurred capture action frame the calendar. Empty past days open the library directly; today opens the camera with a library option; future dates are inactive. There is a year jump, sample memories, a quiet hold preview, and separate settings placeholders.

The [welcome](design/prototype-welcome.png), [calendar](design/prototype-calendar.png), and [moment viewer](design/prototype-moment.png) were visually checked in a 390 × 844 web viewport. The calendar keeps seven columns, with slightly tighter gaps to give each photo more area. A past-date library import was exercised through the editor and saved to the moment viewer in the web prototype. Native scaling, blur performance, and large-text behavior still need device checks.

Still to design and review: full sign-in/recovery states, long-video trimming, complete permission/offline/failure screens, backup/restore/export flows, accessibility pass, and physical-device interaction polish. These depend on later working services and native proof.

## Phase 3 — setup and media feasibility

Completed:

- Expo SDK 57, React Native, TypeScript, Expo Router, and SDK-matched camera, image-picker, image, video, and blur modules installed.
- App identifiers and camera/microphone/library permission descriptions configured for iOS and Android.
- A provisional Memento launcher icon replaces Expo's template icon.
- Prototype can request camera access for today, take a photo, record a video capped at 60 seconds, import a library photo/video, reject imported videos over 60 seconds, preview videos in a circular mask, and open a focused viewer with playback controls. These are code paths, not yet device-verified behavior.
- Typecheck and lint pass; web, Android, and iOS JavaScript bundles export; Expo Doctor passes 21/21 checks.
- GitHub Actions checks install from lockfile, lint, typecheck, verify formatting, and export bundles.

Native proof still required on physical Android and iPhone: capture/import including cloud-library media, microphone permissions and sound transitions, circular Android video clipping/overlap, hold and scroll interactions, video trimming and compression, thumbnail generation, HEIC/HEVC handling, battery/memory limits, and a credible preview budget. No iPhone or Android device was connected during this pass. Authentication provider credentials, backend environments, signed builds, and real sign-in return flow also remain open.

**Phase 2 and Phase 3 remain in progress.** The prototype is intentionally nonpersistent and uses generated sample photographs, so it must not be used as someone's real diary yet.

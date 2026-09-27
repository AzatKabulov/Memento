# Phase 9 — reliability, performance, and accessibility

Phase 9 is in progress. This is an assembled-app verification pass, not a release sign-off. Earlier phases still have native and backend acceptance checks open.

## Verified so far

- The signed Android 0.1.0 APK installed and launched on a Pixel 7 Android 16 (API 36) x86_64 emulator. First run, sample calendar, saved-moment viewer, past-date system photo picker, editor, and saving an imported photo all opened without an observed crash. Camera permission and capture reached the editor; the emulator's preview was black, so image quality and real hardware capture remain unverified. The app was in sample mode because Supabase is not configured; this did **not** verify durable storage. No app crash appeared in the emulator crash log during these flows.
- Automated checks: 14 unit tests, TypeScript, lint, and source formatting pass. The tests cover calendar boundaries, date validity, media limits, reminder scheduling, archive headers/checksums, and backup retry decisions.
- A code review found that diary loading could delete a newly copied file before its database transaction committed. Eager orphan-file deletion on load was removed; failed writes still delete their own temporary copies. Orphan reclamation needs a future serialized maintenance path.
- Date validation now rejects impossible dates before local save or archive restore.
- At 150% Android text size, two-digit labels on filled calendar tiles clipped. The badge now allows more room and caps scaling for its visual number; the tile's accessibility label still states the full date. The rebuilt APK visually showed complete two-digit labels. A separate 200% check exposed an overlapping month heading and navigation summary; after a second rebuild, both wrap without overlap and the calendar remains usable.

## Required before Phase 9 can pass

- Run the complete daily flow on a physical Android phone and iPhone, including camera, microphone, 60-second video, gallery import, replacement, deletion, and app restart.
- Verify the owner-created Supabase project and email delivery, then test email account flows, offline diary persistence, two-account isolation, cloud restore on a second device, interrupted uploads, and conflict resolution. Google and Apple sign-in are deferred.
- Restore an exported mixed-media archive on both platforms; check reminders across permissions and time-zone changes.
- Test VoiceOver and TalkBack, 150% and larger text, reduced motion, contrast, and the non-hold path to every memory.
- Measure startup, save, calendar scrolling, memory, and video preview behavior with 365 and 1,825 entries on named devices. No performance limit has been established from emulator results.
- Rehearse database-plus-media recovery and finish account deletion before a real-memory beta. No real diary should be entrusted to the sample-mode APK.

**Phase 9 remains open.** The emulator smoke test cannot establish real camera, codec, battery, accessibility-service, or iPhone behavior.

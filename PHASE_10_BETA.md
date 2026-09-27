# Phase 10 — real-use beta

**Status: preparation.** No real-use beta has started, no TestFlight or Play test build has been uploaded, and no release candidate has been declared. The current Android APK runs in sample mode because Memento has no configured Supabase project; new moments disappear after restart. It must not be used to judge diary reliability or collect real memories.

The owner needs a [Supabase account and project](https://supabase.com/dashboard). After creating it, the project's Connect dialog provides the URL and **publishable** key needed by Memento; keep database passwords and secret/service-role keys out of the mobile app and repository. The app accepts these values through `mobile/.env` for local testing and through the beta build environment later. [Supabase API key guide](https://supabase.com/docs/guides/getting-started/api-keys). Supabase's Free project currently caps each file at 50 MB. Memento now caps videos at 45 MiB so the beta remains below that limit without a paid plan; the 60-second duration limit remains. [Storage limits](https://supabase.com/docs/guides/storage/uploads/file-limits).

## Entry gates

1. Create an owner-controlled Supabase Free project; apply the private-diary migration, configure email/Google/Apple sign-in, and supply its project URL and publishable key to both beta builds. Verify that captured and imported 60-second videos fit the 45 MiB file limit.
2. Finish Phase 9 on physical Android and iPhone devices. Saving, editing, replacing, deleting, offline use, restart, video/audio, reminders, export/import, two-account isolation, and fresh-device cloud restore must pass. Resolve known data-loss or cross-account defects before inviting testers.
3. Implement and verify account deletion and a database **plus media** recovery procedure. Restore a disposable mixed-media diary into a test environment; the cloud sync copy alone is not a recovery plan.
4. Confirm the owner controls the Expo, Apple Developer/App Store Connect, and Google Play Console accounts, signing credentials, support contact, and tester list. Record the exact build numbers and backend environment used for testing.

## Beta sequence

1. **Owner pilot:** Use disposable, non-sensitive photos and videos on both phones for at least one week. Add one moment daily, deliberately miss a day and backfill it, try a 60-second video, edit and replace a moment, restart offline, reconnect, and restore an export and cloud copy on a second device. Record any failed saves or confusing steps immediately.
2. **Small invited group:** Once the owner pilot is stable, invite Android and iPhone testers for at least two weeks. Include a natural month change when possible and use controlled test dates for leap-day, time-zone, and daylight-saving cases. Ask each tester to try reminders, video sound, long-press preview, the tap alternative, and returning to the diary after missed days.
3. **Triage every report:** Record platform, phone model, OS version, app build, time zone, steps, expected/actual behavior, frequency, and whether the entry survived restart and restore. Do not put personal photos, captions, tokens, or signed media links in GitHub issues or logs. Mark data loss, unintended account access, failed restore, and repeatable save crashes as release blockers.
4. **Release candidate:** Fix blockers, retest the affected journey on both platforms, and repeat the recovery trial. Only then select an exact Android and iOS build as the candidate for Phase 11.

The `preview` EAS profile remains an installable Android APK for quick checks. The new `beta` profile is a **store-distribution** profile: iOS builds can go to TestFlight and Android builds are app bundles for a Play testing track. It is only configuration; it does not create a build, connect store accounts, or start a beta. [Expo EAS build profiles](https://docs.expo.dev/build/eas-json/), [Expo TestFlight distribution](https://docs.expo.dev/submit/testflight/), [Expo Android submission](https://docs.expo.dev/submit/android/).

External TestFlight testers may require Apple's beta review. If the owner uses a personal Play developer account created after 13 November 2023, Google currently requires 12 testers continuously opted into a closed test for 14 days before applying for production access; recheck the account's actual eligibility before scheduling release. [Apple TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/), [Google Play testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en).

**Next executable step:** establish the Supabase project and complete the physical-device Phase 9 checks. Until those gates pass, Phase 10 remains preparation rather than a live beta.

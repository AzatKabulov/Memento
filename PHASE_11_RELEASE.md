# Phase 11 — release preparation

**Status: preparation only.** The owner has a Supabase Free project and a locally configured Android APK, but the Supabase migration and redirects are not confirmed, physical-device QA is incomplete, no real-use beta has run, and there is no release candidate. Nothing has been submitted to either store.

## Store listing draft

**Name:** Memento (check availability in each developer account before reserving a listing).

**Apple subtitle:** One moment, every day

**Short description:** A private photo and video diary, arranged as a calendar.

**Full description:**

> Memento gives each day a place to live. Save one photo or a short video, add a few words if you like, and revisit your life through a visual calendar. Open a date to see the moment up close. Missed a day? Add a photo or video from your library later. Gentle reminders are optional, and there are no streaks, likes, or public profiles in Volume 1.

Review this copy against the final build. Do not claim working cloud recovery, Google/Apple sign-in, or account deletion until those paths pass device and backend tests. Use real app screenshots made with disposable diary content: populated calendar, camera/video capture, focused moment, and backup/settings. Do not publish screenshots containing a tester's private moments.

## Data-handling inventory for disclosure review

| Data | Current implementation | Release check |
| --- | --- | --- |
| Account email and authentication | Supabase Auth; email/password flow exists. Google/Apple are still planned. | Confirm providers, confirmation email delivery, reset, token handling, and deletion. |
| Photos, videos, captions, dates | Stored in app-private local storage; cloud sync code targets a private Supabase Storage bucket and owner-scoped database rows. | Verify migration, RLS, upload/download, restore, retention, and complete deletion on two accounts. |
| Reminders | Local notification setting and schedule. | Confirm platform permission prompts and behavior on real phones. |
| Archive exports | User-initiated portable archive shared through the phone's share sheet. | Verify what leaves the app and warn that anyone with an exported archive can read it. |
| Camera, microphone, photo library | Requested for capture or import. | Audit permission text, native manifests, and actual access on both phones. |
| Analytics, ads, tracking | None intentionally integrated in this repository. | Recheck final dependency/build inventory before answering store questionnaires. |

This inventory is a review worksheet, **not** a published privacy policy or a completed Apple App Privacy/Google Data safety form. The owner must provide a public support contact and a public privacy-policy URL. The final policy and store answers must match the shipped build, Supabase configuration, actual retention/recovery process, and any later SDKs. Apple requires a privacy-policy URL and app privacy answers; Google requires Data safety answers. [Apple App Privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy), [Google account deletion and Data safety](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en).

## Release gates

- [ ] Confirm Supabase redirect URLs and apply/verify `supabase/migrations/202609270001_private_diary.sql` in the owner project. Test email sign-up, confirmation, reset, private media, and two-account isolation.
- [ ] Implement Google and Apple sign-in if they remain promised Volume 1 providers; test both on devices. The current app implements email only.
- [ ] Finish Phase 9 physical Android/iPhone testing and Phase 10 owner/invited beta. Record build numbers and backend environment; resolve data-loss and privacy blockers.
- [ ] Implement secure account deletion in the app and a public web request path. The server must remove private media, diary rows, Auth identity, and any retained copies according to a disclosed retention rule. Revoke Apple sign-in tokens when applicable. Test interrupted and repeated requests. Do not expose an untested deletion control. [Apple account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app), [Google Play account deletion](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en).
- [ ] Test a **database plus Storage** recovery drill. Supabase database backups do not cover Storage objects; see `supabase/OPERATIONS.md`.
- [ ] Verify account ownership for Expo, Apple Developer/App Store Connect, and Google Play Console; check current submission and testing requirements in those accounts. Paid store memberships are separate from the Supabase Free project. [Expo store build guide](https://docs.expo.dev/deploy/build-project/).
- [ ] Decide support email, public privacy-policy URL, deletion-request URL, operator identity, retention period, and supported regions. Publish accurate pages before entering store forms.
- [ ] Audit icon, splash, permission prompts, age rating, accessibility, store name, and actual-device screenshots. Complete Apple privacy and Google Data safety forms from the final build's data flows.
- [ ] Configure the EAS environment for the chosen store profiles; keep service-role keys out of the app. Create signed Android App Bundle and iOS archive, then verify signing, launch, sign-in, upgrade from beta, and diary persistence.
- [ ] Provide reviewers with a working demo account or precise review instructions. Owner reviews final listing, build, and rollout choice before public publication.

`mobile/eas.json` has separate `beta` and `production` store-distribution profiles. They are configuration only: no credentials, cloud build, TestFlight upload, Play upload, or release is created by adding them. Production Android builds default to App Bundles; the `preview` profile remains an installable APK for private Android testing. [Expo EAS build profiles](https://docs.expo.dev/build/eas-json/), [Expo store build guide](https://docs.expo.dev/deploy/build-project/).

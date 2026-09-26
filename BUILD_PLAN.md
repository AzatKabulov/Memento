# Memento — Volume 1 build plan

Status: Phase 1 product specification complete. Phase 2 design and Phase 3 native validation remain in progress. Phase 4 account and offline-storage work has begun. Phase 5 capture and editor work has begun; see PHASE_5_PROGRESS.md. The Phase 1 behavior brief is PHASE_1_SPEC.md; visual decisions are in DESIGN.md.

The current implementation and unverified native work are recorded in [Phase 2–3 progress](PHASE_2_3_PROGRESS.md).

Prepared: 26 September 2026. Platform and store requirements must be checked again before implementation and submission.

## 1. The result we are building

A cozy, private diary for iPhone and Android. Each calendar date can contain one photograph or a video up to 60 seconds with an optional caption. Users create an account through Google, Apple, or email, then capture new moments, import old ones, explore their calendar, and recover or export their memories.

Volume 1 includes the entire personal experience: photos, videos, circular presentation, muted calendar playback, press-and-hold preview, editing, reminders, offline access, private cloud backup, recovery, and export.

Volume 2 holds social calendars, public/private profiles, access requests, friends, and per-date audiences. Monthly collages, annual recap videos, and anniversary memories remain later additions.

The repository contains an Expo prototype. This plan starts with product rules and finishes with release and maintenance. Public app-store publication is a later release step; drafting this plan does not authorize account purchases or publication.

## 2. Working decisions

Confirmed requirements come from PRODUCT.md. Account requirements and the 60-second limit below are confirmed by the user. Other rows are proposed defaults, to make the draft actionable without representing them as approved decisions.

| Decision | Proposed starting point | When to settle it |
|---|---|---|
| Accounts — confirmed | Account required; Google, Apple, or email sign-in | Implement in Phases 3–4 |
| Video length — confirmed | Up to 60 seconds | Validate in Phases 3 and 5 |
| Email method — decided | Email and password, with verification and password reset | Implement in Phase 4 |
| Long imported videos | Let the user select a short segment; never silently discard the rest | Phase 3 technical prototype |
| Caption length | Up to 500 characters, with a quiet counter near the limit | Phase 1 |
| Dates — confirmed | In-app capture for today; gallery import for today or a past date; no future entries | Implement in Phases 5–6 |
| Media framing — confirmed | Videos appear circular by default; preserve the underlying saved segment beyond its visual crop | Refine visual treatment in Phase 2 |
| Gestures | Tap opens the date and its audio; hold expands a muted preview; releasing returns to the calendar | Phase 2 |
| Languages | English first, with text structured for translation | Phase 1 |
| Devices | Phone layouts first; decide tablet support before store configuration | Phase 1 |
| Appearance | Warm light and dark appearances, respecting system text and motion preferences | Phase 2 |
| Cloud service | Supabase for authentication, entry data, and private media storage | Phase 3 |
| Pricing | No payment feature assumed; decide a sustainable storage allowance before public release | Phase 7 |

The first sign-in requires connectivity. Afterward, the user's locally saved diary should remain usable offline; cloud operations resume after connectivity and authentication are available. Exact colors, fonts, and controls will be decided during design, not invented as approved requirements in this plan.

## 3. Proposed technical foundation

| Part | Proposed approach | Purpose |
|---|---|---|
| Mobile application | React Native + Expo + TypeScript | Share most application logic between iPhone and Android while respecting platform behavior |
| Navigation | Expo Router with native navigation patterns | Calendar, moment viewer, capture/editor, and settings |
| Local records | SQLite with versioned migrations | Store dates, captions, media references, preferences, and upload state |
| Local media | Durable app file storage | Keep imported/captured files independent of temporary picker files |
| Capture/import | Expo Camera and ImagePicker | Take pictures, record videos, and select existing media |
| Playback | Expo Video | Muted previews and a focused video player |
| Motion/gestures | React Native gesture and animation libraries selected with the Expo version | Hold-to-preview, smooth transitions, and accessible alternatives |
| Private cloud | Supabase Auth, Postgres, and private Storage | Identify the owner and restore their diary on another device |
| Reminders | Local notifications | Gentle reminders without requiring a push-notification service |
| Builds | Expo development builds and EAS Build | Test native behavior and generate Android/iOS release builds |

Expo documents a shared Android/iOS application workflow, local SQLite persistence, file storage, and native media APIs. These tools cover much of the foundation, but do not automatically provide our editor, durable synchronization, or privacy rules. [Expo overview](https://docs.expo.dev/tutorial/introduction/), [SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/), [FileSystem](https://docs.expo.dev/versions/latest/sdk/filesystem/), [Camera](https://docs.expo.dev/versions/latest/sdk/camera/), [ImagePicker](https://docs.expo.dev/versions/latest/sdk/imagepicker/).

Use a development build early. EAS supports cloud builds from the current Windows workflow; local iOS simulation/debugging needs the Apple development environment, and real iPhone testing remains necessary. The planned EAS physical-iPhone workflow needs an Apple Developer account. [Expo CLI](https://docs.expo.dev/more/expo-cli/), [development builds](https://docs.expo.dev/develop/development-builds/introduction/), [iPhone cloud builds](https://docs.expo.dev/tutorial/eas/ios-development-build-for-devices/).

## Phase 1 — Define the exact first release

**Purpose:** Turn the idea into a clear set of behaviors that can be implemented and tested.

Work:

- Record Volume 1 features and the separate Volume 2 backlog.
- Record the confirmed account, date, and circular-video rules in PHASE_1_SPEC.md. Settle remaining implementation choices such as imported-video trimming through the Phase 3 device prototype.
- Define one moment per local calendar date. The chosen date stays fixed when the user travels or changes time zone.
- Define what happens when a date already has a moment: explicit replacement or cancellation, never silent overwriting.
- Define deletion, date changes, unsaved drafts, and empty/future days.
- Set supported phone/OS targets after checking the selected Expo release and available test hardware.
- Inventory access needed later: an iPhone, an Android phone, Expo, backend hosting, Apple Developer, and Google Play Console accounts.
- Identify who owns release accounts, signing credentials, support contact, and recurring costs.

Deliverables: PHASE_1_SPEC.md, a decision list, user journeys, and testable acceptance checks. **Status: complete.** Hardware/account ownership is assigned to the product owner for setup and release; the supported OS target is assigned to Phase 3 when the selected Expo version and test devices are known.

**Complete when:** Every core action has an expected result and remaining open decisions have an owner and decision phase.

## Phase 2 — Design the diary experience

**Purpose:** Establish Memento's cozy character and make the important tasks easy to understand.

Design the following screens and states:

1. A short welcome, Google/Apple/email sign-in, and the first empty calendar.
2. The home calendar, with month browsing, a year overview, today's marker, and a clear Add moment action.
3. Photo/video capture and library selection.
4. The editor: media preview, framing, date, caption, and Save.
5. The expanded moment viewer with caption, date, playback, editing, and deletion.
6. Settings for appearance, reminders, autoplay, backup, export, help, and account management.
7. Account recovery, backup progress, and diary restoration.

Use realistic sample memories, including portrait and landscape images, dim pictures, short/long captions, videos, and incomplete months. Show loading, empty, permission-denied, offline, and failure states alongside the happy path.

Define light/dark color roles, readable typography, spacing, tile framing, icon use, haptics, and gentle transitions. Keep iOS back gestures and Android system Back behavior familiar. Make controls usable with larger text, screen readers, and reduced motion. Hold-to-preview must have a discoverable alternative.

Create a clickable prototype of: welcome/sign-in → add photo/video → save → find it in calendar → open/preview → edit. Returning users should open directly into their diary.

Deliverables: screen designs, reusable component/style guidance, interaction rules, and a reviewed prototype.

**Complete when:** The daily flow and its error states are understandable, and the visual direction reflects the user's comfy personal-diary brief.

## Phase 3 — Set up the project and prove difficult interactions

**Purpose:** Confirm the risky native behavior before building the full application around it.

Work:

- Scaffold the chosen Expo/TypeScript project and navigation.
- Configure package identifiers, environment separation, versioning, Git workflow, formatting, linting, type checks, and a basic automated build/check pipeline.
- Set up development, test, and production configurations. Keep privileged backend credentials out of the app.
- Install real development builds on both an iPhone and an Android phone.
- Configure test backend authentication and Apple/Google application credentials, redirect handling, and email delivery. Prove a provider sign-in returns to the correct app build.
- Prototype photo/video capture, library imports, circular masking, overlapping hold previews, and audio transitions.
- Prove video trimming, thumbnail creation, and compression/conversion on both platforms. Select a maintained compatible native dependency or a small native module where Expo's core APIs are insufficient.
- Try representative HEIC photos, HEVC/H.264 videos, rotated media, large files, and cloud-library items.
- Measure how many calendar video previews can run smoothly on a modest Android phone and an older supported iPhone.

Expo Video documents an Android overlapping-video rendering issue, so clipping and expanded previews belong in this early hardware test. [Expo Video](https://docs.expo.dev/versions/latest/sdk/video/).

Deliverables: working device builds and a short record of supported formats, processing limits, and preview performance.

**Complete when:** Both platforms demonstrate capture/import → local playback → circular/expanded preview, with a credible approach for trimming and storage limits.

## Phase 4 — Build accounts and dependable offline storage

**Purpose:** Give every diary a clear owner and ensure saving a memory is reliable before adding cloud synchronization.

Use separate local records for entries, media, preferences, and pending cloud operations. An entry includes a stable ID, authenticated owner ID, local diary date, caption, media reference, creation/update timestamps, revision, and deletion state. A media record includes type, durable path, thumbnail, dimensions, duration, size, and integrity information. Enforce one active entry per owner/diary and date.

Work:

- Implement required Google, Apple, and verified email sign-in, sign-out, and recovery. Use native provider flows where supported and a secure browser flow where needed, including Apple access from Android.
- Persist sessions securely and restore the current user's local diary offline. First login, account recovery, and new cloud authorization require a connection.
- Handle cancelled login, expired credentials, email-code retries, revoked access, and provider failures.
- Keep one stable diary owner independent of the chosen provider. If linking another sign-in method is exposed, require proof of control; do not merge accounts merely because their displayed email addresses match. Cover Apple's hidden email addresses and duplicate-account recovery. [Supabase mobile authentication](https://supabase.com/docs/guides/auth/quickstarts/with-expo-react-native-social-auth), [identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking).
- Store files in persistent app storage, not only temporary/cache locations or gallery references.
- Save files and metadata through a recoverable process so an interrupted write does not produce a broken entry.
- Add database migrations so updates preserve existing diaries.
- Implement create, read, edit, replace, move-date, and delete operations.
- When replacing a moment, keep the previous media until the new entry commits successfully.
- Handle low storage, interrupted imports, cancellation, orphaned temporary files, and restart recovery.
- Preserve an entry's selected date independently from timestamp/time-zone conversion.

Deliverables: sign-in/account flows, offline diary storage, and focused tests for account isolation, dates, unique entries, migrations, and interrupted saves.

**Complete when:** Google, Apple, and email sign-in work on the supported platforms, and a previously signed-in user can create/edit moments offline, restart the app, and recover the same diary without missing files or changed dates.

## Phase 5 — Build capture and the moment editor

**Purpose:** Make saving a photo or video quick and comfortable.

Work:

- Add camera capture, front/back switching, video recording, and system library import.
- Request camera, microphone, and media access only when required by the chosen action; explain recovery after denial.
- Show recording duration and enforce the 60-second maximum in recording and import validation. Test 59-, 60-, and over-60-second inputs. In-app capture saves to today; a past date accepts only media imported from the gallery.
- Provide trimming for longer imports using the approach verified in Phase 3.
- Present videos in a circular frame by default with a clear preview. Keep enough saved media to change the display crop later; preserve the complete trimmed segment before its display mask.
- Add image framing, optional captions, and date selection. Suggest capture dates where reliable metadata exists; let the user correct them.
- Generate lightweight calendar thumbnails/previews and preserve the saved full-view media at the documented quality.
- Define conversion quality, upload size limits, and how large/unsupported media are explained to the user.
- Keep draft progress safe through ordinary interruptions and protect unsaved work when leaving the editor.
- Distinguish saving locally from uploading to backup.

Deliverable: the complete photo and video creation/editing flow.

**Complete when:** Both types of moment can be captured for today or imported for today or a past date, edited, and replaced without losing the previous entry on failure.

## Phase 6 — Build the calendar and memory viewer

**Purpose:** Make the collection rewarding to browse while controlling video resource use.

Work:

- Build correct month grids, leap years, leading/trailing empty slots, today highlighting, and navigation to older dates.
- Add a year overview that uses still thumbnails; opening a month reveals its daily moments.
- Load only the calendar content needed for the visible area and a small surrounding range.
- Play silent looping previews in visible video tiles. Set the simultaneous-playback budget from Phase 3; use still thumbnails for excess/offscreen items and rotate eligible previews if appropriate.
- Suspend calendar players during full-screen viewing, fast scrolling where necessary, and when the app leaves the foreground. Here, "background video" means within a visible tile, not playback while the app is closed.
- Tap a date to open the moment. Enable that video's audio, provide mute/pause controls, and stop its audio when it closes or another moment opens.
- Press and hold to expand a muted preview; release to return. Resolve conflicts with scrolling and system navigation.
- Add swiping between saved moments, image zoom, caption/date display, and edit/delete actions.
- Provide manual playback and reduced-motion alternatives.

Deliverables: month/year browsing, full moment viewing, muted previews, and hold-to-preview.

**Complete when:** The approved gestures work on both phones, only one focused moment can produce audio, and several years of sample entries remain usable.

## Phase 7 — Add private cloud backup and recovery

**Purpose:** Protect the diary beyond one installation or one phone.

Work:

- Use the accounts established in Phase 4 to back up moments automatically when connectivity and upload preferences allow it.
- Synchronize only entries belonging to the authenticated owner. When local and cloud diaries share a date, let the user resolve the conflict; do not silently overwrite either memory.
- Keep database rows and media in private storage with server-enforced owner-only rules. Test with two accounts, expired sessions, guessed IDs, and direct file requests. [Supabase access control](https://supabase.com/docs/guides/storage/security/access-control), [private buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals).
- Implement a persistent upload queue with safe retries and duplicate prevention. Do not mark a moment backed up until its metadata and required media have both been verified.
- Show understandable states: On this phone, Waiting to back up, Backed up, and Needs attention.
- Add Wi-Fi-only upload preferences and progress for large media.
- Resume queued work when connectivity and app execution allow it. Do not promise uninterrupted uploads after the OS suspends or closes the app.
- Restore entries, captions, thumbnails, and original saved media on a second device, with progress and an offline-download path.
- Use revision checks and deletion markers so old devices cannot silently restore deleted entries or overwrite newer moments. Preserve both conflicting versions until the user resolves a same-date conflict.
- On logout or account change, isolate local content and queued work. Explain whether the local copy is retained or removed; never upload a previous user's diary into another account.
- Implement account deletion across authentication, entry data, media, and the defined backup retention process. Include required Sign in with Apple token revocation through the server-side deletion flow. [Apple account deletion guidance](https://developer.apple.com/documentation/technotes/tn3194-handling-account-deletions-and-revoking-tokens-for-sign-in-with-apple).

Define the recovery promise separately from sync: sync copies current state; recovery needs retained backups or explicit export. Set a recovery window, backup schedule, deletion retention, and restore procedure. Back up both records and media objects: Supabase database backups alone do not include stored photographs/videos. [Supabase backup coverage](https://supabase.com/docs/guides/platform/backups).

Decide storage allowances and costs using measured typical file sizes and a year of expected usage. Owner-only access is a server authorization design; do not market it as end-to-end encryption unless that separate feature is implemented.

Deliverables: private backup, restore, conflict handling, account deletion, and a tested operator recovery procedure.

**Complete when:** A fresh installation restores a complete diary, interrupted uploads recover safely, one account cannot access another's moments, and a test server recovery restores media as well as entries.

## Phase 8 — Finish reminders, settings, and export

**Purpose:** Complete everyday controls and give users a usable copy of their memories.

Work:

- Add optional reminders with a chosen local time, pause/off controls, and a gentle message.
- Cancel today's pending reminder when today's moment is saved. Refresh schedules around time-zone changes and app activity; test daylight-saving boundaries and OS scheduling limits.
- Explain notification permission state and link to system settings when needed. Local notifications support scheduling and cancellation. [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/).
- Add appearance, autoplay, storage usage, backup status, help, and privacy controls.
- Export individual moments and a full diary archive containing saved media, dates, captions, and format/version information.
- Support cancellation, progress, low disk space, and large exports without loading the entire diary into memory.
- Provide archive restore/import with validation and explicit duplicate-date handling, or settle an equally usable recovery method before promising export as a backup.
- Make destructive actions clear and offer export before account deletion.

Deliverables: complete settings, reminders, export, and recovery from an exported archive.

**Complete when:** Reminder behavior works on both platforms and an exported test diary can be restored with matching dates, captions, and media.

## Phase 9 — Verify reliability, performance, and accessibility

**Purpose:** Make the application safe to trust with real memories.

Test incrementally during each phase; this phase checks the assembled product.

| Area | Required verification |
|---|---|
| Daily flow | First run, capture/import, save, reopen, edit, replace, delete, and backfill |
| Accounts | Google/Apple/email login on both platforms, cancelled login, expired codes, hidden email, recovery, revoked credentials, and account isolation |
| Dates | Month/year boundaries, leap day, midnight, travel, daylight-saving changes, and duplicate dates |
| Persistence | Restart during saving, full disk, failed migration, deleted gallery original, and cancelled import |
| Media | Portrait/landscape, supported formats/codecs, silent video, audio interruptions, long imports, and cloud-library assets |
| Playback | Many video tiles, offscreen pausing, rapid scrolling, hold/tap conflicts, headphones, and backgrounding |
| Backup | Network loss, expired sign-in, repeated retry, partial uploads, conflicts, logout, account switching, and restore |
| Privacy | Cross-account reads/writes, direct storage URLs, deletion completion, and logs excluding private content |
| Accessibility | VoiceOver/TalkBack, larger text, contrast, touch targets, reduced motion, and alternatives to hold gestures |
| Scale | Representative diaries containing 365 and 1,825 entries, including mixed media |
| Updates | Existing diary survives an app upgrade and local/cloud schema changes |

Use unit tests for date/entry rules, integration tests for persistence/backup, and device end-to-end tests for critical user journeys. Test gestures, audio, camera, battery/memory behavior, and permissions on actual phones. Browser previews are not sufficient native verification.

Measure startup, calendar loading, save latency, scrolling, memory, and video playback on named test devices; record practical thresholds after Phase 3 measurements. Add crash/error reporting with no photos, captions, signed media URLs, or credentials in logs.

Deliverables: test results, documented device coverage, fixed release-blocking issues, and measurable performance limits.

**Complete when:** There are no known data-loss or cross-account-access defects, essential flows pass on both platforms, and remaining issues have an explicit release decision.

## Phase 10 — Run a real-use beta

**Purpose:** Check whether Memento works as an actual daily habit.

Work:

- Start with the owner's own diary, then a small group using both iPhone and Android.
- Distribute iOS builds with TestFlight and Android builds through an appropriate test track. [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/).
- Ask testers to use photo and video days, backfill entries, try reminders, restore a diary, and report friction.
- Run beta long enough to cover normal daily use, missed days, and changes of month; use controlled dates for boundary tests.
- Track crashes, failed saves/backups, confusing controls, and whether the app feels comfortable to return to.
- Fix discovered issues and verify affected flows before the release candidate.

If publishing through a personal Google Play account created after 13 November 2023, current rules require at least 12 testers opted into a closed test continuously for 14 days before applying for production access. Schedule this early and recheck eligibility near release. [Google Play testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en).

Deliverables: beta feedback, a release candidate, and successful recovery trials with realistic diaries.

**Complete when:** Users can keep and revisit their diaries through repeated real use, and there are no unresolved release-blocking defects.

## Phase 11 — Prepare and release Volume 1

**Purpose:** Deliver the verified application through the chosen distribution channels.

Work:

- Finalize icon, splash screen, store name/listing, screenshots from the actual app, age rating, descriptions, and support details.
- Check Memento's store-listing availability and developer identifiers; do not assume the display name reserves a store identity.
- Prepare privacy/support pages, accurate Apple privacy disclosures, Google Data safety responses, and third-party SDK disclosures.
- Include in-app account deletion; Google's applicable policy also requires an external web path. [Apple review guidelines](https://developer.apple.com/app-store/review/guidelines/), [Google account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en).
- Verify current OS/SDK submission requirements, permission descriptions, signing, production environment configuration, storage rules, quotas, and recovery procedures.
- Prepare a review account or review instructions for features requiring sign-in.
- Produce and verify signed release builds. Test an upgrade from the prior beta without losing entries.
- Review the concrete store listing and release candidate with the owner before actual public publication.
- Submit, address review feedback, and use controlled rollout options where available.

Deliverables: signed builds, store materials, release checklist, operator notes, and an approved release.

**Complete when:** The owner can install the intended production build on both platforms and the chosen store distribution is live, if public launch is requested.

## Phase 12 — Maintain the diary and prepare Volume 2

**Purpose:** Keep existing memories safe while learning what to improve next.

Work:

- Review save/backup failures, crashes, support issues, storage growth, and costs.
- Perform scheduled database-and-media recovery drills and test migrations before updates.
- Maintain compatibility with new iOS/Android releases and supported dependencies.
- Improve real sources of friction before adding more screens or features.
- Keep dates, stable entry IDs, and ownership explicit so later sharing can attach to existing entries.
- Plan Volume 2 as a separate project stage: audience rules, friendship/approval flows, private account behavior, permission revocation, media access, hidden-day appearance, and social safety/support needs.
- When social sharing arrives, keep existing diaries private until their owners explicitly change visibility.

Deliverables: maintenance checklist, recovery schedule, prioritized improvements, and a separate Volume 2 specification.

**Complete when:** Volume 1 has an operating owner, update/recovery processes, and a clearly bounded next-release backlog. Maintenance then continues for the application's lifetime.

## Delivery order and milestones

The development dependency chain is:

**Rules → design → device prototype → accounts/local storage → capture/editor → calendar/viewer → cloud recovery → settings/export → full QA → beta → release → maintenance.**

Store account preparation can begin during project setup. Backend schema/access-rule work can proceed alongside the calendar after entry ownership and media formats are settled. Store materials can be prepared during beta. Final recovery tests depend on the real save/media implementation.

| Milestone | Evidence we should have |
|---|---|
| Design ready | Reviewed core flow, documented states, and unresolved choices listed |
| First device prototype | Photo/video capture and proposed interactions demonstrated on both phones |
| Personal alpha | Offline saving, editing, calendar browsing, and video behavior usable by the owner |
| Feature complete | Private backup/restore, export recovery, reminders, and settings work |
| Release candidate | Critical device journeys pass and beta issues are resolved |
| Volume 1 launch | Signed production builds, appropriate distribution, and support/recovery ownership |

Do not commit to a launch date from this draft alone. Estimate each phase after the media prototype, device access, backend choices, and design are settled. Include beta/testing requirements and external store review time separately from coding effort.

## Costs and dependencies to confirm before committing

- Apple/Google developer accounts and ownership.
- Access to both phone platforms for camera, gesture, notification, and audio testing.
- Cloud build usage, database hosting, media storage, downloads, and recovery copies.
- Authentication email delivery, support/privacy website, and error monitoring if selected.
- A policy for storage limits and what happens when an allowance is reached.

Estimate ongoing media cost from measured average saved photo/video size × entries per user × expected users, then include thumbnails/previews, retained recovery copies, restores/downloads, and provider overhead. Check current provider prices when preparing the budget; no price is assumed in this draft.

## Volume 1 release checklist

- [ ] Required account creation with Google, Apple, or email, plus recovery and deletion.
- [ ] One photo or video up to 60 seconds per date, with an optional caption.
- [ ] Capture, import, framing, trimming, and replacement work on both platforms.
- [ ] Past entries can be added and edited; time-zone changes do not move diary dates.
- [ ] Month/year browsing, focused playback, and hold previews work comfortably.
- [ ] Silent calendar videos remain smooth within measured device limits.
- [ ] Saved moments remain usable offline and survive restarts and app updates.
- [ ] Private backup and complete restoration are verified.
- [ ] Cross-account access is denied by the server.
- [ ] Export and archive recovery preserve media, captions, and dates.
- [ ] Reminder, accessibility, permission, and failure states are covered.
- [ ] Production builds, store requirements, and operating recovery procedures are ready.
- [ ] Social features remain a separately planned Volume 2, with existing entries private.

Current next step: complete Phase 4 account configuration and device verification while continuing the native proof still open from Phase 3.

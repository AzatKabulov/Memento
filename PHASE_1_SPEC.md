# Memento — Volume 1 product specification

Status: Phase 1 complete. This document defines the first release; screen layout and visual design belong to Phase 2. Decisions that require a technical prototype or release accounts are assigned to later phases.

## Product promise

Memento is a private visual diary for iPhone and Android. A person saves one photo or video for a calendar date and gradually builds a timeline of ordinary life. The app feels warm, calm, and personal. Missed days are ordinary. There are no streaks or public engagement features in Volume 1.

## First-release scope

Included: required accounts, daily photo or video moments, optional captions, calendar and year browsing, focused memory viewing, silent video previews, press-and-hold expansion, editing, gentle reminders, offline access after sign-in, private cloud backup and restoration, export, and account deletion.

Excluded from Volume 1: other people's calendars, public profiles, friends, per-date sharing, likes, comments, messaging, monthly collages, yearly recap videos, and anniversary memories. These are future product ideas, not implicit first-release requirements.

## Decisions

| Rule | Status | Decision |
|---|---|---|
| Product name | Confirmed | Memento |
| Platforms | Confirmed | iPhone and Android mobile applications |
| Access | Confirmed | Account required; Google, Apple, or email |
| Daily media | Confirmed | One photo or one video per date |
| Video length | Confirmed | Maximum 60 seconds |
| Privacy | Confirmed | Personal diary; all entries private in Volume 1 |
| Email method | Decided under user's delegated choice | Email and password, with email verification and password reset |
| Video shape | Confirmed | Circular display by default for all daily videos, preserving the underlying trimmed video beyond its visual mask |
| Past dates | Confirmed | A past date can be filled only with a photo or video imported from the phone's gallery. Capture inside Memento is for today. Future dates cannot contain a moment. |
| Caption limit | Working default | 500 characters; adjust after editor testing |
| Languages | Working default | English for the first release, with text ready to translate |
| Device sizes | Working default | Phone layouts first; tablet support decided before store submission |
| Technology | Proposed | Expo/React Native/TypeScript with local storage and private cloud backup; validate in Phase 3 |

Visual details such as precise colors, fonts, transitions, and final navigation are Phase 2 decisions. Supported OS versions and media formats are Phase 3 decisions based on the selected tools and real device testing.

## Core rules

1. Each account may have **at most one active moment for a diary date**. A moment contains one photo or video and an optional caption.
2. A diary date is a calendar day, stored independently of the time or time zone where a file was captured. Once chosen, travel does not move that moment to another date.
3. Capture inside Memento saves to today. To fill a past date, the person imports a photo or video from the phone's gallery. Imported media may suggest its original capture date if reliable metadata is available, but the user chooses the diary date. Missing metadata does not prevent a gallery import.
4. Replacing a moment is an explicit action. The current media remains safe until the replacement has saved successfully.
5. An empty day remains an empty day. The app never creates placeholder moments to preserve a streak.
6. Only the account owner can see, edit, restore, or export that account's diary. No public visibility switch exists in Volume 1.
7. The video limit applies to the saved segment. A longer imported video requires choosing a segment of at most 60 seconds; it is never silently cut.
8. Video sound is off in calendar previews and hold previews. Opening a video date permits sound, with visible pause and mute controls. Only one focused video can produce sound at a time.
9. A saved moment is usable from local storage without connectivity after a successful sign-in. Backup state is shown separately from local save state.
10. A camera-captured moment keeps the diary date on which it was captured, even after that day passes. To fill or replace a moment on another past date, the media must come from the phone's gallery. A gallery-imported moment can move between today and past dates, subject to the one-moment-per-date rule.

## User journeys and acceptance checks

### A. First use and account

The person opens Memento, sees a short explanation, and signs up or signs in using Google, Apple, or email and password. Email registration requires verification and offers password reset. After authentication, the empty calendar is available and adding a first moment is obvious. Returning users open directly to their diary while their session is valid. If they have already signed in on this device, their local diary remains available when offline.

Acceptance checks:

- Each offered sign-in method can create/access an account on its supported platform.
- Cancelling sign-in leaves the diary locked and offers a clear retry.
- Incorrect email/password credentials, unverified email, and expired reset links explain what happened without exposing private data.
- Sign-out and account switching never display another person's local moments.
- The same diary can be restored to a second device after sign-in.
- A person has a clear recovery path if access to a sign-in method changes.

### B. Add a photo

The person taps Add, takes a photo for today or chooses one from the phone's library for today or a past date, checks its framing, optionally writes a caption, confirms the allowed date, and saves. The new moment appears in the calendar immediately. If they deny camera or library access, they can retry or use another available source.

Acceptance checks:

- Save works even if the phone goes offline after sign-in.
- The app keeps its own durable copy of the saved photo; deleting the phone's original does not break the diary entry.
- Leaving an unsaved editor warns the person when their draft would be lost.
- A failed save reports the problem and preserves the current entry and working draft where possible.

### C. Add a video

The person records a video for today or imports one from the gallery for today or a past date, selects a segment up to 60 seconds if needed, previews its circular framing, optionally adds a caption, and saves it. The complete saved segment remains available for focused playback, even when its circular calendar display is cropped.

Acceptance checks:

- A 60-second video is accepted; longer media requires explicit trimming.
- The editor shows duration and framing before Save.
- A video without audio still works and does not show a broken audio control.
- Importing unsupported media produces a useful explanation, without creating a broken calendar entry.

### D. Browse the calendar

The home view opens on the current month, showing saved moments in their dates and empty dates quietly. The person can navigate months and years, return to today, and open a moment. Year browsing helps them reach older months without endless scrolling.

Acceptance checks:

- Month layouts, leap days, and year boundaries are correct.
- A chosen moment stays on its date when the device time zone changes.
- Photos show thumbnails; visible video tiles loop silently within a device-safe playback budget.
- Offscreen videos stop playing, and larger diaries remain responsive.
- Empty past days offer a gallery import action. Empty today offers capture and gallery import. Future days are not editable.

### E. Open or preview a moment

Tapping an occupied date opens the moment with its date, full media, and caption. Focused video playback may use sound. Pressing and holding a tile expands a quiet preview; releasing closes it. The person can also open a moment without using a hold gesture.

Acceptance checks:

- Focused audio stops when the moment closes or another one opens.
- Holding a tile does not accidentally open it or block ordinary calendar scrolling.
- Videos remain silent before the focused view opens.
- Larger text, screen readers, and reduced-motion settings have usable equivalents.

### F. Edit, move, replace, and delete

The person can edit a caption, adjust framing, change an allowed diary date, replace media, or delete a moment. A camera-captured moment keeps its original capture date; changing that moment's date or replacing a past day's media requires a gallery import. A gallery-imported moment can move to today or a past date. Moving to a date that already has a moment requires choosing which one to keep; no entry is silently overwritten. Deletion requires a clear confirmation and is reflected in the calendar and backup state.

Acceptance checks:

- Save failure leaves the original moment intact.
- Moving a moment never produces two active entries on one date.
- Changes made offline appear locally and synchronize later.
- A second device cannot silently revive an already deleted moment.

### G. Reminder

Reminders are optional. A person chooses a local time, can pause them, and receives a gentle prompt on a day without a saved moment. The app never refers to a missed day as a failure.

Acceptance checks:

- Permission is requested when reminders are enabled.
- Turning reminders off cancels future scheduled prompts.
- Saving today's moment prevents or cancels today's pending prompt where the operating system allows it.
- Time-zone and daylight-saving changes do not cause repeated or badly timed prompts during normal app use.

### H. Backup, restore, and export

Every local save is distinct from a successful backup. The app shows whether a moment is on this phone, waiting to upload, backed up, or needs attention. A signed-in person can reinstall Memento or use a second phone and restore their diary. They can also export their own media, dates, and captions in a portable archive.

Acceptance checks:

- An interrupted upload retries without duplicate moments.
- A moment is labelled backed up only after its entry and media are stored and verified.
- A restore preserves original diary dates, captions, and the saved photo/video content.
- A whole-diary export can be checked and restored as a recovery copy.
- Cloud data and media are inaccessible to a different account.
- Account deletion removes the account's diary under the defined deletion policy.

## Core screens for Phase 2

1. Welcome and sign-in.
2. Calendar with month/year navigation and Add action.
3. Capture or choose media.
4. Editor with preview, date, and caption.
5. Focused moment viewer and expanded hold preview.
6. Settings, reminders, backup status, export, and account management.
7. Loading, permission, offline, empty, conflict, and failed-backup states of those screens.

The user should understand whether an action has saved locally or backed up. The calendar and media should remain the visual focus; controls should feel familiar on iPhone and Android.

## User stories

- As a new user, I can create an account using Google, Apple, or email so my diary has a recoverable owner.
- As a returning user, I can open my previously saved moments while offline.
- As a user, I can capture today's moment quickly or import one from my gallery.
- As a user who missed a day, I can choose a gallery photo or video for that past date.
- As a user, I can see videos quietly playing in my calendar and hear one when I open it.
- As a user, I can revisit, edit, replace, delete, export, and restore my moments.
- As a user, I can see whether my newest memories are safely backed up.

## Product language

Use **moment** for the daily saved photo or video, **diary date** for the day it represents, and **backup** for a verified recoverable cloud copy. Example reminder: “Anything from today you'd like to keep?” Avoid guilt, streak counts, public metrics, or technical cloud language in normal flows.

## Dependencies and ownership

Development needs access to an iPhone and Android phone for native testing; test and production account configuration; an Expo account and backend project if the proposed stack is chosen; and Apple Developer/Google Play Console accounts for store distribution. The account owner, signing key custodian, support contact, storage budget, and recovery operator must be named before Phase 3 setup or Phase 11 publication as relevant.

These are operational roles to assign, not assumptions that the accounts or hardware already exist. Exact OS targets, file size/codec support, upload policy, backup retention, and provider costs will be settled in the phases where measurements and chosen services make them concrete.

## Phase 1 completion gate

- [x] Volume 1 and Volume 2 boundaries documented.
- [x] Core journeys and acceptance checks drafted.
- [x] One-moment/date rule, time-zone rule, replacement, deletion, empty-day behavior, and backup distinction specified.
- [x] User answers on email method, video shape, and past-date entries incorporated; the delegated email choice has been resolved to a conventional email-and-password flow.
- [x] Final first-release rules aligned with PRODUCT.md and BUILD_PLAN.md.
- [x] Hardware/account ownership assigned to the product owner for Phase 3 setup and Phase 11 release. Exact OS targets are assigned to Phase 3 after the Expo version and test devices are known.

Phase 2 can design the screens using this document as its behavior brief.

# Memento Volume 2 — shared calendars concept

**Status: future specification.** Volume 1 stays a personal diary. No sharing UI, friend relationship, or public media access is implemented or enabled by this document.

## Promise and scope

People may let approved friends or anyone see selected calendar moments. Each person controls who can see an individual date and can keep their whole account private. Viewing another person's diary should feel like visiting a personal calendar, not scrolling a social feed.

In scope: profile discoverability, friend requests and approvals, account privacy, per-date visibility, calendar viewing, permission changes, and blocking/reporting needed for public viewing. Likes, comments, messaging, follower counts, and a feed are outside the first Volume 2 release.

## Visibility rules to validate with users

| Account | Date audience | Who can view the moment |
| --- | --- | --- |
| Any account | Private | Owner only. |
| Any account | Friends | Owner and approved friends who are not blocked. |
| Public account | Public | Anyone allowed to view that profile. |
| Private account | Public selection | Not offered until the owner changes account privacy; private-account approval cannot be bypassed by a date setting. |

All existing Volume 1 entries and new entries remain **Private** when Volume 2 launches. An owner must explicitly choose an audience for each shared date. Captions and thumbnails inherit the moment's audience; no separate caption switch in the first sharing release. Empty dates and hidden dates should look the same to non-owners so absence of a private moment is not revealed. The owner always sees the real calendar and can revoke sharing without editing the moment.

## Core journeys and acceptance checks

1. The owner selects a date, chooses Friends or Public where permitted, sees a preview of what others will see, and confirms. Cancelling or losing connectivity does not expose the moment.
2. A friend request requires approval. Removing a friend, blocking a person, changing the account to private, or setting a date back to Private removes future access to the moment and its media. Already downloaded copies cannot be recalled; explain this plainly before first sharing.
3. A stranger viewing a public account sees only Public dates. An approved friend sees Public and Friends dates. A blocked person sees neither through the app or a direct media URL.
4. A profile/calendar can be reported. The owner can block a viewer and review their own visibility settings in one place. Public content needs an abuse-response and support process before launch.
5. Account deletion removes social relationships and grants as well as the diary under the stated deletion policy. Restoring an old archive or changing phones must never turn a previously private moment public.

## Technical boundary before implementation

The local diary has stable `entries.id` values, but the current cloud `memento_moments` table is keyed by `(owner_id, diary_date)` and does not sync that entry ID. Before adding sharing, migrate cloud entries to a stable identifier and reconcile existing local IDs across devices. A moved date must retain the same moment identity, while the one-active-moment-per-date rule remains enforced. Test this migration on copied diaries before changing production data.

The current Storage policy allows only the owner to read their bucket objects. Keep that default. Design a server-authorized media delivery path for each viewer and audience, including thumbnails and videos; never make the bucket public or treat a long-lived signed URL as the permission system. Access checks must use the current friendship, block, account privacy, and date audience state. Remove location/EXIF data from media exposed to other people and test cached-media behavior after revocation.

## Decisions to settle in Volume 2 discovery

- Whether a public profile is searchable by name or only reachable by a shared link.
- Whether sharing a date should include its original audio by default.
- How to handle media already viewed or saved by someone after a permission change.
- Who handles public-content reports, response times, and appeals.
- Which regions and ages can use public sharing, after policy and safety review.

**Ready to build when:** Volume 1 recovery and deletion are stable; a user-tested sharing model and safety process are agreed; the stable-ID migration and revocable media access pass two-account and three-audience tests. Until then, all diaries remain private.

# Volume 1 account features

**Decision:** An email-and-password account is required before saving moments. Google and Apple sign-in are deferred. The existing native app already has email sign-up, verification callback, sign-in, password reset, and sign-out code. These paths still need a configured Supabase project and physical-device verification; none is claimed complete. Developer accounts for App Store/TestFlight and Google Play distribution are separate from sign-in providers.

## Finish email sign-in

1. In the owner Supabase project, enable Email under Authentication → Sign In / Providers. Add `memento://auth/callback` and `memento://auth/reset` under Authentication → URL Configuration → Redirect URLs. Apply the private-diary SQL migration. Keep only the project URL and **publishable** key in the app; never put a service-role/secret key in a mobile build.
2. Confirm signup and password-reset messages reach a non-team test address. Supabase's default mail service is limited and meant for testing; configure an owner-controlled SMTP provider before inviting outside beta users. [Supabase SMTP guide](https://supabase.com/docs/guides/auth/auth-smtp).
3. Test create → verify → sign in → save offline → restart → reconnect → restore on Android and iPhone. Test expired links, wrong passwords, sign-out/account switching, and two-account isolation. A successful email alone does not prove diary or media backup works.

## Account deletion design

**Proposed recovery window: seven days.** The owner asked for a short window; seven days is the working default until the in-app wording and backend test are reviewed. A request must lead to permanent deletion, not indefinite deactivation. Show the exact purge date and a cancellation path before that date. A user can export their diary before requesting deletion.

1. Add a plainly named **Delete account** control in Settings. Require fresh authentication and a deliberate final confirmation. Explain that cloud diary access stops immediately, the request can be cancelled during the seven-day window, and permanent erasure follows. Once requested, sign out and prevent local pending uploads from reviving entries.
2. Record the request and purge deadline on the server. Every diary-data and private-media access path must reject a pending-deletion account; a temporary Auth ban alone does not revoke existing sessions. On a new sign-in, show only deletion status and cancellation, with no calendar access until cancellation completes. [Supabase user-management guidance](https://supabase.com/docs/guides/auth/managing-user-data).
3. Run an authenticated, privileged scheduled worker. It must be idempotent: remove all of that account's private Storage objects **through the Storage API**, then remove Auth identity and cascading diary rows; retry and alert on partial failure. Supabase does not allow Auth user deletion while they still own Storage objects. Keep privileged credentials server-side only. [Storage deletion](https://supabase.com/docs/guides/storage/management/delete-objects), [Auth admin deletion](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser).
4. Decide and disclose what happens to operator-held recovery snapshots, exported archives, and any legally required records. Memento cannot erase copies the user exported outside the app. The seven-day in-app recovery window must not be mistaken for a promise that every operator backup is purged that day.
5. Provide an external web request route for people who have uninstalled Memento. Verify ownership of the email/account before processing; do not delete an account merely because someone typed its address. Google Play requires a functional deletion-request web resource in addition to the app path. [Google Play deletion policy](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en).

The native deletion control and external page must remain unavailable until the server worker, access lock, cancellation, failure handling, and end-to-end tests are working. Apple allows deletion to take time if users know when it will complete, but temporary deactivation alone is insufficient. [Apple account deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app).

## Proof before release

- Two disposable accounts: deleting one never changes or exposes the other's diary.
- Pending deletion blocks the diary and direct media URLs, including with an already issued session token.
- Cancelling before the deadline restores the same dates, captions, photos, and videos; cancellation after purge is rejected.
- A failed media deletion does **not** falsely report the account erased; retry eventually clears media, rows, and identity.
- Reinstalling or restoring an old export cannot silently revive a deleted cloud account.
- The external request page works without the app; support can trace a request to completion without putting private content in public logs.

**Current next step:** confirm Supabase migration, redirect URLs, and email delivery, then test email sign-in and backup with disposable moments. The deletion flow is a release blocker and is not implemented yet.

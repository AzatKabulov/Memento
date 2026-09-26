# Memento backup operations — draft

The mobile app synchronizes current diary state. It does not provide historical recovery after accidental deletion or a service failure. Before launch, configure a separate, tested operator backup for **both** the Supabase database and the `memento-private` Storage bucket. [Supabase database backup coverage](https://supabase.com/docs/guides/platform/backups) does not include Storage objects.

Proposed release target: at least one daily recoverable snapshot retained for 30 days, with a documented restore point and access limited to operators who need it. This is a target, not a current promise. Measure real photo/video sizes and the resulting storage and egress cost before approving it.

Recovery drill for a test project:

1. Create two test accounts and a mix of photos, videos, captions, replacements, and deletion markers. Record per-account row counts, media paths, object sizes, and sample file hashes.
2. Take a database backup and a separate private-bucket object backup. Record the same snapshot time and do not expose either backup publicly.
3. Restore the database and media into an isolated project with matching Auth and Storage configuration. Reapply migrations and owner policies as needed.
4. Sign in as each test account on a fresh phone. Restore and compare dates, captions, media bytes, and playback with the recorded inventory. Confirm account A cannot read account B's rows or direct object URLs; unauthenticated requests must fail.
5. Record duration, failed objects, retry procedure, and the actual recovery point. Only then describe a recovery window in user-facing copy.

Account deletion is not enabled in the app. Its server implementation must authenticate the requesting user, revoke a Sign in with Apple token when applicable, remove all private media and retained copies according to the stated retention policy, delete diary rows and Auth identity, and return a verifiable completion state. A publishable-key client cannot perform these privileged steps. Do not expose a deletion button until this flow and its failure recovery are tested.

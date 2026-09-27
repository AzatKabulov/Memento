# Phase 12 — maintenance preparation

**Status: prepared, not operating.** Volume 1 has not passed physical-device QA or beta and is not released. This is the owner runbook to activate at launch. It does not claim that backups, monitoring, or support are already running.

## Owner routine

| When | Check | Record or act |
| --- | --- | --- |
| Daily during the first two weeks, then weekly | Review support reports, store feedback, auth failures, backup/restore reports, and Supabase usage and billing dashboards. | Note app build, platform, affected flow, first occurrence, and whether local and cloud copies still exist. Never copy diary media, captions, tokens, or signed links into public issues. |
| Weekly | Inspect unresolved save/sync conflicts, available storage/egress headroom, email delivery, and the result of the latest database **and media** backup. | Escalate repeated failures or low headroom before users lose access. Check the Free project's activity and pause state. |
| Monthly, and before risky changes | Restore a disposable mixed-media diary into an isolated project and test two-account isolation. Check a supported Android and iPhone OS version and dependency/security updates. | Record snapshot time, row/object counts, sample hashes, restore duration, failures, and follow-up owner. Do not claim a recovery window until measured. |
| Every app or schema release | Rehearse migration and an upgrade from the previous public build with an existing diary. Test offline save, reconnect, replacement, deletion, export/import, fresh-device restore, and account separation. | Record the exact app build, schema version, backend project, signing identity, result, and rollback path. |

Supabase database backups contain Storage metadata, **not** the photo/video objects. The separate media-backup and restore drill in [`supabase/OPERATIONS.md`](supabase/OPERATIONS.md) is mandatory before any recovery promise. [Supabase backup documentation](https://supabase.com/docs/guides/platform/backups). Monitor plan limits and project activity in the owner dashboard; Free projects can pause after low activity, and quotas can change. [Supabase usage](https://supabase.com/docs/guides/platform/billing-on-supabase), [Free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing).

## Incident response

1. **Protect existing diaries first.** Treat lost/changed moments, a failed restore, cross-account access, exposed media, and account deletion failures as urgent. Pause a rollout or backend migration while investigating. Do not ask users to reinstall or clear app data before establishing whether a local-only copy exists.
2. Record sanitized reproduction steps, build, phone/OS, connectivity, time zone, affected date count, and local/cloud status. Restrict access to any diagnostic material that could identify a user.
3. Reproduce with disposable accounts. Preserve the last known recoverable database and media snapshots; do not overwrite them during a repair trial. Verify owner access and object hashes after any restore.
4. Fix and test the affected path on both platforms. Test upgrading an existing diary, then resume distribution in stages where available. Google Play staged rollouts apply to **updates**, not the first publication; Apple's phased release also applies to version updates. [Google Play staged rollout](https://support.google.com/googleplay/android-developer/answer/6346149?hl=en), [Apple phased release](https://developer.apple.com/help/app-store-connect/update-your-app/release-a-version-update-in-phases).
5. Tell affected users what is known, what is being done, and whether any diary data may be unavailable. Log the resolution and prevention work without putting private content in GitHub.

## Improvement queue

Prioritize from actual beta and live evidence, rather than adding speculative features to Volume 1:

1. **Safety and reliability:** save, sync, restore, privacy, deletion, and upgrade defects.
2. **Daily-use friction:** confusing capture/import, slow calendar rendering, video playback, reminders, and accessibility problems shown by testing or support.
3. **Operational costs:** measured average media size, storage/egress trend, backup size, and email delivery limits.
4. **Optional polish:** only after the first three groups are stable.

For each item, keep a sanitized report, severity, owner, acceptance check, and linked fix/release. Review whether the issue affected older builds before closing it. No crash analytics or automatic cross-user telemetry is currently integrated; dashboards and support reports alone cannot prove every user is healthy.

**Activation gate:** name the operating owner and support contact; complete Phase 9–11; prove database-and-media recovery; configure the chosen monitoring and backup schedule; then record the first actual maintenance check. Phase 12 continues for the life of Volume 1.

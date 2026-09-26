import { randomUUID } from "expo-crypto";
import { File } from "expo-file-system";
import {
  database,
  fileExtension,
  mediaUri,
  ownerDirectory,
} from "./MomentStore.native";
import type {
  BackupConflict,
  BackupSummary,
  LocalChange,
  RemoteMoment,
} from "../backup/types";

export async function localSyncIndex(ownerId: string) {
  const db = await database;
  const rows = await db.getAllAsync<{
    date: string;
    cloudRevision: number;
    pending: number;
  }>(
    `SELECT e.diary_date AS date, e.cloud_revision AS cloudRevision,
       (SELECT count(*) FROM pending_operations p JOIN entries changed ON changed.id = p.entry_id
         WHERE p.owner_id = e.owner_id AND changed.diary_date = e.diary_date) AS pending
     FROM entries e WHERE e.owner_id = ?
     ORDER BY (e.deleted_at IS NULL) DESC, e.updated_at DESC`,
    ownerId,
  );
  const result = new Map<string, { cloudRevision: number; pending: boolean }>();
  for (const row of rows)
    if (!result.has(row.date))
      result.set(row.date, {
        cloudRevision: row.cloudRevision,
        pending: row.pending > 0,
      });
  return result;
}

export async function nextPendingChange(
  ownerId: string,
): Promise<LocalChange | null> {
  const db = await database;
  return db.getFirstAsync<LocalChange>(
    `SELECT p.id AS operationId, e.id AS entryId, e.diary_date AS date,
       e.revision, e.cloud_revision AS cloudRevision, e.deleted_at AS deletedAt,
       m.kind, e.caption, e.source, e.frame_y AS frame, m.duration_ms AS durationMs,
       m.id AS mediaId, m.path AS mediaPath, m.byte_size AS mediaBytes,
       p.media_path AS uploadPath, p.upload_url AS uploadUrl,
       p.retry_at AS retryAt, p.attempts
     FROM pending_operations p
     JOIN entries e ON e.id = p.entry_id AND e.owner_id = p.owner_id
     JOIN media m ON m.id = e.media_id AND m.owner_id = e.owner_id
     LEFT JOIN sync_conflicts c ON c.owner_id = e.owner_id AND c.diary_date = e.diary_date
     WHERE p.owner_id = ? AND c.owner_id IS NULL
       AND (p.retry_at IS NULL OR p.retry_at <= ?)
     ORDER BY p.created_at, p.rowid LIMIT 1`,
    ownerId,
    new Date().toISOString(),
  );
}

export async function saveUploadCursor(
  ownerId: string,
  operationId: string,
  path: string,
  url: string | null,
) {
  const db = await database;
  await db.runAsync(
    "UPDATE pending_operations SET media_path = ?, upload_url = ? WHERE id = ? AND owner_id = ?",
    path,
    url,
    operationId,
    ownerId,
  );
}

export async function markOperationApplied(
  ownerId: string,
  operationId: string,
  entryId: string,
  cloudRevision: number,
) {
  const db = await database;
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      "UPDATE entries SET cloud_revision = max(cloud_revision, ?) WHERE id = ? AND owner_id = ?",
      cloudRevision,
      entryId,
      ownerId,
    );
    await tx.runAsync(
      "DELETE FROM pending_operations WHERE id = ? AND owner_id = ?",
      operationId,
      ownerId,
    );
  });
}

export async function acknowledgeRemoteMutation(
  ownerId: string,
  mutationId: string,
  cloudRevision: number,
) {
  const db = await database;
  const operation = await db.getFirstAsync<{ entry_id: string }>(
    "SELECT entry_id FROM pending_operations WHERE owner_id = ? AND id = ?",
    ownerId,
    mutationId,
  );
  if (!operation) return false;
  await markOperationApplied(
    ownerId,
    mutationId,
    operation.entry_id,
    cloudRevision,
  );
  return true;
}

export async function delayOperation(
  ownerId: string,
  operationId: string,
  retryAt: string,
  reason: string,
) {
  const db = await database;
  await db.runAsync(
    `UPDATE pending_operations SET attempts = attempts + 1, retry_at = ?, last_error = ?
     WHERE id = ? AND owner_id = ?`,
    retryAt,
    reason,
    operationId,
    ownerId,
  );
}

export async function retryPendingNow(ownerId: string) {
  const db = await database;
  await db.runAsync(
    "UPDATE pending_operations SET retry_at = NULL WHERE owner_id = ?",
    ownerId,
  );
}

export async function backupSummary(ownerId: string): Promise<BackupSummary> {
  const db = await database;
  const counts = await db.getFirstAsync<{
    pending: number;
    needsAttention: number;
  }>(
    `SELECT count(*) AS pending, coalesce(sum(CASE WHEN attempts >= 3 THEN 1 ELSE 0 END), 0) AS needsAttention
     FROM pending_operations WHERE owner_id = ?`,
    ownerId,
  );
  const preferences = await db.getAllAsync<{ key: string; value: string }>(
    "SELECT key, value FROM preferences WHERE owner_id = ? AND key IN ('wifi_only_backup', 'last_cloud_sync')",
    ownerId,
  );
  const values = Object.fromEntries(
    preferences.map((row) => [row.key, row.value]),
  );
  return {
    pending: counts?.pending ?? 0,
    needsAttention: counts?.needsAttention ?? 0,
    conflicts: await listBackupConflicts(ownerId),
    wifiOnly: values.wifi_only_backup !== "false",
    lastSynced: values.last_cloud_sync ?? null,
  };
}

export async function setBackupPreference(ownerId: string, wifiOnly: boolean) {
  const db = await database;
  await db.runAsync(
    `INSERT INTO preferences(owner_id, key, value) VALUES (?, 'wifi_only_backup', ?)
     ON CONFLICT(owner_id, key) DO UPDATE SET value = excluded.value`,
    ownerId,
    wifiOnly ? "true" : "false",
  );
}

export async function markSyncAt(ownerId: string) {
  const db = await database;
  await db.runAsync(
    `INSERT INTO preferences(owner_id, key, value) VALUES (?, 'last_cloud_sync', ?)
     ON CONFLICT(owner_id, key) DO UPDATE SET value = excluded.value`,
    ownerId,
    new Date().toISOString(),
  );
}

export async function listBackupConflicts(
  ownerId: string,
): Promise<BackupConflict[]> {
  const db = await database;
  const rows = await db.getAllAsync<{ date: string; remoteJson: string }>(
    "SELECT diary_date AS date, remote_json AS remoteJson FROM sync_conflicts WHERE owner_id = ? ORDER BY diary_date DESC",
    ownerId,
  );
  return rows.map((row) => ({
    date: row.date,
    remote: JSON.parse(row.remoteJson) as RemoteMoment,
  }));
}

export async function rememberConflict(ownerId: string, remote: RemoteMoment) {
  const db = await database;
  await db.runAsync(
    `INSERT INTO sync_conflicts(owner_id, diary_date, remote_json, created_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(owner_id, diary_date) DO UPDATE SET remote_json = excluded.remote_json`,
    ownerId,
    remote.diary_date,
    JSON.stringify(remote),
    new Date().toISOString(),
  );
}

export async function choosePhoneCopy(ownerId: string, remote: RemoteMoment) {
  const db = await database;
  await db.withExclusiveTransactionAsync(async (tx) => {
    const row = await tx.getFirstAsync<{
      id: string;
      deleted_at: string | null;
    }>(
      `SELECT e.id, e.deleted_at
       FROM entries e WHERE e.owner_id = ? AND e.diary_date = ?
       ORDER BY (e.deleted_at IS NULL) DESC, e.updated_at DESC LIMIT 1`,
      ownerId,
      remote.diary_date,
    );
    if (!row) throw new Error("The phone copy is no longer available.");
    await tx.runAsync(
      "UPDATE entries SET cloud_revision = ? WHERE id = ? AND owner_id = ?",
      remote.revision,
      row.id,
      ownerId,
    );
    await tx.runAsync(
      "DELETE FROM pending_operations WHERE owner_id = ? AND entry_id IN (SELECT id FROM entries WHERE owner_id = ? AND diary_date = ?)",
      ownerId,
      ownerId,
      remote.diary_date,
    );
    await tx.runAsync(
      "INSERT INTO pending_operations(id, owner_id, entry_id, action, created_at) VALUES (?, ?, ?, ?, ?)",
      randomUUID(),
      ownerId,
      row.id,
      row.deleted_at ? "delete" : "upsert",
      new Date().toISOString(),
    );
    await tx.runAsync(
      "DELETE FROM sync_conflicts WHERE owner_id = ? AND diary_date = ?",
      ownerId,
      remote.diary_date,
    );
  });
}

export async function applyCloudCopy(
  ownerId: string,
  remote: RemoteMoment,
  downloaded: File | null,
  resolveConflict = false,
) {
  const db = await database;
  let stored: File | null = null;
  let replacedPath: string | null = null;
  let applied = false;
  if (!remote.deleted_at) {
    if (
      !downloaded ||
      !remote.kind ||
      !remote.media_path ||
      !remote.media_bytes
    )
      throw new Error("The cloud copy has incomplete media.");
    if (!downloaded.exists || downloaded.size !== remote.media_bytes)
      throw new Error("The downloaded media is incomplete.");
    stored = new File(
      ownerDirectory(ownerId),
      `${randomUUID()}.${fileExtension(remote.media_path, remote.kind)}`,
    );
    downloaded.move(stored);
  }
  try {
    await db.withExclusiveTransactionAsync(async (tx) => {
      const existing = await tx.getFirstAsync<{
        id: string;
        media_id: string;
        path: string;
        cloud_revision: number;
        pending: number;
      }>(
        `SELECT e.id, e.media_id, m.path, e.cloud_revision,
          (SELECT count(*) FROM pending_operations p JOIN entries changed ON changed.id = p.entry_id
            WHERE p.owner_id = e.owner_id AND changed.diary_date = e.diary_date) AS pending
         FROM entries e JOIN media m ON m.id = e.media_id
         WHERE e.owner_id = ? AND e.diary_date = ?
         ORDER BY (e.deleted_at IS NULL) DESC, e.updated_at DESC LIMIT 1`,
        ownerId,
        remote.diary_date,
      );
      if (existing?.pending && !resolveConflict)
        throw new Error(
          "This date changed on this phone. Resolve the conflict first.",
        );
      if (
        existing &&
        !resolveConflict &&
        remote.revision <= existing.cloud_revision
      )
        return;
      const now = new Date().toISOString();
      if (remote.deleted_at) {
        if (existing) {
          await tx.runAsync(
            `UPDATE entries SET deleted_at = ?, cloud_revision = ?, revision = revision + 1, updated_at = ?
             WHERE id = ? AND owner_id = ?`,
            remote.deleted_at,
            remote.revision,
            now,
            existing.id,
            ownerId,
          );
          replacedPath = mediaUri(ownerId, existing.path);
        }
      } else if (stored && remote.kind) {
        const mediaId = randomUUID();
        await tx.runAsync(
          `INSERT INTO media(id, owner_id, kind, path, duration_ms, byte_size, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          mediaId,
          ownerId,
          remote.kind,
          stored.name,
          remote.duration_ms,
          remote.media_bytes ?? 0,
          now,
        );
        if (existing) {
          await tx.runAsync(
            `UPDATE entries SET caption = ?, media_id = ?, source = ?, frame_y = ?, deleted_at = NULL,
              cloud_revision = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND owner_id = ?`,
            remote.caption,
            mediaId,
            remote.source ?? "library",
            remote.frame_y ?? "center",
            remote.revision,
            now,
            existing.id,
            ownerId,
          );
          await tx.runAsync(
            "DELETE FROM media WHERE id = ? AND owner_id = ?",
            existing.media_id,
            ownerId,
          );
          replacedPath = mediaUri(ownerId, existing.path);
        } else {
          await tx.runAsync(
            `INSERT INTO entries(id, owner_id, diary_date, caption, media_id, source, frame_y,
              created_at, updated_at, revision, cloud_revision)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
            randomUUID(),
            ownerId,
            remote.diary_date,
            remote.caption,
            mediaId,
            remote.source ?? "library",
            remote.frame_y ?? "center",
            now,
            now,
            remote.revision,
          );
        }
      }
      if (resolveConflict) {
        await tx.runAsync(
          "DELETE FROM pending_operations WHERE owner_id = ? AND entry_id IN (SELECT id FROM entries WHERE owner_id = ? AND diary_date = ?)",
          ownerId,
          ownerId,
          remote.diary_date,
        );
        await tx.runAsync(
          "DELETE FROM sync_conflicts WHERE owner_id = ? AND diary_date = ?",
          ownerId,
          remote.diary_date,
        );
      }
      applied = true;
    });
  } catch (error) {
    if (stored?.exists) stored.delete();
    throw error;
  }
  if (!applied && stored?.exists) stored.delete();
  try {
    if (replacedPath && new File(replacedPath).exists)
      new File(replacedPath).delete();
  } catch {
    // A committed cloud restore remains valid if stale-file cleanup must retry.
  }
}

import { randomUUID } from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import * as SQLite from "expo-sqlite";
import type { Moment } from "../state/DiaryContext";

type EntryRow = {
  id: string;
  diary_date: string;
  caption: string;
  kind: "photo" | "video";
  source: "camera" | "library";
  path: string;
  duration_ms: number | null;
};

const database = SQLite.openDatabaseAsync("memento.db").then(async (db) => {
  const version = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  if ((version?.user_version ?? 0) > 1)
    throw new Error("This diary needs a newer Memento version.");
  await db.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  if ((version?.user_version ?? 0) < 1)
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      kind TEXT NOT NULL CHECK(kind IN ('photo', 'video')),
      path TEXT NOT NULL,
      thumbnail_path TEXT,
      width INTEGER,
      height INTEGER,
      duration_ms INTEGER,
      byte_size INTEGER NOT NULL,
      sha256 TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      diary_date TEXT NOT NULL,
      caption TEXT NOT NULL DEFAULT '',
      media_id TEXT NOT NULL REFERENCES media(id),
      source TEXT NOT NULL CHECK(source IN ('camera', 'library')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      revision INTEGER NOT NULL DEFAULT 1,
      deleted_at TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS one_active_moment_per_day
      ON entries(owner_id, diary_date) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS entries_by_owner_date
      ON entries(owner_id, diary_date);
    CREATE TABLE IF NOT EXISTS preferences (
      owner_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      PRIMARY KEY(owner_id, key)
    );
    CREATE TABLE IF NOT EXISTS pending_operations (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      entry_id TEXT NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('upsert', 'delete')),
      created_at TEXT NOT NULL
    );
    PRAGMA user_version = 1;
  `);
  return db;
});

function ownerDirectory(ownerId: string) {
  if (!/^[a-zA-Z0-9-]{1,64}$/.test(ownerId))
    throw new Error("Invalid diary owner");
  const directory = new Directory(Paths.document, "memento", ownerId);
  directory.create({ intermediates: true, idempotent: true });
  return directory;
}

function mediaUri(ownerId: string, path: string) {
  // An absolute path is accepted for early development records; new records use filenames.
  return path.startsWith("file://")
    ? path
    : new File(ownerDirectory(ownerId), path).uri;
}

function fileExtension(uri: string, kind: Moment["kind"]) {
  const extension = uri
    .split(/[?#]/)[0]
    .match(/\.(jpe?g|png|heic|mp4|mov|m4v)$/i)?.[1];
  return extension?.toLowerCase() ?? (kind === "photo" ? "jpg" : "mp4");
}

export async function listSavedMoments(ownerId: string): Promise<Moment[]> {
  const db = await database;
  const referenced = await db.getAllAsync<{ path: string }>(
    "SELECT path FROM media WHERE owner_id = ?",
    ownerId,
  );
  const paths = new Set(
    referenced.map((row) => new File(mediaUri(ownerId, row.path)).name),
  );
  try {
    for (const item of ownerDirectory(ownerId).list()) {
      if (
        item instanceof File &&
        /^[0-9a-f-]{36}\.(jpe?g|png|heic|mp4|mov|m4v)$/i.test(item.name) &&
        !paths.has(item.name)
      )
        item.delete();
    }
  } catch {
    // Cleanup can retry on the next open without hiding committed diary entries.
  }
  const rows = await db.getAllAsync<EntryRow>(
    `SELECT e.id, e.diary_date, e.caption, e.source, m.kind, m.path, m.duration_ms
     FROM entries e JOIN media m ON m.id = e.media_id
     WHERE e.owner_id = ? AND e.deleted_at IS NULL
     ORDER BY e.diary_date`,
    ownerId,
  );
  return rows.map((row) => ({
    date: row.diary_date,
    kind: row.kind,
    source: row.source,
    uri: mediaUri(ownerId, row.path),
    caption: row.caption,
    duration: row.duration_ms == null ? undefined : row.duration_ms / 1000,
  }));
}

export async function saveMomentLocally(
  ownerId: string,
  moment: Moment,
): Promise<Moment> {
  if (!moment.uri) throw new Error("Choose a photo or video before saving.");
  if (moment.kind === "video" && (moment.duration ?? 0) > 60)
    throw new Error("Videos must be 60 seconds or shorter.");

  const db = await database;
  const current = await db.getFirstAsync<{ path: string }>(
    `SELECT m.path FROM entries e JOIN media m ON m.id = e.media_id
     WHERE e.owner_id = ? AND e.diary_date = ? AND e.deleted_at IS NULL`,
    ownerId,
    moment.date,
  );
  const needsCopy = !current || mediaUri(ownerId, current.path) !== moment.uri;
  let storedFile: File | null = null;
  if (needsCopy) {
    const directory = ownerDirectory(ownerId);
    storedFile = new File(
      directory,
      `${randomUUID()}.${fileExtension(moment.uri, moment.kind)}`,
    );
    await new File(moment.uri).copy(storedFile);
    if (!storedFile.exists || !storedFile.size) {
      if (storedFile.exists) storedFile.delete();
      throw new Error("The selected file could not be saved.");
    }
  }

  let replacedPath: string | null = null;
  try {
    await db.withExclusiveTransactionAsync(async (tx) => {
      const existing = await tx.getFirstAsync<{
        id: string;
        media_id: string;
        path: string;
        source: "camera" | "library";
      }>(
        `SELECT e.id, e.media_id, e.source, m.path FROM entries e
         JOIN media m ON m.id = e.media_id
         WHERE e.owner_id = ? AND e.diary_date = ? AND e.deleted_at IS NULL`,
        ownerId,
        moment.date,
      );
      const now = new Date().toISOString();
      const mediaId = needsCopy ? randomUUID() : existing?.media_id;
      if (!mediaId)
        throw new Error("The moment changed while saving. Please try again.");
      if (storedFile)
        await tx.runAsync(
          `INSERT INTO media (id, owner_id, kind, path, duration_ms, byte_size, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          mediaId,
          ownerId,
          moment.kind,
          storedFile.name,
          moment.duration == null ? null : Math.round(moment.duration * 1000),
          storedFile.size ?? 0,
          now,
        );
      const entryId = existing?.id ?? randomUUID();
      if (existing) {
        await tx.runAsync(
          `UPDATE entries SET caption = ?, media_id = ?, source = ?, updated_at = ?, revision = revision + 1
           WHERE id = ? AND owner_id = ?`,
          moment.caption,
          mediaId,
          needsCopy ? (moment.source ?? "library") : existing.source,
          now,
          entryId,
          ownerId,
        );
        if (storedFile) {
          replacedPath = mediaUri(ownerId, existing.path);
          await tx.runAsync(
            "DELETE FROM media WHERE id = ? AND owner_id = ?",
            existing.media_id,
            ownerId,
          );
        }
      } else {
        await tx.runAsync(
          `INSERT INTO entries (id, owner_id, diary_date, caption, media_id, source, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          entryId,
          ownerId,
          moment.date,
          moment.caption,
          mediaId,
          moment.source ?? "library",
          now,
          now,
        );
      }
      await tx.runAsync(
        `INSERT INTO pending_operations (id, owner_id, entry_id, action, created_at)
         VALUES (?, ?, ?, 'upsert', ?)`,
        randomUUID(),
        ownerId,
        entryId,
        now,
      );
    });
  } catch (error) {
    if (storedFile?.exists) storedFile.delete();
    throw error;
  }
  try {
    if (replacedPath && new File(replacedPath).exists)
      new File(replacedPath).delete();
  } catch {
    // A committed replacement must still be reported as saved; stale files can be cleaned later.
  }
  return { ...moment, uri: storedFile?.uri ?? moment.uri, sample: undefined };
}

export async function deleteMomentLocally(ownerId: string, date: string) {
  const db = await database;
  let oldPath: string | null = null;
  await db.withExclusiveTransactionAsync(async (tx) => {
    const existing = await tx.getFirstAsync<{
      id: string;
      media_id: string;
      path: string;
    }>(
      `SELECT e.id, e.media_id, m.path FROM entries e JOIN media m ON m.id = e.media_id
       WHERE e.owner_id = ? AND e.diary_date = ? AND e.deleted_at IS NULL`,
      ownerId,
      date,
    );
    if (!existing) return;
    const now = new Date().toISOString();
    await tx.runAsync(
      `UPDATE entries SET deleted_at = ?, updated_at = ?, revision = revision + 1
       WHERE id = ? AND owner_id = ?`,
      now,
      now,
      existing.id,
      ownerId,
    );
    await tx.runAsync(
      `INSERT INTO pending_operations (id, owner_id, entry_id, action, created_at)
       VALUES (?, ?, ?, 'delete', ?)`,
      randomUUID(),
      ownerId,
      existing.id,
      now,
    );
    oldPath = mediaUri(ownerId, existing.path);
  });
  try {
    if (oldPath && new File(oldPath).exists) new File(oldPath).delete();
  } catch {
    // The tombstone is committed even if filesystem cleanup must be retried.
  }
}

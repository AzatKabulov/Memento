import { database } from "./MomentStore.native";

export type LocalSettings = {
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  autoplay: boolean;
  theme: "dark" | "light";
  savedMediaBytes: number;
  savedCount: number;
};

export async function loadLocalSettings(
  ownerId: string,
): Promise<LocalSettings> {
  const db = await database;
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    "SELECT key, value FROM preferences WHERE owner_id = ? AND key IN ('reminder_enabled', 'reminder_hour', 'reminder_minute', 'autoplay', 'theme')",
    ownerId,
  );
  const values = Object.fromEntries(rows.map(({ key, value }) => [key, value]));
  const usage = await db.getFirstAsync<{ count: number; bytes: number }>(
    `SELECT count(*) AS count, coalesce(sum(m.byte_size), 0) AS bytes
     FROM entries e JOIN media m ON m.id = e.media_id
     WHERE e.owner_id = ? AND e.deleted_at IS NULL`,
    ownerId,
  );
  const hour = Number(values.reminder_hour ?? 20);
  const minute = Number(values.reminder_minute ?? 0);
  return {
    reminderEnabled: values.reminder_enabled === "true",
    reminderHour: Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : 20,
    reminderMinute:
      Number.isInteger(minute) && minute >= 0 && minute <= 59 ? minute : 0,
    autoplay: values.autoplay !== "false",
    theme: values.theme === "light" ? "light" : "dark",
    savedMediaBytes: usage?.bytes ?? 0,
    savedCount: usage?.count ?? 0,
  };
}

export async function saveLocalSetting(
  ownerId: string,
  key:
    | "reminder_enabled"
    | "reminder_hour"
    | "reminder_minute"
    | "autoplay"
    | "theme",
  value: string,
) {
  const db = await database;
  await db.runAsync(
    `INSERT INTO preferences(owner_id, key, value) VALUES (?, ?, ?)
     ON CONFLICT(owner_id, key) DO UPDATE SET value = excluded.value`,
    ownerId,
    key,
    value,
  );
}

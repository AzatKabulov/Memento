import type { Moment } from "../state/DiaryContext";
import type { File } from "expo-file-system";

export type InspectedArchive = {
  file: File;
  manifest: { entries: { date: string }[] };
  locations: Map<string, { offset: number; size: number }>;
};

const unavailable = (): never => {
  throw new Error(
    "Archive sharing is available in the iPhone and Android app.",
  );
};

export async function canShareFiles() {
  return false;
}
export async function pickDiaryArchive(): Promise<File | null> {
  return null;
}
export async function shareMoment(_moment: Moment): Promise<void> {
  unavailable();
}
export async function shareDiaryArchive(
  _ownerId: string,
  _progress: (message: string, completed: number, total: number) => void,
  _active: () => boolean,
): Promise<void> {
  unavailable();
}
export async function inspectDiaryArchive(
  _file: File,
  _progress: (message: string, completed: number, total: number) => void,
  _active: () => boolean,
): Promise<InspectedArchive> {
  return unavailable();
}
export async function restoreDiaryArchive(
  _ownerId: string,
  _inspected: InspectedArchive,
  _existingDates: ReadonlySet<string>,
  _duplicates: "skip" | "replace",
  _progress: (message: string, completed: number, total: number) => void,
  _active: () => boolean,
): Promise<{ restored: number; skipped: number }> {
  return unavailable();
}

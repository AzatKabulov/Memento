import { randomUUID } from "expo-crypto";
import { File, FileMode, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { diaryDate } from "../lib/dates";
import { mediaLimitIssue } from "../lib/mediaRules";
import type { Moment } from "../state/DiaryContext";
import {
  hasMomentLocally,
  listSavedMoments,
  MomentAlreadyExistsError,
  saveMomentLocally,
} from "../storage/MomentStore.native";
import {
  crc32Hex,
  crc32Update,
  paddedSize,
  readTarHeader,
  TAR_BLOCK,
  tarHeader,
} from "./tar";

const chunkSize = 512 * 1024;
const cushion = 128 * 1024 * 1024;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

type ArchiveEntry = {
  date: string;
  kind: "photo" | "video";
  caption: string;
  frame: "top" | "center" | "bottom";
  duration: number | null;
  mediaPath: string;
  mediaBytes: number;
  crc32: string;
};

type ArchiveManifest = {
  format: "memento-diary";
  version: 1;
  createdAt: string;
  entries: ArchiveEntry[];
};

export type InspectedArchive = {
  file: File;
  manifest: ArchiveManifest;
  locations: Map<string, { offset: number; size: number }>;
};

type Progress = (message: string, completed: number, total: number) => void;
type Active = () => boolean;

function requireActive(active: Active) {
  if (!active())
    throw new Error(
      "Operation cancelled. Changes already imported remain in your diary.",
    );
}

function yieldToUI() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

function extension(moment: Moment) {
  const match = moment.uri
    ?.split(/[?#]/)[0]
    .match(/\.(jpe?g|png|heic|heif|webp|avif|gif|mp4|mov|m4v)$/i);
  return match?.[1]?.toLowerCase() ?? (moment.kind === "video" ? "mp4" : "jpg");
}

function mediaPath(moment: Moment) {
  return `media/${moment.date}.${extension(moment)}`;
}

function ensureSpace(bytes: number) {
  const available = Paths.availableDiskSpace;
  if (available < bytes + cushion)
    throw new Error(
      "This phone needs more free space to make or restore the archive.",
    );
}

export async function canShareFiles() {
  return Sharing.isAvailableAsync();
}

export async function pickDiaryArchive() {
  const picked = await File.pickFileAsync({ mimeTypes: "*/*" });
  return picked.canceled ? null : picked.result;
}

export async function shareMoment(moment: Moment) {
  if (!moment.uri || !(await canShareFiles()))
    throw new Error("Sharing is unavailable on this device.");
  if (!new File(moment.uri).exists)
    throw new Error("This moment's file is missing.");
  const mimeByExtension: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    heic: "image/heic",
    heif: "image/heif",
    webp: "image/webp",
    avif: "image/avif",
    gif: "image/gif",
    mp4: "video/mp4",
    mov: "video/quicktime",
    m4v: "video/x-m4v",
  };
  await Sharing.shareAsync(moment.uri, {
    dialogTitle: "Share this moment",
    mimeType: mimeByExtension[extension(moment)] ?? "application/octet-stream",
  });
}

export async function shareDiaryArchive(
  ownerId: string,
  progress: Progress,
  active: Active,
) {
  if (!(await canShareFiles()))
    throw new Error("Sharing is unavailable on this device.");
  const moments = await listSavedMoments(ownerId);
  if (!moments.length)
    throw new Error("Add a moment before exporting your diary.");
  const sources = moments.map((moment) => {
    if (!moment.uri) throw new Error("A saved moment is missing its file.");
    const file = new File(moment.uri);
    if (!file.exists || !file.size)
      throw new Error(`The saved file for ${moment.date} is missing.`);
    return { moment, file, path: mediaPath(moment) };
  });
  const mediaTotal = sources.reduce((sum, item) => sum + item.file.size, 0);
  const estimated =
    sources.reduce(
      (sum, item) => sum + TAR_BLOCK + paddedSize(item.file.size),
      0,
    ) +
    5 * 1024 * 1024;
  ensureSpace(estimated);
  const output = new File(
    Paths.cache,
    `Memento-${diaryDate(new Date())}-${randomUUID()}.tar`,
  );
  output.create();
  const writer = output.open(FileMode.WriteOnly);
  const entries: ArchiveEntry[] = [];
  let completed = 0;
  try {
    for (const { moment, file, path } of sources) {
      requireActive(active);
      writer.writeBytes(tarHeader(path, file.size));
      const reader = file.open(FileMode.ReadOnly);
      let checksum = 0xffffffff;
      try {
        let remaining = file.size;
        while (remaining > 0) {
          requireActive(active);
          const bytes = reader.readBytes(Math.min(chunkSize, remaining));
          if (!bytes.length)
            throw new Error(`The saved file for ${moment.date} ended early.`);
          writer.writeBytes(bytes);
          checksum = crc32Update(checksum, bytes);
          remaining -= bytes.length;
          completed += bytes.length;
          progress("Preparing archive", completed, mediaTotal);
          await yieldToUI();
        }
      } finally {
        reader.close();
      }
      const padding = paddedSize(file.size) - file.size;
      if (padding) writer.writeBytes(new Uint8Array(padding));
      entries.push({
        date: moment.date,
        kind: moment.kind,
        caption: moment.caption,
        frame: moment.frame ?? "center",
        duration: moment.duration ?? null,
        mediaPath: path,
        mediaBytes: file.size,
        crc32: crc32Hex(checksum),
      });
    }
    const manifest: ArchiveManifest = {
      format: "memento-diary",
      version: 1,
      createdAt: new Date().toISOString(),
      entries,
    };
    const bytes = encoder.encode(JSON.stringify(manifest));
    if (bytes.length > 5 * 1024 * 1024)
      throw new Error("This diary is too large for one archive manifest.");
    writer.writeBytes(tarHeader("manifest.json", bytes.length));
    writer.writeBytes(bytes);
    const padding = paddedSize(bytes.length) - bytes.length;
    if (padding) writer.writeBytes(new Uint8Array(padding));
    writer.writeBytes(new Uint8Array(2 * TAR_BLOCK));
  } catch (error) {
    writer.close();
    if (output.exists) output.delete();
    throw error;
  }
  writer.close();
  try {
    requireActive(active);
    progress("Ready to save", mediaTotal, mediaTotal);
    await Sharing.shareAsync(output.uri, {
      dialogTitle: "Save your Memento archive",
      mimeType: "application/x-tar",
      UTI: "public.tar-archive",
    });
  } finally {
    if (output.exists) output.delete();
  }
}

function validEntry(value: unknown): value is ArchiveEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<ArchiveEntry>;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date ?? "")) return false;
  const [year, month, day] = entry.date!.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (diaryDate(date) !== entry.date || entry.date! > diaryDate(new Date()))
    return false;
  if (entry.kind !== "photo" && entry.kind !== "video") return false;
  if (typeof entry.caption !== "string" || entry.caption.length > 500)
    return false;
  if (
    entry.frame !== "top" &&
    entry.frame !== "center" &&
    entry.frame !== "bottom"
  )
    return false;
  if (!Number.isSafeInteger(entry.mediaBytes) || (entry.mediaBytes ?? 0) < 1)
    return false;
  if (
    typeof entry.mediaPath !== "string" ||
    !new RegExp(
      `^media/${entry.date}\\.(jpe?g|png|heic|heif|webp|avif|gif|mp4|mov|m4v)$`,
      "i",
    ).test(entry.mediaPath)
  )
    return false;
  const extension = entry.mediaPath.split(".").pop()?.toLowerCase();
  if (
    entry.kind === "video"
      ? !["mp4", "mov", "m4v"].includes(extension ?? "")
      : !["jpg", "jpeg", "png", "heic", "heif", "webp", "avif", "gif"].includes(
          extension ?? "",
        )
  )
    return false;
  if (!/^[0-9a-f]{8}$/.test(entry.crc32 ?? "")) return false;
  if (entry.kind === "photo" && entry.duration !== null) return false;
  if (
    entry.kind === "video" &&
    (typeof entry.duration !== "number" || !Number.isFinite(entry.duration))
  )
    return false;
  if (
    mediaLimitIssue(entry.kind, entry.duration ?? undefined, entry.mediaBytes)
  )
    return false;
  return true;
}

export function validateManifest(value: unknown): ArchiveManifest {
  if (!value || typeof value !== "object")
    throw new Error("This is not a Memento archive.");
  const manifest = value as Partial<ArchiveManifest>;
  if (
    manifest.format !== "memento-diary" ||
    manifest.version !== 1 ||
    !Array.isArray(manifest.entries) ||
    manifest.entries.length === 0 ||
    manifest.entries.length > 10000 ||
    !manifest.entries.every(validEntry)
  )
    throw new Error("This archive's format or contents are not supported.");
  const dates = new Set(manifest.entries.map((entry) => entry.date));
  if (dates.size !== manifest.entries.length)
    throw new Error("This archive contains duplicate dates.");
  return manifest as ArchiveManifest;
}

export async function inspectDiaryArchive(
  file: File,
  progress: Progress,
  active: Active,
): Promise<InspectedArchive> {
  if (!file.exists || !file.size || file.size < 2 * TAR_BLOCK)
    throw new Error("Choose a complete Memento archive.");
  const reader = file.open(FileMode.ReadOnly);
  const locations = new Map<string, { offset: number; size: number }>();
  const checksums = new Map<string, string>();
  let manifest: ArchiveManifest | null = null;
  let position = 0;
  let ended = false;
  try {
    while (position + TAR_BLOCK <= file.size) {
      requireActive(active);
      reader.offset = position;
      const header = readTarHeader(reader.readBytes(TAR_BLOCK));
      position += TAR_BLOCK;
      if (!header) {
        const second = reader.readBytes(TAR_BLOCK);
        if (
          second.length !== TAR_BLOCK ||
          second.some((byte) => byte !== 0) ||
          position + TAR_BLOCK !== file.size ||
          !manifest
        )
          throw new Error("Archive ending is damaged.");
        ended = true;
        break;
      }
      if (
        manifest ||
        position + paddedSize(header.size) > file.size - 2 * TAR_BLOCK
      )
        throw new Error("Archive contents are incomplete or out of order.");
      if (header.name === "manifest.json") {
        if (header.size > 5 * 1024 * 1024)
          throw new Error("Archive manifest is too large.");
        const bytes = reader.readBytes(header.size);
        if (bytes.length !== header.size)
          throw new Error("Archive manifest is incomplete.");
        try {
          manifest = validateManifest(JSON.parse(decoder.decode(bytes)));
        } catch (error) {
          if (error instanceof SyntaxError)
            throw new Error("Archive manifest is damaged.");
          throw error;
        }
      } else {
        if (
          !/^media\/\d{4}-\d{2}-\d{2}\.(jpe?g|png|heic|heif|webp|avif|gif|mp4|mov|m4v)$/i.test(
            header.name,
          ) ||
          locations.has(header.name) ||
          locations.size >= 10000
        )
          throw new Error("Archive has an unsupported or repeated media path.");
        locations.set(header.name, { offset: position, size: header.size });
        let remaining = header.size;
        let checksum = 0xffffffff;
        while (remaining > 0) {
          requireActive(active);
          const bytes = reader.readBytes(Math.min(chunkSize, remaining));
          if (!bytes.length) throw new Error("Archive media ended early.");
          checksum = crc32Update(checksum, bytes);
          remaining -= bytes.length;
          progress(
            "Checking archive",
            position + header.size - remaining,
            file.size,
          );
          await yieldToUI();
        }
        checksums.set(header.name, crc32Hex(checksum));
      }
      position += paddedSize(header.size);
    }
  } finally {
    reader.close();
  }
  if (!ended || !manifest || manifest.entries.length !== locations.size)
    throw new Error("Archive manifest does not match its media.");
  for (const entry of manifest.entries) {
    const location = locations.get(entry.mediaPath);
    if (
      !location ||
      location.size !== entry.mediaBytes ||
      checksums.get(entry.mediaPath) !== entry.crc32
    )
      throw new Error(`Archive media for ${entry.date} is damaged.`);
  }
  requireActive(active);
  return { file, manifest, locations };
}

export async function restoreDiaryArchive(
  ownerId: string,
  inspected: InspectedArchive,
  existingDates: ReadonlySet<string>,
  duplicates: "skip" | "replace",
  progress: Progress,
  active: Active,
) {
  let restored = 0;
  let skipped = 0;
  const entries = inspected.manifest.entries;
  const archive = inspected.file.open(FileMode.ReadOnly);
  try {
    for (let index = 0; index < entries.length; index += 1) {
      requireActive(active);
      const entry = entries[index];
      if (
        duplicates === "skip" &&
        (existingDates.has(entry.date) ||
          (await hasMomentLocally(ownerId, entry.date)))
      ) {
        skipped += 1;
        await yieldToUI();
        continue;
      }
      ensureSpace(entry.mediaBytes * 2);
      const location = inspected.locations.get(entry.mediaPath);
      if (!location)
        throw new Error(`Archive media for ${entry.date} is missing.`);
      const temporary = new File(
        Paths.cache,
        `memento-import-${randomUUID()}.${entry.mediaPath.split(".").pop()}`,
      );
      temporary.create();
      try {
        const output = temporary.open(FileMode.WriteOnly);
        try {
          archive.offset = location.offset;
          let remaining = location.size;
          let checksum = 0xffffffff;
          while (remaining > 0) {
            requireActive(active);
            const bytes = archive.readBytes(Math.min(chunkSize, remaining));
            if (!bytes.length)
              throw new Error(`Archive media for ${entry.date} ended early.`);
            output.writeBytes(bytes);
            checksum = crc32Update(checksum, bytes);
            remaining -= bytes.length;
            progress(
              "Restoring memories",
              index + (location.size - remaining) / location.size,
              entries.length,
            );
            await yieldToUI();
          }
          if (crc32Hex(checksum) !== entry.crc32)
            throw new Error(
              `Archive media for ${entry.date} changed during import.`,
            );
        } finally {
          output.close();
        }
        requireActive(active);
        try {
          await saveMomentLocally(
            ownerId,
            {
              date: entry.date,
              kind: entry.kind,
              source: "library",
              uri: temporary.uri,
              caption: entry.caption,
              frame: entry.frame,
              duration: entry.duration ?? undefined,
            },
            duplicates === "skip",
          );
        } catch (error) {
          if (
            duplicates === "skip" &&
            error instanceof MomentAlreadyExistsError
          ) {
            skipped += 1;
            continue;
          }
          throw error;
        }
        existingDates = new Set(existingDates).add(entry.date);
        restored += 1;
      } finally {
        if (temporary.exists) temporary.delete();
      }
      progress("Restoring memories", index + 1, entries.length);
    }
  } finally {
    archive.close();
  }
  return { restored, skipped };
}

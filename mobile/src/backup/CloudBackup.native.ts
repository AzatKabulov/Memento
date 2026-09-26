import NetInfo from "@react-native-community/netinfo";
import { randomUUID } from "expo-crypto";
import { File, Paths } from "expo-file-system";
import { supabase } from "../auth/client.native";
import { incomingAction, retryDelayMs } from "./decisions";
import type { LocalChange, RemoteMoment } from "./types";
import {
  acknowledgeRemoteMutation,
  applyCloudCopy,
  choosePhoneCopy,
  delayOperation,
  localSyncIndex,
  markOperationApplied,
  markSyncAt,
  nextPendingChange,
  rememberConflict,
  saveUploadCursor,
} from "../storage/BackupStore.native";
import { mediaUri } from "../storage/MomentStore.native";

const bucket = "memento-private";
const chunkBytes = 6 * 1024 * 1024;
type Progress = (message: string, fraction?: number) => void;

function client() {
  if (!supabase)
    throw new Error("Connect a Supabase project before backing up.");
  return supabase;
}

async function sessionToken(ownerId: string) {
  const { data, error } = await client().auth.getSession();
  if (error || !data.session || data.session.user.id !== ownerId)
    throw new Error("Sign in again to continue your backup.");
  return data.session.access_token;
}

export async function connectionAllowed(wifiOnly: boolean) {
  const state = await NetInfo.fetch();
  if (!state.isConnected || state.isInternetReachable === false)
    return "offline" as const;
  if (wifiOnly && state.type !== "wifi" && state.type !== "ethernet")
    return "wifi" as const;
  return "ready" as const;
}

function contentType(fileName: string, kind: LocalChange["kind"]) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  const known: Record<string, string> = {
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
  return (
    known[extension ?? ""] ?? (kind === "video" ? "video/mp4" : "image/jpeg")
  );
}

function projectOrigin() {
  const projectUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!projectUrl) throw new Error("The backup service is not configured.");
  return new URL(projectUrl).origin;
}

function storageOrigin() {
  const url = new URL(projectOrigin());
  if (/^[a-z0-9-]+\.supabase\.co$/.test(url.hostname))
    url.hostname = url.hostname.replace(".supabase.co", ".storage.supabase.co");
  return url.origin;
}

function base64Ascii(value: string) {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let encoded = "";
  for (let i = 0; i < value.length; i += 3) {
    const a = value.charCodeAt(i);
    const b = i + 1 < value.length ? value.charCodeAt(i + 1) : 0;
    const c = i + 2 < value.length ? value.charCodeAt(i + 2) : 0;
    if (a > 127 || b > 127 || c > 127) throw new Error("Invalid media path.");
    encoded += alphabet[a >> 2];
    encoded += alphabet[((a & 3) << 4) | (b >> 4)];
    encoded +=
      i + 1 < value.length ? alphabet[((b & 15) << 2) | (c >> 6)] : "=";
    encoded += i + 2 < value.length ? alphabet[c & 63] : "=";
  }
  return encoded;
}

function uploadMetadata(path: string, mime: string) {
  return Object.entries({
    bucketName: bucket,
    objectName: path,
    contentType: mime,
  })
    .map(([key, value]) => `${key} ${base64Ascii(value)}`)
    .join(",");
}

async function verifiedRemoteSize(path: string) {
  const { data, error } = await client().storage.from(bucket).info(path);
  if (error || !data) return null;
  return Number(data.size);
}

async function uploadMedia(
  ownerId: string,
  change: LocalChange,
  wifiOnly: boolean,
  active: () => boolean,
  progress: Progress,
) {
  const path = `${ownerId}/${change.mediaId}/${change.mediaPath.split(/[\\/]/).pop()}`;
  const file = new File(mediaUri(ownerId, change.mediaPath));
  if (!file.exists || !file.size || file.size !== change.mediaBytes)
    throw new Error("The local media file is missing or has changed.");
  const remoteSize = await verifiedRemoteSize(path);
  if (remoteSize === file.size) return path;
  if (remoteSize !== null)
    throw new Error("The cloud file size does not match the phone copy.");

  const origin = storageOrigin();
  const endpoint = `${origin}/storage/v1/upload/resumable`;
  const headers = {
    authorization: `Bearer ${await sessionToken(ownerId)}`,
    apikey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
    "Tus-Resumable": "1.0.0",
  };
  let uploadUrl = change.uploadPath === path ? change.uploadUrl : null;
  let offset = 0;
  if (uploadUrl) {
    if (!uploadUrl.startsWith(`${origin}/storage/v1/upload/resumable/`))
      uploadUrl = null;
    else {
      const response = await fetch(uploadUrl, { method: "HEAD", headers });
      if (response.ok)
        offset = Number(response.headers.get("Upload-Offset") ?? 0);
      else if (response.status === 404 || response.status === 410)
        uploadUrl = null;
      else throw new Error("Could not resume the media upload.");
    }
  }
  if (!uploadUrl) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        ...headers,
        "Upload-Length": String(file.size),
        "Upload-Metadata": uploadMetadata(
          path,
          contentType(file.name, change.kind),
        ),
      },
    });
    if (!response.ok) throw new Error("Could not start the media upload.");
    const location = response.headers.get("Location");
    if (!location)
      throw new Error("The backup service did not return an upload address.");
    uploadUrl = new URL(location, endpoint).toString();
    if (!uploadUrl.startsWith(`${origin}/storage/v1/upload/resumable/`))
      throw new Error(
        "The backup service returned an unexpected upload address.",
      );
    await saveUploadCursor(ownerId, change.operationId, path, uploadUrl);
  }

  const handle = file.open();
  try {
    while (offset < file.size) {
      if (!active() || (await connectionAllowed(wifiOnly)) !== "ready")
        throw new Error("Backup paused until the allowed connection returns.");
      handle.offset = offset;
      const bytes = handle.readBytes(Math.min(chunkBytes, file.size - offset));
      if (!bytes.length) throw new Error("The local media file ended early.");
      const chunk = new File(
        Paths.cache,
        `memento-upload-${randomUUID()}.part`,
      );
      try {
        chunk.write(bytes);
        const result = await chunk.upload(uploadUrl, {
          httpMethod: "PATCH",
          mimeType: "application/offset+octet-stream",
          sessionType: "foreground",
          headers: {
            ...headers,
            "Content-Type": "application/offset+octet-stream",
            "Upload-Offset": String(offset),
          },
          onProgress: ({ bytesSent }) =>
            progress("Backing up media", (offset + bytesSent) / file.size),
        });
        if (result.status !== 204 && result.status !== 200)
          throw new Error("The media transfer was interrupted.");
        const next = Number(
          result.headers["upload-offset"] ?? result.headers["Upload-Offset"],
        );
        offset =
          Number.isFinite(next) && next > offset ? next : offset + bytes.length;
        progress("Backing up media", offset / file.size);
      } finally {
        if (chunk.exists) chunk.delete();
      }
    }
  } finally {
    handle.close();
  }
  const uploadedSize = await verifiedRemoteSize(path);
  if (uploadedSize !== file.size)
    throw new Error("The cloud file could not be verified.");
  return path;
}

async function remoteMoments(ownerId: string): Promise<RemoteMoment[]> {
  const result: RemoteMoment[] = [];
  for (let offset = 0; ; offset += 200) {
    const { data, error } = await client()
      .from("memento_moments")
      .select("*")
      .eq("owner_id", ownerId)
      .order("diary_date", { ascending: true })
      .range(offset, offset + 199);
    if (error) throw error;
    result.push(...((data ?? []) as RemoteMoment[]));
    if (!data || data.length < 200) break;
  }
  return result;
}

export async function downloadCloudMedia(
  ownerId: string,
  remote: RemoteMoment,
  progress?: Progress,
) {
  if (
    !remote.media_path ||
    !remote.media_bytes ||
    !remote.media_path.startsWith(`${ownerId}/`)
  )
    throw new Error("The cloud copy has an invalid media path.");
  const path = remote.media_path.split("/").map(encodeURIComponent).join("/");
  const url = `${projectOrigin()}/storage/v1/object/authenticated/${bucket}/${path}`;
  const destination = new File(
    Paths.cache,
    `memento-restore-${randomUUID()}.part`,
  );
  try {
    await File.downloadFileAsync(url, destination, {
      headers: {
        authorization: `Bearer ${await sessionToken(ownerId)}`,
        apikey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
      },
      onProgress: ({ bytesWritten, totalBytes }) =>
        progress?.(
          "Downloading a memory",
          totalBytes > 0 ? bytesWritten / totalBytes : undefined,
        ),
    });
    if (destination.size !== remote.media_bytes)
      throw new Error("The downloaded memory is incomplete.");
    return destination;
  } catch (error) {
    if (destination.exists) destination.delete();
    throw error;
  }
}

async function checkConflictIsCurrent(ownerId: string, remote: RemoteMoment) {
  const { data, error } = await client()
    .from("memento_moments")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("diary_date", remote.diary_date)
    .single();
  if (error || !data)
    throw error ?? new Error("Could not check the cloud copy.");
  const latest = data as RemoteMoment;
  if (
    latest.revision !== remote.revision ||
    latest.mutation_id !== remote.mutation_id
  ) {
    await rememberConflict(ownerId, latest);
    throw new Error(
      "The cloud copy changed. Compare this date again before choosing.",
    );
  }
}

export async function restoreCloudCopy(
  ownerId: string,
  remote: RemoteMoment,
  progress?: Progress,
) {
  await checkConflictIsCurrent(ownerId, remote);
  const downloaded = remote.deleted_at
    ? null
    : await downloadCloudMedia(ownerId, remote, progress);
  try {
    await checkConflictIsCurrent(ownerId, remote);
    await applyCloudCopy(ownerId, remote, downloaded, true);
  } finally {
    if (downloaded?.exists) downloaded.delete();
  }
}

export async function keepPhoneCopy(ownerId: string, remote: RemoteMoment) {
  await checkConflictIsCurrent(ownerId, remote);
  await choosePhoneCopy(ownerId, remote);
}

export async function runCloudSync(
  ownerId: string,
  wifiOnly: boolean,
  active: () => boolean,
  progress: Progress,
) {
  const connection = await connectionAllowed(wifiOnly);
  if (connection !== "ready") return { restored: 0, connection };
  const { data, error } = await client().auth.getUser();
  if (error || data.user?.id !== ownerId)
    throw new Error("Sign in again to continue your backup.");

  progress("Checking your private diary");
  const cloud = await remoteMoments(ownerId);
  let index = await localSyncIndex(ownerId);
  let restored = 0;
  for (const remote of cloud) {
    if (!active()) break;
    if (
      await acknowledgeRemoteMutation(
        ownerId,
        remote.mutation_id,
        remote.revision,
      )
    )
      index = await localSyncIndex(ownerId);
    const decision = incomingAction(
      index.get(remote.diary_date) ?? null,
      remote.revision,
    );
    if (decision === "conflict") {
      await rememberConflict(ownerId, remote);
    } else if (decision === "restore") {
      if (remote.deleted_at && !index.has(remote.diary_date)) continue;
      const downloaded = remote.deleted_at
        ? null
        : await downloadCloudMedia(ownerId, remote, progress);
      try {
        await applyCloudCopy(ownerId, remote, downloaded);
        restored += 1;
      } finally {
        if (downloaded?.exists) downloaded.delete();
      }
      index.set(remote.diary_date, {
        cloudRevision: remote.revision,
        pending: false,
      });
    }
  }

  for (let count = 0; count < 20 && active(); count += 1) {
    const change = await nextPendingChange(ownerId);
    if (!change) break;
    if ((await connectionAllowed(wifiOnly)) !== "ready") break;
    try {
      const mediaPath = change.deletedAt
        ? null
        : await uploadMedia(ownerId, change, wifiOnly, active, progress);
      const { data: result, error: writeError } = await client().rpc(
        "memento_apply_change",
        {
          p_date: change.date,
          p_expected_revision: change.cloudRevision,
          p_mutation_id: change.operationId,
          p_deleted: !!change.deletedAt,
          p_kind: change.deletedAt ? null : change.kind,
          p_caption: change.deletedAt ? "" : change.caption,
          p_source: change.deletedAt ? null : change.source,
          p_frame_y: change.deletedAt ? null : change.frame,
          p_duration_ms: change.deletedAt ? null : change.durationMs,
          p_media_path: mediaPath,
          p_media_bytes: change.deletedAt ? null : change.mediaBytes,
        },
      );
      if (writeError) throw writeError;
      const outcome = result as { status?: string; revision?: number } | null;
      if (outcome?.status === "conflict") {
        const { data: latest, error: readError } = await client()
          .from("memento_moments")
          .select("*")
          .eq("owner_id", ownerId)
          .eq("diary_date", change.date)
          .single();
        if (readError || !latest)
          throw readError ?? new Error("Could not load the other copy.");
        await rememberConflict(ownerId, latest as RemoteMoment);
      } else if (
        outcome?.status === "applied" &&
        typeof outcome.revision === "number"
      ) {
        await markOperationApplied(
          ownerId,
          change.operationId,
          change.entryId,
          outcome.revision,
        );
      } else
        throw new Error("The backup service returned an unexpected result.");
    } catch {
      await delayOperation(
        ownerId,
        change.operationId,
        new Date(Date.now() + retryDelayMs(change.attempts)).toISOString(),
        "Backup could not finish. Tap Sync now to retry.",
      );
    }
  }
  if (active()) await markSyncAt(ownerId);
  return { restored, connection: "ready" as const };
}

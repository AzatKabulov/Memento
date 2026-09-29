import { randomUUID } from "expo-crypto";
import { supabase } from "../auth/client";
import { diaryDate, isValidDiaryDate } from "../lib/dates";
import { mediaLimitIssue, mediaLimitMessage } from "../lib/mediaRules";
import { focalPoint } from "../lib/photoFrame";
import type { Moment } from "../state/DiaryContext";
import type { RemoteMoment } from "../backup/types";

const bucket = "memento-private";
const signedUrlSeconds = 60 * 60;
const knownTypes: Record<string, string> = {
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

function client() {
  if (!supabase) throw new Error("The cloud diary is not configured yet.");
  return supabase;
}

function extensionFor(blob: Blob, uri: string, kind: Moment["kind"]) {
  const uriExtension = uri
    .split(/[?#]/)[0]
    .match(/\.([a-z0-9]+)$/i)?.[1]
    ?.toLowerCase();
  const byType = Object.entries(knownTypes).find(
    ([, contentType]) => contentType === blob.type.toLowerCase(),
  )?.[0];
  const extension = byType ?? uriExtension;
  const contentType = blob.type || knownTypes[extension ?? ""];
  if (!extension || !contentType)
    throw new Error(
      "Memento could not identify this file type. Choose another file.",
    );
  if (!Object.values(knownTypes).includes(contentType.toLowerCase()))
    throw new Error(
      "This browser video format is not supported. Choose an MP4 or MOV video.",
    );
  return { extension, contentType };
}

async function signPath(path: string) {
  const { data, error } = await client()
    .storage.from(bucket)
    .createSignedUrl(path, signedUrlSeconds);
  if (error || !data?.signedUrl)
    throw error ?? new Error("The private media link could not be created.");
  return data.signedUrl;
}

async function toMoment(
  ownerId: string,
  row: RemoteMoment,
  signedUri?: string,
): Promise<Moment> {
  if (
    row.deleted_at ||
    !row.media_path ||
    !row.media_path.startsWith(`${ownerId}/`) ||
    !row.kind
  )
    throw new Error("A saved moment has an invalid private media reference.");
  return {
    date: row.diary_date,
    kind: row.kind,
    source: row.source ?? "library",
    uri: signedUri ?? (await signPath(row.media_path)),
    caption: row.caption,
    frame: row.frame_y ?? "center",
    focalX: row.focal_x ?? 50,
    focalY: row.focal_y ?? 50,
    duration: row.duration_ms == null ? undefined : row.duration_ms / 1000,
    cloudPath: row.media_path,
    cloudRevision: row.revision,
    cloudBytes: Number(row.media_bytes ?? 0),
  };
}

async function currentRow(ownerId: string, date: string) {
  const { data, error } = await client()
    .from("memento_moments")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("diary_date", date)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as RemoteMoment | null;
}

export async function listSavedMoments(ownerId: string): Promise<Moment[]> {
  const { data, error } = await client()
    .from("memento_moments")
    .select("*")
    .eq("owner_id", ownerId)
    .is("deleted_at", null)
    .order("diary_date", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as RemoteMoment[];
  const signedUrls = new Map<string, string>();
  for (let offset = 0; offset < rows.length; offset += 100) {
    const batch = rows.slice(offset, offset + 100);
    const paths = batch
      .map((row) => row.media_path)
      .filter((path): path is string => !!path);
    const { data: links, error: signError } = await client()
      .storage.from(bucket)
      .createSignedUrls(paths, signedUrlSeconds);
    if (signError) throw signError;
    for (const link of links ?? []) {
      if (link.path && link.signedUrl && !link.error)
        signedUrls.set(link.path, link.signedUrl);
    }
  }
  return Promise.all(
    rows.map((row) => {
      const uri = row.media_path ? signedUrls.get(row.media_path) : undefined;
      if (!uri) throw new Error("A private moment could not be opened.");
      return toMoment(ownerId, row, uri);
    }),
  );
}

export async function backfillPhotoThumbnails(
  _ownerId: string,
  _onReady: (date: string, photoUri: string, thumbnailUri: string) => void,
): Promise<void> {}

export async function saveMomentLocally(
  ownerId: string,
  moment: Moment,
): Promise<Moment> {
  if (!moment.uri) throw new Error("Choose a photo or video before saving.");
  if (!isValidDiaryDate(moment.date) || moment.date > diaryDate(new Date()))
    throw new Error("Choose today or an earlier date.");
  if (moment.source === "camera" && moment.date !== diaryDate(new Date()))
    throw new Error("Choose a moment from your library for a past date.");

  const existing = await currentRow(ownerId, moment.date);
  if (
    existing &&
    !existing.deleted_at &&
    moment.cloudRevision != null &&
    existing.revision !== moment.cloudRevision
  )
    throw new Error(
      "This date changed in your account on another device. Reopen the calendar and try again.",
    );

  const hasSameCloudMedia =
    !!moment.cloudPath &&
    !existing?.deleted_at &&
    existing?.media_path === moment.cloudPath;
  let mediaPath: string;
  let mediaBytes: number;
  if (hasSameCloudMedia && existing) {
    mediaPath = existing.media_path!;
    mediaBytes = Number(existing.media_bytes);
  } else {
    let blob: Blob;
    try {
      const response = await fetch(moment.uri);
      if (!response.ok) throw new Error("The selected file could not be read.");
      blob = await response.blob();
    } catch {
      throw new Error(
        "The selected media is no longer available. Choose it from your library again.",
      );
    }
    const issue = mediaLimitIssue(moment.kind, moment.duration, blob.size);
    if (issue) throw new Error(mediaLimitMessage(issue));
    if (moment.kind === "video" && moment.duration == null)
      throw new Error(
        "Memento could not read this video’s length. Choose another video.",
      );
    const { extension, contentType } = extensionFor(
      blob,
      moment.uri,
      moment.kind,
    );
    const mediaId = randomUUID();
    mediaPath = `${ownerId}/${mediaId}/${mediaId}.${extension}`;
    mediaBytes = blob.size;
    const { error } = await client()
      .storage.from(bucket)
      .upload(mediaPath, blob, {
        contentType,
        cacheControl: "3600",
        upsert: false,
      });
    if (error) throw error;
  }

  const focal = focalPoint(moment);
  const mutationId = randomUUID();
  const writeArgs = {
    p_date: moment.date,
    p_expected_revision: existing?.revision ?? 0,
    p_mutation_id: mutationId,
    p_deleted: false,
    p_kind: moment.kind,
    p_caption: moment.caption.slice(0, 500),
    p_source: moment.source ?? "library",
    p_frame_y: moment.frame ?? "center",
    p_duration_ms:
      moment.kind === "video" && moment.duration != null
        ? Math.round(moment.duration * 1000)
        : null,
    p_media_path: mediaPath,
    p_media_bytes: mediaBytes,
  };
  let { data, error } = await client().rpc("memento_apply_change_v2", {
    ...writeArgs,
    p_focal_x: focal.x,
    p_focal_y: focal.y,
  });
  // Older Supabase projects may have the first diary migration but not yet the
  // focal-point migration. Keep saving working there, as the native app does.
  if (error?.code === "PGRST202")
    ({ data, error } = await client().rpc("memento_apply_change", writeArgs));
  if (error) throw error;
  const result = data as { status?: string } | null;
  if (result?.status === "conflict")
    throw new Error(
      "This date changed in your account on another device. Reopen the calendar and try again.",
    );
  if (result?.status !== "applied")
    throw new Error(
      "The cloud diary did not confirm this save. Please try again.",
    );

  const saved = await currentRow(ownerId, moment.date);
  if (!saved) throw new Error("The saved moment could not be reloaded.");
  return toMoment(ownerId, saved);
}

export async function deleteMomentLocally(ownerId: string, date: string) {
  const existing = await currentRow(ownerId, date);
  if (!existing || existing.deleted_at) return;
  const writeArgs = {
    p_date: date,
    p_expected_revision: existing.revision,
    p_mutation_id: randomUUID(),
    p_deleted: true,
    p_kind: null,
    p_caption: "",
    p_source: null,
    p_frame_y: null,
    p_duration_ms: null,
    p_media_path: null,
    p_media_bytes: null,
  };
  let { data, error } = await client().rpc("memento_apply_change_v2", {
    ...writeArgs,
    p_focal_x: null,
    p_focal_y: null,
  });
  if (error?.code === "PGRST202")
    ({ data, error } = await client().rpc("memento_apply_change", writeArgs));
  if (error) throw error;
  const result = data as { status?: string } | null;
  if (result?.status === "conflict")
    throw new Error(
      "This date changed on another device. Reload and try again.",
    );
  if (result?.status !== "applied")
    throw new Error(
      "The diary did not confirm this removal. Please try again.",
    );
}

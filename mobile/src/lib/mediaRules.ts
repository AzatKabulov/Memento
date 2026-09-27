export const MAX_PHOTO_BYTES = 25 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 45 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 60;

export type MediaLimitIssue =
  | "video-too-long"
  | "video-duration-unknown"
  | "media-too-large"
  | "media-empty";

export function mediaLimitIssue(
  kind: "photo" | "video",
  durationSeconds?: number,
  fileSize?: number,
): MediaLimitIssue | null {
  if (kind === "video") {
    if (
      durationSeconds == null ||
      !Number.isFinite(durationSeconds) ||
      durationSeconds < 0
    )
      return "video-duration-unknown";
    if (durationSeconds > MAX_VIDEO_SECONDS) return "video-too-long";
  }
  if (fileSize != null) {
    if (fileSize <= 0) return "media-empty";
    if (fileSize > (kind === "photo" ? MAX_PHOTO_BYTES : MAX_VIDEO_BYTES))
      return "media-too-large";
  }
  return null;
}

export function mediaLimitMessage(issue: MediaLimitIssue) {
  switch (issue) {
    case "video-too-long":
      return "Videos must be 60 seconds or shorter. Trim this video in your gallery and choose it again.";
    case "video-duration-unknown":
      return "Memento could not read this video’s length. Choose another video.";
    case "media-too-large":
      return "Choose a photo up to 25 MB or a video up to 45 MB.";
    case "media-empty":
      return "This file is empty. Choose another photo or video.";
  }
}

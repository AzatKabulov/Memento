import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_PHOTO_BYTES,
  MAX_VIDEO_BYTES,
  mediaLimitIssue,
} from "../src/lib/mediaRules.ts";

test("the 60-second video boundary accepts 59 and 60, then rejects longer clips", () => {
  assert.equal(mediaLimitIssue("video", 59, 1_000), null);
  assert.equal(mediaLimitIssue("video", 60, 1_000), null);
  assert.equal(mediaLimitIssue("video", 60.001, 1_000), "video-too-long");
  assert.equal(
    mediaLimitIssue("video", undefined, 1_000),
    "video-duration-unknown",
  );
});

test("photo and video size limits are inclusive and empty files are rejected", () => {
  assert.equal(mediaLimitIssue("photo", undefined, MAX_PHOTO_BYTES), null);
  assert.equal(
    mediaLimitIssue("photo", undefined, MAX_PHOTO_BYTES + 1),
    "media-too-large",
  );
  assert.equal(mediaLimitIssue("video", 1, MAX_VIDEO_BYTES), null);
  assert.equal(
    mediaLimitIssue("video", 1, MAX_VIDEO_BYTES + 1),
    "media-too-large",
  );
  assert.equal(mediaLimitIssue("photo", undefined, 0), "media-empty");
});

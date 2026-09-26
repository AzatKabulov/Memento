import assert from "node:assert/strict";
import test from "node:test";
import { incomingAction, retryDelayMs } from "../src/backup/decisions.ts";

test("an unsent local edit never gets replaced by another device", () => {
  assert.equal(incomingAction({ cloudRevision: 1, pending: true }, 2), "conflict");
  assert.equal(incomingAction({ cloudRevision: 1, pending: true }, 1), "ignore");
});

test("a newer cloud revision restores only when this device has no pending edit", () => {
  assert.equal(incomingAction(null, 4), "restore");
  assert.equal(incomingAction({ cloudRevision: 1, pending: false }, 2), "restore");
  assert.equal(incomingAction({ cloudRevision: 3, pending: false }, 2), "ignore");
});

test("network retries back off without growing indefinitely", () => {
  assert.equal(retryDelayMs(0), 30_000);
  assert.equal(retryDelayMs(1), 60_000);
  assert.equal(retryDelayMs(10), 3_600_000);
});

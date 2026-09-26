import assert from "node:assert/strict";
import test from "node:test";
import { reminderDates } from "../src/settings/reminderDates.ts";

test("daily reminders skip saved dates and retain the chosen local time", () => {
  const now = new Date(2026, 8, 27, 10, 0);
  const dates = reminderDates("2026-09-27", 20, 15, new Set(["2026-09-28"]), now, 3);
  assert.deepEqual(dates.map(({ date }) => date), ["2026-09-27", "2026-09-29"]);
  assert.equal(dates[0].at.getHours(), 20);
  assert.equal(dates[0].at.getMinutes(), 15);
});

test("a past reminder time is not scheduled again for today", () => {
  const now = new Date(2026, 8, 27, 21, 0);
  const dates = reminderDates("2026-09-27", 20, 0, new Set(), now, 2);
  assert.deepEqual(dates.map(({ date }) => date), ["2026-09-28"]);
});

test("daylight-saving gaps resolve to the next valid local time", () => {
  const previous = process.env.TZ;
  try {
    process.env.TZ = "America/New_York";
    const dates = reminderDates("2026-03-08", 2, 30, new Set(), new Date(2026, 2, 7, 12), 2);
    assert.equal(dates[0].at.getDate(), 8);
    assert.equal(dates[0].at.getHours(), 3);
    assert.equal(dates[0].at.getMinutes(), 30);
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

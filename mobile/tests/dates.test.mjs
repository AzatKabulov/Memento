import assert from "node:assert/strict";
import test from "node:test";
import {
  calendarCells,
  diaryDate,
  isValidDiaryDate,
  shiftDate,
} from "../src/lib/dates.ts";

test("February in a leap year includes the 29th and complete weeks", () => {
  const cells = calendarCells(2024, 1);
  assert.equal(cells.length % 7, 0);
  assert.equal(cells.filter(Boolean).length, 29);
  assert.equal(cells[3], "2024-02-01");
  assert.equal(cells.at(-1), null);
  assert.equal(shiftDate("2024-02-28", 1), "2024-02-29");
});

test("Sunday-start and Monday-start months align to Monday-first headings", () => {
  const sunday = calendarCells(2026, 2);
  assert.equal(sunday[6], "2026-03-01");
  assert.equal(sunday.length, 42);
  const monday = calendarCells(2026, 5);
  assert.equal(monday[0], "2026-06-01");
  assert.equal(monday.length, 35);
  assert.equal(diaryDate(new Date(2026, 5, 1)), monday[0]);
});

test("calendar can align dates to Sunday-first headings", () => {
  const cells = calendarCells(2025, 8, 0);
  assert.equal(cells[0], null);
  assert.equal(cells[1], "2025-09-01");
  assert.equal(cells[7], "2025-09-07");
  assert.equal(cells.length, 35);
});

test("diary dates reject impossible days without normalizing them", () => {
  assert.equal(isValidDiaryDate("2024-02-29"), true);
  assert.equal(isValidDiaryDate("2023-02-29"), false);
  assert.equal(isValidDiaryDate("2026-04-31"), false);
  assert.equal(isValidDiaryDate("2026-13-01"), false);
  assert.equal(isValidDiaryDate("2026-09-27"), true);
});

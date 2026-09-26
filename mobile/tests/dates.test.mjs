import assert from "node:assert/strict";
import test from "node:test";
import { calendarCells, diaryDate, shiftDate } from "../src/lib/dates.ts";

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

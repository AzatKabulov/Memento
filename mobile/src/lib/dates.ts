export function diaryDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isValidDiaryDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year === 0) return false;
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

export function dateFromDiary(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function shiftDate(value: string, days: number): string {
  const date = dateFromDiary(value);
  date.setDate(date.getDate() + days);
  return diaryDate(date);
}

export function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month, 1));
}

export function momentLabel(value: string): string {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(dateFromDiary(value));
}

export function calendarCells(
  year: number,
  month: number,
  weekStartsOn: 0 | 1 = 1,
): (string | null)[] {
  const count = new Date(year, month + 1, 0).getDate();
  const start = (new Date(year, month, 1).getDay() + 7 - weekStartsOn) % 7;
  const trailing = (7 - ((start + count) % 7)) % 7;
  return [
    ...Array(start).fill(null),
    ...Array.from({ length: count }, (_, index) =>
      diaryDate(new Date(year, month, index + 1)),
    ),
    ...Array(trailing).fill(null),
  ];
}

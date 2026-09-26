export function reminderDates(
  today: string,
  hour: number,
  minute: number,
  savedDates: ReadonlySet<string>,
  now: Date,
  days = 14,
) {
  const result: { date: string; at: Date }[] = [];
  const [startYear, startMonth, startDay] = today.split("-").map(Number);
  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(
      Date.UTC(startYear, startMonth - 1, startDay + offset),
    )
      .toISOString()
      .slice(0, 10);
    if (savedDates.has(date)) continue;
    const [year, month, day] = date.split("-").map(Number);
    const at = new Date(year, month - 1, day, hour, minute);
    if (at.getTime() > now.getTime()) result.push({ date, at });
  }
  return result;
}

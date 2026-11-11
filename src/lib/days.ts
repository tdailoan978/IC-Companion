// Calendar days in the device's local time zone, as YYYY-MM-DD strings.
// Everything that schedules (review, study plan) takes `today` as an argument,
// so tests can use a fake clock.

const pad = (n: number) => String(n).padStart(2, '0');

export type Day = string; // YYYY-MM-DD

export const toDay = (d: Date): Day => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayDay = (): Day => toDay(new Date());

/** Noon avoids daylight-saving edges when adding days. */
export const fromDay = (day: Day): Date => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};

export const addDays = (day: Day, n: number): Day => {
  const d = fromDay(day);
  d.setDate(d.getDate() + n);
  return toDay(d);
};

/** Whole days from a to b (b - a). */
export const daysBetween = (a: Day, b: Day): number => Math.round((fromDay(b).getTime() - fromDay(a).getTime()) / 86_400_000);

/** 0 = Sunday … 6 = Saturday. */
export const weekday = (day: Day): number => fromDay(day).getDay();

/** The Monday on or before `day`. */
export const weekStart = (day: Day): Day => addDays(day, -((weekday(day) + 6) % 7));

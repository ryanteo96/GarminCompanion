// Readings pulled out of the days list. Each takes `days` explicitly so panels can call them from useMemo.
import type { DayKey, DayWithLoad } from '../../lib/types.js';
import { fmtDate, localToday, num } from './format.js';
import { mean, sd } from './stats.js';

export const lastRow = (days: DayWithLoad[], key: DayKey): DayWithLoad | undefined => days.findLast((d) => d[key] != null);
export const latest = (days: DayWithLoad[], key: DayKey): number | null => lastRow(days, key)?.[key] ?? null;
export const avg7 = (days: DayWithLoad[], key: DayKey): number | null => mean(days.slice(-7).map((d) => d[key]));

// Most recent day Garmin reported anything for; readings older than this are labelled with their own date.
export const newest = (days: DayWithLoad[]): string | undefined =>
  days.findLast((d) => (['steps', 'hrv', 'sleepH', 'restingHr'] as const).some((k) => d[k] != null))?.date;

export const withAge = (days: DayWithLoad[], key: DayKey, sub: string): string => {
  const r = lastRow(days, key);
  const through = newest(days);
  return [r && through && r.date < through ? `From ${fmtDate(r.date)}` : '', sub].filter(Boolean).join(' · ');
};

// "Today so far" while the day is still running, otherwise the day the reading is from.
export const dayWhen = (days: DayWithLoad[], key: DayKey): string => {
  const r = lastRow(days, key);
  return !r ? '' : r.date === localToday() ? 'Today so far' : fmtDate(r.date);
};

// The band is your normal range: the usual +/- 1 SD of the last 28 days, the same baseline readiness uses.
export type Series14 = [(number | null | undefined)[], number | null, string, [number, number] | null];

// The last `n` days (14 by default) of one signal, with its usual (or null) as the dashed reference.
export function series14(days: DayWithLoad[], key: DayKey, name: string, usual: number | null, f: (x: number) => string = num, n = 14): Series14 {
  const v = days.slice(-n).map((x) => x[key]);
  const seen = v.filter((x) => x != null);
  const s = usual == null ? null : sd(days.slice(-28).map((x) => x[key]));
  return [v, usual, seen.length ? `${name}, last ${n} days: ${f(Math.min(...seen))} to ${f(Math.max(...seen))}` : name, usual != null && s != null ? [usual - s, usual + s] : null];
}

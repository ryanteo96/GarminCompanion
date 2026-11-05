// Readings pulled out of the days list. Each takes `days` explicitly so panels can call them from useMemo.
import type { DayKey, DayWithLoad } from '../../lib/types.js';
import { fmtDate, localToday, num } from './format.js';
import { mean } from './stats.js';

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

// "Steps, today so far" while the day is still running, otherwise the day it is from.
export const dayLabel = (days: DayWithLoad[], key: DayKey, base: string): string => {
  const r = lastRow(days, key);
  return !r ? base : `${base}, ${r.date === localToday() ? 'today so far' : fmtDate(r.date)}`;
};

export type Series14 = [(number | null | undefined)[], number | null, string];

// Last 14 days of one signal, with its usual (or null) as the dashed reference.
export function series14(days: DayWithLoad[], key: DayKey, name: string, usual: number | null, f: (x: number) => string = num): Series14 {
  const v = days.slice(-14).map((x) => x[key]);
  const seen = v.filter((x) => x != null);
  return [v, usual, seen.length ? `${name}, last 14 days: ${f(Math.min(...seen))} to ${f(Math.max(...seen))}` : name];
}

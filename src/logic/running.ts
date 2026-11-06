import type { Activity } from '../../lib/types.js';
import { sessionLoad } from './fitness.js';
import { isPartialWeek, weekStart } from './stats.js';

export interface RunWeek { week: string; km: number; load: number; partial: boolean }

// Every Monday week the days span, with the runs' distance and load summed into it. Empty weeks are 0, not gaps.
export function runWeeks(days: { date: string }[], runs: Pick<Activity, 'date' | 'km' | 'load' | 'zones'>[]): RunWeek[] {
  if (!days.length) return [];
  const [first, last] = [days[0].date, days[days.length - 1].date];
  const weeks = new Map<string, RunWeek>();
  for (const { date } of days) {
    const week = weekStart(date);
    weeks.set(week, { week, km: 0, load: 0, partial: isPartialWeek(week, first, last) });
  }
  for (const r of runs) {
    const w = weeks.get(weekStart(r.date));
    if (!w) continue;
    w.km += r.km ?? 0;
    w.load += sessionLoad(r);
  }
  return [...weeks.values()];
}

export interface Z2Point { date: string; speed: number; hr: number }

// One point per run with Zone 2 stored, oldest first. The live list decides which runs show (ADR 0005), so stored ids not in it are ignored.
export function z2Points(runs: Pick<Activity, 'id' | 'date'>[], z2: Record<number, { speed: number; hr: number }>): Z2Point[] {
  return runs
    .flatMap((r) => (z2[r.id] ? [{ date: r.date, ...z2[r.id] }] : []))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface EffortPoint { date: string; hr: number | null; rpe: number | null; feel: number | null }

// Runs that were rated, oldest first. RPE is stored as CR10 x 10.
export function effortPoints(runs: Pick<Activity, 'date' | 'avgHr' | 'feel' | 'rpe'>[]): EffortPoint[] {
  return runs
    .filter((r) => r.rpe != null || r.feel != null)
    .map((r) => ({ date: r.date, hr: r.avgHr, rpe: r.rpe == null ? null : r.rpe / 10, feel: r.feel }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

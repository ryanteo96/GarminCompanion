import type { Activity } from '../../lib/types.js';

export interface FitnessPoint {
  date: string;
  load: number;
  fitness: number;
  fatigue: number;
  form: number;
}

// Edwards (1993) summated heart-rate-zone score: minutes in each zone weighted 1 to 5. Used only when Garmin gave the Session no load.
const edwardsScore = (zones: number[]): number => zones.reduce((t, s, i) => t + (s / 60) * (i + 1), 0);
export const sessionLoad = (a: Pick<Activity, 'load' | 'zones'>): number => a.load ?? edwardsScore(a.zones);

// Banister et al. (1975) impulse-response model with fixed 42-day (Fitness) and 7-day (Fatigue) time constants, as Intervals.icu and COROS do.
// shortcut: starts from zero at the first loaded day, so the first ~6 weeks understate Fitness; seed from older history when ADR 0005's store has it.
export function fitnessSeries(days: { date: string }[], activities: Pick<Activity, 'date' | 'load' | 'zones'>[]): FitnessPoint[] {
  const byDate = new Map<string, number>();
  for (const a of activities) byDate.set(a.date, (byDate.get(a.date) ?? 0) + sessionLoad(a));
  const kF = 1 - Math.exp(-1 / 42);
  const kA = 1 - Math.exp(-1 / 7);
  let fitness = 0;
  let fatigue = 0;
  return days.map(({ date }) => {
    const load = byDate.get(date) ?? 0;
    fitness += (load - fitness) * kF;
    fatigue += (load - fatigue) * kA;
    return { date, load, fitness, fatigue, form: fitness - fatigue };
  });
}

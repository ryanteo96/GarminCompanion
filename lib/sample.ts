import { addDays } from './garmin.js';
import type { Activity, Day } from './types.js';

// Bed at about 23:00 (+/- drift), wake after sleep plus a little awake time.
function bedWake(sleepH: number, driftMin: number): { bedtime: string; wake: string } {
  const bed = (23 * 60 + Math.round(driftMin) + 1440) % 1440;
  const wake = (bed + Math.round(sleepH * 60 * 1.07)) % 1440;
  const hhmm = (m: number): string => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return { bedtime: hhmm(bed), wake: hhmm(wake) };
}

// Deterministic demo data in the same shape as normalize(). HRV is wired to sleep and prior-day
// load so the Insights tab has real structure to find.
export function sample(n: number, today = new Date().toISOString().slice(0, 10)): { days: Day[]; activities: Activity[] } {
  let seed = 42;
  const rnd = (): number => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const noise = (s: number): number => (rnd() - 0.5) * 2 * s;
  const days: Day[] = [];
  const activities: Activity[] = [];
  let id = 1;
  let prevLoad = 0;
  let prevSteps = 8000;

  for (let i = n - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
    const sleepH = Math.max(4.5, Math.min(9.5, 7 + 0.3 * (prevSteps > 10000 ? 1 : 0) + noise(1.2)));
    const hrv = Math.round(52 + 4 * (sleepH - 7) - 0.04 * prevLoad + noise(4));
    const train = dow === 2 || dow === 4 || dow === 6 || rnd() < 0.1;
    const load = train ? Math.round(60 + rnd() * 140) : 0;
    if (train) {
      const mins = Math.round(30 + load / 3);
      const z = [0.05, 0.3, 0.35, 0.2, 0.1].map((p) => Math.round(p * mins * 60 * (0.7 + rnd() * 0.6)));
      activities.push({
        id: id++, date, name: dow === 6 ? 'Long run' : 'Training session', type: dow === 4 ? 'strength_training' : 'running',
        minutes: mins, km: dow === 4 ? null : Math.round(mins * 0.17 * 100) / 100, avgHr: Math.round(135 + load / 8),
        load, te: Math.round((2 + load / 70) * 10) / 10, zones: z,
      });
    }
    const steps = Math.round(7500 + (train ? 3000 : 0) + noise(2500));
    days.push({
      date, steps, calories: Math.round(2300 + load * 3 + noise(150)), restingHr: Math.round(54 - (hrv - 52) * 0.15 + noise(1.5)),
      intensityMin: train ? Math.round(load / 3) : Math.round(rnd() * 12), stress: Math.round(32 + noise(8) - (sleepH - 7) * 2),
      bbHigh: Math.min(100, Math.round(78 + 6 * (sleepH - 7) + noise(6))), bbLow: Math.round(18 + noise(6)),
      hrv, hrvWeekly: Math.round(52 + noise(2)),
      sleepH: Math.round(sleepH * 100) / 100, deepH: Math.round(sleepH * 0.17 * 100) / 100, remH: Math.round(sleepH * 0.22 * 100) / 100,
      lightH: Math.round(sleepH * 0.54 * 100) / 100, awakeH: Math.round(sleepH * 0.07 * 100) / 100,
      sleepScore: Math.max(40, Math.min(98, Math.round(75 + 8 * (sleepH - 7) + noise(5)))),
      ...bedWake(sleepH, noise(25)),
    });
    prevLoad = load;
    prevSteps = steps;
  }
  return { days, activities };
}

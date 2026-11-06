import assert from 'node:assert/strict';
import { test } from 'vitest';
import { effortPoints, runWeeks, z2Points } from '../src/logic/running.js';

const run = (date: string, km: number | null, load: number | null, zones = [0, 0, 0, 0, 0]) => ({ date, km, load, zones });
const range = (from: string, n: number) => Array.from({ length: n }, (_, i) => ({ date: new Date(Date.parse(`${from}T00:00:00Z`) + i * 864e5).toISOString().slice(0, 10) }));

test('runWeeks sums distance and load per Monday week, with empty weeks at 0 and the ends partial', () => {
  // Wed 2026-11-04 to Wed 2026-11-18: three weeks, the first and last partial
  const w = runWeeks(range('2026-11-04', 15), [run('2026-11-05', 5, 100), run('2026-11-08', 10, 50), run('2026-11-17', 3, 20)]);
  assert.deepEqual(w.map((x) => [x.week, x.km, x.load, x.partial]), [
    ['2026-11-02', 15, 150, true],
    ['2026-11-09', 0, 0, false],
    ['2026-11-16', 3, 20, true],
  ]);
});

test('runWeeks falls back to the heart-rate-zone score when Garmin gave no load, and counts a missing distance as 0', () => {
  const w = runWeeks(range('2026-11-02', 7), [run('2026-11-03', null, null, [0, 3600, 0, 0, 0])]);
  assert.deepEqual([w[0].km, w[0].load, w[0].partial], [0, 120, false]);
  assert.deepEqual(runWeeks([], []), []);
});

test('z2Points joins by id, drops runs without Zone 2, and ignores stored ids that are not in the list', () => {
  const runs = [{ id: 2, date: '2026-11-05' }, { id: 1, date: '2026-11-01' }, { id: 3, date: '2026-11-03' }];
  const p = z2Points(runs, { 1: { speed: 3, hr: 140 }, 2: { speed: 3.2, hr: 141 }, 9: { speed: 4, hr: 150 } });
  assert.deepEqual(p, [{ date: '2026-11-01', speed: 3, hr: 140 }, { date: '2026-11-05', speed: 3.2, hr: 141 }]);
});

test('effortPoints keeps rated runs only, oldest first, with RPE on the 0 to 10 scale', () => {
  const r = (date: string, avgHr: number | null, feel: number | null, rpe: number | null) => ({ date, avgHr, feel, rpe });
  assert.deepEqual(effortPoints([r('2026-11-05', 150, 50, 60), r('2026-11-01', 140, null, null), r('2026-11-03', 145, 25, null)]), [
    { date: '2026-11-03', hr: 145, rpe: null, feel: 25 },
    { date: '2026-11-05', hr: 150, rpe: 6, feel: 50 },
  ]);
});

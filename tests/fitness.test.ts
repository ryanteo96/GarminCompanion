import assert from 'node:assert/strict';
import { test } from 'vitest';
import { fitnessSeries, sessionLoad } from '../src/logic/fitness.js';

const act = (date: string, load: number | null, zones = [0, 0, 0, 0, 0]) => ({ date, load, zones });
const dates = (n: number) => Array.from({ length: n }, (_, i) => ({ date: new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10) }));

test("sessionLoad uses Garmin's load, and falls back to zone minutes weighted 1 to 5", () => {
  assert.equal(sessionLoad(act('2026-01-01', 120, [600, 0, 0, 0, 0])), 120);
  assert.equal(sessionLoad(act('2026-01-01', null, [600, 600, 0, 0, 0])), 10 * 1 + 10 * 2);
  assert.equal(sessionLoad(act('2026-01-01', null)), 0);
});

test('a single day of load rises Fatigue faster than Fitness, so Form goes negative then recovers', () => {
  const s = fitnessSeries(dates(60), [act('2026-01-01', 100)]);
  assert.ok(Math.abs(s[0].fatigue - 100 * (1 - Math.exp(-1 / 7))) < 1e-9);
  assert.ok(Math.abs(s[0].fitness - 100 * (1 - Math.exp(-1 / 42))) < 1e-9);
  assert.ok(s[0].form < 0 && s[0].fatigue > s[0].fitness);
  assert.ok(s[59].form > 0, 'Fatigue decays faster, so Form ends positive');
});

test('steady daily load converges Fitness and Fatigue to it and Form to zero', () => {
  const days = dates(400);
  const s = fitnessSeries(days, days.map((d) => act(d.date, 80)));
  const last = s[399];
  assert.ok(Math.abs(last.fitness - 80) < 0.01 && Math.abs(last.fatigue - 80) < 0.01 && Math.abs(last.form) < 0.01);
});

test('days with several sessions add their load', () => {
  const s = fitnessSeries(dates(1), [act('2026-01-01', 30), act('2026-01-01', 70)]);
  assert.equal(s[0].load, 100);
});

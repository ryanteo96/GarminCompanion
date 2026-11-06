import assert from 'node:assert/strict';
import { test } from 'vitest';
import { buildDetail, decoupling, downsample, z2Efficiency, type Rec } from '../lib/fit.js';

// speed m/s and heart rate per second
const steady = (n: number, speed: number, hr: number): Rec[] => Array.from({ length: n }, (_, t) => ({ t, speed, hr }));

test('downsample keeps first and last, and leaves short series alone', () => {
  const a = Array.from({ length: 5000 }, (_, i) => i);
  const d = downsample(a, 500);
  assert.ok(d.length <= 500 && d.length >= 499);
  assert.equal(d[0], 0);
  assert.equal(d.at(-1), 4999);
  assert.deepEqual(downsample([1, 2, 3], 500), [1, 2, 3]);
});

test('decoupling is zero at a steady effort and positive when heart rate drifts up at the same pace', () => {
  assert.equal(decoupling(steady(1800, 3, 150)), 0);
  const drift = [...steady(900, 3, 150), ...steady(900, 3, 159)];
  const d = decoupling(drift)!;
  assert.ok(Math.abs(d - (1 - 150 / 159) * 100) < 1e-9, `got ${d}`);
});

test('decoupling needs a long enough effort', () => {
  assert.equal(decoupling(steady(300, 3, 150)), null);
  assert.equal(decoupling([]), null);
});

test('z2Efficiency is speed per heart-rate beat inside the zone, in metres per minute per bpm', () => {
  const recs = [...steady(400, 3, 130), ...steady(400, 4, 170)];
  assert.equal(z2Efficiency(recs, [120, 140]), (3 * 60) / 130);
  assert.equal(z2Efficiency(recs, null), null, 'no zone bounds, no figure');
  assert.equal(z2Efficiency(steady(100, 3, 130), [120, 140]), null, 'too little time in zone');
});

test('buildDetail turns decoded FIT messages into the stored shape', () => {
  const t0 = new Date('2026-11-01T07:00:00Z').getTime();
  const rec = (s: number) => ({ timestamp: new Date(t0 + s * 1000), heartRate: 140, enhancedSpeed: 3, cadence: 80, enhancedAltitude: 10, positionLat: 2 ** 30, positionLong: 0 });
  const d = buildDetail({
    recordMesgs: Array.from({ length: 1200 }, (_, s) => rec(s)),
    lapMesgs: [{ startTime: new Date(t0), totalElapsedTime: 600, totalDistance: 1800, avgHeartRate: 140, avgSpeed: 3 }],
    setMesgs: [{ setType: 'active', category: ['benchPress'], repetitions: 8, weight: 60, duration: 30 }],
    hrZoneMesgs: [{ highBpm: 120 }, { highBpm: 150 }],
  });
  assert.equal(d.series.t.length, 500, 'a longer series is thinned to about 500 points');
  assert.equal(d.series.t.at(-1), 1199);
  assert.deepEqual(d.series.hr.slice(0, 2), [140, 140]);
  assert.equal(d.route[0][0], 90, 'semicircles become degrees');
  assert.equal(d.laps[0].distanceM, 1800);
  assert.equal(d.sets[0].category, 'benchPress');
  assert.equal(d.metrics.decoupling, 0);
  assert.equal(d.metrics.z2Efficiency, (3 * 60) / 140);
  assert.equal(d.metrics.methodVersion, 1);
});

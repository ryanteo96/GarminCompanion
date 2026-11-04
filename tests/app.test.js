import assert from 'node:assert/strict';
import { test } from 'node:test';
import { authed, mintCookie, same } from '../lib/auth.js';
import { addDays, normalize, parseToken, ranges, token } from '../lib/garmin.js';
import { sample } from '../lib/sample.js';
import { corr, insights, loadSeries, readiness, weekStart, withLoad } from '../public/stats.js';

process.env.SESSION_SECRET = 'test-secret-0123456789';

test('ranges split inclusive dates into windows', () => {
  assert.deepEqual(ranges('2026-01-01', '2026-01-10', 4), [['2026-01-01', '2026-01-04'], ['2026-01-05', '2026-01-08'], ['2026-01-09', '2026-01-10']]);
  assert.equal(addDays('2026-02-28', 1), '2026-03-01');
});

test('normalize maps Garmin spec fields', () => {
  const out = normalize({
    daily: [{ calendarDate: '2026-11-01', movement: { steps: 9000 }, calories: { burnedTotal: 2500 }, heartRate: { restingValue: 52 }, intensityMinutes: { moderate: 10, vigorous: 5 }, stress: { avgLevel: 30 }, bodyBattery: { maxValue: 90, minValue: 20 } }],
    hrv: [{ calendarDate: '2026-11-01', lastNightAvg: 55, weeklyAvg: 53 }],
    sleep: [{ calendarDate: '2026-11-01', sleepTimeSeconds: 27000, deepSleepSeconds: 3600 }],
    acts: [{ activityId: 7, startTimeLocal: '2026-11-01 07:00:00', activityName: 'Run', activityType: { typeKey: 'running' }, duration: 1800, distance: 5000, activityTrainingLoad: 120, hrTimeInZone_2: 600 }],
  });
  assert.deepEqual(out.days[0], { date: '2026-11-01', steps: 9000, calories: 2500, restingHr: 52, intensityMin: 20, stress: 30, bbHigh: 90, bbLow: 20, hrv: 55, hrvWeekly: 53, sleepH: 7.5, deepH: 1, remH: null, lightH: null, awakeH: null, sleepScore: null });
  assert.equal(out.activities[0].date, '2026-11-01');
  assert.equal(out.activities[0].km, 5);
  assert.deepEqual(out.activities[0].zones, [0, 600, 0, 0, 0]);
});

test('normalize skips records without a date instead of crashing', () => {
  const out = normalize({ daily: [{ calendarDate: null }, { calendarDate: '2026-11-01' }], hrv: [{}], sleep: [null], acts: [{ activityId: 1, startTimeLocal: null }] });
  assert.equal(out.days.length, 1);
  assert.equal(out.activities.length, 0);
  assert.deepEqual(out.skipped, { daily: 1, hrv: 1, sleep: 1, activities: 1 });
});

test('token exchange sends the ApiKey header and parses the access token', async () => {
  process.env.GARMIN_API_KEY = 'k123';
  const real = globalThis.fetch;
  let seen;
  globalThis.fetch = async (url, init) => ((seen = { url, init }), new Response('eyJhbGciOiJSUzI1NiJ9.payload.sig\n', { status: 200 }));
  assert.equal(await token(), 'eyJhbGciOiJSUzI1NiJ9.payload.sig');
  assert.equal(seen.init.headers.Authorization, 'ApiKey k123');
  assert.match(seen.url, /personal-api-key\/token$/);
  globalThis.fetch = real;
});

test('parseToken accepts plain text, JSON object and JSON string', () => {
  assert.equal(parseToken(' eyJabc.def.ghi \n'), 'eyJabc.def.ghi');
  assert.equal(parseToken('{"access_token":"abc"}'), 'abc');
  assert.equal(parseToken('"abc"'), 'abc');
});

test('cookie round-trip and tamper detection', () => {
  const c = mintCookie();
  assert.ok(authed({ headers: { cookie: `gc=${c}` } }));
  assert.ok(!authed({ headers: { cookie: `gc=${c}x` } }));
  assert.ok(!authed({ headers: { cookie: `gc=${Date.now() + 1e9}.${c.split('.')[1]}` } }));
  assert.ok(!authed({ headers: {} }));
  assert.ok(same('a', 'a') && !same('a', 'b'));
});

test('stats: correlation, load ratio, readiness, insights on sample data', () => {
  assert.equal(Math.round(corr([[1, 2], [2, 4], [3, 6], [4, 8]]).r), 1);
  assert.equal(weekStart('2026-11-04'), '2026-11-02'); // Wednesday -> Monday
  const { days, activities } = sample(120, '2026-11-04');
  assert.equal(days.length, 120);
  const d = withLoad(days, activities);
  const ls = loadSeries(d);
  assert.ok(ls.at(-1).ratio > 0);
  const r = readiness(d);
  assert.ok(r.score >= 0 && r.score <= 100);
  const sleepHrv = insights(d).find((i) => i.id === 'sleep-hrv');
  assert.ok(sleepHrv.r > 0.3, `sample sleep->HRV link should be visible, got ${sleepHrv.r}`);
  assert.match(insights(d.slice(-5))[0].text, /Not enough/);
});

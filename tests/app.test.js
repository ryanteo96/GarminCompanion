import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { test } from 'node:test';
import { authed, mintCookie, same } from '../lib/auth.js';
import { addDays, clock, normalize, parseToken, ranges, token } from '../lib/garmin.js';
import { sample } from '../lib/sample.js';
import { friendly } from '../public/errors.js';
import { band, corr, explain, insights, loadSeries, readiness, rolling, weekStart, withLoad } from '../public/stats.js';

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
  assert.deepEqual(out.days[0], { date: '2026-11-01', steps: 9000, calories: 2500, restingHr: 52, intensityMin: 20, stress: 30, bbHigh: 90, bbLow: 20, hrv: 55, hrvWeekly: 53, sleepH: 7.5, deepH: 1, remH: null, lightH: null, awakeH: null, sleepScore: null, bedtime: null, wake: null });
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

test('readiness states, headline, driver values and explanation', () => {
  const flat = Array.from({ length: 30 }, (_, i) => ({ date: `2026-10-${String(i + 1).padStart(2, '0')}`, hrv: 50 + (i % 3), restingHr: 55 + (i % 2), sleepH: 7 + (i % 2) * 0.2, bbHigh: 80 + (i % 3) }));
  const at = (last) => readiness([...flat, { date: '2026-10-31', ...last }]);
  const bad = at({ hrv: 30, restingHr: 66, sleepH: 4.5, bbHigh: 55 });
  assert.equal(bad.state, 'strained');
  assert.equal(bad.head, 'Keep today easy');
  assert.equal(bad.parts.find((p) => p.k === 'hrv').value, 30);
  assert.ok(bad.parts.find((p) => p.k === 'hrv').base > 49);
  const why = explain(bad);
  for (const phrase of ['HRV is low', 'sleep was short', 'Body Battery peaked low']) assert.ok(why.toLowerCase().includes(phrase.toLowerCase()), phrase);
  assert.match(why, /^[A-Z].*compared with your own last 28 days\.$/);
  const good = at({ hrv: 62, restingHr: 50, sleepH: 8.8, bbHigh: 98 });
  assert.equal(good.state, 'well');
  assert.match(explain(good), /HRV is high/);
  assert.equal(good.parts.length, 4); // sentence names at most 3 drivers, the bars show all 4
  assert.equal(explain(at({ hrv: 51, restingHr: 55.5, sleepH: 7.1, bbHigh: 81 })), 'Everything is close to your own 28-day norm.');
  assert.equal(readiness(flat.slice(0, 5)), null);
});

test('friendly error copy covers offline, timeout, rate limit, bad key and server errors', () => {
  assert.match(friendly({ status: 0 })[0], /Can't reach/);
  assert.match(friendly({ status: 'timeout' })[0], /too long/);
  assert.match(friendly({ status: 502, message: 'Garmin /sleep-service returned 429' })[0], /limiting requests/);
  assert.match(friendly({ status: 502, message: 'Garmin token exchange failed (401)' })[0], /API key/);
  assert.match(friendly({ status: 502, message: 'Garmin /x returned 500' })[0], /Garmin/);
  assert.match(friendly({ status: 500, message: 'boom' })[0], /Something went wrong/);
});

test('dev server returns 404 for a missing static file and keeps running', async () => {
  const port = 41000 + Math.floor(Math.random() * 1000);
  const child = spawn(process.execPath, ['dev.js'], { env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    await new Promise((resolve, reject) => {
      child.stdout.once('data', resolve);
      child.once('exit', () => reject(new Error('dev server exited before listening')));
    });
    assert.equal((await fetch(`http://localhost:${port}/favicon.ico`)).status, 404);
    assert.equal((await fetch(`http://localhost:${port}/`)).status, 200, 'server must survive the 404');
  } finally {
    child.kill();
  }
});

test('clock reads ISO strings as written and epoch millis as UTC wall time', () => {
  assert.equal(clock('2026-11-03T23:14:00.0'), '23:14');
  assert.equal(clock('2026-11-03 06:40:00'), '06:40');
  assert.equal(clock(Date.UTC(2026, 10, 3, 23, 14)), '23:14');
  assert.equal(clock(String(Date.UTC(2026, 10, 3, 6, 5))), '06:05');
  assert.equal(clock(null), null);
  assert.equal(clock('garbage'), null);
});

test('rolling mean and normal-range band', () => {
  assert.deepEqual(rolling([1, 2, 3, 4], 2, 2), [null, 1.5, 2.5, 3.5]);
  assert.deepEqual(rolling([null, null, 5], 7, 3), [null, null, null]);
  const vals = Array.from({ length: 10 }, (_, i) => 50 + (i % 2) * 2); // 50,52,50,52...
  const b = band(vals);
  assert.equal(b[5], null, 'needs 7 readings');
  assert.ok(b[9].lo < 51 && b[9].hi > 51 && b[9].hi - b[9].lo < 3);
  assert.equal(band([null, 1, 2])[2], null);
});

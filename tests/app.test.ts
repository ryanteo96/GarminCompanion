import assert from 'node:assert/strict';
import { test } from 'vitest';
import { authed, mintCookie, same } from '../lib/auth.js';
import type { ReadinessState } from '../src/logic/stats.js';
import { addDays, clock, normalize, parseToken, pickToday, ranges, token } from '../lib/garmin.js';
import { sample } from '../lib/sample.js';
import data from '../api/data.js';
import sessionApi from '../api/session.js';
import logout from '../api/logout.js';
import { friendly } from '../src/logic/errors.js';
import { ago } from '../src/logic/time.js';
import { call } from './stubs.js';
import { band, corr, explain, isPartialWeek, loadBand, loadSummary, loadZone, ratioLabel, ratioPos, insights, loadSeries, readiness, rolling, verdict, verdictTone, weekDeltas, weekStart, withLoad } from '../src/logic/stats.js';

process.env.SESSION_SECRET = 'test-secret-0123456789';

// Fails the test with a clear message instead of a TypeError when a value the test depends on is missing.
function must<T>(x: T | null | undefined): T {
  assert.ok(x != null, 'expected a value');
  return x;
}

test('ranges split inclusive dates into windows', () => {
  assert.deepEqual(ranges('2026-01-01', '2026-01-10', 4), [['2026-01-01', '2026-01-04'], ['2026-01-05', '2026-01-08'], ['2026-01-09', '2026-01-10']]);
  assert.equal(addDays('2026-02-28', 1), '2026-03-01');
});

test('normalize maps Garmin spec fields', () => {
  const out = normalize({
    daily: [{ calendarDate: '2026-11-01', movement: { steps: { goal: 10000, value: 9000, distanceInMeters: 6800 } }, calories: { burnedTotal: 2500 }, heartRate: { restingValue: 52 }, intensityMinutes: { moderate: 10, vigorous: 5 }, stress: { avgLevel: 30 }, bodyBattery: { maxValue: 90, minValue: 20 } }],
    hrv: [{ calendarDate: '2026-11-01', lastNightAvg: 55, weeklyAvg: 53 }],
    sleep: [{ calendarDate: '2026-11-01', sleepTimeSeconds: 27000, deepSleepSeconds: 3600 }],
    acts: [{ activityId: 7, startTimeLocal: '2026-11-01 07:00:00', activityName: 'Run', activityType: { typeKey: 'running' }, duration: 1800, distance: 5000, activityTrainingLoad: 120, hrTimeInZone_2: 600, directWorkoutFeel: 75, directWorkoutRpe: 50 }],
  });
  assert.deepEqual(out.days[0], { date: '2026-11-01', steps: 9000, stepGoal: 10000, distanceM: 6800, calories: 2500, restingHr: 52, intensityMin: 20, stress: 30, bbHigh: 90, bbLow: 20, hrv: 55, hrvWeekly: 53, sleepH: 7.5, deepH: 1, remH: null, lightH: null, awakeH: null, sleepScore: null, bedtime: null, wake: null });
  assert.equal(out.activities[0].date, '2026-11-01');
  assert.equal(out.activities[0].km, 5);
  assert.deepEqual(out.activities[0].zones, [0, 600, 0, 0, 0]);
  assert.deepEqual([out.activities[0].feel, out.activities[0].rpe], [75, 50]);
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
  let seen = undefined as { url: string; init?: RequestInit } | undefined;
  globalThis.fetch = ((url: string, init?: RequestInit) => ((seen = { url, init }), Promise.resolve(new Response('eyJhbGciOiJSUzI1NiJ9.payload.sig\n', { status: 200 })))) as typeof fetch;
  assert.equal(await token(), 'eyJhbGciOiJSUzI1NiJ9.payload.sig');
  assert.equal((must(seen).init?.headers as Record<string, string>).Authorization, 'ApiKey k123');
  assert.match(must(seen).url, /personal-api-key\/token$/);
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
  assert.equal(Math.round(corr([[1, 2], [2, 4], [3, 6], [4, 8]]).r ?? NaN), 1);
  assert.equal(weekStart('2026-11-04'), '2026-11-02'); // Wednesday -> Monday
  const { days, activities } = sample(120, '2026-11-04');
  assert.equal(days.length, 120);
  const d = withLoad(days, activities);
  const ls = loadSeries(d);
  assert.ok((must(ls.at(-1)).ratio ?? 0) > 0);
  const r = must(readiness(d));
  assert.ok(r.score >= 0 && r.score <= 100);
  const sleepHrv = must(insights(d).find((i) => i.id === 'sleep-hrv'));
  assert.ok((sleepHrv.r ?? 0) > 0.3, `sample sleep->HRV link should be visible, got ${String(sleepHrv.r)}`);
  assert.match(insights(d.slice(-5))[0].text, /Not enough/);
});

test('readiness states, headline, driver values and explanation', () => {
  const flat = Array.from({ length: 30 }, (_, i) => ({ date: `2026-10-${String(i + 1).padStart(2, '0')}`, hrv: 50 + (i % 3), restingHr: 55 + (i % 2), sleepH: 7 + (i % 2) * 0.2, bbHigh: 80 + (i % 3) }));
  const at = (last: { hrv: number; restingHr: number; sleepH: number; bbHigh: number }) => must(readiness([...flat, { date: '2026-10-31', ...last }]));
  const bad = at({ hrv: 30, restingHr: 66, sleepH: 4.5, bbHigh: 55 });
  assert.equal(bad.state, 'strained');
  assert.equal(verdict(bad, 1), 'Keep today easy');
  assert.equal(must(bad.parts.find((p) => p.k === 'hrv')).value, 30);
  assert.ok(must(bad.parts.find((p) => p.k === 'hrv')).base > 49);
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
  const last = must(b[9]);
  assert.ok(last.lo < 51 && last.hi > 51 && last.hi - last.lo < 3);
  assert.equal(band([null, 1, 2])[2], null);
});

test('ago gives a relative freshness label', () => {
  const now = Date.UTC(2026, 10, 4, 12, 0, 0);
  assert.equal(ago(now - 20e3, now), 'just now');
  assert.equal(ago(now - 12 * 60e3, now), '12 min ago');
  assert.equal(ago(now - 3 * 3600e3, now), '3 h ago');
  assert.equal(ago(now + 5e3, now), 'just now', 'clock skew must not go negative');
  assert.match(ago(now - 3 * 86400e3, now), /\w/);
});

test('pickToday trusts a plausible local date and falls back to UTC otherwise', () => {
  const now = new Date('2026-11-04T22:30:00Z'); // 06:30 on Nov 5 in Singapore
  assert.equal(pickToday('2026-11-05', now), '2026-11-05', 'a timezone ahead of UTC');
  assert.equal(pickToday('2026-11-03', now), '2026-11-03', 'a timezone behind UTC');
  assert.equal(pickToday('2026-11-07', now), '2026-11-04', 'more than a day away');
  assert.equal(pickToday('2026-02-31', now), '2026-11-04', 'impossible date');
  assert.equal(pickToday('not-a-date', now), '2026-11-04');
  assert.equal(pickToday(null, now), '2026-11-04');
  assert.equal(pickToday("2026-11-05'; DROP", now), '2026-11-04');
});

test('isPartialWeek flags the first and last week of a range', () => {
  // data 2026-10-07 (Wed) to 2026-11-04 (Wed)
  assert.ok(isPartialWeek('2026-10-05', '2026-10-07', '2026-11-04'), 'range starts mid-week');
  assert.ok(!isPartialWeek('2026-10-12', '2026-10-07', '2026-11-04'));
  assert.ok(isPartialWeek('2026-11-02', '2026-10-07', '2026-11-04'), 'current week ends after the data');
  assert.ok(!isPartialWeek('2026-10-26', '2026-10-07', '2026-11-04'));
  assert.ok(!isPartialWeek('2026-11-02', '2026-10-07', '2026-11-08'), 'complete once Sunday is in the data');
});

test('logout clears the cookie and only accepts POST', async () => {
  const run = (method: string, headers: Record<string, string> = {}) => call(logout, { method, headers });
  const ok = await run('POST', { 'x-forwarded-proto': 'https' });
  assert.equal(ok.status, 200);
  assert.match(ok.headers['Set-Cookie'], /^gc=;.*HttpOnly.*SameSite=Strict.*Max-Age=0.*Secure$/);
  assert.equal((await run('GET')).status, 405);
  assert.doesNotMatch((await run('POST')).headers['Set-Cookie'], /Secure/, 'no Secure flag over plain http');
});

test('weekDeltas says which direction is good', () => {
  const days = Array.from({ length: 28 }, (_, i) => ({ date: `2026-10-${String(i + 1).padStart(2, '0')}`, hrv: i < 21 ? 50 : 60, restingHr: i < 21 ? 55 : 60, load: 100 }));
  const by = Object.fromEntries(weekDeltas(days).map((d) => [d.k, d]));
  assert.equal(by.hrv.good, 1);
  assert.equal(by.restingHr.good, -1);
  assert.equal(by.load.good, 0);
  assert.ok(by.hrv.pct > 15 && by.restingHr.pct > 8);
  assert.equal(by.steps, undefined, 'metrics with no data are left out');
});

test('data responses are never cacheable, whether authorised or not', async () => {
  const saved = process.env.GARMIN_API_KEY;
  delete process.env.GARMIN_API_KEY; // demo mode
  try {
    const ok = await call(data, { url: '/api/data?days=7', headers: { cookie: `gc=${mintCookie()}` } });
    assert.equal(ok.status, 200);
    assert.equal(ok.headers['Cache-Control'], 'private, no-store', 'a max-age here kept the dashboard readable after sign out');
    const denied = await call(data, { url: '/api/data?days=7', headers: {} });
    assert.equal(denied.status, 401);
    assert.match(denied.headers['Cache-Control'], /no-store/);
  } finally {
    if (saved !== undefined) process.env.GARMIN_API_KEY = saved;
  }
});

test('logout also tells the browser to clear its cache and storage', async () => {
  const out = await call(logout, { method: 'POST', headers: {} });
  assert.equal(out.headers['Clear-Site-Data'], '"cache", "storage"');
});

test('empty-result message exists', () => {
  assert.match(friendly({ status: 'empty' })[0], /no data for this range/);
});

test('correlations show no number below 14 overlapping days', () => {
  const { days, activities } = sample(60, '2026-11-04');
  const full = insights(withLoad(days, activities));
  assert.ok(full.every((i) => i.r != null), 'plenty of days: every card has an r');
  const thin = insights(withLoad(days.slice(-4), activities));
  assert.ok(thin.every((i) => i.r === null && /Not enough/.test(i.text)), 'four days: r is withheld, not 1.00');
  const edge = must(insights(withLoad(days.slice(-15), activities)).find((i) => i.lag === 0));
  assert.ok(edge.n >= 14 ? edge.r != null : edge.r === null, 'the threshold follows n');
});

test('verdict combines recovery and load, and never says "hard session" over a spiking load', () => {
  assert.equal(loadBand(null), 'ok');
  assert.equal(loadBand(0.79), 'light');
  assert.equal(loadBand(0.8), 'ok');
  assert.equal(loadBand(1.5), 'ok', '1.5 is still "ramping up", not spiking');
  assert.equal(loadBand(1.51), 'spiking');
  const r = (state: ReadinessState) => ({ state });
  assert.equal(verdict(r('well'), 1.0), 'Good day for a hard session');
  assert.equal(verdict(r('well'), null), 'Good day for a hard session', 'no load history: recovery decides');
  assert.match(verdict(r('well'), 1.94), /load is spiking: keep it moderate/);
  assert.doesNotMatch(verdict(r('well'), 1.94), /hard session/);
  assert.match(verdict(r('well'), 0.5), /light load: room to push/);
  assert.match(verdict(r('strained'), 0.77), /despite|even with a light load/, 'explains the apparent contradiction instead of ignoring it');
  assert.match(verdict(r('strained'), 1.94), /^Rest today/);
  for (const st of ['well', 'typical', 'below', 'strained'] as const) {
    const heads = new Set((['light', 'ok', 'spiking'] as const).map((b) => verdict(r(st), { light: 0.5, ok: 1, spiking: 2 }[b])));
    assert.equal(heads.size, 3, `${st}: each load band reads differently`);
  }
});

test('verdict colour follows the advice: a spiking load cannot be green', () => {
  assert.equal(verdictTone({ state: 'well' }, 1.0), 'well');
  assert.equal(verdictTone({ state: 'well' }, 1.94), 'below', 'recovered but spiking reads as caution');
  assert.equal(verdictTone({ state: 'typical' }, 2), 'below');
  assert.equal(verdictTone({ state: 'below' }, 2), 'below');
  assert.equal(verdictTone({ state: 'strained' }, 2), 'strained', 'already the most cautious tone, never softened');
  assert.equal(verdictTone({ state: 'strained' }, 0.5), 'strained', 'a light load does not soften a strained day');
  assert.equal(verdictTone({ state: 'well' }, null), 'well');
});

test('load zones: one set of cut-offs behind the label, the verdict and the Training hero', () => {
  assert.equal(loadZone(null), null);
  assert.deepEqual([0.79, 0.8, 1.3, 1.31, 1.5, 1.51].map(loadZone), ['light', 'sweet', 'sweet', 'ramping', 'ramping', 'spiking']);
  assert.deepEqual([0.5, 1, 1.4, 2].map(ratioLabel), ['Lighter than usual', 'In your sweet spot', 'Ramping up', 'Spiking']);
  assert.equal(ratioLabel(null), 'Not enough history');
  assert.deepEqual([0.5, 1, 1.4, 2].map(loadBand), ['light', 'ok', 'ok', 'spiking']);
});

test('loadSummary: sentence first, numbers in prose, tone matches the zone', () => {
  const a = loadSummary({ acute: 312, chronic: 407.4, ratio: 0.77 });
  assert.equal(a.head, 'Your load is lighter than usual');
  assert.equal(a.tone, 'typical');
  assert.match(a.detail, /^312 over the last 7 days, against 407 in a usual week \(your 28-day average\)\./);
  const t = (ratio: number) => loadSummary({ acute: 100, chronic: 100, ratio }).tone;
  assert.deepEqual([0.5, 1, 1.4, 1.9].map(t), ['typical', 'well', 'below', 'strained']);
  const none = loadSummary({ acute: 2345, chronic: null, ratio: null });
  assert.equal(none.head, 'Not enough history yet');
  assert.equal(none.tone, '');
  assert.match(none.detail, /^2,345 load over the last 7 days\. The ratio needs 28 days/);
  assert.deepEqual([-1, 0, 1, 2, 5].map(ratioPos), [0, 0, 50, 100, 100], 'the marker clamps to the 0 to 2 scale');
  const empty = loadSummary({ acute: 0, chronic: 0, ratio: null });
  assert.equal(empty.head, 'No training recorded in the last 28 days', 'zero load is not "missing history"');
  assert.doesNotMatch(empty.detail, /28 days of history/);
  assert.equal(empty.tone, '');
});

test('the session endpoint needs a session and a valid id, and reports not stored without a database', async () => {
  const cookie = `gc=${mintCookie()}`;
  const ask = (url: string, headers: Record<string, string> = { cookie }) => call(sessionApi, { url, headers });
  assert.equal((await ask('/api/session?id=1', {})).status, 401);
  assert.equal((await ask('/api/session?id=abc')).status, 400);
  assert.equal((await ask('/api/session?id=-3')).status, 400);
  const saved = { ...process.env };
  delete process.env.DATABASE_URL;
  try {
    process.env.GARMIN_API_KEY = 'k';
    const none = await ask('/api/session?id=12');
    assert.equal(none.status, 200);
    assert.deepEqual(JSON.parse(none.body), { stored: false, detail: null });
    delete process.env.GARMIN_API_KEY; // demo: detail comes from the sample parser
    const demo = JSON.parse((await ask('/api/session?id=12')).body) as { stored: boolean; detail: { laps: unknown[]; metrics: { methodVersion: number } } };
    assert.equal(demo.stored, true);
    assert.equal(demo.detail.laps.length, 5);
    assert.equal(demo.detail.metrics.methodVersion, 1);
  } finally {
    Object.assign(process.env, saved);
    if (saved.GARMIN_API_KEY === undefined) delete process.env.GARMIN_API_KEY;
  }
});

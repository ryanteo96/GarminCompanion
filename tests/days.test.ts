import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { DayWithLoad } from '../lib/types.js';
import { avg7, dayWhen, latest, newest, series14, withAge } from '../src/logic/days.js';
import { fmtDate, hm, localToday, num, ymd } from '../src/logic/format.js';

const day = (date: string, extra: Partial<DayWithLoad> = {}): DayWithLoad => ({ date, load: 0, ...extra });

test('hm writes hours and zero-padded minutes, and a dash for no reading', () => {
  assert.equal(hm(7.5), '7h 30m');
  assert.equal(hm(6.05), '6h 03m');
  assert.equal(hm(null), '—');
  assert.equal(hm(undefined), '—');
});

test('num rounds to the asked decimals and shows a dash for no reading', () => {
  assert.equal(num(null), '—');
  assert.equal(num(undefined), '—');
  assert.equal(num(0), '0');
  assert.match(num(7.25, 1), /^7[.,]3$/);
  assert.match(num(1234), /^1\D?234$/, 'thousands may be grouped by the locale');
});

test('fmtDate names the month and day in UTC, whatever the local timezone', () => {
  assert.match(fmtDate('2026-11-03'), /^(Nov 3|3 Nov)$/);
});

test('ymd and localToday use the local calendar date', () => {
  assert.equal(ymd(new Date(2026, 10, 5, 23, 59)), '2026-11-05');
  assert.equal(localToday(), ymd(new Date()));
  assert.match(localToday(), /^\d{4}-\d{2}-\d{2}$/);
});

test('latest, avg7 and newest read the most recent days', () => {
  const days = [day('2026-11-01', { hrv: 50 }), day('2026-11-02', { hrv: null, steps: 9000 }), day('2026-11-03', { hrv: null })];
  assert.equal(latest(days, 'hrv'), 50, 'skips days with no reading');
  assert.equal(latest(days, 'calories'), null);
  assert.equal(avg7(days, 'hrv'), 50, 'the mean ignores missing days');
  assert.equal(newest(days), '2026-11-02', 'the newest day Garmin reported anything for');
  assert.equal(newest([day('2026-11-03', { calories: 2000 })]), undefined, 'calories alone do not count as a report');
});

test('withAge labels a reading older than the newest day with its own date', () => {
  const days = [day('2026-11-01', { hrv: 50 }), day('2026-11-03', { steps: 9000 })];
  assert.match(withAge(days, 'hrv', 'Score 80'), /^From (Nov 1|1 Nov) · Score 80$/);
  assert.match(withAge(days, 'hrv', ''), /^From (Nov 1|1 Nov)$/);
  assert.equal(withAge(days, 'steps', 'Score 80'), 'Score 80', 'a current reading gets no date');
  assert.equal(withAge(days, 'calories', ''), '', 'no reading, nothing to say');
});

test('dayWhen says "Today so far" for a reading from today and the date otherwise', () => {
  assert.equal(dayWhen([day(localToday(), { steps: 1 })], 'steps'), 'Today so far');
  assert.match(dayWhen([day('2026-11-03', { steps: 1 })], 'steps'), /^(Nov 3|3 Nov)$/);
  assert.equal(dayWhen([day('2026-11-03')], 'steps'), '', 'no reading, no date');
});

test('series14 returns the last 14 values, the usual line and a text summary', () => {
  const days = [day('2026-11-01', { hrv: 50 }), day('2026-11-02', { hrv: null }), day('2026-11-03', { hrv: 60 })];
  const [v, usual, label, band] = series14(days, 'hrv', 'HRV', 55);
  assert.deepEqual([v, usual, label], [[50, null, 60], 55, 'HRV, last 14 days: 50 to 60']);
  assert.deepEqual(band?.map((x) => x.toFixed(2)), ['47.93', '62.07'], 'the band is the usual +/- 1 SD');
  assert.equal(series14(days, 'hrv', 'HRV', null)[3], null, 'no usual, no band');
  assert.deepEqual(series14(days, 'hrv', 'HRV', null, hm)[2], 'HRV, last 14 days: 50h 00m to 60h 00m', 'the formatter is applied to both ends');
  assert.equal(series14([day('2026-11-01')], 'hrv', 'HRV', null)[2], 'HRV', 'no readings: just the name');
  const long = Array.from({ length: 20 }, (_, i) => day(`2026-10-${String(i + 1).padStart(2, '0')}`, { hrv: i }));
  assert.equal(series14(long, 'hrv', 'HRV', null)[0].length, 14);
});

test('series14 takes a window length and names it in the label', () => {
  const days = Array.from({ length: 20 }, (_, i) => day(`2026-10-${String(i + 1).padStart(2, '0')}`, { hrv: i }));
  const [values, , label] = series14(days, 'hrv', 'HRV', null, num, 7);
  assert.equal(values.length, 7);
  assert.match(label, /^HRV, last 7 days: /);
  assert.match(series14(days, 'hrv', 'HRV', null)[2], /last 14 days/);
});

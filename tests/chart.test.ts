import assert from 'node:assert/strict';
import type { TooltipItem } from 'chart.js';
import { test } from 'vitest';
import type { DayWithLoad } from '../lib/types.js';
import { alpha, chartConfig, describe, trend, weekBars, type Dataset } from '../src/chart.js';

const env = { mfg: '#666666', rule: '#dddddd', width: 360, reduced: false };
const day = (date: string): DayWithLoad => ({ date, load: 0 });
const ticksOf = (width: number, horizontal = false): number => {
  const config = chartConfig('line', ['a'], [{ label: 'x', data: [1] }], { horizontal }, { ...env, width });
  return (config.options?.scales?.x as { ticks: { maxTicksLimit: number } }).ticks.maxTicksLimit;
};

test('describe summarises latest, average and range, and says so when there is no data', () => {
  assert.equal(describe('HRV', [null, undefined], ' ms'), 'HRV: no data.');
  assert.match(describe('HRV', [50.25, null, 60.5], ' ms'), /^HRV: latest 60[.,]5 ms, average 55[.,]4 ms, range 50[.,]3 to 60[.,]5 ms over 2 points\.$/);
});

test('alpha appends the opacity as two hex digits to a #rrggbb colour', () => {
  assert.equal(alpha('#112233', 0.5), '#11223380');
  assert.equal(alpha('#112233', 1), '#112233ff');
  assert.equal(alpha('#112233', 0), '#11223300');
});

test('trend draws the raw readings and a 7-day line, and puts a normal-range band behind them when asked', () => {
  const values = Array.from({ length: 30 }, (_, i) => 50 + (i % 3));
  assert.deepEqual(trend(values, '#111111', 'Daily HRV').map((d) => d.label), ['Daily HRV', '7-day average']);
  const withBand = trend(values, '#111111', 'Daily HRV', '#222222');
  assert.deepEqual(withBand.map((d) => d.label), ['_low', 'Your normal range', 'Daily HRV', '7-day average']);
  const range = withBand[1];
  assert.equal(range.fill, '-1', 'the band fills down to the _low edge');
  assert.equal(range.backgroundColor, alpha('#222222', 0.18));
  assert.equal(range.noTip, true, 'edges never appear in tooltips');
  assert.equal(withBand[2].borderColor, alpha('#111111', 0.5), 'raw readings are faint');
});

test('weekBars lightens the partial first and last weeks and names them in the tooltip', () => {
  // data 2026-10-07 (Wed) to 2026-11-04 (Wed): the first and last Monday-weeks are only partly covered
  const days = [day('2026-10-07'), day('2026-11-04')];
  const weeks = ['2026-10-05', '2026-10-12', '2026-10-26', '2026-11-02'].map((week) => ({ week, v: 1 }));
  const bars = weekBars(weeks, days, '#112233');
  assert.equal(bars.any, true);
  assert.deepEqual(bars.colors, [alpha('#112233', 0.45), '#112233', '#112233', alpha('#112233', 0.45)]);
  assert.equal(bars.last, true);
  const at = (dataIndex: number) => bars.title([{ label: 'Oct 5', dataIndex }] as unknown as TooltipItem<'bar'>[]);
  assert.equal(at(0), 'Week of Oct 5 (partial week)');
  assert.equal(at(1), 'Week of Oct 5');
  assert.equal(at(3), 'Week of Oct 5 (so far)');
  assert.equal(weekBars([{ week: '2026-10-12', v: 1 }], [day('2026-10-05'), day('2026-10-18')], '#112233').any, false);
});

test('chartConfig hides underscore datasets from the legend and only shows a legend for two or more', () => {
  const sets: Dataset[] = [{ label: '_low', data: [1] }, { label: 'Range', data: [2] }, { label: 'Daily', data: [3] }];
  assert.equal(chartConfig('line', ['a'], sets, {}, env).options?.plugins?.legend?.display, true);
  assert.equal(chartConfig('line', ['a'], sets.slice(0, 2), {}, env).options?.plugins?.legend?.display, false, 'one visible dataset needs no legend');
});

test('chartConfig keeps about one date label per 72 px, between 3 and 8', () => {
  assert.equal(ticksOf(100), 3);
  assert.equal(ticksOf(360), 5);
  assert.equal(ticksOf(2000), 8);
  assert.equal(ticksOf(0), 5, 'an unmeasured width falls back to a phone');
  assert.equal(ticksOf(100, true), 8, 'horizontal bars label by value, so they always get 8');
});

test('chartConfig honours reduced motion and starts bars and horizontal charts at zero', () => {
  assert.equal(chartConfig('bar', ['a'], [{ label: 'x', data: [1] }], {}, { ...env, reduced: true }).options?.animation, false);
  assert.deepEqual(chartConfig('line', ['a'], [{ label: 'x', data: [1] }], {}, env).options?.animation, { duration: 300 });
  const y = (type: 'bar' | 'line', horizontal = false) => (chartConfig(type, ['a'], [{ label: 'x', data: [1] }], { horizontal }, env).options?.scales?.y as { beginAtZero: boolean }).beginAtZero;
  assert.deepEqual([y('bar'), y('line'), y('line', true)], [true, false, true]);
});

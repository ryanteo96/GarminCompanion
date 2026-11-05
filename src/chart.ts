// Dataset builders and Chart.js options. Pure: colours and measurements come in as arguments, so these can be tested without a browser.
import { Chart, type ChartConfiguration, type ChartType, type TooltipItem } from 'chart.js';
import type { DayWithLoad } from '../lib/types.js';
import { num } from './logic/format.js';
import { band, isPartialWeek, mean, rolling, type WeekPoint } from './logic/stats.js';

type Num = number | null | undefined;

/** A Chart.js dataset plus the two flags this app reads back: `noTip` hides it from tooltips, `swatch` forces a filled legend key. */
export interface Dataset {
  label: string;
  data: (Num | [number, number])[];
  type?: 'line' | 'bar';
  noTip?: boolean;
  swatch?: 'rect';
  [key: string]: unknown;
}

export interface DrawOpts {
  stacked?: boolean;
  summary?: string;
  horizontal?: boolean;
  whole?: boolean;
  yRange?: { min?: number; max?: number };
  tipTitle?: (items: TooltipItem<ChartType>[]) => string;
}

export interface ChartEnv {
  mfg: string;
  rule: string;
  width: number;
  reduced: boolean;
}

export const line = (label: string, data: Num[], color: string, dash = false): Dataset => ({
  label, data, borderColor: color, backgroundColor: color, borderWidth: 2, cubicInterpolationMode: 'monotone', spanGaps: true, // monotone: smooth without overshooting between points
  pointRadius: data.length > 60 ? 0 : 2, borderDash: dash ? [6, 4] : [],
});
export const bar = (label: string, data: (Num | [number, number])[], color: string | string[]): Dataset => ({ label, data, backgroundColor: color, borderRadius: 2 });
export const alpha = (hex: string, a: number): string => hex + Math.round(a * 255).toString(16).padStart(2, '0'); // tokens are #rrggbb

// Faint raw readings, a bold 7-day line, and optionally the shaded 28-day normal range behind them.
export function trend(values: Num[], color: string, name: string, bandColor?: string): Dataset[] {
  const lines: Dataset[] = [
    { ...line(name, values, alpha(color, 0.5)), borderWidth: 1, pointRadius: 0 },
    { ...line('7-day average', rolling(values), color), borderWidth: 3, pointRadius: 0 },
  ];
  if (bandColor === undefined) return lines;
  const b = band(values);
  const edge = { borderWidth: 0, pointRadius: 0, spanGaps: true, noTip: true, cubicInterpolationMode: 'monotone' };
  return [
    { label: '_low', data: b.map((x) => x?.lo ?? null), fill: false, ...edge },
    { label: 'Your normal range', data: b.map((x) => x?.hi ?? null), fill: '-1', backgroundColor: alpha(bandColor, 0.18), swatch: 'rect', ...edge }, // neutral: amber means "reference line" and went muddy on dark
    ...lines,
  ];
}

export function describe(name: string, values: Num[], unit = ''): string {
  const v = values.filter((x) => x != null);
  if (!v.length) return `${name}: no data.`;
  return `${name}: latest ${num(v.at(-1), 1)}${unit}, average ${num(mean(v), 1)}${unit}, range ${num(Math.min(...v), 1)} to ${num(Math.max(...v), 1)}${unit} over ${v.length} points.`;
}

// Weeks start Monday. A week the data only partly covers is drawn lighter and named in the tooltip.
export function weekBars(w: WeekPoint[], d: DayWithLoad[], color: string): { any: boolean; colors: string[]; title: (items: TooltipItem<ChartType>[]) => string; last: boolean | undefined } {
  const first = d[0].date;
  const last = d[d.length - 1].date;
  const partial = w.map((x) => isPartialWeek(x.week, first, last));
  return {
    any: partial.some(Boolean),
    colors: w.map((_, i) => (partial[i] ? alpha(color, 0.45) : color)),
    title: (items) => `Week of ${items[0].label}${partial[items[0].dataIndex] ? (w[items[0].dataIndex].week < first ? ' (partial week)' : ' (so far)') : ''}`,
    last: partial.at(-1),
  };
}

export function chartConfig(type: 'line' | 'bar', labels: string[], datasets: Dataset[], opts: DrawOpts, env: ChartEnv): ChartConfiguration {
  const { stacked = false, horizontal = false, whole = false, yRange = {}, tipTitle } = opts;
  // About one label per 72px keeps date labels from running together on a phone.
  const maxTicks = Math.max(3, Math.min(8, Math.floor((env.width || 360) / 72)));
  const axis = { ticks: { color: env.mfg, maxTicksLimit: horizontal ? 8 : maxTicks, maxRotation: 0, autoSkipPadding: 12 }, stacked };
  return {
    type,
    data: { labels, datasets: datasets as unknown as ChartConfiguration['data']['datasets'] },
    options: {
      indexAxis: horizontal ? 'y' : 'x',
      responsive: true,
      maintainAspectRatio: false,
      animation: env.reduced ? false : { duration: 300 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: datasets.filter((d) => !d.label.startsWith('_')).length > 1,
          labels: {
            color: env.mfg, usePointStyle: true, boxWidth: 14, boxHeight: 8,
            // Lines get a line swatch (dashed stays dashed), bars and the range band a filled one.
            generateLabels: (chart) => Chart.defaults.plugins.legend.labels.generateLabels(chart).filter((l) => !l.text.startsWith('_')).map((l) => {
              const ds = chart.data.datasets[l.datasetIndex ?? 0] as unknown as Dataset;
              const isLine = (ds.type ?? type) === 'line' && ds.swatch !== 'rect';
              return { ...l, pointStyle: isLine ? ('line' as const) : ('rectRounded' as const), lineDash: (ds.borderDash as number[] | undefined) ?? [], lineWidth: isLine ? 3 : 0, strokeStyle: isLine ? (ds.borderColor as string) : l.fillStyle };
            }),
          },
        },
        tooltip: {
          filter: (item) => !(item.dataset as unknown as Dataset).noTip,
          callbacks: { ...(tipTitle && { title: tipTitle }), label: (c) => `${c.dataset.label ?? ''}: ${Array.isArray(c.raw) ? c.raw.join(' to ') : c.formattedValue}` },
        },
      },
      scales: {
        x: { ...axis, grid: { display: horizontal, color: env.rule } },
        y: { ...axis, ticks: { color: env.mfg, precision: whole ? 0 : undefined }, grid: { display: !horizontal, color: env.rule }, beginAtZero: type === 'bar' || horizontal, ...yRange },
      },
    },
  };
}

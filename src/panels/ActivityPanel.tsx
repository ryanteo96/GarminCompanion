import { useMemo } from 'react';
import type { DayKey } from '../../lib/types.js';
import { alpha, bar, describe, line, trend, weekBars } from '../chart.js';
import { ChartCard } from '../components/ChartCard.js';
import { MetricCard } from '../components/MetricCard.js';
import { useLayout } from '../layout.js';
import { avg7, dayLabel, latest, series14 } from '../logic/days.js';
import { fmtDate, num } from '../logic/format.js';
import { mean, weekly } from '../logic/stats.js';
import { useStore } from '../store.js';

const GOAL = 150; // Garmin's weekly intensity-minutes goal

export function ActivityPanel() {
  const days = useStore((s) => s.days);
  const { token } = useLayout();

  const { im, imBars, thisWeek } = useMemo(() => {
    const weeks = weekly(days, 'intensityMin');
    return { im: weeks, imBars: weekBars(weeks, days, token('--ink-int')), thisWeek: weeks.at(-1)?.v };
  }, [days, token]);

  const spec = useMemo(() => {
    const dates = days.map((x) => fmtDate(x.date));
    const col = (k: DayKey) => days.map((x) => x[k]);
    const roll = days.map((_, i) => mean(days.slice(Math.max(0, i - 6), i + 1).map((x) => x.steps)));
    return {
      steps: {
        labels: dates,
        datasets: [bar('Steps', col('steps'), alpha(token('--ink-steps'), 0.45)), { ...line('7-day average', roll, token('--ink-steps')), type: 'line' as const, borderWidth: 3, pointRadius: 0 }],
        opts: { summary: describe('Daily steps', col('steps')) },
      },
      im: {
        labels: im.map((x) => fmtDate(x.week)),
        datasets: [bar('Intensity minutes', im.map((x) => x.v), imBars.colors), { ...line('Goal', im.map(() => GOAL), token('--mfg'), true), type: 'line' as const, pointRadius: 0 }],
        opts: { summary: describe('Weekly intensity minutes', im.map((x) => x.v)), tipTitle: imBars.title },
      },
      stress: {
        labels: dates,
        datasets: trend(col('stress'), token('--ink-stress'), 'Average stress'),
        opts: { summary: describe('Average stress', col('stress')), whole: true },
      },
    };
  }, [days, im, imBars, token]);

  const avg28 = (k: DayKey): number | null => mean(days.slice(-28).map((d) => d[k]));

  return (
    <>
      <div className="metrics" id="k-activity">
        <MetricCard ink="steps" label={dayLabel(days, 'steps', 'Steps')} value={num(latest(days, 'steps'))} subs={[`7-day avg ${num(avg7(days, 'steps'))}`]} series={series14(days, 'steps', 'Steps', avg28('steps'))} />
        <MetricCard
          ink="int"
          label="Intensity minutes"
          value={num(thisWeek)}
          unit="min"
          subs={[`This week${imBars.last ? ' so far' : ''}, goal ${GOAL}`, thisWeek != null && thisWeek < GOAL ? `${num(GOAL - thisWeek)} min to go` : '']}
          pill={(thisWeek ?? 0) >= GOAL ? ['good', 'Goal reached'] : undefined}
          progress={thisWeek == null ? null : thisWeek / GOAL}
        />
        <MetricCard ink="cal" label={dayLabel(days, 'calories', 'Calories burned')} value={num(latest(days, 'calories'))} subs={[`7-day avg ${num(avg7(days, 'calories'))}`]} series={series14(days, 'calories', 'Calories', avg28('calories'))} />
        <MetricCard ink="stress" label={dayLabel(days, 'stress', 'Average stress')} value={num(latest(days, 'stress'))} subs={[`7-day avg ${num(avg7(days, 'stress'))}`]} series={series14(days, 'stress', 'Average stress', avg28('stress'))} />
      </div>
      <p className="scope">Charts follow the chart range. The cards use the latest day and the current week.</p>
      <div className="grid">
        <ChartCard caption="Daily steps" canvasId="c-steps" type="bar" {...spec.steps} />
        <ChartCard caption={`Weekly intensity minutes${imBars.any ? ' (lighter = partial week)' : ''}`} captionId="cap-im" canvasId="c-im" type="bar" {...spec.im} />
        <ChartCard caption="Average stress" canvasId="c-stress" type="line" {...spec.stress} />
      </div>
    </>
  );
}

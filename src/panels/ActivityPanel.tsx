import { useMemo } from 'react';
import type { DayKey, DayWithLoad } from '../../lib/types.js';
import { alpha, bar, describe, line, trend, weekBars } from '../chart.js';
import { ChartCard } from '../components/ChartCard.js';
import { MetricCard } from '../components/MetricCard.js';
import { useLayout } from '../layout.js';
import { avg7, dayWhen, latest, series14 } from '../logic/days.js';
import { fmtDate, num } from '../logic/format.js';
import { mean, weekly } from '../logic/stats.js';
import { useStore } from '../store.js';

const GOAL = 150; // Garmin's weekly intensity-minutes goal

const avg28 = (days: DayWithLoad[], k: DayKey): number | null => mean(days.slice(-28).map((d) => d[k]));

export function StepsCard({ days, n = 14 }: { days: DayWithLoad[]; n?: number }) {
  return <MetricCard ink="steps" label="Steps" when={dayWhen(days, 'steps')} value={num(latest(days, 'steps'))} subs={[`7-day avg ${num(avg7(days, 'steps'))}`]} series={series14(days, 'steps', 'Steps', avg28(days, 'steps'), num, n)} />;
}

export function IntensityCard({ days }: { days: DayWithLoad[] }) {
  const weeks = weekly(days, 'intensityMin');
  const thisWeek = weeks.at(-1)?.v;
  const partial = weekBars(weeks, days, '').last;
  return (
    <MetricCard
      ink="int"
      label="Intensity"
      when={partial ? 'This week so far' : 'This week'}
      value={num(thisWeek)}
      unit="min"
      subs={[`Goal ${GOAL} min`, thisWeek != null && thisWeek < GOAL ? `${num(GOAL - thisWeek)} min to go` : '']}
      pill={(thisWeek ?? 0) >= GOAL ? ['good', 'Goal reached'] : undefined}
      progress={thisWeek == null ? null : thisWeek / GOAL}
    />
  );
}

export function StressCard({ days, n = 14 }: { days: DayWithLoad[]; n?: number }) {
  return <MetricCard ink="stress" label="Stress" when={dayWhen(days, 'stress')} value={num(latest(days, 'stress'))} subs={[`Daily average · 7-day avg ${num(avg7(days, 'stress'))}`]} series={series14(days, 'stress', 'Average stress', avg28(days, 'stress'), num, n)} />;
}

export function ActivityPanel() {
  const days = useStore((s) => s.days);
  const { token } = useLayout();

  const { im, imBars } = useMemo(() => {
    const weeks = weekly(days, 'intensityMin');
    return { im: weeks, imBars: weekBars(weeks, days, token('--ink-int')) };
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

  return (
    <>
      <div className="metrics" id="k-activity">
        <StepsCard days={days} />
        <IntensityCard days={days} />
        <MetricCard ink="cal" label="Calories" when={dayWhen(days, 'calories')} value={num(latest(days, 'calories'))} subs={[`7-day avg ${num(avg7(days, 'calories'))}`]} series={series14(days, 'calories', 'Calories', avg28(days, 'calories'))} />
        <StressCard days={days} />
      </div>
      <div className="grid">
        <ChartCard caption="Daily steps" canvasId="c-steps" type="bar" {...spec.steps} />
        <ChartCard caption={`Weekly intensity minutes${imBars.any ? ' (lighter = partial week)' : ''}`} captionId="cap-im" canvasId="c-im" type="bar" {...spec.im} />
        <ChartCard caption="Average stress" canvasId="c-stress" type="line" {...spec.stress} />
      </div>
    </>
  );
}

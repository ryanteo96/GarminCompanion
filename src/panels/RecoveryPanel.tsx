import { useMemo } from 'react';
import type { DayKey, DayWithLoad } from '../../lib/types.js';
import { bar, describe, trend, type Dataset, type DrawOpts } from '../chart.js';
import { Battery } from '../components/Battery.js';
import { ChartCard } from '../components/ChartCard.js';
import { Hero } from '../components/Hero.js';
import { MetricCard } from '../components/MetricCard.js';
import { NightBar } from '../components/NightBar.js';
import { Scale } from '../components/Scale.js';
import { useLayout } from '../layout.js';
import { latest, series14, withAge } from '../logic/days.js';
import { fmtDate, hm, localToday, num } from '../logic/format.js';
import { explain, loadSeries, ratioLabel, readiness, verdict, verdictTone, weekly, type Readiness, type ReadinessKey } from '../logic/stats.js';
import { useStore } from '../store.js';

// The four signals behind the readiness score, each as a card that says how it compares with your usual.
const SIGNALS: [ReadinessKey, string, string, string, string][] = [['hrv', 'hrv', 'HRV', 'ms', 'Last night'], ['restingHr', 'rhr', 'Resting HR', 'bpm', 'Daily'], ['sleepH', 'sleep', 'Sleep', '', 'Last night'], ['bbHigh', 'bb', 'Body Battery', '', 'Daily peak']];

const HOW = (
  <details className="how">
    <summary>How is this scored?</summary>
    <p>Readiness compares last night's HRV, resting heart rate, sleep time and Body Battery peak with your own previous 28 days. 60 means typical for you, and each standard deviation from your norm moves it 20 points. Under 30 is strained, 30 to 49 below usual, 50 to 69 typical, 70 and up well recovered. It is a simple guide computed here, not a Garmin metric and not medical advice.</p>
    <p>The load ratio is your last 7 days of training load divided by your usual week (28-day total divided by 4). Under 0.8 is lighter than usual, up to 1.3 in your sweet spot, up to 1.5 ramping up, above 1.5 spiking.</p>
  </details>
);

export function Today({ r, days, compact }: { r: Readiness | null; days: DayWithLoad[]; compact?: boolean }) {
  if (!r) return <Hero id="today" headingId="today-h" state="" tone="" verdict="Not enough data yet" detail="Readiness needs about a week of HRV and sleep history to compare against." chip={null} main={compact ? undefined : HOW} compact={compact} />;
  const ratio = loadSeries(days).at(-1)?.ratio ?? null;
  // A reading that isn't from today gets a chip at the top, where the verdict is read, with what to do about it.
  const stale = r.date < localToday();
  return (
    <Hero
      id="today"
      compact={compact}
      headingId="today-h"
      state={r.state}
      tone={verdictTone(r, ratio)}
      verdict={verdict(r, ratio)}
      detail={explain(r)}
      chip={stale ? `Based on ${fmtDate(r.date)}, not today. Garmin hasn't reported today yet: sync your watch, then Refresh.` : null}
      main={
        <>
          {!compact && <p id="today-load" className="loadline">{ratio == null ? '' : `Training load ratio ${ratio.toFixed(2)}: ${ratioLabel(ratio).toLowerCase()}.`}</p>}
          <p id="today-date" className="small muted" hidden={stale}>{`Based on ${fmtDate(r.date)}.`}</p>
          {!compact && HOW}
        </>
      }
      score={
        <div className="today-score">
          <p className="score">
            <span id="score-n" className="score-n">{r.score}</span>
            <span className="of">of 100</span>
          </p>
          <p id="score-state" className="state">{r.label}</p>
          <Scale
            id="scale"
            markerId="marker"
            label={`Readiness ${r.score} out of 100, ${r.label}. Zones: under 30 strained, 30 to 49 below usual, 50 to 69 typical, 70 and up well recovered.`}
            pos={r.score}
            ticks={[{ pos: 30, text: '30' }, { pos: 50, text: '50' }, { pos: 70, text: '70' }]}
          />
          <div className="zonelabels" aria-hidden="true">
            <span>Strained</span><span>Below usual</span><span>Typical</span><span>Well recovered</span>
          </div>
        </div>
      }
    />
  );
}

export function SignalCard({ k, days, r, n = 14 }: { k: ReadinessKey; days: DayWithLoad[]; r: Readiness | null; n?: number }) {
  const [, ink, label, unit, when] = SIGNALS.find(([key]) => key === k)!;
  const sleepScore = latest(days, 'sleepScore');
  const value = latest(days, k);
  const f = k === 'sleepH' ? hm : num;
  const short = k === 'sleepH' ? (h: number): string => hm(h).replace(/^0h /, '').replace(/ 00m$/, '') : num; // "+55m vs usual 7h"
  const p = r?.parts.find((x) => x.k === k && x.value === value); // only compare the reading the score used
  const u = unit && ` ${unit}`;
  let delta = '';
  let pill: [string, string] | undefined;
  if (p) {
    const diff = p.value - p.base;
    const shown = k === 'sleepH' ? Math.round(Math.abs(diff) * 60) : Math.round(Math.abs(diff));
    delta = shown === 0 ? `Usual ${short(p.base)}${u}` : `${diff > 0 ? '+' : '−'}${short(Math.abs(diff))}${u} vs usual ${short(p.base)}${u}`;
    pill = p.z >= 0.5 ? ['good', 'Better'] : p.z <= -0.5 ? ['bad', 'Worse'] : ['', 'About usual'];
  }
  return (
    <MetricCard
      ink={ink}
      label={label}
      when={when}
      pill={pill}
      value={f(value)}
      unit={k === 'sleepH' || k === 'bbHigh' ? '' : unit}
      glyph={k === 'bbHigh' ? <Battery value={value} /> : undefined}
      subs={[delta, withAge(days, k, k === 'sleepH' && sleepScore != null ? `Score ${num(sleepScore)}` : '')]}
      series={series14(days, k, label, p?.base ?? null, f, n)}
    />
  );
}

function Cards({ days, r }: { days: DayWithLoad[]; r: Readiness | null }) {
  return (
    <div className="metrics" id="k-recovery">
      {SIGNALS.map(([k]) => (
        <SignalCard key={k} k={k} days={days} r={r} />
      ))}
    </div>
  );
}

interface Spec {
  type: 'line' | 'bar';
  labels: string[];
  datasets: Dataset[];
  opts: DrawOpts;
}

const byWeek = (d: DayWithLoad[], k: DayKey): Map<string, number | null> => new Map(weekly(d, k, 'mean').map((x) => [x.week, x.v]));

export function RecoveryPanel() {
  const days = useStore((s) => s.days);
  const { token } = useLayout();
  const r = useMemo(() => readiness(days), [days]);

  const spec = useMemo(() => {
    const dates = days.map((x) => fmtDate(x.date));
    const col = (k: DayKey) => days.map((x) => x[k]);
    const css = token;

    // Ninety floating bars read as a solid wall, so past a month the peak is a line with its usual range, like HRV.
    const short = days.length <= 31;
    const bb: Spec = short
      ? {
          type: 'bar',
          labels: dates,
          datasets: [{ ...bar('Daily range', days.map((x) => (x.bbLow != null && x.bbHigh != null ? ([x.bbLow, x.bbHigh] as [number, number]) : null)), css('--ink-bb')), borderSkipped: false }],
          opts: { summary: describe('Body Battery daily high', col('bbHigh')), yRange: { min: 0, max: 100 } },
        }
      : { type: 'line', labels: dates, datasets: trend(col('bbHigh'), css('--ink-bb'), 'Daily peak', css('--mfg')), opts: { summary: describe('Body Battery daily peak', col('bbHigh')), whole: true, yRange: { max: 100 } } };

    // Nightly bars for a month or less; weekly averages beyond that, where 90 slim bars read as texture.
    const stage = (k: DayKey) => (short ? col(k) : [...byWeek(days, k).values()]);
    const seg = (name: string, k: DayKey, t: string): Dataset => ({ ...bar(name, stage(k), css(t)), borderColor: css('--panel'), borderWidth: 1 });
    const sleep: Spec = {
      type: 'bar',
      labels: short ? dates : [...byWeek(days, 'sleepH').keys()].map(fmtDate),
      datasets: [seg('Deep', 'deepH', '--sl-deep'), seg('REM', 'remH', '--sl-rem'), seg('Light', 'lightH', '--sl-light'), seg('Awake', 'awakeH', '--sl-awake')],
      opts: { stacked: true, summary: `Sleep stages (deep, REM, light, awake) in hours. ${describe('Total sleep', col('sleepH'), ' h')}`, tipTitle: short ? undefined : (items) => `Week of ${items[0].label}` },
    };

    return {
      hrv: { type: 'line', labels: dates, datasets: trend(col('hrv'), css('--ink-hrv'), 'Daily HRV', css('--mfg')), opts: { summary: describe('HRV', col('hrv'), ' ms'), whole: true } } satisfies Spec,
      rhr: { type: 'line', labels: dates, datasets: trend(col('restingHr'), css('--ink-rhr'), 'Resting HR', css('--mfg')), opts: { summary: describe('Resting heart rate', col('restingHr'), ' bpm'), whole: true } } satisfies Spec,
      bb,
      sleep,
      bbCaption: short ? 'Body Battery, daily low to high' : 'Body Battery, daily peak',
      sleepCaption: short ? 'Sleep stages, nightly (hours)' : 'Sleep stages, weekly average per night (hours)',
    };
  }, [days, token]);

  return (
    <>
      <Today r={r} days={days} />
      <Cards days={days} r={r} />
      <div className="grid">
        <ChartCard caption="Heart rate variability (ms)" canvasId="c-hrv" {...spec.hrv} />
        <ChartCard caption="Resting heart rate (bpm)" canvasId="c-rhr" {...spec.rhr} />
        <ChartCard caption={spec.bbCaption} captionId="cap-bb" canvasId="c-bb" {...spec.bb} />
        <ChartCard caption={spec.sleepCaption} captionId="cap-sleep" canvasId="c-sleep" wide {...spec.sleep}>
          <NightBar days={days} />
        </ChartCard>
      </div>
    </>
  );
}

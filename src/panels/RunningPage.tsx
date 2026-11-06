import { useEffect, useMemo, useState } from 'react';
import { FEEL } from '../components/RunBody.js';
import { Plot } from '../components/Plot.js';
import { WeekBars } from '../components/WeekBars.js';
import { fmtDate, num, pace } from '../logic/format.js';
import { effortPoints, runWeeks, z2Points } from '../logic/running.js';
import { sportOf } from '../logic/sports.js';
import { useStore } from '../store.js';
import { Sessions } from './TrainingPanel.js';

type Z2 = Record<number, { speed: number; hr: number }>;

// Zone 2 pace and heart rate come from stored detail (ADR 0005); a failed ask just leaves those charts empty.
function useZ2(ids: number[]): Z2 {
  const [z2, setZ2] = useState<Z2>({});
  const key = ids.join(',');
  useEffect(() => {
    if (!key) return;
    const ctl = new AbortController();
    fetch(`/api/zones?ids=${key}`, { signal: ctl.signal, cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<{ z2: Z2 }>) : null))
      .then((j) => j && setZ2(j.z2))
      .catch(() => undefined);
    return () => ctl.abort();
  }, [key]);
  return z2;
}

const epochDay = (date: string): number => Date.parse(`${date}T00:00:00Z`) / 864e5;
const dayLabel = (v: number): string => fmtDate(new Date(v * 864e5).toISOString().slice(0, 10));
const feelLabel = (v: number): string => (v % 25 === 0 ? FEEL[v / 25] ?? '' : '');
const mean = (a: number[]): number => a.reduce((s, x) => s + x, 0) / a.length;

export function RunningPage() {
  const days = useStore((s) => s.days);
  const activities = useStore((s) => s.activities);
  const runs = useMemo(() => activities.filter((a) => sportOf(a.type) === 'running'), [activities]);
  const z2 = useZ2(useMemo(() => runs.map((r) => r.id), [runs]));
  const since = (n: number): string => days.at(-n)?.date ?? '0000';

  const weeks = useMemo(() => runWeeks(days, runs), [days, runs]);
  const zp = useMemo(() => z2Points(runs, z2), [runs, z2]);
  const ep = useMemo(() => effortPoints(runs), [runs]);
  const domain: [number, number] = days.length ? [epochDay(days[0].date), epochDay(days[days.length - 1].date)] : [0, 1];
  const wk = weeks.some((w) => w.partial) ? ' Lighter bars are partial weeks.' : '';
  const date = (p: { date: string }): number => epochDay(p.date);
  const effort = (title: string, cls: string, y: (p: (typeof ep)[number]) => number | null, fmt: (v: number) => string, unit: string) => {
    const vs = ep.map(y).filter((v): v is number => v != null);
    return (
      <div>
        <h3 className="cap">{title}</h3>
        {vs.length ? (
          <Plot label={`${title}. ${vs.length} runs${unit ? `, average ${fmt(mean(vs))}${unit}` : ''}.`} x={ep.map(date)} y={ep.map(y)} cls={cls} fmt={fmt} xFmt={dayLabel} domain={domain} dots />
        ) : (
          <p className="small muted">No rated runs in this range.</p>
        )}
      </div>
    );
  };

  return (
    <div className="running">
      <h2 className="cap">Running</h2>
      <div className="card">
        <h3 className="cap">Pace in Zone 2</h3>
        {zp.length ? (
          <>
            <Plot label={`Pace in Zone 2, per run. ${zp.length} runs, average ${pace(mean(zp.map((p) => p.speed)))} per km.`} x={zp.map(date)} y={zp.map((p) => 1000 / 60 / p.speed)} cls="pace" flip fmt={(v) => pace(1000 / 60 / v)} xFmt={dayLabel} domain={domain} dots />
            <h3 className="cap">Heart rate in Zone 2</h3>
            <Plot label={`Heart rate in Zone 2, per run. Average ${num(mean(zp.map((p) => p.hr)))} bpm.`} x={zp.map(date)} y={zp.map((p) => p.hr)} cls="hr" fmt={(v) => String(Math.round(v))} xFmt={dayLabel} domain={domain} dots />
          </>
        ) : (
          <p className="small muted">No Zone 2 data yet. It needs at least 5 minutes in your watch&rsquo;s Zone 2 and a run whose detail is stored.</p>
        )}
      </div>
      <div className="card">
        <h3 className="cap">Weekly distance (km)</h3>
        <WeekBars label={`Weekly distance. ${num(mean(weeks.map((w) => w.km)), 1)} km a week on average.${wk}`} weeks={weeks} k="km" cls="km" />
        <h3 className="cap">Weekly load from runs</h3>
        <WeekBars label={`Weekly load from runs. ${num(mean(weeks.map((w) => w.load)))} a week on average.${wk}`} weeks={weeks} k="load" cls="load" />
      </div>
      <div className="card">
        {effort('Heart rate by run', 'hr', (p) => p.hr, (v) => String(Math.round(v)), ' bpm')}
        {effort('RPE by run', 'rpe', (p) => p.rpe, (v) => num(v, 1), ' of 10')}
        {effort('Feel by run', 'feel', (p) => p.feel, feelLabel, '')}
      </div>
      <Sessions activities={runs} since={since} />
      <p className="small muted">
        Zone 2 is your watch&rsquo;s own Zone 2, and Zone 2 charts cover only runs with stored detail (the last 90 days); weekly charts follow the chart range. Load is Garmin&rsquo;s per-Session figure, or Edwards (1993) from your zone minutes when Garmin gave none. Feel is Garmin&rsquo;s five-step rating and RPE is Borg&rsquo;s CR10 (Borg, 1982). These are estimates, not Garmin&rsquo;s numbers, and not medical advice.
      </p>
    </div>
  );
}

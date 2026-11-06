import type { Detail } from '../../lib/fit.js';
import { num, pace } from '../logic/format.js';
import { Plot } from './Plot.js';

export const FEEL = ['Very weak', 'Weak', 'Normal', 'Strong', 'Very strong']; // Garmin stores 0, 25, 50, 75, 100
const mmss = (s: number | null): string => (s == null ? '—' : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`);

function Chart({ title, summary, ...p }: { title: string; summary: string; x: number[]; y: (number | null)[]; cls: string; flip?: boolean; fmt: (v: number) => string }) {
  return <Plot label={`${title} over the run. ${summary}`} xFmt={(v) => `${Math.round(v / 60)} min`} {...p} />;
}

export function RunBody({ detail: d, feel, rpe }: { detail: Detail; feel: number | null; rpe: number | null }) {
  const { series: s, laps, metrics: m } = d;
  const speeds = s.speed.map((v) => (v != null && v >= 1 ? v : null)); // stops and walking would spike the pace axis
  const hrs = s.hr.filter((v): v is number => v != null);
  const mps = speeds.filter((v): v is number => v != null);
  const mean = (a: number[]): number | null => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const facts: [string, string][] = [
    ['Decoupling', m.decoupling != null ? `${num(m.decoupling, 1)}%` : '—'],
    ['Z2 efficiency', m.z2Efficiency != null ? `${num(m.z2Efficiency, 2)} m/min per bpm` : '—'],
    ['Feel', feel != null ? FEEL[Math.round(feel / 25)] ?? '—' : '—'],
    ['RPE', rpe != null ? `${num(rpe / 10, 1)} of 10` : '—'],
  ];
  return (
    <div className="fit run">
      <dl className="session-facts">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt className="cap">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <h3 className="cap">Pace</h3>
      <Chart title="Pace" summary={`Average ${pace(mean(mps))} per km.`} x={s.t} y={speeds.map((v) => (v == null ? null : 1000 / 60 / v))} cls="pace" flip fmt={(v) => pace(1000 / 60 / v)} />
      <h3 className="cap">Heart rate</h3>
      <Chart title="Heart rate" summary={`Average ${num(mean(hrs))} bpm.`} x={s.t} y={s.hr} cls="hr" fmt={(v) => String(Math.round(v))} />
      {laps.length > 0 && (
        <table className="laps">
          <caption className="cap">Laps</caption>
          <thead><tr><th>#</th><th>Distance</th><th>Time</th><th>Pace</th><th>Avg HR</th></tr></thead>
          <tbody>
            {laps.map((l, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{l.distanceM != null ? `${num(l.distanceM / 1000, 2)} km` : '—'}</td>
                <td>{mmss(l.durationS)}</td>
                <td>{pace(l.avgSpeed)}</td>
                <td>{num(l.avgHr)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="small muted">
        Decoupling is the drift of pace-to-heart-rate between the two halves of the run, and Z2 efficiency is metres per minute per beat in your Zone 2 (Friel, TrainingPeaks); the 5% cut-off is practitioner guidance, not validated. Feel is Garmin&rsquo;s five-step rating and RPE is Borg&rsquo;s CR10 (Borg, 1982). These are estimates, not Garmin&rsquo;s numbers, and not medical advice. Method v{m.methodVersion}.
      </p>
    </div>
  );
}

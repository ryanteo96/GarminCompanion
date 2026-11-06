import { useMemo, type ReactNode } from 'react';
import type { Activity, DayWithLoad } from '../../lib/types.js';
import { bar, describe, line, weekBars } from '../chart.js';
import { ChartCard } from '../components/ChartCard.js';
import { Hero } from '../components/Hero.js';
import { Scale } from '../components/Scale.js';
import { ScrollRegion } from '../components/ScrollRegion.js';
import { SessionItem } from '../components/SessionItem.js';
import { useLayout } from '../layout.js';
import { fmtDate, num } from '../logic/format.js';
import { loadSeries, loadSummary, ratioLabel, ratioPos, weekly, type LoadPoint } from '../logic/stats.js';
import { useStore } from '../store.js';

const newestFirst = (a: Activity, b: Activity): number => b.date.localeCompare(a.date) || b.id - a.id;
const ZONE_NAMES = ['Z1 Warm-up', 'Z2 Easy', 'Z3 Aerobic', 'Z4 Threshold', 'Z5 Maximum'];
const ZONE_TOKENS = ['--z1', '--z2', '--z3', '--z4', '--z5'];

// `brief` is the Home card: more rows and a plain title, since the heatmap card beside it already totals the week.
export function Sessions({ activities, since, brief }: { activities: Activity[]; since: (n: number) => string; brief?: boolean }) {
  const week = activities.filter((a) => a.date >= since(7));
  const hours = week.reduce((t, a) => t + (a.minutes ?? 0), 0) / 60;
  const three = [...activities].sort(newestFirst).slice(0, brief ? 4 : 3);
  const heading = brief && three.length
    ? 'Recent sessions'
    : three.length
    ? `Your last ${three.length} session${three.length === 1 ? '' : 's'}: ${week.length ? `${week.length} in the last 7 days, ${num(hours, 1)} h` : 'none in the last 7 days'}`
    : 'No sessions recorded in this range';
  return (
    <div className="sessions-wrap">
      <h3 id="sessions-h" className="cap">{heading}</h3>
      <ul id="sessions" className="sessions" aria-labelledby="sessions-h">
        {three.map((a) => (
          <SessionItem key={a.id} a={a} />
        ))}
      </ul>
    </div>
  );
}

export function LoadHero({ last, compact, children }: { last: LoadPoint; compact?: boolean; children?: ReactNode }) {
  const s = loadSummary(last);
  const ratio = last.ratio;
  return (
    <Hero
      id="load"
      headingId="load-h"
      compact={compact}
      state={s.tone}
      tone={s.tone}
      verdict={s.head}
      detail={s.detail}
      main={
        compact ? undefined : (
          <details className="how">
            <summary>What is training load?</summary>
            <p>Training load is the score Garmin gives each activity for how demanding it was, added up over a week. The ratio divides your last 7 days by your usual week (your 28-day total divided by 4). Under 0.8 is lighter than usual, up to 1.3 your sweet spot, up to 1.5 ramping up, and above that spiking. It describes your own recent pattern, not a limit, and it is not medical advice.</p>
          </details>
        )
      }
      score={
        <div className="today-score" id="load-score" hidden={ratio == null}>
          {ratio != null && (
            <>
              <p className="score">
                <span id="load-n" className="score-n">{ratio.toFixed(2)}</span>
                <span className="of">ratio</span>
              </p>
              <p id="load-state" className="state">{ratioLabel(ratio)}</p>
              <Scale
                id="load-scale"
                markerId="load-marker"
                className="load"
                label={`Load ratio ${ratio.toFixed(2)}, ${ratioLabel(ratio).toLowerCase()}. Zones: under 0.8 lighter than usual, 0.8 to 1.3 sweet spot, 1.3 to 1.5 ramping up, above 1.5 spiking.`}
                pos={ratioPos(ratio)}
                ticks={[{ pos: 40, text: '0.8' }, { pos: 65, text: '1.3' }, { pos: 75, text: '1.5' }]}
              />
              <ul className="zonekey" aria-hidden="true">
                <li><i className="zk-light" />Lighter</li>
                <li><i className="zk-sweet" />Sweet spot</li>
                <li><i className="zk-ramp" />Ramping</li>
                <li><i className="zk-spike" />Spiking</li>
              </ul>
            </>
          )}
        </div>
      }
    >
      {children}
    </Hero>
  );
}

export function TrainingPanel() {
  const days = useStore((s) => s.days);
  const activities = useStore((s) => s.activities);
  const { token } = useLayout();
  const ls = useMemo(() => loadSeries(days), [days]);
  const last = ls[ls.length - 1];
  const since = (n: number): string => days.at(-n)?.date ?? '0000';

  const spec = useMemo(() => {
    const d: DayWithLoad[] = days;
    const w = weekly(d, 'load');
    const wk = weekBars(w, d, token('--ink-load'));
    const minutes = [0, 0, 0, 0, 0];
    const cutoff = d.at(-28)?.date ?? '0000';
    for (const a of activities) if (a.date >= cutoff) a.zones.forEach((s, i) => (minutes[i] += s / 60));
    return {
      wloadCaption: `Weekly training load${wk.any ? ' (lighter = partial week)' : ''}`,
      wload: { labels: w.map((x) => fmtDate(x.week)), datasets: [bar('Load', w.map((x) => x.v), wk.colors)], opts: { summary: describe('Weekly training load', w.map((x) => x.v)), tipTitle: wk.title } },
      ac: {
        labels: ls.map((x) => fmtDate(x.date)),
        datasets: [line('Acute (7-day)', ls.map((x) => x.acute), token('--ink-load')), line('Chronic (weekly avg)', ls.map((x) => x.chronic), token('--mfg'), true)],
        opts: { summary: `Acute (7-day) and chronic (28-day weekly average) training load. ${describe('Acute load', ls.map((x) => x.acute))}` },
      },
      zones: {
        labels: ZONE_NAMES,
        datasets: [bar('Minutes', minutes.map(Math.round), ZONE_TOKENS.map((t) => token(t)))],
        opts: { horizontal: true, summary: `Minutes per heart-rate zone: ${ZONE_NAMES.map((n, i) => `${n} ${Math.round(minutes[i])}`).join(', ')}.` },
      },
    };
  }, [days, activities, ls, token]);

  const recent = useMemo(() => [...activities].sort(newestFirst).slice(0, 10), [activities]);

  return (
    <>
      <LoadHero last={last}>
        <Sessions activities={activities} since={since} />
      </LoadHero>
      <div className="grid">
        <ChartCard caption={spec.wloadCaption} captionId="cap-wload" canvasId="c-wload" type="bar" {...spec.wload} />
        <ChartCard caption="Acute (7-day) vs chronic (28-day weekly average) load" canvasId="c-ac" type="line" {...spec.ac} />
        <ChartCard caption="Time in heart-rate zones, last 28 days (minutes)" canvasId="c-zones" type="bar" {...spec.zones} />
        <div className="card wide">
          <h2 className="cap">Recent activities</h2>
          <ScrollRegion id="acts-wrap" label="Recent activities table">
            <table id="acts">
              <thead>
                <tr>
                  <th>Date</th><th>Name</th><th>Type</th><th className="num">Min</th><th className="num">km</th><th className="num">Avg HR</th><th className="num">Load</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((a) => (
                  <tr key={a.id}>
                    {[fmtDate(a.date), a.name, a.type.replaceAll('_', ' '), num(a.minutes), num(a.km, 1), num(a.avgHr), num(a.load)].map((v, i) => (
                      <td key={i} className={i > 2 ? 'num' : i === 2 ? 'a-type' : undefined}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollRegion>
          <ul id="acts-list" className="acts-list" aria-label="Recent activities">
            {recent.map((a) => (
              <SessionItem key={a.id} a={a} />
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

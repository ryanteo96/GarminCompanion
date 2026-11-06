import { AxisBottom, AxisLeft } from '@visx/axis';
import { Group } from '@visx/group';
import { ParentSize } from '@visx/responsive';
import { scaleLinear, scalePoint } from '@visx/scale';
import { LinePath } from '@visx/shape';
import { useMemo } from 'react';
import { fitnessSeries, type FitnessPoint } from '../logic/fitness.js';
import { fmtDate, num } from '../logic/format.js';
import { useStore } from '../store.js';
import { Hover } from './Hover.js';
import { Num } from './Num.js';

const M = { top: 8, right: 12, bottom: 24, left: 36 };

function Plot({ width, height, points, keys }: { width: number; height: number; points: FitnessPoint[]; keys: { k: 'fitness' | 'fatigue' | 'form'; cls: string }[] }) {
  const w = Math.max(width - M.left - M.right, 0);
  const h = height - M.top - M.bottom;
  const x = scalePoint<string>({ domain: points.map((p) => p.date), range: [0, w] });
  const all = points.flatMap((p) => keys.map(({ k }) => p[k]));
  const y = scaleLinear<number>({ domain: [Math.min(0, ...all), Math.max(1, ...all)], range: [h, 0], nice: true });
  const step = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(w / 70))));
  return (
    <svg width={width} height={height} aria-hidden="true">
      <Group left={M.left} top={M.top}>
        <AxisLeft scale={y} numTicks={4} axisClassName="ax" tickClassName="ax" hideAxisLine />
        <AxisBottom scale={x} top={h} tickValues={points.filter((_, i) => i % step === 0).map((p) => p.date)} tickFormat={fmtDate} axisClassName="ax" tickClassName="ax" />
        <line className="zero" x1={0} x2={w} y1={y(0)} y2={y(0)} />
        {keys.map(({ k, cls }) => (
          <LinePath key={k} className={`ln ${cls}`} data={points} x={(p) => x(p.date) ?? 0} y={(p) => y(p[k])} />
        ))}
        <Hover w={w} h={h} tips={points.map((p) => ({ x: x(p.date) ?? 0, dots: keys.map(({ k, cls }) => ({ y: y(p[k]), cls })), lines: [fmtDate(p.date), ...keys.map(({ k }) => `${k[0].toUpperCase()}${k.slice(1)} ${num(p[k])}`)] }))} />
      </Group>
    </svg>
  );
}

export function FitnessCard() {
  const days = useStore((s) => s.days);
  const activities = useStore((s) => s.activities);
  const points = useMemo(() => fitnessSeries(days, activities), [days, activities]);
  const last = points.at(-1);
  if (!last) return null;
  const summary = `Fitness ${num(last.fitness)}, Fatigue ${num(last.fatigue)}, Form ${num(last.form)} on ${fmtDate(last.date)}, over ${points.length} days.`;
  return (
    <div className="card wide fit" id="fitness">
      <h2 className="cap">Fitness, Fatigue and Form</h2>
      <p className="sr-only">{summary}</p>
      <dl className="fit-now">
        <div className="fitness"><dt>Fitness</dt><dd><Num>{num(last.fitness)}</Num></dd></div>
        <div className="fatigue"><dt>Fatigue</dt><dd><Num>{num(last.fatigue)}</Num></dd></div>
        <div className="form"><dt>Form</dt><dd><Num>{`${last.form > 0 ? '+' : ''}${num(last.form)}`}</Num></dd></div>
      </dl>
      <div role="img" aria-label={`Fitness and Fatigue over time. ${summary}`} className="fit-plot tall">
        <ParentSize debounceTime={50}>{({ width }) => width > 0 && <Plot width={width} height={220} points={points} keys={[{ k: 'fitness', cls: 'fitness' }, { k: 'fatigue', cls: 'fatigue' }]} />}</ParentSize>
      </div>
      <div role="img" aria-label={`Form over time. ${summary}`} className="fit-plot short">
        <ParentSize debounceTime={50}>{({ width }) => width > 0 && <Plot width={width} height={110} points={points} keys={[{ k: 'form', cls: 'form' }]} />}</ParentSize>
      </div>
      <p className="small muted">
        Fitness and Fatigue are exponentially weighted averages of daily load over 42 and 7 days (Banister et al., 1975); Form is Fitness minus Fatigue. Load is Garmin&rsquo;s figure for each Session, or, where Garmin gives none, minutes in heart-rate zones weighted 1 to 5 (Edwards, 1993). They start from zero at the first day loaded, so the early weeks read low. These are estimates, not Garmin&rsquo;s numbers, and not medical advice.
      </p>
    </div>
  );
}

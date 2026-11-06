import { AxisBottom, AxisLeft } from '@visx/axis';
import { Group } from '@visx/group';
import { ParentSize } from '@visx/responsive';
import { scaleBand, scaleLinear } from '@visx/scale';
import type { RunWeek } from '../logic/running.js';
import { fmtDate, num } from '../logic/format.js';
import { Hover } from './Hover.js';

const M = { top: 8, right: 12, bottom: 24, left: 40 };

function Svg({ width, weeks, k, cls }: { width: number; weeks: RunWeek[]; k: 'km' | 'load'; cls: string }) {
  const height = 140;
  const w = Math.max(width - M.left - M.right, 0);
  const h = height - M.top - M.bottom;
  const x = scaleBand<string>({ domain: weeks.map((d) => d.week), range: [0, w], padding: 0.2 });
  const y = scaleLinear<number>({ domain: [0, Math.max(1, ...weeks.map((d) => d[k]))], range: [h, 0], nice: true });
  const every = Math.ceil(weeks.length / 6); // keep the week labels from colliding
  return (
    <svg width={width} height={height} aria-hidden="true">
      <Group left={M.left} top={M.top}>
        <AxisLeft scale={y} numTicks={4} tickFormat={(v) => String(Math.round(Number(v)))} axisClassName="ax" tickClassName="ax" hideAxisLine />
        <AxisBottom scale={x} top={h} tickValues={weeks.filter((_, i) => i % every === 0).map((d) => d.week)} tickFormat={fmtDate} axisClassName="ax" tickClassName="ax" />
        {weeks.map((d) => (
          <rect key={d.week} className={`bar ${cls}${d.partial ? ' partial' : ''}`} x={x(d.week)} y={y(d[k])} width={x.bandwidth()} height={h - y(d[k])} />
        ))}
        <Hover w={w} h={h} tips={weeks.map((d) => ({ x: (x(d.week) ?? 0) + x.bandwidth() / 2, dots: [{ y: y(d[k]), cls }], lines: [`Week of ${fmtDate(d.week)}${d.partial ? ' (partial)' : ''}`, k === 'km' ? `${num(d.km, 1)} km` : `Load ${num(d.load)}`] }))} />
      </Group>
    </svg>
  );
}

// Weekly totals as bars; a partial week is drawn lighter.
export function WeekBars({ label, ...p }: { label: string; weeks: RunWeek[]; k: 'km' | 'load'; cls: string }) {
  return (
    <div role="img" aria-label={label} className="fit-plot chart">
      <ParentSize debounceTime={50}>{({ width }) => width > 0 && <Svg width={width} {...p} />}</ParentSize>
    </div>
  );
}

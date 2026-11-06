import { AxisBottom, AxisLeft } from '@visx/axis';
import { Group } from '@visx/group';
import { ParentSize } from '@visx/responsive';
import { scaleLinear } from '@visx/scale';
import { LinePath } from '@visx/shape';
import { Hover } from './Hover.js';

const M = { top: 8, right: 12, bottom: 24, left: 84 }; // wide enough for the Feel labels, "Very strong"

export interface PlotProps {
  x: number[];
  y: (number | null)[];
  cls: string;
  fmt: (v: number) => string; // y tick labels
  xFmt: (v: number) => string; // x tick labels
  flip?: boolean; // larger values lower, for pace
  dots?: boolean; // runs are discrete, so a lone point still shows
  domain?: [number, number]; // shared x range, so stacked plots line up
  yTicks?: number[]; // fixed y ticks, for a scale of named steps
}

function Svg({ width, x: xs, y: ys, cls, flip, fmt, xFmt, dots, domain, yTicks }: PlotProps & { width: number }) {
  const height = 140;
  const w = Math.max(width - M.left - M.right, 0);
  const h = height - M.top - M.bottom;
  const pts = xs.map((x, i) => ({ x, v: ys[i] })).filter((p): p is { x: number; v: number } => p.v != null);
  const vs = pts.map((p) => p.v);
  const [lo, hi] = domain ?? [0, Math.max(1, ...xs)];
  const x = scaleLinear<number>({ domain: [lo, Math.max(hi, lo + 1)], range: [0, w] });
  const y = scaleLinear<number>({ domain: [Math.min(...vs, ...(yTicks ?? [])), Math.max(...vs, ...(yTicks ?? []))], range: flip ? [0, h] : [h, 0], nice: true });
  return (
    <svg width={width} height={height} aria-hidden="true">
      <Group left={M.left} top={M.top}>
        <AxisLeft scale={y} tickValues={yTicks ?? [...new Map(y.ticks(4).map((v) => [fmt(v), v])).values()]} tickFormat={(v) => fmt(Number(v))} axisClassName="ax" tickClassName="ax" hideAxisLine />
        <AxisBottom scale={x} top={h} numTicks={5} tickFormat={(v) => xFmt(Number(v))} axisClassName="ax" tickClassName="ax" />
        <LinePath className={`ln ${cls}`} data={pts} x={(p) => x(p.x)} y={(p) => y(p.v)} />
        {dots && pts.map((p, i) => <circle key={i} className={`dot ${cls}`} cx={x(p.x)} cy={y(p.v)} r={3} />)}
        <Hover w={w} h={h} tips={pts.map((p) => ({ x: x(p.x), dots: [{ y: y(p.v), cls }], lines: [xFmt(p.x), fmt(p.v)] }))} />
      </Group>
    </svg>
  );
}

// A line chart read as one image: `label` is what a screen reader hears.
export function Plot({ label, ...p }: PlotProps & { label: string }) {
  return (
    <div role="img" aria-label={label} className="fit-plot chart">
      <ParentSize debounceTime={50}>{({ width }) => width > 0 && <Svg width={width} {...p} />}</ParentSize>
    </div>
  );
}

import { Group } from '@visx/group';
import { ParentSize } from '@visx/responsive';
import { scaleBand } from '@visx/scale';
import { fmtDate, num } from '../logic/format.js';
import type { HeatCell } from '../logic/stats.js';

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const LEFT = 16;
const HEIGHT = 154; // matches .heat in style.css

function Svg({ width, cells }: { width: number; cells: HeatCell[] }) {
  const cols = Math.max(...cells.map((c) => c.col)) + 1;
  const x = scaleBand<number>({ domain: Array.from({ length: cols }, (_, i) => i), range: [0, Math.max(width - LEFT, 0)], padding: 0.12 });
  const y = scaleBand<number>({ domain: [0, 1, 2, 3, 4, 5, 6], range: [0, HEIGHT], padding: 0.12 });
  const max = Math.max(1, ...cells.map((c) => c.load));
  return (
    <svg width={width} height={HEIGHT} aria-hidden="true">
      {DOW.map((d, i) => <text key={i} className="heat-dow" x={0} y={(y(i) ?? 0) + y.bandwidth() / 2} dominantBaseline="central">{d}</text>)}
      <Group left={LEFT}>
        {cells.map((c) => (
          <rect key={c.date} className="heat-cell" x={x(c.col)} y={y(c.row)} width={x.bandwidth()} height={y.bandwidth()} rx={3} style={{ fillOpacity: c.load ? 0.25 + 0.75 * (c.load / max) : 0 }}>
            <title>{`${fmtDate(c.date)}: ${c.load ? `load ${num(c.load)}` : 'no load'}`}</title>
          </rect>
        ))}
      </Group>
    </svg>
  );
}

// Daily training load as a week-by-weekday grid; darker means more load, empty means none.
export function MonthHeat({ cells }: { cells: HeatCell[] }) {
  if (!cells.length) return <p className="muted">No days to show yet.</p>;
  const total = cells.reduce((t, c) => t + c.load, 0);
  const active = cells.filter((c) => c.load > 0).length;
  return (
    <div role="img" aria-label={`Training load by day, ${cells.length} days: ${active} with load, ${num(total)} in total`} className="heat">
      <ParentSize debounceTime={50}>{({ width }) => width > 0 && <Svg width={width} cells={cells} />}</ParentSize>
    </div>
  );
}

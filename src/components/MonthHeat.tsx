import { useMemo, useState } from 'react';
import { Group } from '@visx/group';
import { scaleBand } from '@visx/scale';
import type { Activity } from '../../lib/types.js';
import { fmtDate, num } from '../logic/format.js';
import type { HeatCell } from '../logic/stats.js';

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const LEFT = 16;
const STEP = 24; // cell plus gap
const CELL = 20;

// Daily training load as a week-by-weekday grid; darker means more load, empty means none. Hover, tap or focus a cell for that day's activities.
export function MonthHeat({ cells, activities }: { cells: HeatCell[]; activities: Activity[] }) {
  const [sel, setSel] = useState<HeatCell | null>(null);
  const byDate = useMemo(() => {
    const m = new Map<string, Activity[]>();
    for (const a of activities) m.set(a.date, [...(m.get(a.date) ?? []), a]);
    return m;
  }, [activities]);
  if (!cells.length) return <p className="muted">No days to show yet.</p>;

  const cols = Math.max(...cells.map((c) => c.col)) + 1;
  const x = scaleBand<number>({ domain: Array.from({ length: cols }, (_, i) => i), range: [0, cols * STEP], padding: (STEP - CELL) / STEP });
  const y = scaleBand<number>({ domain: [0, 1, 2, 3, 4, 5, 6], range: [0, 7 * STEP], padding: (STEP - CELL) / STEP });
  const max = Math.max(1, ...cells.map((c) => c.load));
  const total = cells.reduce((t, c) => t + c.load, 0);
  const active = cells.filter((c) => c.load > 0).length;
  const acts = sel ? (byDate.get(sel.date) ?? []) : [];
  const right = sel != null && sel.col >= cols / 2;

  return (
    <div className="heat" style={{ width: LEFT + cols * STEP, height: 7 * STEP }} onPointerLeave={() => setSel(null)}>
      <svg width={LEFT + cols * STEP} height={7 * STEP} role="img" aria-label={`Training load by day, ${cells.length} days: ${active} with load, ${num(total)} in total`}>
        {DOW.map((d, i) => <text key={i} className="heat-dow" x={0} y={(y(i) ?? 0) + y.bandwidth() / 2} dominantBaseline="central" aria-hidden="true">{d}</text>)}
        <Group left={LEFT}>
          {cells.map((c) => (
            <rect
              key={c.date}
              className={`heat-cell${sel?.date === c.date ? ' on' : ''}`}
              x={x(c.col)} y={y(c.row)} width={x.bandwidth()} height={y.bandwidth()} rx={3}
              style={{ fillOpacity: c.load ? 0.25 + 0.75 * (c.load / max) : 0 }}
              onPointerEnter={() => setSel(c)}
              onPointerDown={() => setSel(c)}
            />
          ))}
        </Group>
      </svg>
      {sel && (
        <div className="heat-pop" role="status" style={{ top: (y(sel.row) ?? 0) + STEP, [right ? 'right' : 'left']: right ? LEFT + (cols - sel.col - 1) * STEP : LEFT + sel.col * STEP }}>
          <strong>{fmtDate(sel.date)}</strong>
          <span className="muted">{sel.load ? ` · load ${num(sel.load)}` : ' · no load'}</span>
          {acts.map((a) => (
            <div key={a.id}>{a.name} <span className="muted">{[a.minutes != null && `${num(a.minutes)} min`, a.te != null && `TE ${num(a.te, 1)}`].filter(Boolean).join(' · ')}</span></div>
          ))}
        </div>
      )}
    </div>
  );
}

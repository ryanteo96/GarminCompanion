import { useMemo } from 'react';
import { ScrollRegion } from '../components/ScrollRegion.js';
import { newest } from '../logic/days.js';
import { fmtDate, hm, num } from '../logic/format.js';
import { weekDeltas, type WeekDelta } from '../logic/stats.js';
import { useStore } from '../store.js';

// Say whether the move is good or bad, in words as well as colour; skip it for small changes and for load.
function ChangeCell({ x }: { x: WeekDelta }) {
  const pct = `${Math.abs(x.pct).toFixed(1)}%`;
  const better = Math.sign(x.pct) === x.good;
  return (
    <td className="num">
      {Math.abs(x.pct) < 1 ? `flat ${pct}` : `${x.pct > 0 ? 'up' : 'down'} ${pct}`}
      {x.good !== 0 && Math.abs(x.pct) >= 3 && (
        <>
          {' '}
          <span className={better ? 'good' : 'bad'}>{better ? 'better' : 'worse'}</span>
        </>
      )}
    </td>
  );
}

// The last 7 days against the 21 before them, one row per metric.
export function WeekCard() {
  const days = useStore((s) => s.days);
  const through = newest(days);
  const deltas = useMemo(() => weekDeltas(days), [days]);
  return (
    <section className="card" aria-labelledby="deltas-h">
      <h3 id="deltas-h" className="cap">{`Last 7 days vs the 21 before${through ? ` (through ${fmtDate(through)})` : ''}`}</h3>
      <ScrollRegion label="Weekly changes table">
        <table id="deltas">
          <thead>
            <tr><th>Metric</th><th className="num">Last 7 days</th><th className="num">Before</th><th className="num">Change</th></tr>
          </thead>
          <tbody>
            {deltas.length === 0 && (
              <tr><td colSpan={4} className="muted">Not enough history yet. It needs about a week of data plus earlier days to compare against.</td></tr>
            )}
            {deltas.map((x) => (
              <tr key={x.k} className={Math.abs(x.pct) < 3 ? 'quiet' : undefined}>
                <td>{`${x.label}${x.unit && x.k !== 'sleepH' ? ` (${x.unit})` : ''}`}</td>
                <td className="num">{x.k === 'sleepH' ? hm(x.now) : num(x.now, x.now < 100 ? 1 : 0)}</td>
                <td className="num">{x.k === 'sleepH' ? hm(x.prev) : num(x.prev, x.prev < 100 ? 1 : 0)}</td>
                <ChangeCell x={x} />
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollRegion>
    </section>
  );
}

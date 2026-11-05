import { useMemo } from 'react';
import { ScrollRegion } from '../components/ScrollRegion.js';
import { newest } from '../logic/days.js';
import { fmtDate, num } from '../logic/format.js';
import { insights, weekDeltas, type WeekDelta } from '../logic/stats.js';
import { useStore } from '../store.js';

// A drawn icon in the same stroke family as the tab icons; decorative, so the words beside it carry the meaning.
const Icon = ({ d, cls = '' }: { d: string; cls?: string }) => (
  <svg viewBox="0 0 24 24" className={`ico ${cls}`.trim()} aria-hidden="true">
    <path d={d} />
  </svg>
);

// Say whether the move is good or bad, in words as well as colour; skip it for small changes and for load.
function ChangeCell({ x }: { x: WeekDelta }) {
  const pct = `${Math.abs(x.pct).toFixed(1)}%`;
  const better = Math.sign(x.pct) === x.good;
  return (
    <td className="num">
      {Math.abs(x.pct) < 1 ? (
        `flat ${pct}`
      ) : (
        <>
          <Icon d={x.pct > 0 ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} cls="arrow" />
          <span className="sr-only">{x.pct > 0 ? ' up ' : ' down '}</span>
          {pct}
        </>
      )}
      {x.good !== 0 && Math.abs(x.pct) >= 3 && (
        <>
          {' '}
          <span className={better ? 'good' : 'bad'}>{better ? 'better' : 'worse'}</span>
        </>
      )}
    </td>
  );
}

export function InsightsPanel() {
  const days = useStore((s) => s.days);
  const through = newest(days);
  const deltas = useMemo(() => weekDeltas(days), [days]);
  // Strongest relationship first and widest; weak ones step back.
  const ranked = useMemo(() => [...insights(days)].sort((a, b) => Math.abs(b.r ?? 0) - Math.abs(a.r ?? 0)), [days]);

  return (
    <>
      <div className="card">
        <h2 id="deltas-h" className="cap">{`Last 7 days vs the 21 days before${through ? ` (through ${fmtDate(through)})` : ''}`}</h2>
        <ScrollRegion label="Weekly changes table">
          <table id="deltas">
            <thead>
              <tr>
                <th>Metric</th><th className="num">Last 7 days</th><th className="num">Before</th><th className="num">Change</th>
              </tr>
            </thead>
            <tbody>
              {deltas.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted">Not enough history yet for a weekly comparison. It needs about a week of data plus earlier days to compare against.</td>
                </tr>
              )}
              {deltas.map((x) => (
                <tr key={x.k}>
                  <td>{`${x.label}${x.unit ? ` (${x.unit})` : ''}`}</td>
                  <td className="num">{num(x.now, x.now < 100 ? 1 : 0)}</td>
                  <td className="num">{num(x.prev, x.prev < 100 ? 1 : 0)}</td>
                  <ChangeCell x={x} />
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollRegion>
      </div>
      <h2 className="cap pad">What moves together in your data</h2>
      <div id="insight-cards" className="grid">
        {ranked.map((i) => (
          <div key={i.id} className={`card insight${Math.abs(i.r ?? 0) < 0.2 ? ' weak' : ''}`}>
            <div className="head">
              {i.xs}
              <Icon d="M5 12h14M13 6l6 6-6 6" />
              <span className="sr-only"> goes with </span>
              {i.ys}
            </div>
            <div className="r">{i.r == null ? 'r = —' : `r = ${i.r.toFixed(2)}`}</div>
            {i.r != null && (
              <div className="dtrack" role="img" aria-label={`Relationship strength ${i.r.toFixed(2)} on a scale from minus 1 to 1`}>
                <div className="dfill" style={{ width: `${Math.abs(i.r) * 50}%`, [i.r > 0 ? 'left' : 'right']: '50%' }} />
              </div>
            )}
            <p>{i.text}</p>
          </div>
        ))}
      </div>
      <p className="muted small">These are patterns in your own history, not medical advice. Readiness is a simple score computed here from your 28-day baseline, not a Garmin metric.</p>
    </>
  );
}

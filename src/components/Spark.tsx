import type { Series14 } from '../logic/days.js';

// A trend (the last 14 days on the detail tabs, 7 on Home) over your normal range as a band, with your usual dashed
// inside it and the latest reading as a dot. Gaps break the line.
export function Spark({ series: [values, usual, label, band] }: { series: Series14 }) {
  const seen = values.filter((v) => v != null);
  if (seen.length < 2) return null;
  const all = [...seen, ...(usual == null ? [] : [usual]), ...(band ?? [])];
  const lo = Math.min(...all);
  const span = Math.max(...all) - lo || 1;
  const X = (i: number): string => ((i / (values.length - 1)) * 120).toFixed(1);
  const Y = (v: number): string => (37 - ((v - lo) / span) * 34).toFixed(1);
  const d = values.map((v, i) => (v == null ? '' : `${values[i - 1] == null ? 'M' : 'L'}${X(i)} ${Y(v)}`)).join('');
  const last = values.findLastIndex((v) => v != null);
  return (
    <div className="spark-wrap">
      <svg viewBox="0 0 120 40" preserveAspectRatio="none" className="spark" role="img" aria-label={band ? `${label}. Shaded: your normal range.` : label}>
        {band && <path className="band" d={`M0 ${Y(band[1])}H120V${Y(band[0])}H0Z`} />}
        {usual != null && <path className="usual" d={`M0 ${Y(usual)}H120`} />}
        <path className="ln" d={d} />
      </svg>
      <i className="spark-dot" style={{ left: `${(last / (values.length - 1)) * 100}%`, top: `${(Number(Y(values[last]!)) / 40) * 100}%` }} />
    </div>
  );
}

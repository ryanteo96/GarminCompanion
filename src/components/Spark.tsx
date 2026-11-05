import type { Series14 } from '../logic/days.js';

// The last 14 days as a line that scales to its own range, with your usual drawn dashed behind it. Gaps break the line.
export function Spark({ series: [values, usual, label] }: { series: Series14 }) {
  const seen = values.filter((v) => v != null);
  if (seen.length < 2) return null;
  const all = usual == null ? seen : [...seen, usual];
  const lo = Math.min(...all);
  const span = Math.max(...all) - lo || 1;
  const X = (i: number): string => ((i / (values.length - 1)) * 120).toFixed(1);
  const Y = (v: number): string => (37 - ((v - lo) / span) * 34).toFixed(1);
  const d = values.map((v, i) => (v == null ? '' : `${values[i - 1] == null ? 'M' : 'L'}${X(i)} ${Y(v)}`)).join('');
  return (
    <svg viewBox="0 0 120 40" preserveAspectRatio="none" className="spark" role="img" aria-label={label}>
      {usual != null && <path className="usual" d={`M0 ${Y(usual)}H120`} />}
      <path d={d} />
    </svg>
  );
}

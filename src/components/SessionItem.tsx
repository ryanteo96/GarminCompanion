import type { Activity } from '../../lib/types.js';
import { fmtDate, num } from '../logic/format.js';

// One two-line session row, shared by the Training hero and the phone activity list.
export function SessionItem({ a }: { a: Activity }) {
  const type = a.type.replaceAll('_', ' ');
  const facts = [type, a.minutes != null && `${num(a.minutes)} min`, a.km != null && `${num(a.km, 1)} km`, a.avgHr != null && `${num(a.avgHr)} bpm`, a.load != null && `load ${num(a.load)}`].filter(Boolean);
  return (
    <li>
      <div className="a-top">
        <span className="a-name">{a.name || type}</span>
        <span className="a-date">{fmtDate(a.date)}</span>
      </div>
      <div className="a-meta">
        {facts.map((f) => (
          <span key={String(f)}>{f}</span>
        ))}
      </div>
    </li>
  );
}

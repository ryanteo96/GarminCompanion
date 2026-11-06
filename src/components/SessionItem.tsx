import { Link } from 'react-router';
import type { Activity } from '../../lib/types.js';
import { fmtDate, num } from '../logic/format.js';
import { sportOf } from '../logic/sports.js';

// One two-line session row, shared by the Training hero and the phone activity list.
export function SessionItem({ a }: { a: Activity }) {
  const type = a.type.replaceAll('_', ' ');
  const facts = [type, a.minutes != null && `${num(a.minutes)} min`, a.km != null && `${num(a.km, 1)} km`, a.avgHr != null && `${num(a.avgHr)} bpm`, a.load != null && `load ${num(a.load)}`].filter(Boolean);
  const sport = sportOf(a.type); // a type with no Sport has no Session page
  const label = a.name || type;
  return (
    <li>
      <div className="a-top">
        <span className="a-name">{sport ? <Link to={`/activity/${sport}/${a.id}`}>{label}</Link> : label}</span>
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

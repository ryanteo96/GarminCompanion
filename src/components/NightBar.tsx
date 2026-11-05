import type { DayWithLoad } from '../../lib/types.js';
import { clock12, fmtDate, hm } from '../logic/format.js';

// Last night's stage totals as one proportional bar. Garmin's API gives totals and bed/wake times, not a per-minute timeline.
const STAGES = [['deep', 'Deep', 'deepH'], ['rem', 'REM', 'remH'], ['light', 'Light', 'lightH'], ['awake', 'Awake', 'awakeH']] as const;

export function NightBar({ days }: { days: DayWithLoad[] }) {
  const row = days.findLast((x) => x.sleepH != null);
  if (!row) return null;
  const present = STAGES.filter(([, , k]) => (row[k] ?? 0) > 0);
  const total = STAGES.reduce((t, [, , k]) => t + (row[k] ?? 0), 0);
  const times = row.bedtime && row.wake ? `In bed ${clock12(row.bedtime)}, up ${clock12(row.wake)}.` : total > 0 ? '' : 'Stage detail is not available for this night.';
  return (
    <div id="night" className="night">
      <p id="night-head" className="night-head">{`Last night, ${fmtDate(row.date)}: ${hm(row.sleepH)} asleep`}</p>
      {total > 0 && (
        <>
          <div id="nightbar" className="nightbar" role="img" aria-label={`Last night's sleep stages: ${present.map(([, name, k]) => `${name} ${hm(row[k])}`).join(', ')}.`}>
            {present.map(([cls, , k]) => (
              <i key={cls} className={`stage-${cls}`} style={{ width: `${((row[k] ?? 0) / total) * 100}%` }} />
            ))}
          </div>
          <ul id="nightkey" className="nightkey">
            {present.map(([cls, name, k]) => (
              <li key={cls}>
                <i className={`stage-${cls}`} />
                <span>{`${name} ${hm(row[k])} (${Math.round(((row[k] ?? 0) / total) * 100)}%)`}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <p id="night-times" className="small muted">{times}</p>
    </div>
  );
}

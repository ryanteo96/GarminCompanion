import type { ReactNode } from 'react';
import type { Series14 } from '../logic/days.js';
import { Spark } from './Spark.js';
import { Num } from './Num.js';

// One drawn icon per signal ink, 24-unit grid at a 2.25 stroke (shapes after Lucide, ISC).
const ICONS: Record<string, ReactNode> = {
  hrv: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  rhr: <path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z" />,
  sleep: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />,
  bb: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />,
  load: <path d="M22 7 13.5 15.5l-5-5L2 17M16 7h6v6" />,
  steps: <path d="M4 16v-2.4C4 11.5 3 10.5 3 8c0-2.7 1.5-6 4.5-6C9.4 2 10 3.8 10 5.5c0 3.1-2 5.7-2 8.7V16a2 2 0 1 1-4 0ZM20 20v-2.4c0-2.1 1-3.1 1-5.6 0-2.7-1.5-6-4.5-6C14.6 6 14 7.8 14 9.5c0 3.1 2 5.7 2 8.7V20a2 2 0 1 0 4 0Z" />,
  int: <path d="M10 2h4M12 14l3-3M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />,
  stress: <path d="m12 14 4-4M3.3 19a10 10 0 1 1 17.4 0" />,
  cal: <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5Z" />,
};

interface MetricProps {
  ink: string;
  label: string;
  /** When the reading is from, shown on the right of the header ("Last night", "Today so far"). */
  when?: string;
  value: string;
  unit?: string;
  subs?: string[];
  /** [class, text], e.g. ['good', 'Better']. */
  pill?: [string, string];
  glyph?: ReactNode;
  series?: Series14;
  /** 0 to 1; draws a goal bar. */
  progress?: number | null;
}

// One metric card in its signal's ink: label and verdict pill, the value, how it compares, and an optional trend line.
export function MetricCard({ ink, label, when, value, unit, subs = [], pill, glyph, series, progress }: MetricProps) {
  const [first, ...rest] = subs.filter(Boolean);
  return (
    <div className="card metric" data-ink={ink}>
      <div className="mhead">
        {ICONS[ink] && <svg className="mico" viewBox="0 0 24 24" aria-hidden="true">{ICONS[ink]}</svg>}
        <span>{label}</span>
        {when && <span className="when">{when}</span>}
      </div>
      <div className="mval">
        {glyph}
        <span><Num>{value}</Num></span>
        {unit && <span className="unit">{unit}</span>}
      </div>
      {(pill || first) && (
        <div className="msub">
          {pill && <span className={`pill ${pill[0]}`.trim()}>{pill[1]}</span>}
          {pill && first && ' · '}
          {first}
        </div>
      )}
      {rest.map((t) => (
        <div key={t} className="msub">{t}</div>
      ))}
      {series && <Spark series={series} />}
      {progress != null && (
        <div className="goalbar">
          <i style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }} />
        </div>
      )}
    </div>
  );
}

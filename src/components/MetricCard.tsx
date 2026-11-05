import type { ReactNode } from 'react';
import type { Series14 } from '../logic/days.js';
import { Spark } from './Spark.js';

interface MetricProps {
  ink: string;
  label: string;
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

// One metric card in its signal's ink: label and verdict pill, the value, how it compares, and an optional 14-day line.
export function MetricCard({ ink, label, value, unit, subs = [], pill, glyph, series, progress }: MetricProps) {
  return (
    <div className="card metric" data-ink={ink}>
      <div className="mhead">
        <span className="mdot" />
        <span>{label}</span>
        {pill && <span className={`pill ${pill[0]}`.trim()}>{pill[1]}</span>}
      </div>
      <div className="mval">
        {glyph}
        <span>{value}</span>
        {unit && <span className="unit">{unit}</span>}
      </div>
      {subs.filter(Boolean).map((t) => (
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

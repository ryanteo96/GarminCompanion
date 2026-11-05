import type { ReactNode } from 'react';

interface HeroProps {
  /** Section id and prefix for the detail/chip ids: "today" or "load". */
  id: string;
  headingId: string;
  state: string;
  tone: string;
  verdict: string;
  detail: string;
  /** The stale-reading chip. Pass null to keep it in the DOM but hidden; omit it for a hero that has none. */
  chip?: string | null;
  /** Extra content inside the text column, after the detail line. */
  main?: ReactNode;
  /** The score block (omitted when there is no score to show). */
  score?: ReactNode;
  /** Anything after the score, e.g. the Training session list. */
  children?: ReactNode;
  /** Home's smaller variant: a smaller numeral and padding, one column. */
  compact?: boolean;
}

// The shared card behind both the readiness verdict (Recovery) and the training-load verdict (Training).
export function Hero({ id, headingId, state, tone, verdict, detail, chip, main, score, children, compact }: HeroProps) {
  return (
    <section id={id} className={compact ? 'card today compact' : 'card today'} aria-labelledby={headingId} data-state={state} data-tone={tone}>
      {chip !== undefined && <p id={`${id}-chip`} className="chip" hidden={!chip}>{chip}</p>}
      <div className="today-main">
        <h2 id={headingId} className="verdict">{verdict}</h2>
        <p id={`${id}-detail`} className="detail">{detail}</p>
        {main}
      </div>
      {score}
      {children}
    </section>
  );
}

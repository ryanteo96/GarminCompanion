export interface ScaleTick {
  /** Position along the track, in percent. */
  pos: number;
  text: string;
}

// The coloured zones with a marker and labelled ticks. Positions are set through the DOM, not inline markup, so the CSP holds.
export function Scale({ id, markerId, className, label, pos, ticks }: { id: string; markerId: string; className?: string; label: string; pos: number; ticks: ScaleTick[] }) {
  return (
    <div className={className ? `scale ${className}` : 'scale'} id={id} role="img" aria-label={label}>
      <span className="zones"><i /><i /><i /><i /></span>
      <span className="marker" id={markerId} style={{ left: `${pos}%` }} />
      {ticks.map((t) => (
        <span key={t.pos} className="tick" data-pos={t.pos} style={{ left: `${t.pos}%` }}>{t.text}</span>
      ))}
    </div>
  );
}

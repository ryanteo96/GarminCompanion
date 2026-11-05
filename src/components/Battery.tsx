// Body Battery as a battery: the fill is the day's peak.
export function Battery({ value }: { value: number | null | undefined }) {
  return (
    <svg viewBox="0 0 44 22" className="battery" aria-hidden="true">
      <rect x={1} y={1} width={38} height={20} rx={4} className="bat-shell" />
      <rect x={40} y={7} width={3} height={8} rx={1} className="bat-cap" />
      <rect x={3} y={3} width={(34 * Math.max(0, Math.min(100, value ?? 0))) / 100} height={16} rx={2} className="bat-fill" />
    </svg>
  );
}

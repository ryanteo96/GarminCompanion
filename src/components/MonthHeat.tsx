import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { Group } from '@visx/group';
import { scaleBand } from '@visx/scale';
import type { Activity } from '../../lib/types.js';
import { fmtDate, num } from '../logic/format.js';
import type { HeatCell } from '../logic/stats.js';

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const TOP = 16;
const STEP = 24; // cell plus gap
const CELL = 20;
const GLOW = 3; // how many cells away the glow still reaches

// Daily training load, one row per week (oldest first) and one column per weekday; darker means more load, grey means none. Hover or tap a cell for that day's activities.
export function MonthHeat({ cells, activities }: { cells: HeatCell[]; activities: Activity[] }) {
  const [sel, setSel] = useState<HeatCell | null>(null);
  const [last, setLast] = useState<HeatCell | null>(null); // keeps the lifted cell mounted while it settles back
  const pick = (c: HeatCell | null) => { setSel(c); if (c) setLast(c); };
  const els = useRef(new Map<string, SVGRectElement>());
  const lift = useRef<SVGRectElement>(null);
  const byDate = useMemo(() => {
    const m = new Map<string, Activity[]>();
    for (const a of activities) m.set(a.date, [...(m.get(a.date) ?? []), a]);
    return m;
  }, [activities]);

  // The hovered cell is picked up and keeps bobbing while the pointer stays; the cells around it glow, rippling out from it.
  useEffect(() => {
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const k = calm ? 0 : 1;
    for (const c of cells) {
      const el = els.current.get(c.date);
      if (!el) continue;
      const d = sel ? Math.hypot(c.row - sel.row, c.col - sel.col) : 0;
      const g = sel && c.date !== sel.date ? Math.max(0, 1 - d / (GLOW + 1)) : 0;
      gsap.to(el, { '--g': g, scale: 1 + 0.12 * g, transformOrigin: '50% 50%', duration: 0.5 * k, delay: sel ? d * 0.05 * k : 0, ease: 'power2.out', overwrite: 'auto' });
    }
    const el = lift.current;
    if (!el) return;
    gsap.killTweensOf(el);
    if (!sel) {
      gsap.to(el, { scale: 1, y: 0, '--b': 0, opacity: 0, duration: 0.25 * k, ease: 'power2.in' });
      return;
    }
    gsap.set(el, { transformOrigin: '50% 50%', opacity: 1, scale: 1, y: 0, '--b': 0 });
    gsap.to(el, { scale: 1.3, y: -4, '--b': 0.5, duration: 0.45 * k, ease: 'back.out(3)' });
    if (!calm) gsap.to(el, { scale: 1.38, y: -7, '--b': 1, duration: 0.9, delay: 0.45, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    return () => { gsap.killTweensOf(el); };
  }, [sel, cells]);

  if (!cells.length) return <p className="muted">No days to show yet.</p>;

  const weeks = Math.max(...cells.map((c) => c.col)) + 1;
  const width = 7 * STEP;
  const height = TOP + weeks * STEP;
  const pad = (STEP - CELL) / STEP;
  const x = scaleBand<number>({ domain: [0, 1, 2, 3, 4, 5, 6], range: [0, width], padding: pad });
  const y = scaleBand<number>({ domain: Array.from({ length: weeks }, (_, i) => i), range: [0, weeks * STEP], padding: pad });
  const max = Math.max(1, ...cells.map((c) => c.load));
  const total = cells.reduce((t, c) => t + c.load, 0);
  const active = cells.filter((c) => c.load > 0).length;
  const acts = sel ? (byDate.get(sel.date) ?? []) : [];
  const right = sel != null && sel.row >= 4;
  const above = sel != null && sel.col >= weeks - 2;
  const fill = (c: HeatCell) => (c.load ? { fillOpacity: 0.25 + 0.75 * (c.load / max) } : undefined);

  return (
    <div className="heat" style={{ width, height }} onPointerLeave={() => pick(null)}>
      <svg width={width} height={height} role="img" aria-label={`Training load by day, ${cells.length} days: ${active} with load, ${num(total)} in total`}>
        {DOW.map((d, i) => <text key={i} className="heat-dow" x={(x(i) ?? 0) + x.bandwidth() / 2} y={TOP / 2} textAnchor="middle" dominantBaseline="central" aria-hidden="true">{d}</text>)}
        <Group top={TOP}>
          {cells.map((c) => (
            <rect
              key={c.date}
              ref={(el) => { if (el) els.current.set(c.date, el); else els.current.delete(c.date); }}
              className={`heat-cell${c.load ? '' : ' none'}`}
              x={x(c.row)} y={y(c.col)} width={x.bandwidth()} height={y.bandwidth()} rx={3}
              style={fill(c)}
              onPointerEnter={() => pick(c)}
              onPointerDown={() => pick(c)}
            />
          ))}
          {last && (
            // Drawn last so the lifted cell sits above its neighbours; it takes no pointer events, so the cell underneath keeps the hover.
            <rect ref={lift} className={`heat-cell heat-lift${last.load ? '' : ' none'}`} x={x(last.row)} y={y(last.col)} width={x.bandwidth()} height={y.bandwidth()} rx={3} style={{ ...fill(last), opacity: 0 }} pointerEvents="none" />
          )}
        </Group>
      </svg>
      {sel && (
        <div
          className="heat-pop"
          role="status"
          style={{ ...(above ? { bottom: height - TOP - (y(sel.col) ?? 0) + 4 } : { top: TOP + (y(sel.col) ?? 0) + STEP }), ...(right ? { right: 0 } : { left: 0 }) }}
        >
          <strong>{fmtDate(sel.date)}</strong>
          <span className="muted">{sel.load ? ` · load ${num(sel.load)}` : ' · no load'}</span>
          {acts.map((a) => (
            <div key={a.id}>{a.name} <span className="muted">{[a.minutes != null && `${num(a.minutes)} min`, a.te != null && `TE ${num(a.te, 1)}`].filter(Boolean).join(' · ')}</span></div>
          ))}
        </div>
      )}
    </div>
  );
}

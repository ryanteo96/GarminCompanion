import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { Group } from '@visx/group';
import { scaleBand } from '@visx/scale';
import type { Activity } from '../../lib/types.js';
import { fmtDate, num } from '../logic/format.js';
import type { HeatCell } from '../logic/stats.js';

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const TOP = 16;
const STEP = 32; // cell plus gap
const CELL = 28;
const MAGNIFY = 0.3; // extra scale of the cell under the pointer
const REACH = 1.1; // how far, in cells, the magnification spreads
const LIFT = 3; // how far the swelled cells rise, in px
const RING = CELL * (1 + MAGNIFY) + 4;

type Quick = { sx: ReturnType<typeof gsap.quickTo>; sy: ReturnType<typeof gsap.quickTo>; y: ReturnType<typeof gsap.quickTo> };

// Daily training load, one row per week (oldest first) and one column per weekday; brighter (darker in light mode) means more load, grey means none.
// Under a pointer the grid swells like the Dock around it, a ring glides to the nearest day and a frosted card lists that day's activities.
export function MonthHeat({ cells, activities }: { cells: HeatCell[]; activities: Activity[] }) {
  const [sel, setSel] = useState<HeatCell | null>(null);
  const [last, setLast] = useState<HeatCell | null>(null); // keeps the card's content while it fades out
  const root = useRef<HTMLDivElement>(null);
  const els = useRef(new Map<string, SVGRectElement>());
  const quick = useRef(new Map<string, Quick>());
  const ring = useRef<SVGRectElement>(null);
  const ringLift = useRef<SVGGElement>(null);
  const liftTo = useRef<ReturnType<typeof gsap.quickTo> | null>(null);
  const pop = useRef<HTMLDivElement>(null);
  const ringOn = useRef(false);
  const byDate = useMemo(() => {
    const m = new Map<string, Activity[]>();
    for (const a of activities) m.set(a.date, [...(m.get(a.date) ?? []), a]);
    return m;
  }, [activities]);

  const weeks = cells.length ? Math.max(...cells.map((c) => c.col)) + 1 : 0;
  const width = 7 * STEP;
  const height = TOP + weeks * STEP;
  const pad = (STEP - CELL) / STEP;
  const x = scaleBand<number>({ domain: [0, 1, 2, 3, 4, 5, 6], range: [0, width], padding: pad });
  const y = scaleBand<number>({ domain: Array.from({ length: weeks }, (_, i) => i), range: [0, weeks * STEP], padding: pad });
  const centre = (c: HeatCell): [number, number] => [(x(c.row) ?? 0) + x.bandwidth() / 2, (y(c.col) ?? 0) + y.bandwidth() / 2];
  const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const k = calm ? 0 : 1;

  // One smoothed setter per cell, so following the pointer is fluid instead of stepping.
  useEffect(() => {
    quick.current.clear();
    for (const c of cells) {
      const el = els.current.get(c.date);
      if (!el) continue;
      gsap.set(el, { transformOrigin: '50% 50%' });
      const o = { duration: 0.5 * k, ease: 'power3.out' };
      // quickTo cannot drive the 'scale' shorthand, so each axis gets its own setter.
      quick.current.set(c.date, { sx: gsap.quickTo(el, 'scaleX', o), sy: gsap.quickTo(el, 'scaleY', o), y: gsap.quickTo(el, 'y', o) });
    }
    // The ring's group rises with the chosen day on the same curve, so the ring stays centred however far that day has swelled.
    liftTo.current = ringLift.current && gsap.quickTo(ringLift.current, 'y', { duration: 0.5 * k, ease: 'power3.out' });
  }, [cells, k]);

  const swell = (p: [number, number] | null, chosen?: HeatCell) => {
    if (!chosen) void liftTo.current?.(0);
    for (const c of cells) {
      const q = quick.current.get(c.date);
      if (!q) continue;
      const [cx, cy] = centre(c);
      const w = p && !calm ? Math.exp(-((p[0] - cx) ** 2 + (p[1] - cy) ** 2) / STEP ** 2 / (2 * REACH ** 2)) : 0;
      void q.sx(1 + MAGNIFY * w);
      void q.sy(1 + MAGNIFY * w);
      void q.y(-LIFT * w);
      if (c === chosen) void liftTo.current?.(-LIFT * w);
    }
  };

  const clear = () => {
    swell(null);
    setSel(null);
  };

  const aim = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const p: [number, number] = [e.clientX - r.left, e.clientY - r.top - TOP];
    if (p[1] < 0) return clear(); // over the weekday letters
    let best = cells[0];
    let bd = Infinity;
    for (const c of cells) {
      const [cx, cy] = centre(c);
      const d = (p[0] - cx) ** 2 + (p[1] - cy) ** 2;
      if (d < bd) { bd = d; best = c; }
    }
    swell(p, best);
    if (best.date !== sel?.date) {
      setSel(best);
      setLast(best);
    }
  };

  // A finger lifts off without a pointerleave worth honouring, so touch dismisses by tapping elsewhere.
  useEffect(() => {
    if (!sel) return;
    const away = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) clear(); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  });

  // The ring glides between days and breathes slowly while the pointer stays; the card follows it.
  useEffect(() => {
    const r = ring.current;
    const p = pop.current;
    if (!r || !p) return;
    gsap.killTweensOf(p); // a slower move to the previous day must not outlive this one
    if (!sel) {
      ringOn.current = false;
      gsap.killTweensOf(r);
      gsap.to(r, { opacity: 0, scale: 0.9, duration: 0.25 * k, ease: 'power2.in' });
      gsap.to(p, { opacity: 0, scale: 0.96, duration: 0.2 * k, ease: 'power2.in' });
      return;
    }
    const resumed = !ringOn.current;
    ringOn.current = true;
    // Coming back while the ring is still fading out glides from where it is instead of snapping to nothing first.
    const first = resumed && Number(gsap.getProperty(r, 'opacity')) < 0.05;
    const [cx, cy] = centre(sel);
    const to = { x: cx - RING / 2, y: cy - RING / 2 }; // the lift lives on the ring's group
    if (resumed) gsap.killTweensOf(r);
    if (first) {
      // smoothOrigin would keep a stale offset from the mount-time fade, which scaled about the corner.
      gsap.set(r, { ...to, transformOrigin: '50% 50%', smoothOrigin: false, scale: 0.8, opacity: 0 });
      gsap.to(r, { opacity: 1, scale: 1, duration: 0.5 * k, ease: 'back.out(2.2)' });
    } else {
      gsap.to(r, { ...to, ...(resumed && { opacity: 1, scale: 1 }), duration: 0.45 * k, ease: 'power3.out', overwrite: 'auto' });
    }
    if (resumed && !calm) gsap.to(r, { scale: 1.05, duration: 1.6, delay: 0.5, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    const w = p.offsetWidth;
    const h = p.offsetHeight;
    const above = sel.col >= weeks - 2;
    const px = Math.max(0, cx - w / 2);
    const py = above ? TOP + cy - LIFT - CELL * 0.65 - h - 10 : TOP + cy + CELL * 0.65 + 10;
    const origin = above ? '50% 100%' : '50% 0%';
    if (first) {
      gsap.set(p, { x: px, y: py + (above ? -8 : 8), scale: 0.94, opacity: 0, transformOrigin: origin });
      gsap.to(p, { y: py, scale: 1, opacity: 1, duration: 0.55 * k, ease: 'expo.out' });
    } else {
      gsap.to(p, { x: px, y: py, opacity: 1, scale: 1, transformOrigin: origin, duration: 0.45 * k, ease: 'power3.out', overwrite: 'auto' });
    }
  }, [sel]); // eslint-disable-line react-hooks/exhaustive-deps -- centre and weeks derive from cells, which only change with the data

  // The breathing tween repeats forever, so it must not outlive the card (navigating away while a day is selected).
  useEffect(() => {
    const r = ring.current;
    const p = pop.current;
    return () => { gsap.killTweensOf([r, p]); };
  }, []);

  if (!cells.length) return <p className="muted">No days to show yet.</p>;

  const max = Math.max(1, ...cells.map((c) => c.load));
  const total = cells.reduce((t, c) => t + c.load, 0);
  const active = cells.filter((c) => c.load > 0).length;
  const acts = last ? (byDate.get(last.date) ?? []) : [];
  // Opaque, mixed against the card, so the redrawn chosen day and overlapping swelled cells do not darken where they stack.
  const fill = (c: HeatCell) => (c.load ? { fill: `color-mix(in srgb, var(--ink-load) ${25 + 75 * (c.load / max)}%, var(--panel))` } : undefined);

  return (
    <div ref={root} className="heat" style={{ width }}>
      <svg
        width={width}
        height={height}
        style={{ touchAction: 'pan-y', display: 'block', overflow: 'visible' }} // swelled edge cells and the ring reach past the box
        role="img"
        aria-label={`Training load by day, ${cells.length} days: ${active} with load, ${num(total)} in total`}
        onPointerMove={aim}
        onPointerDown={aim}
        onPointerLeave={(e) => { if (e.pointerType !== 'touch') clear(); }}
        onPointerCancel={clear} // the browser took the touch for a scroll, so it was not a tap on a day
      >
        {DOW.map((d, i) => <text key={i} className="heat-dow" x={(x(i) ?? 0) + x.bandwidth() / 2} y={TOP / 2} textAnchor="middle" dominantBaseline="central" aria-hidden="true">{d}</text>)}
        <Group top={TOP}>
          {cells.map((c) => (
            <rect
              key={c.date}
              id={`heat-${c.date}`}
              ref={(el) => { if (el) els.current.set(c.date, el); else els.current.delete(c.date); }}
              className={`heat-cell${c.load ? '' : ' none'}`}
              x={x(c.row)} y={y(c.col)} width={x.bandwidth()} height={y.bandwidth()} rx={8}
              style={fill(c)}
            />
          ))}
          {/* SVG has no z-index: redraw the chosen day on top so its swelled neighbours drawn later do not cover it. */}
          {last && <use href={`#heat-${last.date}`} pointerEvents="none" />}
          <g ref={ringLift}><rect ref={ring} className="heat-ring" width={RING} height={RING} rx={RING * 0.32} pointerEvents="none" /></g>
        </Group>
      </svg>
      <div className="heat-legend" aria-hidden="true">
        <span>Less</span>
        <i className="heat-cell none" />
        {[0.25, 0.5, 0.75, 1].map((o) => <i key={o} style={{ opacity: o }} />)}
        <span>More</span>
      </div>
      <div ref={pop} className="heat-pop" role="status" aria-live="polite">
        {last && (
          <>
            <div className="heat-pop-head">
              <strong>{fmtDate(last.date)}</strong>
              <span>{last.load ? `Load ${num(last.load)}` : 'No load'}</span>
            </div>
            {acts.length === 0 && <div className="heat-pop-meta">No activity</div>}
            {acts.map((a) => (
              <div key={a.id} className="heat-pop-act">
                <div>{a.name}</div>
                <div className="heat-pop-meta">{[a.minutes != null && `${num(a.minutes)} min`, a.te != null && `Training effect ${num(a.te, 1)}`].filter(Boolean).join(' · ')}</div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

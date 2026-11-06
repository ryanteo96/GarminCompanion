import { useState } from 'react';

export interface Tip {
  x: number; // px inside the plot area
  dots: { y: number; cls: string }[];
  lines: string[];
}

// A transparent layer over the plot area: the nearest point to the pointer gets a guide line, dots and a readout.
export function Hover({ tips, w, h }: { tips: Tip[]; w: number; h: number }) {
  const [i, setI] = useState<number | null>(null);
  const t = i == null ? null : tips[i];
  const move = (e: React.PointerEvent<SVGRectElement>) => {
    const px = e.clientX - e.currentTarget.getBoundingClientRect().left;
    let best = 0;
    tips.forEach((p, j) => { if (Math.abs(p.x - px) < Math.abs(tips[best].x - px)) best = j; });
    setI(tips.length ? best : null);
  };
  return (
    <>
      <rect className="hover" width={w} height={h} fill="transparent" style={{ touchAction: 'pan-y' }} onPointerDown={move} onPointerMove={move} onPointerLeave={() => setI(null)} />
      {t && (
        <g pointerEvents="none">
          <line className="guide" x1={t.x} x2={t.x} y1={0} y2={h} />
          {t.dots.map((d, k) => <circle key={k} className={`hd ${d.cls}`} cx={t.x} cy={d.y} r={4} />)}
          <text className="tip" x={t.x + (t.x > w / 2 ? -8 : 8)} textAnchor={t.x > w / 2 ? 'end' : 'start'}>
            {t.lines.map((l, k) => <tspan key={k} x={t.x + (t.x > w / 2 ? -8 : 8)} dy={k ? 14 : 12}>{l}</tspan>)}
          </text>
        </g>
      )}
    </>
  );
}

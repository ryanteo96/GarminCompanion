import { Chart } from 'chart.js';
import { useEffect, useRef, type ReactNode } from 'react';
import { chartConfig, type Dataset, type DrawOpts } from '../chart.js';
import { useLayout } from '../layout.js';

interface ChartCardProps {
  caption: ReactNode;
  captionId?: string;
  canvasId: string;
  type: 'line' | 'bar';
  labels: string[];
  datasets: Dataset[];
  opts?: DrawOpts;
  /** Spans every column of the chart grid. */
  wide?: boolean;
  /** Shown between the caption and the chart. */
  children?: ReactNode;
}

const NO_OPTS: DrawOpts = {};

// `labels`, `datasets` and `opts` should be memoised by the caller: a new identity rebuilds the chart.
export function ChartCard({ caption, captionId, canvasId, type, labels, datasets, opts = NO_OPTS, wide, children }: ChartCardProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const { key, token } = useLayout();
  const empty = datasets.every((d) => d.data.every((v) => v == null));

  useEffect(() => {
    const el = canvas.current;
    const parent = host.current;
    if (!el || !parent || empty) return;
    const chart = new Chart(el, chartConfig(type, labels, datasets, opts, { mfg: token('--mfg'), rule: token('--rule'), width: parent.clientWidth, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches }));
    return () => chart.destroy();
  }, [type, labels, datasets, opts, empty, key, token]);

  return (
    <figure className={wide ? 'card span-all' : 'card'}>
      <figcaption id={captionId}>{caption}</figcaption>
      {children}
      <div className="cv" ref={host}>
        <canvas ref={canvas} id={canvasId} role="img" aria-label={empty ? 'No data for this period.' : (opts.summary ?? '')} hidden={empty} />
        {empty && <p className="empty muted">No data for this period.</p>}
      </div>
    </figure>
  );
}

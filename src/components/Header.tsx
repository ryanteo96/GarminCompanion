import { useEffect, useState } from 'react';
import { fmtDate } from '../logic/format.js';
import { ago } from '../logic/time.js';
import { useStore } from '../store.js';
import { TAB_NAMES, type Tab } from '../tabs.js';

const RANGES: [number, string][] = [[30, '30 days'], [90, '90 days'], [180, '180 days'], [365, '1 year']];

export function Header({ tab }: { tab: Tab }) {
  const { demo, fresh, loading, range, srStatus, load, logout, setRange } = useStore();
  const [, tick] = useState(0);

  // "12 min ago" goes stale on its own, so re-render once a minute.
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  // Keep the line short: the hero says which day it is based on and the cards say "From Nov 3", so the exact data date lives in the tooltip.
  const updated = loading
    ? 'Refreshing…'
    : fresh
      ? [`${fresh.label} ${ago(fresh.ts)}`, fresh.behind && 'nothing for today yet'].filter(Boolean).join(' · ')
      : '';
  const tooltip = fresh ? `${new Date(fresh.ts).toLocaleString()}${fresh.through ? `. Latest data: ${fmtDate(fresh.through)}.` : ''}` : undefined;

  return (
    <header className="top">
      <h1 id="area">{TAB_NAMES[tab]}</h1>
      <div className="meta">
        <span id="demo" className="badge" hidden={!demo}>Demo data</span>
        <span id="updated" className="muted small" title={tooltip}>{updated}</span>
        <button id="refresh" className="link" type="button" disabled={loading} onClick={() => void load()}>Refresh</button>
        <button id="logout" className="link" type="button" onClick={() => void logout()}>Sign out</button>
        <span id="sr-status" className="sr-only" role="status">{srStatus}</span>
      </div>
      {/* Nothing on Home follows the chart range, so neither the control nor its note is there. */}
      {tab !== 'home' && (
        <>
        <label className="range">
          <span className="lbl">Chart range</span>
          <select id="range" aria-describedby="range-note" value={range} onChange={(e) => void setRange(Number(e.target.value))}>
            {RANGES.map(([days, label]) => (
              <option key={days} value={days}>{label}</option>
            ))}
          </select>
        </label>
        <span id="range-note" className="sr-only">The chart range changes the charts and trends. The Today summary and the cards always use fixed windows, the last 7 and 28 days.</span>
        </>
      )}
    </header>
  );
}

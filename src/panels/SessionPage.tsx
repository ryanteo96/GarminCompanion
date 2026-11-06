import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { fmtDate, localToday, num } from '../logic/format.js';
import { sportOf, SPORTS, type SportSlug } from '../logic/sports.js';
import type { Detail } from '../../lib/fit.js';
import { RunBody } from '../components/RunBody.js';
import { useStore } from '../store.js';
import { Num } from '../components/Num.js';

const BACKFILL_DAYS = 90; // ADR 0005: older Sessions are not stored
const cutoff = (): string => {
  const d = new Date(`${localToday()}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - BACKFILL_DAYS);
  return d.toISOString().slice(0, 10);
};

// null: not asked yet, or the ask failed. The page never waits on it: the header shows regardless.
function useDetail(id: number, skip: boolean): { stored: boolean | null; detail: Detail | null } {
  const [got, setGot] = useState<{ stored: boolean | null; detail: Detail | null }>({ stored: null, detail: null });
  useEffect(() => {
    if (skip) return;
    const ctl = new AbortController();
    fetch(`/api/session?id=${id}`, { signal: ctl.signal, cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<{ stored: boolean; detail: Detail | null }>) : null))
      .then((j) => j && setGot(j))
      .catch(() => undefined);
    return () => ctl.abort();
  }, [id, skip]);
  return got;
}

export function SessionPage({ sport, id }: { sport: SportSlug; id: number }) {
  const a = useStore((s) => s.activities).find((x) => x.id === id);
  const old = !!a && a.date < cutoff();
  const { stored, detail } = useDetail(id, !a || old);
  // Not in the loaded range, or filed under another Sport: land on the Sport page, or the right Session URL.
  if (!a) return <Navigate to={`/activity/${sport}`} replace />;
  const own = sportOf(a.type);
  if (!own) return <Navigate to="/activity" replace />;
  if (own !== sport) return <Navigate to={`/activity/${own}/${id}`} replace />;

  const facts: [string, string][] = [
    ['Date', fmtDate(a.date)],
    ['Duration', a.minutes != null ? `${num(a.minutes)} min` : '—'],
    ['Load', num(a.load)],
    ['Average heart rate', a.avgHr != null ? `${num(a.avgHr)} bpm` : '—'],
  ];
  return (
    <article className="card session-page" aria-labelledby="session-h">
      <p className="small"><Link to={`/activity/${sport}`}>← {SPORTS.find((s) => s.slug === sport)?.name}</Link></p>
      <h2 id="session-h">{a.name || a.type.replaceAll('_', ' ')}</h2>
      <dl className="session-facts">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt className="cap">{k}</dt>
            <dd><Num>{String(v)}</Num></dd>
          </div>
        ))}
      </dl>
      {sport === 'running' && detail && <RunBody detail={detail} feel={a.feel} rpe={a.rpe} />}
      {old ? (
        <p className="muted small" role="status">Detail isn't stored for Sessions older than {BACKFILL_DAYS} days.</p>
      ) : (
        stored === false && <p className="muted small" role="status">Detail still syncing. Check back after the next refresh.</p>
      )}
    </article>
  );
}

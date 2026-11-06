import { storesDetail } from '../src/logic/sports.js';
import { opener } from './db.js';
import { parseFit, PARSER_VERSION, type Detail } from './fit.js';
import { downloadActivity } from './garmin.js';
import type { Activity } from './types.js';

export { PARSER_VERSION };

// ADR 0005: parsed detail of each Running and Strength Session, synced on user load. The Neon-backed SessionStore (sessions.ts).
const CAP = 10; // downloads per load
const MAX_ATTEMPTS = 3;
const BUDGET_MS = 25_000; // stop starting new downloads before a serverless function would be cut off

const open = opener(
  (sql) => sql`create table if not exists activities (
    id bigint primary key, date date not null, type text not null, name text not null,
    minutes int, km real, avg_hr int, load real,
    parser_version int, attempts int not null default 0, detail jsonb, synced_at timestamptz not null default now())`,
);

export interface StoredRow { id: number; parser_version: number | null; attempts: number; has_detail: boolean }

// Newest first. Skips what is stored by the current parser and what already failed MAX_ATTEMPTS times.
export function pending(live: Activity[], rows: StoredRow[], today: string): Activity[] {
  const by = new Map(rows.map((r) => [Number(r.id), r]));
  return live
    .filter((a) => {
      const r = by.get(a.id);
      return storesDetail(a, today) && !(r?.has_detail && r.parser_version === PARSER_VERSION) && (r?.attempts ?? 0) < MAX_ATTEMPTS;
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

// This Session's detail if stored by the current parser. Reads the table only; a FIT file is never downloaded here.
export async function storedDetail(id: number): Promise<Detail | null> {
  const rows = (await (await open())`select detail from activities where id = ${id} and detail is not null and parser_version = ${PARSER_VERSION}`) as { detail: Detail }[];
  return rows[0]?.detail ?? null;
}

export interface Z2 { speed: number; hr: number }

// Zone 2 pace and heart rate of each of these Sessions that has them stored by the current parser. Reads the table only.
export async function storedZ2(ids: number[]): Promise<Record<number, Z2>> {
  const rows = (await (await open())`select id, detail->'metrics'->>'z2Speed' as speed, detail->'metrics'->>'z2Hr' as hr from activities where id = any(${ids}::bigint[]) and detail is not null and parser_version = ${PARSER_VERSION}`) as { id: number | string; speed: string | null; hr: string | null }[];
  return Object.fromEntries(rows.flatMap((r) => (r.speed && r.hr ? [[Number(r.id), { speed: Number(r.speed), hr: Number(r.hr) }]] : [])));
}

// How many Sessions the next sync will download, for the "syncing N" notice. 0 when the database is unreachable.
export async function pendingCount(live: Activity[], today: string): Promise<number> {
  try {
    const sql = await open();
    const rows = (await sql`select id, parser_version, attempts, detail is not null as has_detail from activities where id = any(${live.map((a) => a.id)}::bigint[])`) as StoredRow[];
    return Math.min(CAP, pending(live, rows, today).length);
  } catch {
    return 0;
  }
}

// ADR 0005: the manual wipe. The next load re-syncs the last 90 days.
export async function deleteStored(): Promise<void> {
  await (await open())`delete from activities`;
}

const fetchDetail = async (id: number): Promise<Detail> => parseFit(await downloadActivity(id));

// Returns how many Sessions were stored. Never throws: it runs after the response, where nobody can see an error.
export async function syncActivities(live: Activity[], today: string, detailOf: (id: number) => Promise<Detail> = fetchDetail, deadline = Date.now() + BUDGET_MS): Promise<number> {
  try {
    const sql = await open();
    const rows = (await sql`select id, parser_version, attempts, detail is not null as has_detail from activities where id = any(${live.map((a) => a.id)}::bigint[])`) as StoredRow[];
    let done = 0;
    for (const a of pending(live, rows, today).slice(0, CAP)) {
      if (Date.now() > deadline) break;
      try {
        const detail = JSON.stringify(await detailOf(a.id));
        await sql`insert into activities (id, date, type, name, minutes, km, avg_hr, load, parser_version, attempts, detail)
          values (${a.id}, ${a.date}, ${a.type}, ${a.name}, ${a.minutes}, ${a.km}, ${a.avgHr}, ${a.load}, ${PARSER_VERSION}, 0, ${detail}::jsonb)
          on conflict (id) do update set date = excluded.date, type = excluded.type, name = excluded.name, minutes = excluded.minutes, km = excluded.km, avg_hr = excluded.avg_hr, load = excluded.load,
          parser_version = excluded.parser_version, attempts = 0, detail = excluded.detail, synced_at = now()`;
        done++;
      } catch (e) {
        console.error(`activity ${a.id} not stored:`, e instanceof Error ? e.message : String(e)); // the id and the reason only, never health data
        await sql`insert into activities (id, date, type, name, attempts) values (${a.id}, ${a.date}, ${a.type}, ${a.name}, 1)
          on conflict (id) do update set attempts = activities.attempts + 1`;
      }
    }
    return done;
  } catch (e) {
    console.error('activity sync failed:', e instanceof Error ? e.message : String(e));
    return 0;
  }
}

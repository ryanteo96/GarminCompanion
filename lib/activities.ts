import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { sportOf } from '../src/logic/sports.js';
import { parseFit, PARSER_VERSION, type Detail } from './fit.js';
import { addDays, downloadActivity } from './garmin.js';
import type { Activity } from './types.js';

export { PARSER_VERSION };

// ADR 0005: parsed detail of each Running and Strength Session, synced on user load.
const CAP = 10; // downloads per load
const BACKFILL_DAYS = 90;
const MAX_ATTEMPTS = 3;
const BUDGET_MS = 25_000; // stop starting new downloads before a serverless function would be cut off

type Sql = NeonQueryFunction<false, false>;
let ready: Promise<Sql> | undefined;

// Same create-on-first-use as settings.ts; a failed attempt is not cached.
const open = (): Promise<Sql> =>
  (ready ??= (async () => {
    const sql = neon(process.env.DATABASE_URL ?? '');
    await sql`create table if not exists activities (
      id bigint primary key, date date not null, type text not null, name text not null,
      minutes int, km real, avg_hr int, load real,
      parser_version int, attempts int not null default 0, detail jsonb, synced_at timestamptz not null default now())`;
    return sql;
  })().catch((e: unknown) => {
    ready = undefined;
    throw e;
  }));

export interface StoredRow { id: number; parser_version: number | null; attempts: number; has_detail: boolean }

// Newest first. Skips what is stored by the current parser and what already failed MAX_ATTEMPTS times.
export function pending(live: Activity[], rows: StoredRow[], today: string): Activity[] {
  const by = new Map(rows.map((r) => [Number(r.id), r]));
  const since = addDays(today, -BACKFILL_DAYS);
  return live
    .filter((a) => {
      const r = by.get(a.id);
      return sportOf(a.type) && a.date >= since && !(r?.has_detail && r.parser_version === PARSER_VERSION) && (r?.attempts ?? 0) < MAX_ATTEMPTS;
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

// Whether this Session's detail is stored by the current parser. Reads the table only; a FIT file is never downloaded here.
export async function isStored(id: number): Promise<boolean> {
  const rows = (await (await open())`select 1 from activities where id = ${id} and detail is not null and parser_version = ${PARSER_VERSION}`) as unknown[];
  return rows.length > 0;
}

const fetchDetail = async (id: number): Promise<Detail> => parseFit(await downloadActivity(id));

// Returns how many Sessions were stored. Never throws: it runs after the response, where nobody can see an error.
export async function syncActivities(live: Activity[], today: string, detailOf: (id: number) => Promise<Detail> = fetchDetail, deadline = Date.now() + BUDGET_MS): Promise<number> {
  if (!process.env.DATABASE_URL) return 0;
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

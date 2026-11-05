import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

// A tiny key/value store in Neon Postgres for settings that should follow the owner between devices.
export const settingsConfigured = (): boolean => Boolean(process.env.DATABASE_URL);

type Sql = NeonQueryFunction<false, false>;
let ready: Promise<Sql> | undefined;

// shortcut: the table is created on first use, no migration tool; adopt one when a second table arrives.
// A failed attempt is not cached, so the next call retries (Neon may simply be waking up).
const open = (): Promise<Sql> =>
  (ready ??= (async () => {
    const sql = neon(process.env.DATABASE_URL ?? '');
    await sql`create table if not exists settings (key text primary key, value jsonb not null)`;
    return sql;
  })().catch((e: unknown) => {
    ready = undefined;
    throw e;
  }));

export async function getSetting(key: string): Promise<unknown> {
  const sql = await open();
  const rows = (await sql`select value from settings where key = ${key}`) as { value: unknown }[];
  return rows[0]?.value ?? null;
}

export async function putSetting(key: string, value: unknown): Promise<void> {
  const sql = await open();
  await sql`insert into settings (key, value) values (${key}, ${JSON.stringify(value)}::jsonb) on conflict (key) do update set value = excluded.value`;
}

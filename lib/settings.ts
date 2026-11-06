import { opener } from './db.js';

// A tiny key/value store in Neon Postgres for settings that should follow the owner between devices.
export const settingsConfigured = (): boolean => Boolean(process.env.DATABASE_URL);

const open = opener((sql) => sql`create table if not exists settings (key text primary key, value jsonb not null)`);

export async function getSetting(key: string): Promise<unknown> {
  const sql = await open();
  const rows = (await sql`select value from settings where key = ${key}`) as { value: unknown }[];
  return rows[0]?.value ?? null;
}

export async function putSetting(key: string, value: unknown): Promise<void> {
  const sql = await open();
  await sql`insert into settings (key, value) values (${key}, ${JSON.stringify(value)}::jsonb) on conflict (key) do update set value = excluded.value`;
}

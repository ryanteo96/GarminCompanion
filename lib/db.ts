import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

export type Sql = NeonQueryFunction<false, false>;

// shortcut: each table is created on first use, no migration tool; adopt one when a table's shape has to change.
// A failed attempt is not cached, so the next call retries (Neon may simply be waking up).
export function opener(create: (sql: Sql) => Promise<unknown>): () => Promise<Sql> {
  let ready: Promise<Sql> | undefined;
  return () =>
    (ready ??= (async () => {
      const sql = neon(process.env.DATABASE_URL ?? '');
      await create(sql);
      return sql;
    })().catch((e: unknown) => {
      ready = undefined;
      throw e;
    }));
}

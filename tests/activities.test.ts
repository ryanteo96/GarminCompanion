import assert from 'node:assert/strict';
import { afterEach, beforeEach, test, vi } from 'vitest';
import type { Activity } from '../lib/types.js';
import type { Detail } from '../lib/fit.js';

const fake = vi.hoisted(() => ({ calls: [] as { text: string; values: unknown[] }[], rows: [] as unknown[] }));
vi.mock('@neondatabase/serverless', () => ({
  neon: () => (strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join('?').replace(/\s+/g, ' ').trim();
    fake.calls.push({ text, values });
    return Promise.resolve(text.startsWith('select') ? fake.rows : []);
  },
}));

beforeEach(() => {
  vi.resetModules();
  fake.calls = [];
  fake.rows = [];
  process.env.DATABASE_URL = 'postgres://fake';
});
afterEach(() => {
  delete process.env.DATABASE_URL;
});

const act = (id: number, date: string, type = 'running'): Activity => ({ id, date, name: `a${id}`, type, minutes: 30, km: 5, avgHr: 140, load: 100, te: 3, zones: [0, 0, 0, 0, 0] });
const detail = { metrics: { methodVersion: 1 } } as Detail;
const TODAY = '2026-11-06';

test('pending: Running and Strength within 90 days, newest first, skipping stored, exhausted and other types', async () => {
  const { pending, PARSER_VERSION } = await import('../lib/activities.js');
  const live = [act(1, '2026-11-05'), act(2, '2026-11-04'), act(3, '2026-11-03'), act(4, '2026-11-02', 'yoga'), act(5, '2026-05-01'), act(6, '2026-11-01', 'strength_training'), act(7, '2026-10-30')];
  const rows = [
    { id: 1, parser_version: PARSER_VERSION, attempts: 0, has_detail: true }, // stored
    { id: 3, parser_version: null, attempts: 3, has_detail: false }, // retried enough
    { id: 7, parser_version: PARSER_VERSION - 1, attempts: 0, has_detail: true }, // old parser: parse again
  ];
  assert.deepEqual(pending(live, rows, TODAY).map((a) => a.id), [2, 6, 7]);
});

test('sync stores detail for pending activities, at most 10 per load', async () => {
  const { syncActivities } = await import('../lib/activities.js');
  const live = Array.from({ length: 14 }, (_, i) => act(100 + i, '2026-11-05'));
  const asked: number[] = [];
  const done = await syncActivities(live, TODAY, (id) => (asked.push(id), Promise.resolve(detail)));
  assert.equal(done, 10);
  assert.equal(asked.length, 10);
  const writes = fake.calls.filter((c) => c.text.startsWith('insert into activities'));
  assert.equal(writes.length, 10);
  assert.ok(writes[0].text.includes('on conflict (id)'));
  assert.ok(writes[0].values.includes(JSON.stringify(detail)));
});

test('a failed parse is recorded as an attempt and does not stop the rest', async () => {
  const { syncActivities } = await import('../lib/activities.js');
  const done = await syncActivities([act(1, '2026-11-05'), act(2, '2026-11-04')], TODAY, (id) => (id === 1 ? Promise.reject(new Error('bad file')) : Promise.resolve(detail)));
  assert.equal(done, 1);
  const writes = fake.calls.filter((c) => c.text.startsWith('insert into activities'));
  assert.equal(writes.length, 2);
  assert.ok(writes[0].text.includes('attempts = activities.attempts + 1'), 'the failure bumps attempts');
});

test('sync does nothing without a database', async () => {
  process.env.DATABASE_URL = '';
  const { syncActivities } = await import('../lib/activities.js');
  assert.equal(await syncActivities([act(1, '2026-11-05')], TODAY, () => Promise.resolve(detail)), 0);
  assert.equal(fake.calls.length, 0);
});

test('sync stops starting new downloads after its deadline', async () => {
  const { syncActivities } = await import('../lib/activities.js');
  const done = await syncActivities([act(1, '2026-11-05'), act(2, '2026-11-04')], TODAY, () => Promise.resolve(detail), Date.now() - 1);
  assert.equal(done, 0);
});

test('pendingCount is what the next sync will download, capped; 0 without a database', async () => {
  const { pendingCount } = await import('../lib/activities.js');
  const live = Array.from({ length: 12 }, (_, i) => act(i + 1, '2026-11-05'));
  assert.equal(await pendingCount(live, TODAY), 10);
  process.env.DATABASE_URL = '';
  assert.equal(await pendingCount(live, TODAY), 0);
});

test('deleteStored wipes the table', async () => {
  const { deleteStored } = await import('../lib/activities.js');
  await deleteStored();
  assert.ok(fake.calls.some((c) => c.text === 'delete from activities'));
});

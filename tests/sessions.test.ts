import assert from 'node:assert/strict';
import { afterEach, beforeEach, test, vi } from 'vitest';
import type { Activity } from '../lib/types.js';

// Any statement reaching the database is recorded, so the demo and off stores can prove they never touch it.
const fake = vi.hoisted(() => ({ calls: 0 }));
vi.mock('@neondatabase/serverless', () => ({
  neon: () => () => (fake.calls++, Promise.resolve([])),
}));

const saved = { ...process.env };
beforeEach(() => {
  fake.calls = 0;
  delete process.env.GARMIN_API_KEY;
  delete process.env.DATABASE_URL;
});
afterEach(() => {
  process.env = { ...saved };
});

const run: Activity = { id: 1, date: '2026-11-05', name: 'r', type: 'running', minutes: 30, km: 5, avgHr: 140, load: 100, te: 3, zones: [0, 0, 0, 0, 0], feel: null, rpe: null };

test('demo: detail and Zone 2 come from the sample parser, and nothing is synced or stored', async () => {
  process.env.DATABASE_URL = 'postgres://fake'; // a database alongside demo data is still left alone
  const { sessionStore } = await import('../lib/sessions.js');
  const s = sessionStore();
  assert.equal((await s.detail(12))?.laps.length, 5);
  assert.deepEqual(Object.keys(await s.z2([12, 13])), ['12', '13']);
  assert.equal(await s.pendingCount([run], '2026-11-06'), 0);
  assert.equal(await s.sync([run], '2026-11-06'), 0);
  await s.wipe();
  assert.equal(fake.calls, 0);
});

test('off: real Garmin data without a database stores nothing and reports nothing stored', async () => {
  process.env.GARMIN_API_KEY = 'k';
  const { sessionStore } = await import('../lib/sessions.js');
  const s = sessionStore();
  assert.equal(await s.detail(12), null);
  assert.deepEqual(await s.z2([12]), {});
  assert.equal(await s.pendingCount([run], '2026-11-06'), 0);
  assert.equal(await s.sync([run], '2026-11-06'), 0);
  await s.wipe();
  assert.equal(fake.calls, 0);
});

test('with a Garmin key and a database, the store reads the table', async () => {
  process.env.GARMIN_API_KEY = 'k';
  process.env.DATABASE_URL = 'postgres://fake';
  const { sessionStore } = await import('../lib/sessions.js');
  assert.equal(await sessionStore().detail(12), null);
  assert.ok(fake.calls > 0);
});

import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { beforeEach, test, vi } from 'vitest';
import layout from '../api/layout.js';
import { mintCookie } from '../lib/auth.js';
import { call } from './stubs.js';

process.env.SESSION_SECRET = 'test-secret-0123456789';

// A stand-in for lib/settings.ts: an in-memory map that can be unconfigured or made to fail.
const fake = vi.hoisted(() => ({ configured: true, fail: false, rows: new Map<string, unknown>() }));
vi.mock('../lib/settings.js', () => ({
  settingsConfigured: () => fake.configured,
  getSetting: (key: string) => (fake.fail ? Promise.reject(new Error('db down')) : Promise.resolve(fake.rows.get(key) ?? null)),
  putSetting: (key: string, value: unknown) => (fake.fail ? Promise.reject(new Error('db down')) : Promise.resolve(void fake.rows.set(key, value))),
}));

beforeEach(() => {
  fake.configured = true;
  fake.fail = false;
  fake.rows.clear();
});

const headers = () => ({ cookie: `gc=${mintCookie()}` });
const req = (method: string, body?: unknown) => ({ method, url: '/api/layout', headers: headers(), body });
const raw = (text: string) => Object.assign(Readable.from([text]), { method: 'PUT', url: '/api/layout', headers: headers() });
const json = (out: { body: string }): unknown => JSON.parse(out.body);
const KEY = 'home-layout';

test('layout: 401 without a session cookie', async () => {
  for (const method of ['GET', 'PUT']) {
    const out = await call(layout, { method, url: '/api/layout', headers: {}, body: { cards: ['hrv'], updatedAt: 1 } });
    assert.equal(out.status, 401);
  }
  assert.equal(fake.rows.size, 0);
});

test('layout: GET with nothing stored', async () => {
  const out = await call(layout, req('GET'));
  assert.equal(out.status, 200);
  assert.deepEqual(json(out), { synced: true, layout: null });
});

test('layout: PUT stores a newer layout and returns it', async () => {
  const out = await call(layout, req('PUT', { cards: ['hrv', 'sleep'], updatedAt: 10, x: 1 }));
  assert.equal(out.status, 200);
  assert.deepEqual(json(out), { synced: true, layout: { cards: ['hrv', 'sleep'], updatedAt: 10 } });
  assert.deepEqual(fake.rows.get(KEY), { cards: ['hrv', 'sleep'], updatedAt: 10 });
  const ids = Array.from({ length: 32 }, (_, i) => `c${i}`);
  assert.equal((await call(layout, req('PUT', { cards: ids, updatedAt: 11 }))).status, 200, '32 unique valid ids are accepted');
});

test('layout: PUT with an older or equal updatedAt returns the stored layout', async () => {
  const stored = { cards: ['hrv'], updatedAt: 10 };
  fake.rows.set(KEY, stored);
  for (const updatedAt of [5, 10]) {
    const out = await call(layout, req('PUT', { cards: ['sleep'], updatedAt }));
    assert.equal(out.status, 200);
    assert.deepEqual(json(out), { synced: true, layout: stored });
    assert.deepEqual(fake.rows.get(KEY), stored);
  }
});

test('layout: PUT rejects invalid bodies with 400', async () => {
  const far = Date.now() + 2 * 86_400_000;
  const bodies: unknown[] = [
    { cards: ['hrv', 'hrv'], updatedAt: 1 },
    { cards: Array.from({ length: 33 }, (_, i) => `c${i}`), updatedAt: 1 },
    { cards: ['Bad_ID'], updatedAt: 1 },
    { cards: ['1abc'], updatedAt: 1 },
    { cards: ['a'.repeat(33)], updatedAt: 1 },
    { cards: 'hrv', updatedAt: 1 },
    { cards: ['hrv'], updatedAt: '5' },
    { cards: ['hrv'], updatedAt: null },
    { cards: ['hrv'], updatedAt: far },
    null,
  ];
  for (const body of bodies) assert.equal((await call(layout, req('PUT', body))).status, 400, JSON.stringify(body));
  assert.equal((await call(layout, raw('{bad'))).status, 400, 'not JSON');
  assert.equal((await call(layout, raw(JSON.stringify({ cards: ['hrv'], updatedAt: 1, pad: 'x'.repeat(5000) })))).status, 400, 'over the size limit');
  assert.equal(fake.rows.size, 0, 'nothing is stored');
});

test('layout: other methods are 405', async () => {
  for (const method of ['POST', 'DELETE']) assert.equal((await call(layout, req(method))).status, 405);
});

test('layout: answers synced false when storage is not configured', async () => {
  fake.configured = false;
  assert.deepEqual(json(await call(layout, req('GET'))), { synced: false });
  assert.deepEqual(json(await call(layout, req('PUT', { cards: ['hrv'], updatedAt: 1 }))), { synced: false });
});

test('layout: a storage failure is 502', async () => {
  fake.fail = true;
  assert.equal((await call(layout, req('GET'))).status, 502);
});

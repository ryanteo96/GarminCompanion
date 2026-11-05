import assert from 'node:assert/strict';
import { afterEach, beforeEach, test, vi } from 'vitest';

// A stand-in for the Neon HTTP client: a tagged template that records each statement and answers from `fake`.
const fake = vi.hoisted(() => ({ calls: [] as { text: string; values: unknown[] }[], rows: [] as unknown[], failCreate: 0 }));
vi.mock('@neondatabase/serverless', () => ({
  neon: () => (strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join('?').replace(/\s+/g, ' ').trim();
    fake.calls.push({ text, values });
    if (text.startsWith('create table') && fake.failCreate-- > 0) return Promise.reject(new Error('neon is waking up'));
    return Promise.resolve(fake.rows);
  },
}));

beforeEach(() => {
  vi.resetModules(); // the table-created state is per process, so each test gets a fresh module
  fake.calls = [];
  fake.rows = [];
  fake.failCreate = 0;
  process.env.DATABASE_URL = 'postgres://fake';
});
afterEach(() => {
  delete process.env.DATABASE_URL;
});

test('settings: configured only when DATABASE_URL is set', async () => {
  const { settingsConfigured } = await import('../lib/settings.js');
  assert.equal(settingsConfigured(), true);
  process.env.DATABASE_URL = '';
  assert.equal(settingsConfigured(), false);
});

test('settings: creates the table once, then reads and writes', async () => {
  const { getSetting, putSetting } = await import('../lib/settings.js');
  assert.equal(await getSetting('k'), null, 'no row reads as null');
  fake.rows = [{ value: { cards: ['hrv'] } }];
  assert.deepEqual(await getSetting('k'), { cards: ['hrv'] });
  await putSetting('k', { a: 1 });
  assert.equal(fake.calls.filter((c) => c.text.startsWith('create table')).length, 1);
  const write = fake.calls.at(-1)!;
  assert.match(write.text, /^insert into settings .* on conflict \(key\) do update/);
  assert.deepEqual(write.values, ['k', '{"a":1}']);
});

test('settings: a failed table creation is retried on the next call', async () => {
  const { getSetting } = await import('../lib/settings.js');
  fake.failCreate = 1;
  await assert.rejects(getSetting('k'), /waking up/);
  assert.equal(await getSetting('k'), null);
  assert.equal(fake.calls.filter((c) => c.text.startsWith('create table')).length, 2);
});

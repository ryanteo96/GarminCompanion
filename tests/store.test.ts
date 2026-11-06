import assert from 'node:assert/strict';
import { afterEach, beforeEach, test, vi } from 'vitest';
import { sample } from '../lib/sample.js';
import type { Payload } from '../lib/types.js';
import { useStore } from '../src/store.js';
import { memoryStorage, throwingStorage } from './stubs.js';

const payload = (n: number, extra: Partial<Payload> = {}): Payload => ({ demo: true, fetchedAt: '2026-11-04T12:00:00.000Z', ...sample(n, '2026-11-04'), ...extra });
const reply = (code: number, body: unknown = {}): Promise<Response> => Promise.resolve(new Response(JSON.stringify(body), { status: code }));
const state = () => useStore.getState();
const cachedKeys = () => Object.keys(localStorage).filter((k) => k.startsWith('gc:data:'));
const cacheEntry = (savedAt: number, p: Payload) => JSON.stringify({ savedAt, payload: p });

// A fetch that never answers on its own and rejects when its signal aborts, like the real one.
const hangsUntilAborted = (_url: string, init?: RequestInit): Promise<Response> =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(init.signal?.reason as Error));
  });

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  vi.stubGlobal('localStorage', memoryStorage());
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

test('a successful load shows the app with load attached to each day', async () => {
  vi.stubGlobal('fetch', () => reply(200, payload(30)));
  await state().load();
  assert.equal(state().view, 'app');
  assert.equal(state().days.length, 30);
  assert.ok(state().days.every((d) => typeof d.load === 'number'));
  assert.equal(state().notice, null);
  assert.equal(state().loading, false);
  assert.ok(localStorage.getItem('gc:data:90'), 'the good payload is cached under its range');
});

test('the request carries the range and the browser-local date, and is never cached', async () => {
  const seen: { url: string; init?: RequestInit }[] = [];
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => (seen.push({ url, init }), reply(200, payload(30))));
  await state().load();
  assert.match(seen[0].url, /^\/api\/data\?days=90&today=\d{4}-\d{2}-\d{2}$/);
  assert.equal(seen[0].init?.cache, 'no-store');
});

test('a 401 sends you to login and wipes the cache', async () => {
  localStorage.setItem('gc:data:90', cacheEntry(1, payload(30)));
  localStorage.setItem('gc:data:30', cacheEntry(1, payload(30)));
  vi.stubGlobal('fetch', () => reply(401, {}));
  await state().load();
  assert.equal(state().view, 'login');
  assert.deepEqual(cachedKeys(), []);
  assert.equal(state().days.length, 0);
});

test('a failed fetch with a cached copy shows the stale notice', async () => {
  const savedAt = Date.UTC(2026, 10, 3, 9, 30);
  localStorage.setItem('gc:data:90', cacheEntry(savedAt, payload(30)));
  vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Failed to fetch')));
  await state().load();
  assert.equal(state().view, 'app');
  assert.match(state().notice?.text ?? '', /^Showing data saved/);
  assert.equal(state().notice?.retry, true);
  assert.equal(state().fresh?.label, 'Last synced');
  assert.equal(state().stale?.savedAt, savedAt);
});

test('a superseded request is ignored', async () => {
  const signals: AbortSignal[] = [];
  let call = 0;
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    if (init?.signal) signals.push(init.signal);
    return call++ === 0 ? hangsUntilAborted(url, init) : reply(200, payload(30));
  });
  const first = state().load();
  const second = state().load();
  await Promise.all([first, second]);
  assert.equal(signals[0].aborted, true, 'the older request was cancelled');
  assert.equal(state().days.length, 30, 'only the newer payload landed');
  assert.equal(state().view, 'app');
  assert.equal(state().error, null);
  assert.equal(state().loading, false);
});

test('a request that never answers times out after 25 seconds', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', hangsUntilAborted);
  const done = state().load();
  await vi.advanceTimersByTimeAsync(24_999);
  assert.equal(state().view, 'boot', 'still waiting just before the limit');
  await vi.advanceTimersByTimeAsync(1);
  await done;
  assert.equal(state().view, 'error');
  assert.equal(state().error?.status, 'timeout');
});

test('a 200 with no days is an error, not a dashboard', async () => {
  vi.stubGlobal('fetch', () => reply(200, payload(30, { days: [] })));
  await state().load();
  assert.equal(state().view, 'error');
  assert.equal(state().error?.status, 'empty');
  assert.deepEqual(cachedKeys(), [], 'an empty payload is not cached');
});

test('a storage that throws does not stop the app', async () => {
  vi.stubGlobal('localStorage', throwingStorage());
  vi.stubGlobal('fetch', () => reply(200, payload(30)));
  await state().load();
  assert.equal(state().view, 'app', 'a good load works without a cache');
  useStore.setState(useStore.getInitialState(), true);
  vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Failed to fetch')));
  await state().load();
  assert.equal(state().view, 'error', 'no cache to fall back on, so the error view, not a crash');
  assert.equal(state().error?.status, 0);
});

test('refreshing keeps the dashboard on screen instead of going back to the loading view', async () => {
  vi.stubGlobal('fetch', () => reply(200, payload(30)));
  await state().load();
  let release: () => void = () => undefined;
  vi.stubGlobal('fetch', () => new Promise<Response>((resolve) => { release = () => resolve(new Response(JSON.stringify(payload(30)))); }));
  const refresh = state().load();
  assert.equal(state().view, 'app');
  assert.equal(state().loading, true);
  release();
  await refresh;
  assert.equal(state().loading, false);
});

test('records Garmin sent without a date are reported in a notice', async () => {
  vi.stubGlobal('fetch', () => reply(200, payload(30, { skipped: { daily: 2, hrv: 1, sleep: 0, activities: 0 } })));
  await state().load();
  assert.equal(state().notice?.text, '3 Garmin records had no date and were left out.');
  assert.equal(state().notice?.retry, false);
});

test('retry asks for focus to move to the tab and clears the stale notice when it works', async () => {
  localStorage.setItem('gc:data:90', cacheEntry(1, payload(30)));
  vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Failed to fetch')));
  await state().load();
  assert.ok(state().notice);
  vi.stubGlobal('fetch', () => reply(200, payload(30)));
  await state().retry();
  assert.equal(state().refocus, true);
  assert.equal(state().notice, null);
  assert.equal(state().stale, null);
  state().clearRefocus();
  assert.equal(state().refocus, false);
});

test('a wrong password keeps you on login with the server message', async () => {
  useStore.setState({ view: 'login' });
  vi.stubGlobal('fetch', () => reply(401, { error: 'Wrong password' }));
  await state().login('nope');
  assert.equal(state().loginError, 'Wrong password');
  assert.equal(state().view, 'login');
  assert.equal(state().refocus, false);
});

test('the right password signs in and loads the data', async () => {
  useStore.setState({ view: 'login' });
  const urls: string[] = [];
  vi.stubGlobal('fetch', (url: string) => (urls.push(url), url === '/api/login' ? reply(200, { ok: true }) : reply(200, payload(30))));
  await state().login('right');
  assert.equal(urls[0], '/api/login');
  assert.equal(state().view, 'app');
  assert.equal(state().loginError, null);
});

test('sign out wipes the cache and says when the server was unreachable', async () => {
  vi.stubGlobal('fetch', () => reply(200, payload(30)));
  await state().load();
  assert.equal(cachedKeys().length, 1);
  vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Failed to fetch')));
  await state().logout();
  assert.equal(state().view, 'login');
  assert.equal(state().days.length, 0);
  assert.deepEqual(cachedKeys(), []);
  assert.match(state().loginError ?? '', /couldn't reach the server/);
});

// Review findings: the two ways the app could end up showing the wrong thing or no way forward.
const unreadable = { demo: true, fetchedAt: '2026-11-04T12:00:00.000Z', days: [{ date: '2026-11-04' }] }; // a 200 with days but no activities

test('a load still in flight when you sign out cannot bring the dashboard back', async () => {
  vi.stubGlobal('fetch', () => reply(200, payload(30)));
  await state().load();
  assert.equal(state().view, 'app');
  // The refresh's response arrives only after sign-out, and ignores the abort, as one already on its way would.
  let release: () => void = () => undefined;
  vi.stubGlobal('fetch', (url: string) =>
    url === '/api/logout' ? reply(200, { ok: true }) : new Promise<Response>((resolve) => { release = () => resolve(new Response(JSON.stringify(payload(30)))); }),
  );
  const refresh = state().load();
  await state().logout();
  assert.equal(state().view, 'login');
  release();
  await refresh;
  assert.equal(state().view, 'login', 'the late response is dropped');
  assert.equal(state().days.length, 0);
  assert.deepEqual(cachedKeys(), [], 'and it is not written back to the cache');
  assert.equal(state().loading, false);
});

test('a cached payload that is not a payload is ignored instead of breaking the app', async () => {
  localStorage.setItem('gc:data:90', JSON.stringify({ savedAt: 1, payload: { days: 'nope' } }));
  vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Failed to fetch')));
  await state().load();
  assert.equal(state().view, 'error', 'no usable cache, so the error view with a Retry, not the loading screen');
  assert.equal(state().error?.status, 0);
});

test('a payload that cannot be read lands on an error you can retry, not on the loading screen', async () => {
  vi.stubGlobal('fetch', () => reply(200, unreadable));
  await state().load();
  assert.equal(state().view, 'error');
  assert.equal(state().error?.status, 'invalid');
  assert.equal(state().loading, false);
  vi.stubGlobal('fetch', () => reply(200, payload(30)));
  await state().retry();
  assert.equal(state().view, 'app');
});

test('a payload that cannot be read leaves the dashboard you already have and offers a retry', async () => {
  vi.stubGlobal('fetch', () => reply(200, payload(30)));
  await state().load();
  vi.stubGlobal('fetch', () => reply(200, unreadable));
  await state().load();
  assert.equal(state().view, 'app');
  assert.equal(state().days.length, 30, 'the good data stays');
  assert.equal(state().notice?.retry, true);
});

test('a payload with Sessions still syncing says so, and the wipe reports back', async () => {
  vi.stubGlobal('fetch', () => reply(200, payload(30, { syncing: 3 })));
  await state().load();
  assert.match(state().notice?.text ?? '', /Syncing 3 activities/);
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => (url === '/api/activities' && init?.method === 'DELETE' ? reply(200, { ok: true }) : reply(500)));
  await state().deleteStored();
  assert.match(state().notice?.text ?? '', /deleted/);
});

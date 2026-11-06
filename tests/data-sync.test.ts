import assert from 'node:assert/strict';
import type { ServerResponse } from 'node:http';
import { afterEach, expect, test, vi } from 'vitest';

const sync = vi.hoisted(() => vi.fn(() => Promise.resolve(0)));
vi.mock('../lib/sessions.js', () => ({ sessionStore: () => ({ sync, pendingCount: () => Promise.resolve(2) }) }));
vi.mock('@vercel/functions', () => ({ waitUntil: () => undefined }));

afterEach(() => {
  delete process.env.GARMIN_API_KEY;
  vi.unstubAllGlobals();
  sync.mockClear();
});

// A response that records what was sent and lets the test close it.
function fakeRes() {
  const closers: (() => void)[] = [];
  const out = { status: 0, body: '' };
  const res = {
    setHeader: () => undefined,
    end: (b: string) => { out.body = b; },
    set statusCode(v: number) { out.status = v; },
    once: (_: string, cb: () => void) => closers.push(cb),
  };
  return { res: res as unknown as ServerResponse, out, close: () => closers.forEach((c) => c()) };
}

test('on a real load the response is sent first, then stored detail syncs for the live activities', async () => {
  process.env.GARMIN_API_KEY = 'k';
  process.env.DASHBOARD_PASSWORD = 'p';
  process.env.SESSION_SECRET = 's'.repeat(20);
  vi.stubGlobal('fetch', (url: URL | string) => Promise.resolve(new Response(String(url).includes('personal-api-key') ? 'tok' : '[]')));
  const { mintCookie } = await import('../lib/auth.js');
  const { default: handler } = await import('../api/data.js');
  const { res, out, close } = fakeRes();
  await handler({ method: 'GET', url: '/api/data?days=30&today=2026-11-06', headers: { cookie: `gc=${mintCookie()}` } } as never, res);
  assert.equal(out.status, 200);
  assert.equal((JSON.parse(out.body) as { syncing: number }).syncing, 2);
  expect(sync).not.toHaveBeenCalled();
  close();
  await vi.waitFor(() => expect(sync).toHaveBeenCalledWith([], '2026-11-06'));
});

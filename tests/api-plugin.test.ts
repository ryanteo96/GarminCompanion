import assert from 'node:assert/strict';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { test } from 'vitest';
import type { Handler } from '../lib/http.js';
import { apiMiddleware, vercelHeaders, type Loader } from '../tools/api-plugin.js';

interface Outcome {
  via: 'next' | 'end';
  status: number;
  body: string;
  loaded: string[];
}

// Runs the middleware once and resolves when it either hands the request on or ends the response.
function run(url: string, handlers: Record<string, Handler | Error> = {}): Promise<Outcome> {
  const loaded: string[] = [];
  const load: Loader = (name) => {
    loaded.push(name);
    const h = handlers[name];
    return h instanceof Error ? Promise.reject(h) : Promise.resolve(h);
  };
  return new Promise((resolve) => {
    const out: Outcome = { via: 'end', status: 200, body: '', loaded };
    const res = {
      setHeader: () => undefined,
      set statusCode(v: number) { out.status = v; },
      end: (b?: string) => resolve({ ...out, via: 'end', body: b ?? '' }),
    };
    apiMiddleware(load)({ url } as IncomingMessage, res as unknown as ServerResponse, () => resolve({ ...out, via: 'next' }));
  });
}

test('an unknown api name is a 404 and nothing is handed on', async () => {
  const out = await run('/api/nope');
  assert.equal(out.via, 'end');
  assert.equal(out.status, 404);
  assert.deepEqual(out.loaded, ['nope']);
});

test('names that are not plain lowercase words are rejected before anything is loaded', async () => {
  for (const url of ['/api/a.b', '/api/Data', '/api/', '/api/a/b', '/api/a%2Fb']) {
    const out = await run(url);
    assert.equal(out.status, 404, url);
    assert.deepEqual(out.loaded, [], `${url} must not reach the loader`);
  }
});

test('paths outside /api are passed on untouched', async () => {
  const out = await run('/index.html');
  assert.equal(out.via, 'next');
  assert.deepEqual(out.loaded, []);
});

test('a known handler is called with the request and response, and the query string is ignored', async () => {
  let seen: [IncomingMessage, ServerResponse] | undefined;
  const handler: Handler = (req, res) => {
    seen = [req, res];
    res.statusCode = 204;
    res.end();
  };
  const out = await run('/api/data?days=7&today=2026-11-05', { data: handler });
  assert.deepEqual(out.loaded, ['data']);
  assert.equal(out.status, 204);
  assert.ok(seen, 'the handler ran');
});

test('a handler that throws becomes a 500 instead of crashing the server', async () => {
  const out = await run('/api/data', {
    data: () => {
      throw new Error('boom');
    },
  });
  assert.equal(out.status, 500);
  assert.match(out.body, /boom/);
});

test('a module that fails to load becomes a 500 with its message', async () => {
  const out = await run('/api/data', { data: new Error('syntax error in api/data.ts') });
  assert.equal(out.status, 500);
  assert.match(out.body, /syntax error/);
});

test('preview applies the same security headers as vercel.json, CSP included', () => {
  const headers = vercelHeaders();
  assert.match(headers['Content-Security-Policy'], /default-src 'self'/);
  assert.match(headers['Content-Security-Policy'], /style-src 'self'/);
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
});

// Mounts api/*.ts in `vite` (dev) and `vite preview`, standing in for Vercel's functions. Not used in production.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer, type Connect, type Plugin, type ViteDevServer } from 'vite';
import { send, type Handler } from '../lib/http.js';

export type Loader = (name: string) => Promise<Handler | undefined>;

const notFound = (res: { statusCode: number; end: () => void }): void => {
  res.statusCode = 404;
  res.end();
};

export function apiMiddleware(load: Loader): Connect.NextHandleFunction {
  return (req, res, next) => {
    const path = new URL(req.url ?? '/', 'http://x').pathname;
    if (!path.startsWith('/api/')) return next();
    if (!/^\/api\/[a-z]+$/.test(path)) return notFound(res);
    load(path.slice('/api/'.length))
      .then((handler) => (handler ? handler(req, res) : notFound(res)))
      .catch((e: unknown) => {
        if (res.headersSent) return res.end(); // too late for a status; do not throw from the catch
        send(res, 500, { error: e instanceof Error ? e.message : String(e) });
      });
  };
}

// The header pairs from the first `headers` rule in vercel.json, so preview serves the production CSP.
export function vercelHeaders(path = 'vercel.json'): Record<string, string> {
  const config = JSON.parse(readFileSync(path, 'utf8')) as { headers?: { headers: { key: string; value: string }[] }[] };
  return Object.fromEntries((config.headers?.[0]?.headers ?? []).map((h) => [h.key, h.value]));
}

const exists = (name: string): boolean => existsSync(resolve('api', `${name}.ts`));
const handlerOf = (mod: Record<string, unknown>): Handler => mod.default as Handler;

export function apiPlugin(): Plugin {
  return {
    name: 'garmin-api',
    configureServer(server) {
      server.middlewares.use(apiMiddleware(async (name) => (exists(name) ? handlerOf(await server.ssrLoadModule(`/api/${name}.ts`)) : undefined)));
    },
    configurePreviewServer(server) {
      const headers = vercelHeaders();
      server.middlewares.use((_req, res, next) => {
        for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
        next();
      });
      // Preview has no module graph, so handlers load through a second, middleware-only Vite instance.
      let loader: Promise<ViteDevServer> | undefined;
      const vite = (): Promise<ViteDevServer> =>
        (loader ??= createServer({ configFile: false, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true, hmr: false, watch: null } }));
      server.httpServer.once('close', () => {
        if (loader) void loader.then((v) => v.close());
      });
      server.middlewares.use(apiMiddleware(async (name) => (exists(name) ? handlerOf(await (await vite()).ssrLoadModule(`/api/${name}.ts`)) : undefined)));
    },
  };
}

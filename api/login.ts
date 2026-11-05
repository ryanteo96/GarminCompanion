import type { ServerResponse } from 'node:http';
import { MAX_AGE, mintCookie, same } from '../lib/auth.js';
import { readJson, send, type Req } from '../lib/http.js';

export default async function handler(req: Req, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  try {
    const want = process.env.DASHBOARD_PASSWORD;
    if (!want) return send(res, 500, { error: 'DASHBOARD_PASSWORD is not set' });
    const { password } = await readJson(req);
    if (typeof password !== 'string' || !same(password, want)) {
      await new Promise((r) => setTimeout(r, 500)); // shortcut: crude brute-force slowdown, add real rate limiting if exposed widely
      return send(res, 401, { error: 'Wrong password' });
    }
    const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
    send(res, 200, { ok: true }, {
      'Set-Cookie': `gc=${mintCookie()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${MAX_AGE}${secure}`,
    });
  } catch (e) {
    send(res, 500, { error: e instanceof Error ? e.message : String(e) });
  }
}

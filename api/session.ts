import type { ServerResponse } from 'node:http';
import { isStored } from '../lib/activities.js';
import { authed } from '../lib/auth.js';
import { send, type Req } from '../lib/http.js';

// The Session page asks whether its detail is stored yet. Stored detail itself arrives with the per-sport bodies.
export default async function handler(req: Req, res: ServerResponse): Promise<void> {
  if (!authed(req)) return send(res, 401, { error: 'unauthorized' });
  const id = Number(new URL(req.url ?? '/', 'http://x').searchParams.get('id'));
  if (!Number.isSafeInteger(id) || id <= 0) return send(res, 400, { error: 'id must be a positive integer' });
  try {
    send(res, 200, { stored: process.env.DATABASE_URL ? await isStored(id) : false });
  } catch (e) {
    send(res, 502, { error: e instanceof Error ? e.message : String(e) });
  }
}

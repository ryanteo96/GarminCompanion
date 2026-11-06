import type { ServerResponse } from 'node:http';
import { authed } from '../lib/auth.js';
import { send, type Req } from '../lib/http.js';
import { sessionStore } from '../lib/sessions.js';

export default async function handler(req: Req, res: ServerResponse): Promise<void> {
  if (!authed(req)) return send(res, 401, { error: 'unauthorized' });
  if (req.method !== 'DELETE') return send(res, 405, { error: 'DELETE only' });
  try {
    await sessionStore().wipe();
    send(res, 200, { ok: true });
  } catch (e) {
    send(res, 502, { error: e instanceof Error ? e.message : String(e) });
  }
}

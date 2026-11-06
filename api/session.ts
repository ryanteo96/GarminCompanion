import type { ServerResponse } from 'node:http';
import { storedDetail } from '../lib/activities.js';
import { authed } from '../lib/auth.js';
import { send, type Req } from '../lib/http.js';
import { sampleDetail } from '../lib/sample.js';

// The Session page asks for this Session's stored detail. Reads the table only; a FIT file is never downloaded here.
export default async function handler(req: Req, res: ServerResponse): Promise<void> {
  if (!authed(req)) return send(res, 401, { error: 'unauthorized' });
  const id = Number(new URL(req.url ?? '/', 'http://x').searchParams.get('id'));
  if (!Number.isSafeInteger(id) || id <= 0) return send(res, 400, { error: 'id must be a positive integer' });
  try {
    const detail = !process.env.GARMIN_API_KEY ? sampleDetail(id) : process.env.DATABASE_URL ? await storedDetail(id) : null;
    send(res, 200, { stored: !!detail, detail });
  } catch (e) {
    send(res, 502, { error: e instanceof Error ? e.message : String(e) });
  }
}

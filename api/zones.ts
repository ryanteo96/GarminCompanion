import type { ServerResponse } from 'node:http';
import { storedZ2, type Z2 } from '../lib/activities.js';
import { authed } from '../lib/auth.js';
import { send, type Req } from '../lib/http.js';
import { sampleDetail } from '../lib/sample.js';

const MAX_IDS = 400;

// The Running page asks for the Zone 2 pace and heart rate of many Sessions at once. Reads the table only; a FIT file is never downloaded here.
export default async function handler(req: Req, res: ServerResponse): Promise<void> {
  if (!authed(req)) return send(res, 401, { error: 'unauthorized' });
  const ids = (new URL(req.url ?? '/', 'http://x').searchParams.get('ids') ?? '').split(',').filter(Boolean).map(Number);
  if (ids.length > MAX_IDS || !ids.every((n) => Number.isSafeInteger(n) && n > 0)) return send(res, 400, { error: `ids must be up to ${MAX_IDS} positive integers` });
  try {
    if (!process.env.GARMIN_API_KEY) {
      const z2: Record<number, Z2> = {};
      for (const id of ids) {
        const m = sampleDetail(id).metrics;
        if (m.z2Speed != null && m.z2Hr != null) z2[id] = { speed: m.z2Speed, hr: m.z2Hr };
      }
      return send(res, 200, { z2 });
    }
    send(res, 200, { z2: process.env.DATABASE_URL && ids.length ? await storedZ2(ids) : {} });
  } catch (e) {
    send(res, 502, { error: e instanceof Error ? e.message : String(e) });
  }
}

import type { ServerResponse } from 'node:http';
import { waitUntil } from '@vercel/functions';
import { pendingCount, syncActivities } from '../lib/activities.js';
import { authed } from '../lib/auth.js';
import { fetchAll, fetchRaw, pickToday, shape } from '../lib/garmin.js';
import { send, type Req } from '../lib/http.js';
import { sample } from '../lib/sample.js';

export default async function handler(req: Req, res: ServerResponse): Promise<void> {
  try {
    if (!authed(req)) return send(res, 401, { error: 'unauthorized' });
    const q = new URL(req.url ?? '/', 'http://x').searchParams;
    const n = Number(q.get('days')) || 90;
    const today = pickToday(q.get('today'));
    const days = Math.min(365, Math.max(7, Math.round(n)));
    const demo = !process.env.GARMIN_API_KEY;
    if (!demo && q.has('debug')) return send(res, 200, shape(await fetchRaw(days, today)));
    const data = demo ? sample(days, today) : await fetchAll(days, today);
    // ADR 0005: store parsed activity detail after the response, so the page never waits on FIT downloads. waitUntil keeps the function alive for it on Vercel and is a no-op elsewhere.
    if (!demo) waitUntil(new Promise((done) => res.once('close', done)).then(() => syncActivities(data.activities, today)));
    const syncing = demo ? 0 : await pendingCount(data.activities, today);
    send(res, 200, { demo, fetchedAt: new Date().toISOString(), syncing, ...data }, { 'Cache-Control': 'private, no-store' });
  } catch (e) {
    send(res, 502, { error: e instanceof Error ? e.message : String(e) });
  }
}

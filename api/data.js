import { authed } from '../lib/auth.js';
import { fetchAll, fetchRaw, pickToday, shape } from '../lib/garmin.js';
import { send } from '../lib/http.js';
import { sample } from '../lib/sample.js';

export default async function handler(req, res) {
  try {
    if (!authed(req)) return send(res, 401, { error: 'unauthorized' });
    const q = new URL(req.url, 'http://x').searchParams;
    const n = Number(q.get('days')) || 90;
    const today = pickToday(q.get('today'));
    const days = Math.min(365, Math.max(7, Math.round(n)));
    const demo = !process.env.GARMIN_API_KEY;
    if (!demo && q.has('debug')) return send(res, 200, shape(await fetchRaw(days, today)));
    const data = demo ? sample(days, today) : await fetchAll(days, today);
    send(res, 200, { demo, fetchedAt: new Date().toISOString(), ...data }, { 'Cache-Control': 'private, no-store' });
  } catch (e) {
    send(res, 502, { error: e.message });
  }
}

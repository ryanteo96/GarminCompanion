import { authed } from '../lib/auth.js';
import { fetchAll, fetchRaw, shape } from '../lib/garmin.js';
import { send } from '../lib/http.js';
import { sample } from '../lib/sample.js';

export default async function handler(req, res) {
  try {
    if (!authed(req)) return send(res, 401, { error: 'unauthorized' });
    const n = Number(new URL(req.url, 'http://x').searchParams.get('days')) || 90;
    const days = Math.min(365, Math.max(7, Math.round(n)));
    const demo = !process.env.GARMIN_API_KEY;
    if (!demo && new URL(req.url, 'http://x').searchParams.has('debug')) return send(res, 200, shape(await fetchRaw(days)));
    const data = demo ? sample(days) : await fetchAll(days);
    send(res, 200, { demo, fetchedAt: new Date().toISOString(), ...data }, { 'Cache-Control': 'private, max-age=300' });
  } catch (e) {
    send(res, 502, { error: e.message });
  }
}

import { send } from '../lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  send(res, 200, { ok: true }, {
    'Set-Cookie': `gc=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`,
    // Browsers honour this over HTTPS only; the page also wipes its own cached copy, so plain http still works.
    'Clear-Site-Data': '"cache", "storage"',
  });
}

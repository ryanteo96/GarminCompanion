import { send } from '../lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  send(res, 200, { ok: true }, { 'Set-Cookie': `gc=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}` });
}

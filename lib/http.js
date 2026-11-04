export function send(res, status, body, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}

export async function readJson(req, limit = 4096) {
  if (req.body && typeof req.body === 'object') return req.body; // Vercel pre-parses JSON
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > limit) throw new Error('body too large');
  }
  return raw ? JSON.parse(raw) : {};
}

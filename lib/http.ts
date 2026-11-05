import type { IncomingMessage, ServerResponse } from 'node:http';

export type Req = IncomingMessage & { body?: unknown };
export type Handler = (req: Req, res: ServerResponse) => void | Promise<void>;

export function send(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}

export async function readJson(req: Req, limit = 4096): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object') return req.body as Record<string, unknown>; // Vercel pre-parses JSON
  let raw = '';
  for await (const chunk of req as AsyncIterable<Buffer | string>) {
    raw += String(chunk);
    if (raw.length > limit) throw new Error('body too large');
  }
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
}

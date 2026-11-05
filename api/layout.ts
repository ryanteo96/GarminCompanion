import type { ServerResponse } from 'node:http';
import { authed } from '../lib/auth.js';
import { readJson, send, type Req } from '../lib/http.js';
import { getSetting, putSetting, settingsConfigured } from '../lib/settings.js';
import type { HomeLayout } from '../lib/types.js';

const KEY = 'home-layout';
const ID = /^[a-z][a-z0-9-]{0,31}$/;
const DAY = 86_400_000;

// The trust boundary: only a bounded list of plain ids and a believable timestamp get stored. Which ids exist is the UI's business.
function parse(body: Record<string, unknown> | undefined): HomeLayout | null {
  const { cards, updatedAt } = body ?? {};
  if (!Array.isArray(cards) || cards.length > 32 || new Set(cards).size !== cards.length) return null;
  if (!cards.every((c): c is string => typeof c === 'string' && ID.test(c))) return null;
  if (typeof updatedAt !== 'number' || !Number.isFinite(updatedAt) || updatedAt > Date.now() + DAY) return null;
  return { cards, updatedAt };
}

export default async function handler(req: Req, res: ServerResponse): Promise<void> {
  try {
    if (!authed(req)) return send(res, 401, { error: 'unauthorized' });
    if (req.method !== 'GET' && req.method !== 'PUT') return send(res, 405, { error: 'GET or PUT only' });
    if (!settingsConfigured()) return send(res, 200, { synced: false });
    let incoming: HomeLayout | null = null;
    if (req.method === 'PUT') {
      incoming = parse(await readJson(req).catch(() => undefined)); // too large, not JSON, or no body: all invalid
      if (!incoming) return send(res, 400, { error: 'invalid layout' });
    }
    const stored = (await getSetting(KEY)) as HomeLayout | null;
    if (!incoming) return send(res, 200, { synced: true, layout: stored });
    // shortcut: compare-then-write is two statements, not atomic; fine for one owner, use one conditional upsert if a second writer appears
    if (stored && incoming.updatedAt <= stored.updatedAt) return send(res, 200, { synced: true, layout: stored });
    await putSetting(KEY, incoming);
    send(res, 200, { synced: true, layout: incoming });
  } catch (e) {
    send(res, 502, { error: e instanceof Error ? e.message : String(e) });
  }
}

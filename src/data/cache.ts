import type { Payload } from '../../lib/types.js';

// Cache the last good payload per range so a bad connection still shows something. It lives in this
// browser only and is wiped on logout/401; shortcut: no encryption, anyone with this browser profile can read it.
const CACHE = 'gc:data:';

export interface Cached {
  savedAt: number;
  payload: Payload;
}

export const saveCache = (days: number, payload: Payload): void => {
  try {
    localStorage.setItem(CACHE + String(days), JSON.stringify({ savedAt: Date.now(), payload }));
  } catch { /* storage full or blocked */ }
};

// The cache outlives deploys, so an entry written by an older shape of the app (or damaged) must read as "nothing cached".
const isCached = (c: Partial<Cached> | null): c is Cached =>
  typeof c?.savedAt === 'number' && Array.isArray(c.payload?.days) && Array.isArray(c.payload.activities);

export const loadCache = (days: number): Cached | null => {
  try {
    const raw = localStorage.getItem(CACHE + String(days));
    const cached = raw ? (JSON.parse(raw) as Partial<Cached> | null) : null;
    return isCached(cached) ? cached : null;
  } catch {
    return null;
  }
};

export const wipeCache = (): void => {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith(CACHE)).forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
};

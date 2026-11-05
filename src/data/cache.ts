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

export const loadCache = (days: number): Cached | null => {
  try {
    const raw = localStorage.getItem(CACHE + String(days));
    return raw ? (JSON.parse(raw) as Cached) : null;
  } catch {
    return null;
  }
};

export const wipeCache = (): void => {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith(CACHE)).forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
};

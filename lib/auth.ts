import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { Req } from './http.js';

const sig = (v: string): string => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error('SESSION_SECRET (16+ chars) is not set');
  return createHmac('sha256', s).update(v).digest('base64url');
};

// Hash first so timingSafeEqual gets equal-length buffers whatever the input.
export const same = (a: string, b: string): boolean =>
  timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());

export const MAX_AGE = 30 * 86400;

export function mintCookie(): string {
  const exp = String(Date.now() + MAX_AGE * 1000);
  return `${exp}.${sig(exp)}`;
}

export function authed(req: Pick<Req, 'headers'>): boolean {
  const m = /(?:^|; )gc=([^;]+)/.exec(req.headers.cookie || '');
  if (!m) return false;
  const [exp, s] = m[1].split('.');
  return Boolean(s) && Number(exp) > Date.now() && same(s, sig(exp));
}

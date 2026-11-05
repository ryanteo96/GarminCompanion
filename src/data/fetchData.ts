import type { Payload } from '../../lib/types.js';
import { localToday } from '../logic/format.js';

export interface LoadError {
  /** A number is an HTTP status (0: the request never reached the server). 'invalid': the data arrived but could not be read. */
  status: number | 'timeout' | 'empty' | 'invalid';
  message: string;
}

export type FetchOutcome = { j: Payload } | { err: LoadError } | { unauthorized: true } | { superseded: true };

let inflight: AbortController | null = null;

/** Cancels the request in flight, if any; its caller then sees `{ superseded: true }`. */
export function abortInflight(): void {
  inflight?.abort();
}

export async function fetchData(days: number): Promise<FetchOutcome> {
  inflight?.abort();
  const ctl = (inflight = new AbortController());
  const timer = setTimeout(() => ctl.abort('timeout'), 25000);
  try {
    const r = await fetch(`/api/data?days=${days}&today=${localToday()}`, { signal: ctl.signal, cache: 'no-store' });
    if (r.status === 401) {
      await r.text();
      return { unauthorized: true };
    }
    const j = (await r.json().catch(() => ({}))) as Partial<Payload> & { error?: string };
    return r.ok ? { j: j as Payload } : { err: { status: r.status, message: j.error ?? `HTTP ${r.status}` } };
  } catch (e) {
    if (ctl.signal.aborted && ctl.signal.reason !== 'timeout') return { superseded: true }; // a newer request replaced this one
    return { err: { status: ctl.signal.reason === 'timeout' ? 'timeout' : 0, message: e instanceof Error ? e.message : String(e) } };
  } finally {
    clearTimeout(timer);
  }
}

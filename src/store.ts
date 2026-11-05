import { create } from 'zustand';
import type { Activity, DayWithLoad, Payload } from '../lib/types.js';
import { loadCache, saveCache, wipeCache } from './data/cache.js';
import { fetchData, type LoadError } from './data/fetchData.js';
import { newest } from './logic/days.js';
import { friendly } from './logic/errors.js';
import { fmtStamp, localToday } from './logic/format.js';
import { withLoad } from './logic/stats.js';

export type View = 'boot' | 'login' | 'error' | 'app';
export interface Stale {
  savedAt: number;
  err: LoadError;
}
export interface Fresh {
  ts: number;
  label: 'Updated' | 'Last synced';
  through?: string;
  behind: boolean;
}

interface Data {
  days: DayWithLoad[];
  activities: Activity[];
  demo: boolean;
}

export interface DashboardState extends Data {
  view: View;
  range: number;
  stale: Stale | null;
  notice: { text: string; retry: boolean } | null;
  fresh: Fresh | null;
  error: LoadError | null;
  loading: boolean;
  /** Set when the user acted inside a card that is about to close; the next view moves focus to the selected tab. */
  refocus: boolean;
  srStatus: string;
  loginError: string | null;
  load: () => Promise<void>;
  retry: () => Promise<void>;
  setRange: (days: number) => Promise<void>;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  notify: (text: string | null, retry?: boolean) => void;
  clearRefocus: () => void;
}

const NO_DATA: Data = { days: [], activities: [], demo: false };
let running = 0; // loads in flight; the Refresh button stays disabled until the last one ends

export const useStore = create<DashboardState>()((set, get) => {
  function apply(j: Payload, stale: Stale | null): void {
    const days = withLoad(j.days, j.activities);
    const skipped = j.skipped ? j.skipped.daily + j.skipped.hrv + j.skipped.sleep + j.skipped.activities : 0;
    const through = newest(days);
    set({
      view: 'app',
      days,
      activities: j.activities,
      demo: Boolean(j.demo),
      stale,
      error: null,
      notice: stale
        ? { text: `Showing data saved ${fmtStamp(stale.savedAt)}. ${friendly(stale.err)[0]}.`, retry: true }
        : skipped
          ? { text: `${skipped} Garmin records had no date and were left out.`, retry: false }
          : null,
      fresh: { ...(stale ? { ts: stale.savedAt, label: 'Last synced' as const } : { ts: Date.parse(j.fetchedAt), label: 'Updated' as const }), through, behind: !through || through < localToday() },
    });
  }

  async function loadOnce(): Promise<void> {
    const { range } = get();
    if (!get().days.length) set({ view: 'boot' });
    let out = await fetchData(range);
    if ('superseded' in out) return;
    if ('unauthorized' in out) {
      wipeCache();
      set({ ...NO_DATA, view: 'login', stale: null, notice: null, fresh: null });
      return;
    }
    if ('j' in out && !out.j.days?.length) out = { err: { status: 'empty', message: '' } }; // a 200 with nothing in it is not a dashboard
    if ('j' in out) {
      saveCache(range, out.j);
      apply(out.j, null);
      set({ srStatus: `Data refreshed at ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.` });
      return;
    }
    const cached = loadCache(range);
    if (cached) return apply(cached.payload, { savedAt: cached.savedAt, err: out.err });
    set({ view: 'error', error: out.err });
  }

  return {
    ...NO_DATA,
    view: 'boot',
    range: 90,
    stale: null,
    notice: null,
    fresh: null,
    error: null,
    loading: false,
    refocus: false,
    srStatus: '',
    loginError: null,

    async load() {
      running += 1;
      set({ loading: true });
      try {
        await loadOnce();
      } finally {
        running -= 1;
        set({ loading: running > 0 });
      }
    },
    async retry() {
      set({ refocus: true });
      await get().load();
    },
    async setRange(days) {
      set({ range: days });
      await get().load();
    },
    async login(password) {
      set({ loginError: null, refocus: true });
      try {
        const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
        if (r.ok) return await get().load();
        const body = (await r.json().catch(() => ({}))) as { error?: string };
        set({ refocus: false, loginError: body.error ?? 'Login failed' });
      } catch {
        set({ refocus: false, loginError: "Can't reach the dashboard. Check your connection and try again." });
      }
    },
    async logout() {
      let ended = true;
      try {
        ended = (await fetch('/api/logout', { method: 'POST' })).ok;
      } catch {
        ended = false; // offline: the session cookie is HttpOnly, so only the server can end it
      }
      wipeCache();
      set({
        ...NO_DATA,
        view: 'login',
        stale: null,
        notice: null,
        fresh: null,
        loginError: ended ? null : "Signed out here, but couldn't reach the server to end the session. It will expire on its own.",
      });
    },
    notify(text, retry = false) {
      set({ notice: text ? { text, retry } : null });
    },
    clearRefocus() {
      set({ refocus: false });
    },
  };
});

import { create } from 'zustand';
import type { HomeLayout } from '../../lib/types.js';
import { CARD_IDS, DEFAULT_CARDS, hide as hideCard, merge, move as moveCard, reset as resetCards, sanitize, show as showCard, type CardId } from './layout.js';

export const LAYOUT_KEY = 'home-layout';

interface Saved {
  cards: CardId[];
  updatedAt: number;
}

// Read at module load, not in an effect, so the first paint already has the owner's layout.
// Missing, damaged or blocked storage reads as the default.
export function readLocal(): Saved {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    const saved = raw ? (JSON.parse(raw) as { cards?: unknown; updatedAt?: unknown } | null) : null;
    if (!saved) return { cards: [...DEFAULT_CARDS], updatedAt: 0 };
    return { cards: sanitize(saved.cards, CARD_IDS), updatedAt: typeof saved.updatedAt === 'number' && Number.isFinite(saved.updatedAt) ? saved.updatedAt : 0 };
  } catch {
    return { cards: [...DEFAULT_CARDS], updatedAt: 0 };
  }
}

interface HomeState extends Saved {
  move: (from: number, to: number) => void;
  show: (id: CardId) => void;
  hide: (id: CardId) => void;
  reset: () => void;
}

const SAVE_DELAY = 800;
let timer: number | undefined;

const store = (cards: CardId[], updatedAt: number): void => {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify({ cards, updatedAt }));
  } catch { /* storage full or blocked */ }
};

// Sends this device's layout. Failures (offline, signed out) are dropped: the next change or the next visit to Home tries again.
function send(keepalive = false): void {
  const { cards, updatedAt } = useHome.getState();
  fetch('/api/layout', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cards, updatedAt }), keepalive, cache: 'no-store' }).catch(() => undefined);
}

// Sends a change that is still waiting out its delay, at once. For leaving Home and closing the page.
export function flush(): void {
  if (timer === undefined) return;
  window.clearTimeout(timer);
  timer = undefined;
  send(true);
}

// Asks the server for its layout (so a change from another device shows up) and reconciles: the newer copy wins.
// `isOpen` says whether the owner is mid-edit, in which case a newer remote layout waits for the next visit.
export async function pull(isOpen: () => boolean): Promise<void> {
  let body: { synced?: boolean; layout?: { cards?: unknown; updatedAt?: unknown } | null };
  try {
    const res = await fetch('/api/layout', { cache: 'no-store' });
    if (!res.ok) return; // including 401: the data load owns the signed-out flow
    body = (await res.json()) as typeof body;
  } catch {
    return;
  }
  if (!body.synced) return;
  const { cards, updatedAt } = useHome.getState();
  const local: HomeLayout = { cards, updatedAt };
  const remote: HomeLayout | null = typeof body.layout?.updatedAt === 'number' ? { cards: sanitize(body.layout.cards, CARD_IDS), updatedAt: body.layout.updatedAt } : null;
  const winner = merge(local, remote);
  if (winner !== local) {
    if (isOpen()) return;
    store(winner.cards as CardId[], winner.updatedAt);
    useHome.setState(winner as Saved);
  } else if (local.updatedAt > (remote?.updatedAt ?? 0)) send();
}

export const useHome = create<HomeState>()((set, get) => {
  // Every change is stamped, so the newest copy can win between devices, and is sent after a short pause.
  const commit = (cards: CardId[]): void => {
    const updatedAt = Date.now();
    store(cards, updatedAt);
    set({ cards, updatedAt });
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = undefined;
      send();
    }, SAVE_DELAY);
  };
  return {
    ...readLocal(),
    move: (from, to) => commit(moveCard(get().cards, from, to)),
    show: (id) => commit(showCard(get().cards, id)),
    hide: (id) => commit(hideCard(get().cards, id)),
    reset: () => commit(resetCards()),
  };
});

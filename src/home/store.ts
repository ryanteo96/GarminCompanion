import { create } from 'zustand';
import { CARD_IDS, DEFAULT_CARDS, hide as hideCard, move as moveCard, reset as resetCards, sanitize, show as showCard, type CardId } from './layout.js';

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

export const useHome = create<HomeState>()((set, get) => {
  // Every change is stamped, so the newest copy can win between devices.
  const commit = (cards: CardId[]): void => {
    const updatedAt = Date.now();
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify({ cards, updatedAt }));
    } catch { /* storage full or blocked */ }
    set({ cards, updatedAt });
  };
  return {
    ...readLocal(),
    move: (from, to) => commit(moveCard(get().cards, from, to)),
    show: (id) => commit(showCard(get().cards, id)),
    hide: (id) => commit(hideCard(get().cards, id)),
    reset: () => commit(resetCards()),
  };
});

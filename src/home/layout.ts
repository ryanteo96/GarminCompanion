// The Home cards and their default order. Pure: no React, so the layout functions can be tested without a browser.
export const CARD_IDS = ['readiness', 'hrv', 'resting-hr', 'sleep', 'body-battery', 'load', 'sessions', 'steps', 'intensity', 'stress'] as const;
export type CardId = (typeof CARD_IDS)[number];
export const DEFAULT_CARDS: readonly CardId[] = CARD_IDS;

// None of these change their input.
export function move<T>(cards: readonly T[], from: number, to: number): T[] {
  const out = [...cards];
  if (from < 0 || from >= out.length || to < 0 || to >= out.length) return out;
  out.splice(to, 0, ...out.splice(from, 1));
  return out;
}
export const show = <T>(cards: readonly T[], id: T): T[] => (cards.includes(id) ? [...cards] : [...cards, id]);
export const hide = <T>(cards: readonly T[], id: T): T[] => cards.filter((c) => c !== id);
export const reset = (): CardId[] => [...DEFAULT_CARDS];

// Whatever came out of storage or the server: keep known ids once each. A non-array is the default; an empty array is a real choice.
export function sanitize<T extends string>(input: unknown, known: readonly T[]): T[] {
  if (!Array.isArray(input)) return [...known];
  const seen = new Set<unknown>();
  return input.filter((id): id is T => known.includes(id as T) && !seen.has(id) && !!seen.add(id));
}

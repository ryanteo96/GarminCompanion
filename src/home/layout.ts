// The Home cards and their default order. Pure: no React, so the layout functions can be tested without a browser.
export const CARD_IDS = ['readiness', 'hrv', 'resting-hr', 'sleep', 'body-battery', 'load', 'sessions', 'steps', 'intensity', 'stress'] as const;
export type CardId = (typeof CARD_IDS)[number];
export const DEFAULT_CARDS: readonly CardId[] = CARD_IDS;

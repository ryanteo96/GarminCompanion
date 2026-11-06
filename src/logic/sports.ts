import { shift } from './stats.js';

// shortcut: Garmin typeKeys listed from memory, not checked against real data; confirm in the real-data gate.
export const SPORTS = [
  { slug: 'running', name: 'Running', types: ['running', 'street_running', 'trail_running', 'treadmill_running', 'track_running', 'indoor_running', 'virtual_run'] },
  { slug: 'strength', name: 'Strength', types: ['strength_training'] },
] as const;

export type SportSlug = (typeof SPORTS)[number]['slug'];

export const isSport = (s: string | undefined): s is SportSlug => SPORTS.some((x) => x.slug === s);
export const sportOf = (type: string): SportSlug | undefined => SPORTS.find((s) => (s.types as readonly string[]).includes(type))?.slug;

// ADR 0005: detail is stored only for a Sport's Sessions within this many days. Shared by the sync and the Session page.
export const BACKFILL_DAYS = 90;
export const storesDetail = (a: { type: string; date: string }, today: string): boolean => !!sportOf(a.type) && a.date >= shift(today, -BACKFILL_DAYS);

// A Sport with no recorded Sessions is hidden.
export const sportsWithSessions = (activities: { type: string }[]) => SPORTS.filter((s) => activities.some((a) => sportOf(a.type) === s.slug));

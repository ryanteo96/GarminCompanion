import { deleteStored, pendingCount, storedDetail, storedZ2, syncActivities, type Z2 } from './activities.js';
import type { Detail } from './fit.js';
import { sampleDetail } from './sample.js';
import type { Activity } from './types.js';

// ADR 0005: where each Session's parsed detail lives. Never downloads a FIT file except in sync.
export interface SessionStore {
  /** This Session's detail, or null when it is not stored. */
  detail(id: number): Promise<Detail | null>;
  /** Zone 2 pace and heart rate for those of `ids` that have them. */
  z2(ids: number[]): Promise<Record<number, Z2>>;
  /** How many Sessions the next sync will download, for the "syncing N" notice. Never throws. */
  pendingCount(live: Activity[], today: string): Promise<number>;
  /** Downloads and stores pending Sessions; returns how many were stored. Never throws: it runs after the response. */
  sync(live: Activity[], today: string): Promise<number>;
  /** The manual wipe. */
  wipe(): Promise<void>;
}

const zero = (): Promise<number> => Promise.resolve(0);
const nothing = (): Promise<void> => Promise.resolve();

// No Garmin key: detail comes from the sample parser, and nothing is synced or stored.
const demo: SessionStore = {
  detail: (id) => Promise.resolve(sampleDetail(id)),
  z2: (ids) =>
    Promise.resolve(
      Object.fromEntries(
        ids.flatMap((id) => {
          const m = sampleDetail(id).metrics;
          return m.z2Speed != null && m.z2Hr != null ? [[id, { speed: m.z2Speed, hr: m.z2Hr }]] : [];
        }),
      ),
    ),
  pendingCount: zero,
  sync: zero,
  wipe: nothing,
};

// Real Garmin data but no database: nothing is stored.
const off: SessionStore = { detail: () => Promise.resolve(null), z2: () => Promise.resolve({}), pendingCount: zero, sync: zero, wipe: nothing };

const neon: SessionStore = { detail: storedDetail, z2: storedZ2, pendingCount, sync: (live, today) => syncActivities(live, today), wipe: deleteStored };

// Reads the environment on each call, like the handlers did.
export function sessionStore(): SessionStore {
  if (!process.env.GARMIN_API_KEY) return demo;
  return process.env.DATABASE_URL ? neon : off;
}

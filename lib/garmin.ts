// Garmin Connect Personal API client. Endpoints and field names follow Garmin's Swagger spec
// (developer.garmin.com/gc-developer-program/personal/swagger-docs).
import type { Activity, Day, RawActivity, RawDaily, RawHrv, RawInput, RawSleep, Skipped } from './types.js';

const BASE = 'https://personal.connectapi.garmin.com';
let tok: { value: string | null; at: number } = { value: null, at: 0 };

// Garmin returns the bare JWT as plain text; also accept a JSON body in case that changes.
export function parseToken(raw: string): string {
  const body = raw.trim();
  if (!body.startsWith('{') && !body.startsWith('"')) return body;
  const j = JSON.parse(body) as string | { access_token?: string; accessToken?: string; token?: string };
  return typeof j === 'string' ? j : (j.access_token ?? j.accessToken ?? j.token ?? '');
}

export async function token(): Promise<string> {
  if (tok.value && Date.now() - tok.at < 23 * 3600e3) return tok.value; // tokens last 24h, no refresh tokens
  const r = await fetch(`${BASE}/personalapitoken-service/personal-api/personal-api-key/token`, {
    method: 'POST',
    headers: { Authorization: `ApiKey ${process.env.GARMIN_API_KEY}` },
  });
  if (!r.ok) throw new Error(`Garmin token exchange failed (${r.status}); the API key may be wrong or expired`);
  const value = parseToken(await r.text());
  if (!value) throw new Error('Garmin token response had no access token');
  tok = { value, at: Date.now() };
  return value;
}

async function get<T>(path: string, params: Record<string, string | number> = {}, retry = true): Promise<T | null> {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const r = await fetch(url, { headers: { Authorization: `Bearer ${await token()}` } });
  if (r.status === 401 && retry) {
    tok = { value: null, at: 0 };
    return get<T>(path, params, false);
  }
  if (!r.ok) throw new Error(`Garmin ${path} returned ${r.status}`);
  const text = await r.text();
  return text ? (JSON.parse(text) as T) : null;
}

export const addDays = (d: string, n: number): string => {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};

// Split [start, end] (inclusive ISO dates) into windows of at most `size` days.
export function ranges(start: string, end: string, size: number): [string, string][] {
  const out: [string, string][] = [];
  for (let s = start; s <= end; s = addDays(s, size)) out.push([s, addDays(s, size - 1) < end ? addDays(s, size - 1) : end]);
  return out;
}

// "HH:MM" wall-clock time from Garmin's local timestamp, which the spec types only as a string:
// an ISO-like string is read as written, and epoch milliseconds are taken as already shifted to local time.
export function clock(ts: string | number | null | undefined): string | null {
  if (ts == null || ts === '') return null;
  const m = /[T\s](\d{2}):(\d{2})/.exec(String(ts));
  if (m) return `${m[1]}:${m[2]}`;
  const ms = Number(ts);
  return Number.isFinite(ms) && ms > 1e11 ? new Date(ms).toISOString().slice(11, 16) : null;
}

const hours = (s: number | null | undefined): number | null => (s == null ? null : Math.round((s / 3600) * 100) / 100);

export function normalize({ daily = [], hrv = [], sleep = [], acts = [] }: Partial<RawInput>): { days: Day[]; activities: Activity[]; skipped: Skipped } {
  const by = new Map<string, Day>();
  const row = (date: string): Day => {
    let r = by.get(date);
    if (!r) by.set(date, (r = { date }));
    return r;
  };
  // Records without a date can't be placed on the timeline; count them instead of crashing.
  const skipped: Skipped = { daily: 0, hrv: 0, sleep: 0, activities: 0 };
  const dated = <T extends { calendarDate?: string | null }>(list: (T | null)[], key: keyof Skipped): (T & { calendarDate: string })[] =>
    list.filter((x): x is T & { calendarDate: string } => !!x?.calendarDate || (skipped[key]++, false));

  for (const d of dated<RawDaily>(daily, 'daily')) {
    const im = d.intensityMinutes;
    Object.assign(row(d.calendarDate), {
      steps: d.movement?.steps?.value ?? null,
      stepGoal: d.movement?.steps?.goal ?? null,
      distanceM: d.movement?.steps?.distanceInMeters ?? null,
      calories: d.calories?.burnedTotal ?? null,
      restingHr: d.heartRate?.restingValue ?? null,
      // Vigorous minutes count double toward Garmin's weekly goal.
      intensityMin: im ? (im.moderate ?? 0) + 2 * (im.vigorous ?? 0) : null,
      stress: d.stress?.avgLevel ?? null,
      bbHigh: d.bodyBattery?.maxValue ?? null,
      bbLow: d.bodyBattery?.minValue ?? null,
    });
  }
  for (const h of dated<RawHrv>(hrv, 'hrv')) Object.assign(row(h.calendarDate), { hrv: h.lastNightAvg ?? null, hrvWeekly: h.weeklyAvg ?? null });
  for (const s of dated<RawSleep>(sleep, 'sleep')) {
    Object.assign(row(s.calendarDate), {
      sleepH: hours(s.sleepTimeSeconds),
      deepH: hours(s.deepSleepSeconds),
      remH: hours(s.remSleepSeconds),
      lightH: hours(s.lightSleepSeconds),
      awakeH: hours(s.awakeSleepSeconds),
      sleepScore: s.sleepScores?.overall?.value ?? null,
      bedtime: clock(s.sleepStartTimestampLocal),
      wake: clock(s.sleepEndTimestampLocal),
    });
  }

  const activities = acts
    .filter((a): a is RawActivity => !!a?.startTimeLocal || (skipped.activities++, false))
    .map((a): Activity => ({
      id: a.activityId,
      date: String(a.startTimeLocal).slice(0, 10),
      name: a.activityName ?? '',
      type: a.activityType?.typeKey ?? '',
      minutes: a.duration == null ? null : Math.round(a.duration / 60),
      km: a.distance == null ? null : Math.round(a.distance / 10) / 100,
      avgHr: a.averageHR ?? null,
      load: a.activityTrainingLoad ?? null,
      te: a.aerobicTrainingEffect ?? null,
      zones: [a.hrTimeInZone_1, a.hrTimeInZone_2, a.hrTimeInZone_3, a.hrTimeInZone_4, a.hrTimeInZone_5].map((s) => s ?? 0), // seconds
    }));

  return { days: [...by.values()].sort((a, b) => a.date.localeCompare(b.date)), activities, skipped };
}

// Sequential within one endpoint (gentle on unknown rate limits); endpoints run in parallel.
const windows = async <T>(start: string, end: string, size: number, call: (s: string, e: string) => Promise<T>): Promise<T[]> => {
  const out: T[] = [];
  for (const [s, e] of ranges(start, end, size)) out.push(await call(s, e));
  return out;
};

// The browser sends its local date so "today" is right in any timezone; anything invalid, or more than a day
// away from UTC (no timezone is further), is ignored in favour of the UTC date.
export function pickToday(param: string | null | undefined, now = new Date()): string {
  const utc = now.toISOString().slice(0, 10);
  if (param == null || !/^\d{4}-\d{2}-\d{2}$/.test(param)) return utc;
  const t = Date.parse(`${param}T00:00:00Z`);
  if (Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== param) return utc; // rejects 2026-02-31
  return Math.abs(t - Date.parse(`${utc}T00:00:00Z`)) <= 86400e3 ? param : utc;
}

export async function fetchRaw(days: number, end = new Date().toISOString().slice(0, 10)): Promise<RawInput> {
  const start = addDays(end, -(days - 1));

  const activities = async (): Promise<RawActivity[]> => {
    const all: RawActivity[] = [];
    for (let offset = 0; offset < 2000; offset += 99) {
      const page = (await get<RawActivity[]>('/activitylist-service/activities/search/activities', { startDate: start, endDate: end, start: offset, limit: 99 })) ?? [];
      all.push(...page);
      if (page.length < 99) break;
    }
    return all;
  };

  const [daily, hrv, sleep, acts] = await Promise.all([
    get<{ data?: RawDaily[] }>('/usersummary-service/v2/dailysummaries', { startDate: start, endDate: end }),
    windows(start, end, 28, (s, e) => get<{ hrvSummaries?: RawHrv[] }>(`/hrv-service/hrv/daily/${s}/${e}`)),
    windows(start, end, 30, (s, e) => get<RawSleep[]>('/sleep-service/sleep/dailySleepSummariesByDate', { startDate: s, endDate: e })),
    activities(),
  ]);

  return {
    daily: daily?.data ?? [],
    hrv: hrv.flatMap((r) => r?.hrvSummaries ?? []),
    sleep: sleep.flatMap((r) => r ?? []),
    acts,
  };
}

export const fetchAll = async (days: number, end?: string): Promise<{ days: Day[]; activities: Activity[]; skipped: Skipped }> =>
  normalize(await fetchRaw(days, end));

// Field names and value types only, never values, so it is safe to paste when diagnosing a mismatch with the spec.
const kind = (v: unknown, depth = 0): unknown =>
  v === null ? 'null' : Array.isArray(v) ? `array(${v.length})` : typeof v === 'object' ? (depth < 1 ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, kind(x, depth + 1)])) : 'object') : typeof v;
type DatedRow = { calendarDate?: unknown; startTimeLocal?: unknown };
export const shape = (raw: RawInput): Record<string, { count: number; first: unknown; nullDates: number }> =>
  Object.fromEntries(
    (Object.entries(raw) as [string, (DatedRow | null)[]][]).map(([k, list]) => [
      k,
      { count: list.length, first: kind(list[0] ?? null), nullDates: list.filter((x) => !(x?.calendarDate || x?.startTimeLocal)).length },
    ]),
  );

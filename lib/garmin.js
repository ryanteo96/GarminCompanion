// Garmin Connect Personal API client. Endpoints and field names follow Garmin's Swagger spec
// (developer.garmin.com/gc-developer-program/personal/swagger-docs).
const BASE = 'https://personal.connectapi.garmin.com';
let tok = { value: null, at: 0 };

// Garmin returns the bare JWT as plain text; also accept a JSON body in case that changes.
export function parseToken(raw) {
  const body = raw.trim();
  if (!body.startsWith('{') && !body.startsWith('"')) return body;
  const j = JSON.parse(body);
  return typeof j === 'string' ? j : (j.access_token ?? j.accessToken ?? j.token);
}

export async function token() {
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

async function get(path, params = {}, retry = true) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const r = await fetch(url, { headers: { Authorization: `Bearer ${await token()}` } });
  if (r.status === 401 && retry) {
    tok = { value: null, at: 0 };
    return get(path, params, false);
  }
  if (!r.ok) throw new Error(`Garmin ${path} returned ${r.status}`);
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

export const addDays = (d, n) => {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};

// Split [start, end] (inclusive ISO dates) into windows of at most `size` days.
export function ranges(start, end, size) {
  const out = [];
  for (let s = start; s <= end; s = addDays(s, size)) out.push([s, addDays(s, size - 1) < end ? addDays(s, size - 1) : end]);
  return out;
}

const hours = (s) => (s == null ? null : Math.round((s / 3600) * 100) / 100);

export function normalize({ daily = [], hrv = [], sleep = [], acts = [] }) {
  const by = new Map();
  const row = (date) => by.get(date) ?? by.set(date, { date }).get(date);
  // Records without a date can't be placed on the timeline; count them instead of crashing.
  const skipped = { daily: 0, hrv: 0, sleep: 0, activities: 0 };
  const dated = (list, key) => list.filter((x) => x?.calendarDate || (skipped[key]++, false));

  for (const d of dated(daily, 'daily')) {
    const im = d.intensityMinutes;
    Object.assign(row(d.calendarDate), {
      steps: d.movement?.steps ?? null,
      calories: d.calories?.burnedTotal ?? null,
      restingHr: d.heartRate?.restingValue ?? null,
      // Vigorous minutes count double toward Garmin's weekly goal.
      intensityMin: im ? (im.moderate ?? 0) + 2 * (im.vigorous ?? 0) : null,
      stress: d.stress?.avgLevel ?? null,
      bbHigh: d.bodyBattery?.maxValue ?? null,
      bbLow: d.bodyBattery?.minValue ?? null,
    });
  }
  for (const h of dated(hrv, 'hrv')) Object.assign(row(h.calendarDate), { hrv: h.lastNightAvg ?? null, hrvWeekly: h.weeklyAvg ?? null });
  for (const s of dated(sleep, 'sleep')) {
    Object.assign(row(s.calendarDate), {
      sleepH: hours(s.sleepTimeSeconds),
      deepH: hours(s.deepSleepSeconds),
      remH: hours(s.remSleepSeconds),
      lightH: hours(s.lightSleepSeconds),
      awakeH: hours(s.awakeSleepSeconds),
      sleepScore: s.sleepScores?.overall?.value ?? null,
    });
  }

  const activities = acts.filter((a) => a?.startTimeLocal || (skipped.activities++, false)).map((a) => ({
    id: a.activityId,
    date: String(a.startTimeLocal).slice(0, 10),
    name: a.activityName ?? '',
    type: a.activityType?.typeKey ?? '',
    minutes: a.duration == null ? null : Math.round(a.duration / 60),
    km: a.distance == null ? null : Math.round(a.distance / 10) / 100,
    avgHr: a.averageHR ?? null,
    load: a.activityTrainingLoad ?? null,
    te: a.aerobicTrainingEffect ?? null,
    zones: [1, 2, 3, 4, 5].map((i) => a[`hrTimeInZone_${i}`] ?? 0), // seconds
  }));

  return { days: [...by.values()].sort((a, b) => a.date.localeCompare(b.date)), activities, skipped };
}

// Sequential within one endpoint (gentle on unknown rate limits); endpoints run in parallel.
const windows = async (start, end, size, call) => {
  const out = [];
  for (const [s, e] of ranges(start, end, size)) out.push(await call(s, e));
  return out;
};

export async function fetchRaw(days) {
  const end = new Date().toISOString().slice(0, 10);
  const start = addDays(end, -(days - 1));

  const activities = async () => {
    const all = [];
    for (let offset = 0; offset < 2000; offset += 99) {
      const page = (await get('/activitylist-service/activities/search/activities', { startDate: start, endDate: end, start: offset, limit: 99 })) ?? [];
      all.push(...page);
      if (page.length < 99) break;
    }
    return all;
  };

  const [daily, hrv, sleep, acts] = await Promise.all([
    get('/usersummary-service/v2/dailysummaries', { startDate: start, endDate: end }),
    windows(start, end, 28, (s, e) => get(`/hrv-service/hrv/daily/${s}/${e}`)),
    windows(start, end, 30, (s, e) => get('/sleep-service/sleep/dailySleepSummariesByDate', { startDate: s, endDate: e })),
    activities(),
  ]);

  return {
    daily: daily?.data ?? [],
    hrv: hrv.flatMap((r) => r?.hrvSummaries ?? []),
    sleep: sleep.flatMap((r) => r ?? []),
    acts,
  };
}

export const fetchAll = async (days) => normalize(await fetchRaw(days));

// Field names and value types only, never values, so it is safe to paste when diagnosing a mismatch with the spec.
const kind = (v, depth = 0) =>
  v === null ? 'null' : Array.isArray(v) ? `array(${v.length})` : typeof v === 'object' ? (depth < 1 ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, kind(x, depth + 1)])) : 'object') : typeof v;
export const shape = (raw) =>
  Object.fromEntries(Object.entries(raw).map(([k, list]) => [k, { count: list.length, first: kind(list[0] ?? null), nullDates: list.filter((x) => !(x?.calendarDate || x?.startTimeLocal)).length }]));

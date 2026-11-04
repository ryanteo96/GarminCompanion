// Pure analysis helpers. Browser module, also imported by tests.
export const mean = (a) => {
  const v = a.filter((x) => x != null);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
};
const sd = (a) => {
  const m = mean(a);
  const v = a.filter((x) => x != null);
  return v.length > 1 ? Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1)) : null;
};
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

export const shift = (date, n) => {
  const t = new Date(`${date}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};

export const weekStart = (date) => {
  const dow = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
  return shift(date, -dow);
};

export function corr(pairs) {
  const n = pairs.length;
  if (n < 3) return { r: null, n };
  const mx = mean(pairs.map((p) => p[0]));
  const my = mean(pairs.map((p) => p[1]));
  let sxy = 0, sxx = 0, syy = 0;
  for (const [x, y] of pairs) {
    sxy += (x - mx) * (y - my);
    sxx += (x - mx) ** 2;
    syy += (y - my) ** 2;
  }
  return { r: sxx && syy ? sxy / Math.sqrt(sxx * syy) : null, n };
}

// Attach each day's total training load (sum of activity loads).
export function withLoad(days, activities) {
  const byDate = new Map();
  for (const a of activities) byDate.set(a.date, (byDate.get(a.date) ?? 0) + (a.load ?? 0));
  return days.map((d) => ({ ...d, load: byDate.get(d.date) ?? 0 }));
}

// Heuristic, not a Garmin metric: how today's HRV, resting HR, sleep and Body Battery compare with
// your own previous 28 days. 60 = typical for you; each standard deviation moves it 20 points.
export function readiness(days) {
  let i = days.length - 1;
  while (i >= 0 && (days[i].hrv == null || days[i].sleepH == null)) i--;
  if (i < 7) return null;
  const parts = [['hrv', 1], ['restingHr', -1], ['sleepH', 1], ['bbHigh', 1]]
    .map(([k, sign]) => {
      const b = base_(days, i, k);
      const s = sd(b);
      return days[i][k] == null || s == null || b.filter((x) => x != null).length < 7 || s === 0
        ? null
        : { k, z: (sign * (days[i][k] - mean(b))) / s, value: days[i][k], base: mean(b) };
    })
    .filter(Boolean);
  if (parts.length < 2) return null;
  const score = Math.round(clamp(60 + 20 * mean(parts.map((p) => p.z)), 0, 100));
  const [state, label, head] =
    score >= 70 ? ['well', 'Well recovered', 'Good day for a hard session']
    : score >= 50 ? ['typical', 'Typical for you', 'A normal training day fits']
    : score >= 30 ? ['below', 'Below usual', 'Take it easier today']
    : ['strained', 'Strained', 'Keep today easy'];
  return { score, label, state, head, date: days[i].date, parts };
}

const base_ = (days, i, k) => days.slice(Math.max(0, i - 28), i).map((d) => d[k]);

const PHRASE = {
  hrv: ['HRV is low', 'HRV is high'],
  restingHr: ['resting HR is high', 'resting HR is low'],
  sleepH: ['sleep was short', 'sleep was long'],
  bbHigh: ['Body Battery peaked low', 'Body Battery peaked high'],
};

// One plain sentence naming the drivers that sit at least 1 standard deviation from your norm.
export function explain(r) {
  const notable = r.parts.filter((p) => Math.abs(p.z) >= 1).sort((a, b) => Math.abs(b.z) - Math.abs(a.z)).slice(0, 3).map((p) => PHRASE[p.k][p.z < 0 ? 0 : 1]);
  if (!notable.length) return 'Everything is close to your own 28-day norm.';
  const list = notable.length > 1 ? `${notable.slice(0, -1).join(', ')} and ${notable.at(-1)}` : notable[0];
  return `${list[0].toUpperCase()}${list.slice(1)}, compared with your own last 28 days.`;
}

// Acute (7-day sum) vs chronic (28-day sum / 4) training load.
export function loadSeries(days) {
  const sum = (i, n) => days.slice(Math.max(0, i - n + 1), i + 1).reduce((s, d) => s + d.load, 0);
  return days.map((d, i) => {
    const acute = sum(i, 7);
    const chronic = i >= 27 ? sum(i, 28) / 4 : null;
    return { date: d.date, acute, chronic, ratio: chronic ? acute / chronic : null };
  });
}

export const ratioLabel = (r) =>
  r == null ? 'Not enough history' : r < 0.8 ? 'Lighter than usual' : r <= 1.3 ? 'In your sweet spot' : r <= 1.5 ? 'Ramping up' : 'Spiking';

export function weekly(days, key, agg = 'sum') {
  const g = new Map();
  for (const d of days) {
    if (d[key] == null) continue;
    const w = weekStart(d.date);
    g.set(w, [...(g.get(w) ?? []), d[key]]);
  }
  return [...g].map(([week, v]) => ({ week, v: agg === 'sum' ? v.reduce((s, x) => s + x, 0) : mean(v) }));
}

const INSIGHTS = [
  { id: 'sleep-hrv', x: 'sleepH', y: 'hrv', lag: 0, xs: 'Longer sleep', ys: 'HRV that night' },
  { id: 'load-hrv', x: 'load', y: 'hrv', lag: 1, xs: "A heavier training day", ys: "next morning's HRV" },
  { id: 'steps-sleep', x: 'steps', y: 'sleepH', lag: 1, xs: 'A higher-step day', ys: "that night's sleep duration" },
  { id: 'sleep-bb', x: 'sleepH', y: 'bbHigh', lag: 0, xs: 'Longer sleep', ys: 'peak Body Battery the next day' },
  { id: 'stress-rhr', x: 'stress', y: 'restingHr', lag: 1, xs: 'A higher-stress day', ys: "next day's resting heart rate" },
];

export function insights(days) {
  const by = new Map(days.map((d) => [d.date, d]));
  return INSIGHTS.map((def) => {
    const pairs = [];
    for (const d of days) {
      const x = by.get(shift(d.date, -def.lag))?.[def.x];
      if (x != null && d[def.y] != null) pairs.push([x, d[def.y]]);
    }
    const { r, n } = corr(pairs);
    const a = r == null ? 0 : Math.abs(r);
    const strength = a < 0.2 ? 'no clear' : a < 0.4 ? 'a weak' : a < 0.6 ? 'a moderate' : 'a strong';
    let text;
    if (n < 14 || r == null) text = `Not enough overlapping days yet (${n}; need 14).`;
    else if (a < 0.2) text = `No clear link between these across ${n} days.`;
    else text = `Across ${n} days, ${def.xs.toLowerCase()} went with ${r > 0 ? 'higher' : 'lower'} ${def.ys}: ${strength} ${r > 0 ? 'positive' : 'negative'} relationship (r = ${r.toFixed(2)}). Correlation, not proof of cause.`;
    return { ...def, r, n, text };
  });
}

// Last 7 days vs the 21 days before them.
export function weekDeltas(days) {
  const recent = days.slice(-7);
  const before = days.slice(-28, -7);
  return [
    ['hrv', 'HRV', 'ms'], ['restingHr', 'Resting HR', 'bpm'], ['sleepH', 'Sleep', 'h'],
    ['steps', 'Steps', ''], ['stress', 'Stress', ''], ['load', 'Training load', ''],
  ].flatMap(([k, label, unit]) => {
    const now = mean(recent.map((d) => d[k]));
    const prev = mean(before.map((d) => d[k]));
    return now == null || prev == null || prev === 0 ? [] : [{ k, label, unit, now, prev, pct: ((now - prev) / prev) * 100 }];
  });
}

import { friendly } from './errors.js';
import { ago } from './time.js';
import { band, explain, insights, loadSeries, mean, ratioLabel, readiness, rolling, weekDeltas, weekly, withLoad } from './stats.js';

const $ = (id) => document.getElementById(id);
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const TABS = ['recovery', 'training', 'activity', 'insights'];
let state = null;
let tab = TABS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'recovery';
const charts = {};

const fmtDate = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
const num = (x, dp = 0) => (x == null ? '—' : (Math.round(x * 10 ** dp) / 10 ** dp).toLocaleString());
const hm = (h) => (h == null ? '—' : `${Math.floor(h)}h ${String(Math.round((h % 1) * 60)).padStart(2, '0')}m`);
const latest = (key) => state.days.findLast((d) => d[key] != null)?.[key] ?? null;
const avg7 = (key) => mean(state.days.slice(-7).map((d) => d[key]));
const text = (el, s) => ((el.textContent = s), el);

// ---------- drawing helpers ----------
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function kpis(id, items) {
  $(id).replaceChildren(
    ...items.map((item) => {
      if (item instanceof Element) return item;
      const [label, value, sub, tag] = item;
      const card = document.createElement('div');
      card.className = 'card kpi';
      for (const [cls, t] of [['label', label], ['value', value], ['sub', sub], ['tag', tag]]) {
        if (t) card.append(text(Object.assign(document.createElement('div'), { className: cls }), t));
      }
      return card;
    }),
  );
}

const line = (label, data, color, dash = false) => ({
  label, data, borderColor: color, backgroundColor: color, borderWidth: 2, tension: 0.25, spanGaps: true,
  pointRadius: data.length > 60 ? 0 : 2, borderDash: dash ? [6, 4] : [],
});
const bar = (label, data, color) => ({ label, data, backgroundColor: color, borderRadius: 2 });
const alpha = (hex, a) => hex + Math.round(a * 255).toString(16).padStart(2, '0'); // tokens are #rrggbb

// Faint raw readings, a bold 7-day line, and optionally the shaded 28-day normal range behind them.
function trend(values, color, name, withBand = false) {
  const lines = [
    { ...line(name, values, alpha(color, 0.5)), borderWidth: 1, pointRadius: 0 },
    { ...line('7-day average', rolling(values), color), borderWidth: 3, pointRadius: 0 },
  ];
  if (!withBand) return lines;
  const b = band(values);
  const edge = { borderWidth: 0, pointRadius: 0, spanGaps: true, noTip: true };
  return [
    { label: '_low', data: b.map((x) => x?.lo ?? null), fill: false, ...edge },
    { label: 'Your normal range', data: b.map((x) => x?.hi ?? null), fill: '-1', backgroundColor: alpha(css('--s2'), 0.22), swatch: 'rect', ...edge },
    ...lines,
  ];
}

function el(ns, tag, attrs = {}) {
  const node = document.createElementNS(ns, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

// Body Battery as a battery: the fill is the day's peak.
function batteryCard(value, sub) {
  const SVG = 'http://www.w3.org/2000/svg';
  const card = document.createElement('div');
  card.className = 'card kpi';
  const svg = el(SVG, 'svg', { viewBox: '0 0 44 22', class: 'battery', role: 'img', 'aria-label': value == null ? 'Body Battery peak unavailable' : `Body Battery peak ${value} out of 100` });
  const pct = Math.max(0, Math.min(100, value ?? 0));
  svg.append(
    el(SVG, 'rect', { x: 1, y: 1, width: 38, height: 20, rx: 4, class: 'bat-shell' }),
    el(SVG, 'rect', { x: 40, y: 7, width: 3, height: 8, rx: 1, class: 'bat-cap' }),
    el(SVG, 'rect', { x: 3, y: 3, width: (34 * pct) / 100, height: 16, rx: 2, class: 'bat-fill' }),
  );
  const row = document.createElement('div');
  row.className = 'valrow';
  row.append(svg, text(Object.assign(document.createElement('div'), { className: 'value' }), num(value)));
  card.append(
    text(Object.assign(document.createElement('div'), { className: 'label' }), 'Body Battery peak'),
    row,
    text(Object.assign(document.createElement('div'), { className: 'sub' }), sub),
  );
  return card;
}

// Last night's stage totals as one proportional bar. Garmin's API gives totals and bed/wake times, not a per-minute timeline.
const STAGES = [['deep', 'Deep', 'deepH'], ['rem', 'REM', 'remH'], ['light', 'Light', 'lightH'], ['awake', 'Awake', 'awakeH']];
const clock12 = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return new Date(2000, 0, 1, h, m).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };

function night() {
  const host = $('night');
  const row = state.days.findLast((x) => x.sleepH != null);
  host.hidden = !row;
  if (!row) return;
  const total = STAGES.reduce((t, [, , k]) => t + (row[k] ?? 0), 0);
  text($('night-head'), `Last night, ${fmtDate(row.date)}: ${hm(row.sleepH)} asleep`);
  const bar_ = $('nightbar');
  const key = $('nightkey');
  bar_.hidden = key.hidden = total <= 0;
  bar_.replaceChildren();
  key.replaceChildren();
  if (total > 0) {
    for (const [cls, name, k] of STAGES) {
      if (!(row[k] > 0)) continue;
      const seg = document.createElement('i');
      seg.className = `stage-${cls}`;
      seg.style.width = `${(row[k] / total) * 100}%`;
      bar_.append(seg);
      const li = document.createElement('li');
      li.append(Object.assign(document.createElement('i'), { className: `stage-${cls}` }), text(document.createElement('span'), `${name} ${hm(row[k])} (${Math.round((row[k] / total) * 100)}%)`));
      key.append(li);
    }
    bar_.setAttribute('aria-label', `Last night's sleep stages: ${STAGES.filter(([, , k]) => row[k] > 0).map(([, name, k]) => `${name} ${hm(row[k])}`).join(', ')}.`);
  }
  text($('night-times'), row.bedtime && row.wake ? `In bed ${clock12(row.bedtime)}, up ${clock12(row.wake)}.` : total > 0 ? '' : 'Stage detail is not available for this night.');
}

function describe(name, values, unit = '') {
  const v = values.filter((x) => x != null);
  if (!v.length) return `${name}: no data.`;
  return `${name}: latest ${num(v.at(-1), 1)}${unit}, average ${num(mean(v), 1)}${unit}, range ${num(Math.min(...v), 1)} to ${num(Math.max(...v), 1)}${unit} over ${v.length} points.`;
}

function draw(id, type, labels, datasets, { stacked = false, summary, horizontal = false, whole = false, yRange = {} } = {}) {
  charts[id]?.destroy();
  const el = $(id);
  const host = el.parentElement;
  host.querySelector('.empty')?.remove();
  const empty = datasets.every((d) => d.data.every((v) => v == null));
  el.hidden = empty;
  if (empty) {
    el.setAttribute('aria-label', 'No data for this period.');
    host.append(Object.assign(text(document.createElement('p'), 'No data for this period.'), { className: 'empty muted' }));
    return;
  }
  el.setAttribute('aria-label', summary ?? '');
  const mfg = css('--mfg');
  // About one label per 72px keeps date labels from running together on a phone.
  const maxTicks = Math.max(3, Math.min(8, Math.floor((host.clientWidth || 360) / 72)));
  const axis = { ticks: { color: mfg, maxTicksLimit: horizontal ? 8 : maxTicks, maxRotation: 0, autoSkipPadding: 12 }, stacked };
  charts[id] = new Chart(el, {
    type,
    data: { labels, datasets },
    options: {
      indexAxis: horizontal ? 'y' : 'x',
      responsive: true,
      maintainAspectRatio: false,
      animation: reduced ? false : { duration: 300 },
      interaction: { mode: 'index', intersect: false },
      font: { family: '"Fira Sans", system-ui, sans-serif' },
      plugins: {
        legend: {
          display: datasets.filter((d) => !d.label.startsWith('_')).length > 1,
          labels: {
            color: mfg, usePointStyle: true, boxWidth: 14, boxHeight: 8,
            // Lines get a line swatch (dashed stays dashed), bars and the range band a filled one.
            generateLabels: (chart) => Chart.defaults.plugins.legend.labels.generateLabels(chart).filter((l) => !l.text.startsWith('_')).map((l) => {
              const ds = chart.data.datasets[l.datasetIndex];
              const isLine = (ds.type ?? type) === 'line' && ds.swatch !== 'rect';
              return { ...l, pointStyle: isLine ? 'line' : 'rectRounded', lineDash: ds.borderDash ?? [], lineWidth: isLine ? 3 : 0, strokeStyle: isLine ? ds.borderColor : l.fillStyle };
            }),
          },
        },
        tooltip: {
          filter: (item) => !item.dataset.noTip,
          callbacks: { label: (c) => `${c.dataset.label}: ${Array.isArray(c.raw) ? c.raw.join(' to ') : c.formattedValue}` },
        },
      },
      scales: {
        x: { ...axis, grid: { display: horizontal, color: css('--border') } },
        y: { ...axis, ticks: { color: mfg, precision: whole ? 0 : undefined }, grid: { display: !horizontal, color: css('--border') }, beginAtZero: type === 'bar' || horizontal, ...yRange },
      },
    },
  });
}

// ---------- panels ----------
const DRIVER = { hrv: ['HRV', 'ms'], restingHr: ['Resting HR', 'bpm'], sleepH: ['Sleep', 'h'], bbHigh: ['Body Battery peak', ''] };
const fmtVal = (k, v) => (k === 'sleepH' ? hm(v) : `${num(v)}${DRIVER[k][1] ? ` ${DRIVER[k][1]}` : ''}`);

function today(r, days) {
  const el = $('today');
  el.hidden = false;
  const lastDate = days.at(-1).date;
  const ratio = loadSeries(days).at(-1).ratio;
  if (!r) {
    el.dataset.state = '';
    text($('today-h'), 'Not enough data yet');
    text($('today-detail'), 'Readiness needs about a week of HRV and sleep history to compare against.');
    for (const sel of ['#today-load', '.today-score', '#drivers']) el.querySelector(sel).hidden = true;
    return;
  }
  for (const sel of ['#today-load', '.today-score', '#drivers']) el.querySelector(sel).hidden = false;
  el.dataset.state = r.state;
  text($('today-h'), r.head);
  text($('today-detail'), explain(r));
  text($('today-load'), ratio == null ? '' : `Training load ratio ${ratio.toFixed(2)}: ${ratioLabel(ratio).toLowerCase()}.`);
  text($('score-n'), String(r.score));
  text($('score-state'), r.label);
  text($('today-date'), r.date === lastDate ? `Based on ${fmtDate(r.date)}.` : `Based on ${fmtDate(r.date)}. Garmin has not reported ${fmtDate(lastDate)} yet.`);
  const scale = $('scale');
  scale.setAttribute('aria-label', `Readiness ${r.score} out of 100, ${r.label}. Zones: under 30 strained, 30 to 49 below usual, 50 to 69 typical, 70 and up well recovered.`);
  $('marker').style.left = `${r.score}%`;
  scale.querySelectorAll('.tick').forEach((t) => (t.style.left = `${t.dataset.pos}%`));
  $('drivers').replaceChildren(
    ...r.parts.map((p) => {
      const side = p.z > 0 ? 'pos' : 'neg';
      const w = Math.min(Math.abs(p.z) / 2.5, 1) * 50;
      const word = p.z >= 0.5 ? 'better than usual' : p.z <= -0.5 ? 'worse than usual' : 'about usual';
      const row = document.createElement('div');
      row.className = 'driver';
      const name = document.createElement('div');
      name.className = 'name';
      name.append(text(document.createElement('b'), DRIVER[p.k][0]), text(document.createElement('span'), word));
      const track = document.createElement('div');
      track.className = 'dtrack';
      const fill = document.createElement('div');
      fill.className = `dfill ${Math.abs(p.z) < 0.5 ? '' : side}`;
      fill.style.width = `${w}%`;
      fill.style[p.z > 0 ? 'left' : 'right'] = '50%';
      track.append(fill);
      const vs = text(document.createElement('div'), `${fmtVal(p.k, p.value)}, usual ${fmtVal(p.k, p.base)}`);
      vs.className = 'vs';
      row.append(name, track, vs);
      return row;
    }),
  );
}

function recovery() {
  const d = state.days, dates = d.map((x) => fmtDate(x.date)), col = (k) => d.map((x) => x[k]);
  const r = readiness(d);
  today(r, d);
  const sleepScore = latest('sleepScore');
  kpis('k-recovery', [
    ['HRV, last night', `${num(latest('hrv'))} ms`, `7-day avg ${num(avg7('hrv'))} ms`],
    ['Resting HR', `${num(latest('restingHr'))} bpm`, `7-day avg ${num(avg7('restingHr'))} bpm`],
    ['Sleep', hm(latest('sleepH')), sleepScore == null ? '' : `Score ${num(sleepScore)}`],
    batteryCard(latest('bbHigh'), `7-day avg ${num(avg7('bbHigh'))}`),
  ]);
  const s1 = css('--s1');
  draw('c-hrv', 'line', dates, trend(col('hrv'), s1, 'Last night', true), { summary: describe('HRV', col('hrv'), ' ms'), whole: true });
  draw('c-rhr', 'line', dates, trend(col('restingHr'), s1, 'Resting HR', true), { summary: describe('Resting heart rate', col('restingHr'), ' bpm'), whole: true });
  const range = d.map((x) => (x.bbLow != null && x.bbHigh != null ? [x.bbLow, x.bbHigh] : null));
  draw('c-bb', 'bar', dates, [{ ...bar('Daily range', range, css('--bb')), borderSkipped: false }], { summary: describe('Body Battery daily high', col('bbHigh')), yRange: { min: 0, max: 100 } });
  night();
  sleepChart(d);
}

// Nightly bars for a month or less; weekly averages beyond that, where 90 slim bars read as texture.
function sleepChart(d) {
  const nightly = d.length <= 31;
  const stage = (k) => (nightly ? d.map((x) => x[k]) : [...byWeek(d, k).values()]);
  const labels = nightly ? d.map((x) => fmtDate(x.date)) : [...byWeek(d, 'sleepH').keys()].map(fmtDate);
  text($('cap-sleep'), nightly ? 'Sleep stages, nightly (hours)' : 'Sleep stages, weekly average per night (hours)');
  const seg = (name, k, token) => ({ ...bar(name, stage(k), css(token)), borderColor: css('--card'), borderWidth: 1 });
  draw('c-sleep', 'bar', labels, [seg('Deep', 'deepH', '--sl-deep'), seg('REM', 'remH', '--sl-rem'), seg('Light', 'lightH', '--sl-light'), seg('Awake', 'awakeH', '--sl-awake')], { stacked: true, summary: describe('Total sleep', d.map((x) => x.sleepH), ' h') });
}
const byWeek = (d, k) => new Map(weekly(d, k, 'mean').map((x) => [x.week, x.v]));

function training() {
  const d = state.days, ls = loadSeries(d), last = ls.at(-1);
  const since = (n) => d.at(-n)?.date ?? '0000';
  const wk = state.activities.filter((a) => a.date >= since(7));
  kpis('k-training', [
    ['7-day load', num(last.acute), 'sum of activity training load'],
    ['Usual weekly load', num(last.chronic), '28-day average per week'],
    ['Load ratio', last.ratio == null ? '—' : last.ratio.toFixed(2), '7-day ÷ usual week', ratioLabel(last.ratio)],
    ['Sessions, 7 days', String(wk.length), `${num(wk.reduce((s, a) => s + (a.minutes ?? 0), 0) / 60, 1)} h total`],
  ]);
  const s1 = css('--s1'), s2 = css('--s2');
  const w = weekly(d, 'load');
  draw('c-wload', 'bar', w.map((x) => fmtDate(x.week)), [bar('Load', w.map((x) => x.v), s1)], { summary: describe('Weekly training load', w.map((x) => x.v)) });
  draw('c-ac', 'line', ls.map((x) => fmtDate(x.date)), [line('Acute (7-day)', ls.map((x) => x.acute), s1), line('Chronic (weekly avg)', ls.map((x) => x.chronic), s2, true)], { summary: describe('Acute training load', ls.map((x) => x.acute)) });

  const z = [0, 0, 0, 0, 0];
  for (const a of state.activities) if (a.date >= since(28)) a.zones.forEach((s, i) => (z[i] += s / 60));
  const names = ['Z1 Warm-up', 'Z2 Easy', 'Z3 Aerobic', 'Z4 Threshold', 'Z5 Maximum'];
  draw('c-zones', 'bar', names, [bar('Minutes', z.map((m) => Math.round(m)), ['--z1', '--z2', '--z3', '--z4', '--z5'].map(css))], { horizontal: true, summary: `Minutes per heart-rate zone: ${names.map((n, i) => `${n} ${Math.round(z[i])}`).join(', ')}.` });

  const recent = [...state.activities].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).slice(0, 10);
  $('acts-list').replaceChildren(
    ...recent.map((a) => {
      const li = document.createElement('li');
      const top = document.createElement('div');
      top.className = 'a-top';
      top.append(Object.assign(text(document.createElement('span'), a.name || a.type.replaceAll('_', ' ')), { className: 'a-name' }), Object.assign(text(document.createElement('span'), fmtDate(a.date)), { className: 'a-date' }));
      const meta = [a.type.replaceAll('_', ' '), a.minutes != null && `${num(a.minutes)} min`, a.km != null && `${num(a.km, 1)} km`, a.avgHr != null && `${num(a.avgHr)} bpm`, a.load != null && `load ${num(a.load)}`].filter(Boolean);
      const facts = Object.assign(document.createElement('div'), { className: 'a-meta' });
      facts.append(...meta.map((f) => text(document.createElement('span'), f)));
      li.append(top, facts);
      return li;
    }),
  );
  const body = $('acts').tBodies[0];
  body.replaceChildren(
    ...recent.map((a) => {
      const tr = document.createElement('tr');
      [fmtDate(a.date), a.name, a.type.replaceAll('_', ' '), num(a.minutes), num(a.km, 1), num(a.avgHr), num(a.load)].forEach((v, i) => {
        const td = text(document.createElement('td'), v);
        if (i > 2) td.className = 'num';
        tr.append(td);
      });
      return tr;
    }),
  );
}

function activity() {
  const d = state.days, dates = d.map((x) => fmtDate(x.date)), col = (k) => d.map((x) => x[k]);
  const roll = d.map((_, i) => mean(d.slice(Math.max(0, i - 6), i + 1).map((x) => x.steps)));
  const im = weekly(d, 'intensityMin');
  const thisWeek = im.at(-1)?.v;
  kpis('k-activity', [
    ['Steps, latest day', num(latest('steps')), `7-day avg ${num(avg7('steps'))}`],
    ['Intensity minutes', num(thisWeek), 'this week, goal 150', thisWeek >= 150 ? 'Goal reached' : ''],
    ['Calories burned', num(latest('calories')), `7-day avg ${num(avg7('calories'))}`],
    ['Average stress', num(latest('stress')), `7-day avg ${num(avg7('stress'))}`],
  ]);
  const s1 = css('--s1'), s2 = css('--s2');
  draw('c-steps', 'bar', dates, [bar('Steps', col('steps'), alpha(s1, 0.45)), { ...line('7-day average', roll, s1), type: 'line', borderWidth: 3, pointRadius: 0 }], { summary: describe('Daily steps', col('steps')) });
  draw('c-im', 'bar', im.map((x) => fmtDate(x.week)), [bar('Intensity minutes', im.map((x) => x.v), s1), { ...line('Goal', im.map(() => 150), s2, true), type: 'line', pointRadius: 0 }], { summary: describe('Weekly intensity minutes', im.map((x) => x.v)) });
  draw('c-stress', 'line', dates, trend(col('stress'), s1, 'Average stress'), { summary: describe('Average stress', col('stress')), whole: true });
}

function insightsPanel() {
  $('deltas').tBodies[0].replaceChildren(
    ...weekDeltas(state.days).map((x) => {
      const tr = document.createElement('tr');
      const dir = Math.abs(x.pct) < 1 ? 'flat' : x.pct > 0 ? '▲ up' : '▼ down';
      [`${x.label}${x.unit ? ` (${x.unit})` : ''}`, num(x.now, x.now < 100 ? 1 : 0), num(x.prev, x.prev < 100 ? 1 : 0), `${dir} ${Math.abs(x.pct).toFixed(1)}%`].forEach((v, i) => {
        const td = text(document.createElement('td'), v);
        if (i) td.className = 'num';
        tr.append(td);
      });
      return tr;
    }),
  );
  $('insights').replaceChildren(
    ...insights(state.days).map((i) => {
      const card = document.createElement('div');
      card.className = 'card insight';
      card.append(
        text(document.createElement('div'), `${i.xs} → ${i.ys}`),
        text(Object.assign(document.createElement('div'), { className: 'r' }), i.r == null ? 'r = —' : `r = ${i.r.toFixed(2)}`),
        text(document.createElement('p'), i.text),
      );
      return card;
    }),
  );
}

const PANELS = { recovery, training, activity, insights: insightsPanel };

function render() {
  if (!state) return;
  try {
    PANELS[tab]();
  } catch (e) {
    notify(`Couldn't draw this view: ${e.message}`);
  }
  scrollFocus();
}

// A scrolling region must be reachable by keyboard; one that fits is not a tab stop.
function scrollFocus() {
  document.querySelectorAll('.tablewrap').forEach((w) => (w.tabIndex = w.scrollWidth > w.clientWidth ? 0 : -1));
}

// Re-lay out when the width changes (rotation, window resize); height-only changes (mobile URL bar) are ignored.
let lastW = innerWidth;
let resizeTimer;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (innerWidth !== lastW) { lastW = innerWidth; render(); } }, 250);
});

// ---------- tabs ----------
function select(next, focus = false) {
  tab = next;
  for (const t of TABS) {
    const btn = $(`t-${t}`);
    btn.setAttribute('aria-selected', String(t === tab));
    btn.tabIndex = t === tab ? 0 : -1;
    $(`p-${t}`).hidden = t !== tab;
  }
  history.replaceState(null, '', `#${tab}`);
  if (focus) $(`t-${tab}`).focus();
  render();
}

document.querySelector('.tabs').addEventListener('click', (e) => e.target.dataset.tab && select(e.target.dataset.tab));
document.querySelector('.tabs').addEventListener('keydown', (e) => {
  const i = TABS.indexOf(tab);
  const to = { ArrowRight: (i + 1) % 4, ArrowLeft: (i + 3) % 4, Home: 0, End: 3 }[e.key];
  if (to !== undefined) (e.preventDefault(), select(TABS[to], true));
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', render);

// ---------- data + login ----------
const VIEWS = ['boot', 'login', 'error', 'app'];
function show(view) {
  for (const v of VIEWS) $(v).hidden = v !== view;
  if (view === 'login') $('pw').focus();
  if (view === 'error') $('err-retry').focus();
}

function notify(msg, retry = false) {
  $('notice').hidden = !msg;
  text($('notice-text'), msg ?? '');
  $('notice-retry').hidden = !retry;
}

// Cache the last good payload per range so a bad connection still shows something. It lives in this
// browser only and is wiped on logout/401; shortcut: no encryption, anyone with this browser profile can read it.
const CACHE = 'gc:data:';
const saveCache = (days, payload) => { try { localStorage.setItem(CACHE + days, JSON.stringify({ savedAt: Date.now(), payload })); } catch { /* storage full or blocked */ } };
const loadCache = (days) => { try { return JSON.parse(localStorage.getItem(CACHE + days)); } catch { return null; } };
const wipeCache = () => { try { Object.keys(localStorage).filter((k) => k.startsWith(CACHE)).forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ } };

let fresh = null;
function showFresh() {
  if (!fresh) return;
  const u = $('updated');
  text(u, `${fresh.label} ${ago(fresh.ts)}`);
  u.title = new Date(fresh.ts).toLocaleString();
}
setInterval(showFresh, 60000);

let inflight = null;
async function fetchData(days) {
  inflight?.abort();
  const ctl = (inflight = new AbortController());
  const timer = setTimeout(() => ctl.abort('timeout'), 25000);
  try {
    const r = await fetch(`/api/data?days=${days}`, { signal: ctl.signal });
    if (r.status === 401) return (await r.text(), { unauthorized: true });
    const j = await r.json().catch(() => ({}));
    return r.ok ? { j } : { err: { status: r.status, message: j.error ?? `HTTP ${r.status}` } };
  } catch (e) {
    if (ctl.signal.aborted && ctl.signal.reason !== 'timeout') return { superseded: true }; // a newer request replaced this one
    return { err: { status: ctl.signal.reason === 'timeout' ? 'timeout' : 0, message: e.message } };
  } finally {
    clearTimeout(timer);
  }
}

function apply(j, stale) {
  state = { ...j, days: withLoad(j.days, j.activities) };
  show('app');
  const skipped = Object.values(j.skipped ?? {}).reduce((a, b) => a + b, 0);
  if (stale) {
    const [title] = friendly(stale.err);
    notify(`Showing data saved ${new Date(stale.savedAt).toLocaleString()}. ${title}.`, true);
  } else {
    notify(skipped ? `${skipped} Garmin records had no date and were left out.` : '');
  }
  $('demo').hidden = !j.demo;
  fresh = stale ? { ts: stale.savedAt, label: 'Last synced' } : { ts: Date.parse(j.fetchedAt), label: 'Updated' };
  showFresh();
  select(tab);
}

async function load() {
  const days = $('range').value;
  if (state) text($('updated'), 'Refreshing…');
  else show('boot');
  const out = await fetchData(days);
  if (out.superseded) return;
  if (out.unauthorized) return (state = null, wipeCache(), show('login'));
  if (out.j) {
    saveCache(days, out.j);
    return apply(out.j, null);
  }
  const cached = loadCache(days);
  if (cached) return apply(cached.payload, { savedAt: cached.savedAt, err: out.err });
  const [title, hint] = friendly(out.err);
  text($('err-title'), title);
  text($('err-hint'), hint);
  text($('err-detail'), out.err.message && out.err.status !== 0 ? `Details: ${out.err.message}` : ''); // offline detail is browser jargon
  show('error');
}

$('range').addEventListener('change', load);
$('err-retry').addEventListener('click', load);
$('notice-retry').addEventListener('click', load);
$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('login-err');
  const btn = e.target.querySelector('button');
  err.hidden = true;
  btn.disabled = true;
  try {
    const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: $('pw').value }) });
    if (r.ok) return void (($('pw').value = ''), load());
    text(err, (await r.json().catch(() => ({}))).error ?? 'Login failed').hidden = false;
  } catch {
    text(err, "Can't reach the dashboard. Check your connection and try again.").hidden = false;
  } finally {
    btn.disabled = false;
  }
});

load();

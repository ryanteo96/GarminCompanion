import { friendly } from './errors.js';
import { ago } from './time.js';
import { band, explain, insights, isPartialWeek, loadSeries, loadSummary, mean, ratioLabel, ratioPos, readiness, rolling, verdict, verdictTone, weekDeltas, weekly, withLoad } from './stats.js';

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
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const localToday = () => ymd(new Date());
const fmtStamp = (ts) => new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const lastRow = (key) => state.days.findLast((d) => d[key] != null);
// Most recent day Garmin reported anything for; readings older than this are labelled with their own date.
const newest = () => state.days.findLast((d) => ['steps', 'hrv', 'sleepH', 'restingHr'].some((k) => d[k] != null))?.date;
const withAge = (key, sub) => {
  const r = lastRow(key);
  return [r && r.date < newest() ? `From ${fmtDate(r.date)}` : '', sub].filter(Boolean).join(' · ');
};
// "Steps, today so far" while the day is still running, otherwise the day it is from.
const dayLabel = (key, base) => {
  const r = lastRow(key);
  return !r ? base : `${base}, ${r.date === localToday() ? 'today so far' : fmtDate(r.date)}`;
};
const text = (el, s) => ((el.textContent = s), el);

// ---------- drawing helpers ----------
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
// Chart.js reads the font from its defaults; a per-chart options.font.family is ignored by this build.
Chart.defaults.font.family = css('--sans');

const SVG = 'http://www.w3.org/2000/svg';
const node = (tag, cls, content) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (content != null) n.textContent = content;
  return n;
};

function el(ns, tag, attrs = {}) {
  const n = document.createElementNS(ns, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
}

// The last 14 days as a line that scales to its own range, with your usual drawn dashed behind it. Gaps break the line.
function spark([values, usual, label]) {
  const seen = values.filter((v) => v != null);
  if (seen.length < 2) return null;
  const all = usual == null ? seen : [...seen, usual];
  const lo = Math.min(...all), span = Math.max(...all) - lo || 1;
  const X = (i) => ((i / (values.length - 1)) * 120).toFixed(1);
  const Y = (v) => (37 - ((v - lo) / span) * 34).toFixed(1);
  const svg = el(SVG, 'svg', { viewBox: '0 0 120 40', preserveAspectRatio: 'none', class: 'spark', role: 'img', 'aria-label': label });
  if (usual != null) svg.append(el(SVG, 'path', { class: 'usual', d: `M0 ${Y(usual)}H120` }));
  svg.append(el(SVG, 'path', { d: values.map((v, i) => (v == null ? '' : `${values[i - 1] == null ? 'M' : 'L'}${X(i)} ${Y(v)}`)).join('') }));
  return svg;
}

// A drawn icon in the same stroke family as the tab icons; decorative, so the words beside it carry the meaning.
const icon = (d, cls = '') => {
  const svg = el(SVG, 'svg', { viewBox: '0 0 24 24', class: `ico ${cls}`.trim(), 'aria-hidden': 'true' });
  svg.append(el(SVG, 'path', { d }));
  return svg;
};

// Body Battery as a battery: the fill is the day's peak.
function battery(value) {
  const svg = el(SVG, 'svg', { viewBox: '0 0 44 22', class: 'battery', 'aria-hidden': 'true' });
  svg.append(
    el(SVG, 'rect', { x: 1, y: 1, width: 38, height: 20, rx: 4, class: 'bat-shell' }),
    el(SVG, 'rect', { x: 40, y: 7, width: 3, height: 8, rx: 1, class: 'bat-cap' }),
    el(SVG, 'rect', { x: 3, y: 3, width: (34 * Math.max(0, Math.min(100, value ?? 0))) / 100, height: 16, rx: 2, class: 'bat-fill' }),
  );
  return svg;
}

// One metric card in its signal's ink: label and verdict pill, the value, how it compares, and an optional 14-day line.
function metric({ ink, label, value, unit, subs = [], pill, glyph, series, progress }) {
  const card = node('div', 'card metric');
  card.dataset.ink = ink;
  const head = node('div', 'mhead');
  head.append(node('span', 'mdot'), node('span', null, label));
  if (pill) head.append(node('span', `pill ${pill[0]}`, pill[1]));
  const val = node('div', 'mval');
  if (glyph) val.append(glyph);
  val.append(node('span', null, value));
  if (unit) val.append(node('span', 'unit', unit));
  card.append(head, val, ...subs.filter(Boolean).map((t) => node('div', 'msub', t)));
  const sp = series && spark(series);
  if (sp) card.append(sp);
  if (progress != null) {
    const track = node('div', 'goalbar');
    const fill = node('i');
    fill.style.width = `${Math.max(0, Math.min(1, progress)) * 100}%`;
    track.append(fill);
    card.append(track);
  }
  return card;
}

// Last 14 days of one signal, with its usual (or null) as the dashed reference.
function series14(k, name, usual, f = num) {
  const v = state.days.slice(-14).map((x) => x[k]);
  const seen = v.filter((x) => x != null);
  return [v, usual, seen.length ? `${name}, last 14 days: ${f(Math.min(...seen))} to ${f(Math.max(...seen))}` : name];
}

const line = (label, data, color, dash = false) => ({
  label, data, borderColor: color, backgroundColor: color, borderWidth: 2, cubicInterpolationMode: 'monotone', spanGaps: true, // monotone: smooth without overshooting between points
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
  const edge = { borderWidth: 0, pointRadius: 0, spanGaps: true, noTip: true, cubicInterpolationMode: 'monotone' };
  return [
    { label: '_low', data: b.map((x) => x?.lo ?? null), fill: false, ...edge },
    { label: 'Your normal range', data: b.map((x) => x?.hi ?? null), fill: '-1', backgroundColor: alpha(css('--mfg'), 0.18), swatch: 'rect', ...edge }, // neutral: amber means "reference line" and went muddy on dark
    ...lines,
  ];
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

function draw(id, type, labels, datasets, { stacked = false, summary, horizontal = false, whole = false, yRange = {}, tipTitle } = {}) {
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
          callbacks: { ...(tipTitle && { title: tipTitle }), label: (c) => `${c.dataset.label}: ${Array.isArray(c.raw) ? c.raw.join(' to ') : c.formattedValue}` },
        },
      },
      scales: {
        x: { ...axis, grid: { display: horizontal, color: css('--rule') } },
        y: { ...axis, ticks: { color: mfg, precision: whole ? 0 : undefined }, grid: { display: !horizontal, color: css('--rule') }, beginAtZero: type === 'bar' || horizontal, ...yRange },
      },
    },
  });
}

// ---------- panels ----------
// The four signals behind the readiness score, each as a card that says how it compares with your usual.
const SIGNALS = [['hrv', 'hrv', 'HRV, last night', 'ms'], ['restingHr', 'rhr', 'Resting HR', 'bpm'], ['sleepH', 'sleep', 'Sleep', ''], ['bbHigh', 'bb', 'Body Battery peak', '']];

function recoveryCards(r) {
  const sleepScore = latest('sleepScore');
  return SIGNALS.map(([k, ink, label, unit]) => {
    const value = latest(k);
    const f = k === 'sleepH' ? hm : num;
    const p = r?.parts.find((x) => x.k === k && x.value === value); // only compare the reading the score used
    const u = unit && ` ${unit}`;
    let delta = '', pill = null;
    if (p) {
      const diff = value - p.base;
      const shown = k === 'sleepH' ? Math.round(Math.abs(diff) * 60) : Math.round(Math.abs(diff));
      delta = shown === 0 ? `At your usual ${f(p.base)}${u}` : `${diff > 0 ? '+' : '−'}${f(Math.abs(diff))}${u} vs usual ${f(p.base)}${u}`;
      pill = p.z >= 0.5 ? ['good', 'Better'] : p.z <= -0.5 ? ['bad', 'Worse'] : ['', 'About usual'];
    }
    return metric({
      ink, label, pill, value: f(value), unit: k === 'sleepH' || k === 'bbHigh' ? '' : unit,
      glyph: k === 'bbHigh' ? battery(value) : null,
      subs: [delta, withAge(k, k === 'sleepH' && sleepScore != null ? `Score ${num(sleepScore)}` : '')],
      series: series14(k, label, p?.base ?? null, f),
    });
  });
}

function today(r, days) {
  const el = $('today');
  el.hidden = false;
  const ratio = loadSeries(days).at(-1).ratio;
  if (!r) {
    el.dataset.state = '';
    el.dataset.tone = '';
    text($('today-h'), 'Not enough data yet');
    text($('today-detail'), 'Readiness needs about a week of HRV and sleep history to compare against.');
    for (const sel of ['#today-load', '.today-score', '#today-date', '#today-chip']) el.querySelector(sel).hidden = true;
    return;
  }
  for (const sel of ['#today-load', '.today-score']) el.querySelector(sel).hidden = false;
  el.dataset.state = r.state;
  el.dataset.tone = verdictTone(r, ratio);
  text($('today-h'), verdict(r, ratio));
  text($('today-detail'), explain(r));
  text($('today-load'), ratio == null ? '' : `Training load ratio ${ratio.toFixed(2)}: ${ratioLabel(ratio).toLowerCase()}.`);
  text($('score-n'), String(r.score));
  text($('score-state'), r.label);
  // A reading that isn't from today gets a chip at the top, where the verdict is read, with what to do about it.
  const stale = r.date < localToday();
  $('today-chip').hidden = !stale;
  if (stale) text($('today-chip'), `Based on ${fmtDate(r.date)}, not today. Garmin hasn't reported today yet: sync your watch, then Refresh.`);
  $('today-date').hidden = stale;
  text($('today-date'), `Based on ${fmtDate(r.date)}.`);
  const scale = $('scale');
  scale.setAttribute('aria-label', `Readiness ${r.score} out of 100, ${r.label}. Zones: under 30 strained, 30 to 49 below usual, 50 to 69 typical, 70 and up well recovered.`);
  $('marker').style.left = `${r.score}%`;
  scale.querySelectorAll('.tick').forEach((t) => (t.style.left = `${t.dataset.pos}%`));
}

function recovery() {
  const d = state.days, dates = d.map((x) => fmtDate(x.date)), col = (k) => d.map((x) => x[k]);
  const r = readiness(d);
  today(r, d);
  $('k-recovery').replaceChildren(...recoveryCards(r));
  draw('c-hrv', 'line', dates, trend(col('hrv'), css('--ink-hrv'), 'Daily HRV', true), { summary: describe('HRV', col('hrv'), ' ms'), whole: true });
  draw('c-rhr', 'line', dates, trend(col('restingHr'), css('--ink-rhr'), 'Resting HR', true), { summary: describe('Resting heart rate', col('restingHr'), ' bpm'), whole: true });
  // Ninety floating bars read as a solid wall, so past a month the peak is a line with its usual range, like HRV.
  const bbBars = d.length <= 31;
  text($('cap-bb'), bbBars ? 'Body Battery, daily low to high' : 'Body Battery, daily peak');
  if (bbBars) {
    const range = d.map((x) => (x.bbLow != null && x.bbHigh != null ? [x.bbLow, x.bbHigh] : null));
    draw('c-bb', 'bar', dates, [{ ...bar('Daily range', range, css('--ink-bb')), borderSkipped: false }], { summary: describe('Body Battery daily high', col('bbHigh')), yRange: { min: 0, max: 100 } });
  } else {
    draw('c-bb', 'line', dates, trend(col('bbHigh'), css('--ink-bb'), 'Daily peak', true), { summary: describe('Body Battery daily peak', col('bbHigh')), whole: true, yRange: { max: 100 } });
  }
  night();
  sleepChart(d);
}

// Nightly bars for a month or less; weekly averages beyond that, where 90 slim bars read as texture.
function sleepChart(d) {
  const nightly = d.length <= 31;
  const stage = (k) => (nightly ? d.map((x) => x[k]) : [...byWeek(d, k).values()]);
  const labels = nightly ? d.map((x) => fmtDate(x.date)) : [...byWeek(d, 'sleepH').keys()].map(fmtDate);
  text($('cap-sleep'), nightly ? 'Sleep stages, nightly (hours)' : 'Sleep stages, weekly average per night (hours)');
  const seg = (name, k, token) => ({ ...bar(name, stage(k), css(token)), borderColor: css('--panel'), borderWidth: 1 });
  draw('c-sleep', 'bar', labels, [seg('Deep', 'deepH', '--sl-deep'), seg('REM', 'remH', '--sl-rem'), seg('Light', 'lightH', '--sl-light'), seg('Awake', 'awakeH', '--sl-awake')], { stacked: true, summary: `Sleep stages (deep, REM, light, awake) in hours. ${describe('Total sleep', d.map((x) => x.sleepH), ' h')}`, tipTitle: nightly ? undefined : (items) => `Week of ${items[0].label}` });
}
const byWeek = (d, k) => new Map(weekly(d, k, 'mean').map((x) => [x.week, x.v]));

// Weeks start Monday. A week the data only partly covers is drawn lighter and named in the tooltip.
function weekBars(w, d, color) {
  const first = d[0].date, last = d.at(-1).date;
  const partial = w.map((x) => isPartialWeek(x.week, first, last));
  return {
    any: partial.some(Boolean),
    colors: w.map((_, i) => (partial[i] ? alpha(color, 0.45) : color)),
    title: (items) => `Week of ${items[0].label}${partial[items[0].dataIndex] ? (w[items[0].dataIndex].week < first ? ' (partial week)' : ' (so far)') : ''}`,
    last: partial.at(-1),
  };
}

// One two-line session row, shared by the Training hero and the phone activity list.
function sessionItem(a) {
  const li = document.createElement('li');
  const top = document.createElement('div');
  top.className = 'a-top';
  top.append(Object.assign(text(document.createElement('span'), a.name || a.type.replaceAll('_', ' ')), { className: 'a-name' }), Object.assign(text(document.createElement('span'), fmtDate(a.date)), { className: 'a-date' }));
  const meta = [a.type.replaceAll('_', ' '), a.minutes != null && `${num(a.minutes)} min`, a.km != null && `${num(a.km, 1)} km`, a.avgHr != null && `${num(a.avgHr)} bpm`, a.load != null && `load ${num(a.load)}`].filter(Boolean);
  const facts = Object.assign(document.createElement('div'), { className: 'a-meta' });
  facts.append(...meta.map((f) => text(document.createElement('span'), f)));
  li.append(top, facts);
  return li;
}
const newestFirst = (a, b) => b.date.localeCompare(a.date) || b.id - a.id;

function loadHero(last, since) {
  const el = $('load');
  const s = loadSummary(last);
  el.dataset.state = el.dataset.tone = s.tone;
  text($('load-h'), s.head);
  text($('load-detail'), s.detail);
  $('load-score').hidden = last.ratio == null;
  if (last.ratio != null) {
    text($('load-n'), last.ratio.toFixed(2));
    text($('load-state'), ratioLabel(last.ratio));
    const scale = $('load-scale');
    scale.setAttribute('aria-label', `Load ratio ${last.ratio.toFixed(2)}, ${ratioLabel(last.ratio).toLowerCase()}. Zones: under 0.8 lighter than usual, 0.8 to 1.3 sweet spot, 1.3 to 1.5 ramping up, above 1.5 spiking.`);
    $('load-marker').style.left = `${ratioPos(last.ratio)}%`;
    scale.querySelectorAll('.tick').forEach((t) => (t.style.left = `${t.dataset.pos}%`));
  }
  const week = state.activities.filter((a) => a.date >= since(7));
  const hours = week.reduce((t, a) => t + (a.minutes ?? 0), 0) / 60;
  const three = [...state.activities].sort(newestFirst).slice(0, 3);
  text($('sessions-h'), three.length ? `Your last ${three.length} session${three.length === 1 ? '' : 's'}: ${week.length ? `${week.length} in the last 7 days, ${num(hours, 1)} h` : 'none in the last 7 days'}` : 'No sessions recorded in this range');
  $('sessions').replaceChildren(...three.map(sessionItem));
}

function training() {
  const d = state.days, ls = loadSeries(d), last = ls.at(-1);
  const since = (n) => d.at(-n)?.date ?? '0000';
  loadHero(last, since);
  const w = weekly(d, 'load');
  const wk_ = weekBars(w, d, css('--ink-load'));
  text($('cap-wload'), `Weekly training load${wk_.any ? ' (lighter = partial week)' : ''}`);
  draw('c-wload', 'bar', w.map((x) => fmtDate(x.week)), [bar('Load', w.map((x) => x.v), wk_.colors)], { summary: describe('Weekly training load', w.map((x) => x.v)), tipTitle: wk_.title });
  draw('c-ac', 'line', ls.map((x) => fmtDate(x.date)), [line('Acute (7-day)', ls.map((x) => x.acute), css('--ink-load')), line('Chronic (weekly avg)', ls.map((x) => x.chronic), css('--mfg'), true)], { summary: `Acute (7-day) and chronic (28-day weekly average) training load. ${describe('Acute load', ls.map((x) => x.acute))}` });

  const z = [0, 0, 0, 0, 0];
  for (const a of state.activities) if (a.date >= since(28)) a.zones.forEach((s, i) => (z[i] += s / 60));
  const names = ['Z1 Warm-up', 'Z2 Easy', 'Z3 Aerobic', 'Z4 Threshold', 'Z5 Maximum'];
  draw('c-zones', 'bar', names, [bar('Minutes', z.map((m) => Math.round(m)), ['--z1', '--z2', '--z3', '--z4', '--z5'].map(css))], { horizontal: true, summary: `Minutes per heart-rate zone: ${names.map((n, i) => `${n} ${Math.round(z[i])}`).join(', ')}.` });

  const recent = [...state.activities].sort(newestFirst).slice(0, 10);
  $('acts-list').replaceChildren(...recent.map(sessionItem));
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
  const imBars = weekBars(im, d, css('--ink-int'));
  const avg28 = (k) => mean(d.slice(-28).map((x) => x[k]));
  $('k-activity').replaceChildren(
    metric({ ink: 'steps', label: dayLabel('steps', 'Steps'), value: num(latest('steps')), subs: [`7-day avg ${num(avg7('steps'))}`], series: series14('steps', 'Steps', avg28('steps')) }),
    metric({ ink: 'int', label: 'Intensity minutes', value: num(thisWeek), unit: 'min', subs: [`This week${imBars.last ? ' so far' : ''}, goal 150`, thisWeek != null && thisWeek < 150 ? `${num(150 - thisWeek)} min to go` : ''], pill: thisWeek >= 150 ? ['good', 'Goal reached'] : null, progress: thisWeek == null ? null : thisWeek / 150 }),
    metric({ ink: 'cal', label: dayLabel('calories', 'Calories burned'), value: num(latest('calories')), subs: [`7-day avg ${num(avg7('calories'))}`], series: series14('calories', 'Calories', avg28('calories')) }),
    metric({ ink: 'stress', label: dayLabel('stress', 'Average stress'), value: num(latest('stress')), subs: [`7-day avg ${num(avg7('stress'))}`], series: series14('stress', 'Average stress', avg28('stress')) }),
  );
  draw('c-steps', 'bar', dates, [bar('Steps', col('steps'), alpha(css('--ink-steps'), 0.45)), { ...line('7-day average', roll, css('--ink-steps')), type: 'line', borderWidth: 3, pointRadius: 0 }], { summary: describe('Daily steps', col('steps')) });
  text($('cap-im'), `Weekly intensity minutes${imBars.any ? ' (lighter = partial week)' : ''}`);
  draw('c-im', 'bar', im.map((x) => fmtDate(x.week)), [bar('Intensity minutes', im.map((x) => x.v), imBars.colors), { ...line('Goal', im.map(() => 150), css('--mfg'), true), type: 'line', pointRadius: 0 }], { summary: describe('Weekly intensity minutes', im.map((x) => x.v)), tipTitle: imBars.title });
  draw('c-stress', 'line', dates, trend(col('stress'), css('--ink-stress'), 'Average stress'), { summary: describe('Average stress', col('stress')), whole: true });
}

const emptyRow = (cols, msg) => {
  const tr = document.createElement('tr');
  tr.append(Object.assign(text(document.createElement('td'), msg), { colSpan: cols, className: 'muted' }));
  return tr;
};

function insightsPanel() {
  const through = newest();
  text($('deltas-h'), `Last 7 days vs the 21 days before${through ? ` (through ${fmtDate(through)})` : ''}`);
  const deltas = weekDeltas(state.days);
  $('deltas').tBodies[0].replaceChildren(
    ...(deltas.length ? [] : [emptyRow(4, 'Not enough history yet for a weekly comparison. It needs about a week of data plus earlier days to compare against.')]),
    ...deltas.map((x) => {
      const tr = document.createElement('tr');
      [`${x.label}${x.unit ? ` (${x.unit})` : ''}`, num(x.now, x.now < 100 ? 1 : 0), num(x.prev, x.prev < 100 ? 1 : 0)].forEach((v, i) => {
        const td = text(document.createElement('td'), v);
        if (i) td.className = 'num';
        tr.append(td);
      });
      // Say whether the move is good or bad, in words as well as colour; skip it for small changes and for load.
      const change = document.createElement('td');
      change.className = 'num';
      const pct = `${Math.abs(x.pct).toFixed(1)}%`;
      if (Math.abs(x.pct) < 1) change.append(`flat ${pct}`);
      else change.append(icon(x.pct > 0 ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6', 'arrow'), Object.assign(text(document.createElement('span'), x.pct > 0 ? ' up ' : ' down '), { className: 'sr-only' }), pct);
      if (x.good && Math.abs(x.pct) >= 3) {
        const better = Math.sign(x.pct) === x.good;
        change.append(' ', Object.assign(text(document.createElement('span'), better ? 'better' : 'worse'), { className: better ? 'good' : 'bad' }));
      }
      tr.append(change);
      return tr;
    }),
  );
  // Strongest relationship first and widest; weak ones step back.
  const ranked = [...insights(state.days)].sort((a, b) => Math.abs(b.r ?? 0) - Math.abs(a.r ?? 0));
  $('insight-cards').replaceChildren(
    ...ranked.map((i) => {
      const card = document.createElement('div');
      card.className = `card insight${Math.abs(i.r ?? 0) < 0.2 ? ' weak' : ''}`;
      const head = node('div', 'head');
      head.append(i.xs, icon('M5 12h14M13 6l6 6-6 6'), node('span', 'sr-only', ' goes with '), i.ys);
      let track = null;
      if (i.r != null) {
        track = document.createElement('div');
        track.className = 'dtrack';
        const fill = document.createElement('div');
        fill.className = 'dfill';
        fill.style.width = `${Math.abs(i.r) * 50}%`;
        fill.style[i.r > 0 ? 'left' : 'right'] = '50%';
        track.append(fill);
        track.setAttribute('role', 'img');
        track.setAttribute('aria-label', `Relationship strength ${i.r.toFixed(2)} on a scale from minus 1 to 1`);
      }
      card.append(
        head,
        text(Object.assign(document.createElement('div'), { className: 'r' }), i.r == null ? 'r = —' : `r = ${i.r.toFixed(2)}`),
        ...(track ? [track] : []),
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
const APP_TITLE = 'Garmin Companion';

function select(next, focus = false) {
  tab = next;
  for (const t of TABS) {
    const btn = $(`t-${t}`);
    btn.setAttribute('aria-selected', String(t === tab));
    btn.tabIndex = t === tab ? 0 : -1;
    $(`p-${t}`).hidden = t !== tab;
  }
  history.replaceState(null, '', `#${tab}`); // replaceState does not fire hashchange, so this cannot loop
  const name = $(`t-${tab}`).textContent.trim();
  text($('area'), name);
  document.title = `${name} · ${APP_TITLE}`;
  if (focus) $(`t-${tab}`).focus();
  render();
}

// A hash changed after load (typed, bookmarked link, another tab's link): follow it if it names a tab.
addEventListener('hashchange', () => {
  const h = location.hash.slice(1);
  if (TABS.includes(h) && h !== tab) select(h);
});

document.querySelector('.tabs').addEventListener('click', (e) => { const t = e.target.closest('[data-tab]'); if (t) select(t.dataset.tab); });
document.querySelector('.tabs').addEventListener('keydown', (e) => {
  const i = TABS.indexOf(tab);
  const to = { ArrowRight: (i + 1) % 4, ArrowDown: (i + 1) % 4, ArrowLeft: (i + 3) % 4, ArrowUp: (i + 3) % 4, Home: 0, End: 3 }[e.key];
  if (to !== undefined) (e.preventDefault(), select(TABS[to], true));
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', render);

// ---------- data + login ----------
const VIEWS = ['boot', 'login', 'error', 'app'];
// Set when the user acts inside a card that is about to close (the Unlock button disables itself, which already drops
// focus to <body>, so "was focus inside the card" cannot detect it).
let refocus = false;
function show(view) {
  // Only a card the user was working in (login, error) loses focus when it closes; a plain page load must leave
  // focus alone so the skip link is the first Tab stop.
  const lostFocus = refocus || ['login', 'error'].some((v) => $(v).contains(document.activeElement));
  if (view !== 'boot') refocus = false; // the loading view comes first and must not use it up
  for (const v of VIEWS) $(v).hidden = v !== view;
  $('skip').hidden = view !== 'app'; // nothing to skip to on the login, loading or error views
  if (view === 'login') $('pw').focus();
  if (view === 'error') $('err-retry').focus();
  if (view === 'login') document.title = `Sign in · ${APP_TITLE}`;
  else if (view !== 'app') document.title = APP_TITLE;
  if (view === 'app' && lostFocus) $(`t-${tab}`).focus({ preventScroll: true });
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
  // Keep the line short: the hero says which day it is based on and the cards say "From Nov 3", so the exact data date lives in the tooltip.
  text(u, [`${fresh.label} ${ago(fresh.ts)}`, fresh.behind && 'nothing for today yet'].filter(Boolean).join(' · '));
  u.title = `${new Date(fresh.ts).toLocaleString()}${fresh.through ? `. Latest data: ${fmtDate(fresh.through)}.` : ''}`;
}
setInterval(showFresh, 60000);

let inflight = null;
async function fetchData(days) {
  inflight?.abort();
  const ctl = (inflight = new AbortController());
  const timer = setTimeout(() => ctl.abort('timeout'), 25000);
  try {
    const r = await fetch(`/api/data?days=${days}&today=${localToday()}`, { signal: ctl.signal, cache: 'no-store' });
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
    notify(`Showing data saved ${fmtStamp(stale.savedAt)}. ${title}.`, true);
  } else {
    notify(skipped ? `${skipped} Garmin records had no date and were left out.` : '');
  }
  $('demo').hidden = !j.demo;
  const through = newest();
  fresh = { ...(stale ? { ts: stale.savedAt, label: 'Last synced' } : { ts: Date.parse(j.fetchedAt), label: 'Updated' }), through, behind: !through || through < localToday() };
  showFresh();
  select(tab);
}

let loading = 0;
async function load() {
  $('refresh').disabled = ++loading > 0;
  try {
    await loadOnce();
  } finally {
    $('refresh').disabled = --loading > 0;
  }
}

async function loadOnce() {
  const days = $('range').value;
  if (state) text($('updated'), 'Refreshing…');
  else show('boot');
  let out = await fetchData(days);
  if (out.superseded) return;
  if (out.unauthorized) return (state = null, wipeCache(), show('login'));
  if (out.j && !out.j.days?.length) out = { err: { status: 'empty', message: '' } }; // a 200 with nothing in it is not a dashboard
  if (out.j) {
    saveCache(days, out.j);
    apply(out.j, null);
    text($('sr-status'), `Data refreshed at ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`);
    return;
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
$('refresh').addEventListener('click', load);
$('showpw').addEventListener('change', (e) => ($('pw').type = e.target.checked ? 'text' : 'password'));
$('logout').addEventListener('click', async () => {
  let ended = true;
  try {
    ended = (await fetch('/api/logout', { method: 'POST' })).ok;
  } catch {
    ended = false; // offline: the session cookie is HttpOnly, so only the server can end it
  }
  state = null;
  wipeCache();
  show('login');
  if (!ended) text($('login-err'), "Signed out here, but couldn't reach the server to end the session. It will expire on its own.").hidden = false;
});
// Both retry buttons vanish when the retry succeeds, so ask for focus to move to the selected tab.
$('err-retry').addEventListener('click', () => { refocus = true; load(); });
$('notice-retry').addEventListener('click', () => { refocus = true; load(); });
$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('login-err');
  const btn = e.target.querySelector('button');
  err.hidden = true;
  btn.disabled = true;
  refocus = true;
  try {
    const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: $('pw').value }) });
    if (r.ok) return void (($('pw').value = ''), load());
    refocus = false;
    text(err, (await r.json().catch(() => ({}))).error ?? 'Login failed').hidden = false;
  } catch {
    refocus = false;
    text(err, "Can't reach the dashboard. Check your connection and try again.").hidden = false;
  } finally {
    btn.disabled = false;
  }
});

load();

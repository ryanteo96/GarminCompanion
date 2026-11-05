# Redesign the charts on visx

Date: 2026-11-05 (revised the same day after review). Status: awaiting review. Part 2 of 3 (after `2026-11-05-stylelint-design.md`).

## Goal

Replace Chart.js (canvas) with visx (SVG) and redesign all ten charts in the same step, so the new look is built once and not matched to Chart.js first. The charts become calmer, answer "is today normal for me" at a glance, read well under a thumb on a phone, and animate. Nothing on the home page depends on this piece (its trend cards use the hand-rolled `Spark`), so it can ship before or after that one.

Success means:

- No `chart.js` import or dependency remains. `npm run check` and `npm run test:e2e` pass.
- All ten charts (Recovery 4, Training 3, Activity 3) follow the design below in dark and light, at phone and laptop width.
- A readout line above each chart replaces the floating tooltip: at rest it shows the latest reading against your usual; while a finger or cursor is on the plot it shows that day.
- Charts animate on entry (below) and not at all under `prefers-reduced-motion`.
- `e2e/csp.spec.ts` passes under the production CSP with no violations.
- `DESIGN.md` is amended to match (below), so the design doc and the app agree.

## Non-goals

New chart types or new data; keyboard-operable scrubbing (today's tooltips are mouse and touch only; this stays that way and is cheap to add later); a data-table fallback for screen readers (charts keep their `aria-label` summary); animating `Spark`; morphing one dataset into another when the range changes (the chart redraws with its entry animation instead); automated visual regression; `@visx/xychart`; a JS animation library.

## Decisions

| Question | Decision |
|---|---|
| Library layer | visx primitives, not `@visx/xychart`: `@visx/scale`, `shape`, `curve`, `axis`, `grid`, `responsive` (all 4.0.0, React 19 compatible). xychart adds a `@react-spring/web` peer and does not obviously cover floating range bars or the band. `@visx/tooltip` is not used: the readout is plain React state |
| Structure | `src/chart.ts` stays the pure, unit-tested layer (series builders, domains, tick choice, nearest-index, readout rows, emphasis). `src/components/Chart.tsx` is the only code that draws |
| Colours | Series carry CSS values such as `var(--ink-hrv)`; opacity is `fill-opacity` / `stroke-opacity`. No new colour tokens. SVG presentation attributes are not inline styles, so `style-src 'self'` is unaffected |
| Animation | CSS keyframes in `style.css`, no library. The existing global `prefers-reduced-motion` rule already switches CSS animation off, so reduced motion is handled with no chart code |
| Phone first | Plot sizes, tick counts and the touch interaction are designed at phone width first and widened for the laptop |
| Scope of the redesign | Chart marks and chart chrome only. Cards, `MetricCard`, `Spark`, the readiness scale and `NightBar` are unchanged |

## Design

Every chart is: caption, readout line, plot. Only the stacked sleep chart also has a compact key.

**Readout (replaces the tooltip).**
- At rest it names the latest day with data and its values against your usual, for example "Nov 5 · 54 ms · usual 49 to 58". While the pointer is on the plot it shows the pointed day instead, with a vertical guide and a marker on the plot; it returns to the latest reading on release or leave.
- It sits above the plot so a thumb never covers it. The plot overlay uses `touch-action: pan-y`, so vertical page scrolling still works and horizontal movement scrubs.
- Rows: each visible series with its value, and the usual range where the chart has a band. Ranges read "20 to 95". Week charts say "Week of Oct 26", and a partial week says "(so far)" or "(partial week)" as today.

**Today against usual.**
- The latest point or bar is emphasised on every chart. Lines get a ring (a panel-coloured cut-out, the same device as the scale marker's halo) and an end value label. Bars: the latest bar is full strength and earlier bars are drawn at 60% opacity. A partial week is drawn as an outline (1.5px stroke, 20% fill) at any position, so "so far" never looks like "lower".
- The usual range band (the existing 28-day normal range, `band()`) now sits behind every trend line: HRV, resting heart rate, long-range Body Battery and, new, stress. Bar charts keep the reference they already have (the intensity goal, the steps 7-day line, acute versus chronic). Sleep stages and heart-rate zones have none.

**Calmer chrome.**
- No vertical gridlines and no axis lines. Three or four faint horizontal lines at nice values. About one date label per 90px, three to six in all, so a phone shows about three.
- No legend. The emphasised line is named at its right end, inside the plot, with its value, nudged apart if two labels would touch (for example "Acute" and "Chronic"). Faint raw series are named in the readout. The stacked sleep chart keeps a compact key because four stages cannot be labelled in place.

**Marks.**
- Lines are 3px with round caps (the faint raw series 1px). Single-line charts without a band get a single-ink gradient fade under the line (28% to 0%). Bars have 4px rounded tops and 2px gaps. Heart-rate zones keep one colour per bar with the value at the bar's end.

**Animation (CSS).**
- Lines draw in over about 600ms (`pathLength` set to 1 and a `stroke-dashoffset` keyframe). Bars grow from the baseline with a short stagger totalling at most 400ms, set per bar through a CSS custom property. The band and the gradient fade in over 300ms. The end labels and the latest-point ring appear last.
- It plays when a chart mounts (so each time a tab opens) and when the chart range changes. A background Refresh that returns data of the same shape updates the marks in place and does not replay. The component is keyed on the label count to get this.

## Per-chart plan

| Chart | Marks | Reference | End label |
|---|---|---|---|
| HRV (Recovery) | faint daily line, bold 7-day line | usual band | "7-day avg" |
| Resting HR (Recovery) | same | usual band | "7-day avg" |
| Body Battery, 31 days or fewer | floating low-to-high bars | none | none |
| Body Battery, longer | daily peak line and 7-day line | usual band | "7-day avg" |
| Sleep stages | stacked bars (nightly, or weekly beyond a month) | none; latest night marked by a baseline tick, no dimming, since segment colours carry meaning | none (key) |
| Weekly load (Training) | bars | none | none |
| Acute vs chronic | acute bold line, chronic dashed line | the chronic line | "Acute", "Chronic" |
| Heart-rate zones | horizontal bars, one colour each | none | value at bar end |
| Daily steps (Activity) | bars plus 7-day line | the 7-day line | "7-day avg" |
| Weekly intensity | bars plus dashed goal line | the goal | "Goal 150" |
| Stress | faint daily line, bold 7-day line | usual band (new) | "7-day avg" |

## Series model

```ts
type Num = number | null | undefined;
type Series =
  | { kind: 'line'; label: string; values: Num[]; color: string; dash?: boolean; width?: number; endLabel?: string; faint?: boolean }
  | { kind: 'bar'; label: string; values: Num[]; color: string | string[]; opacity?: number[]; outline?: boolean[] }
  | { kind: 'range'; label: string; values: ([number, number] | null)[]; color: string }
  | { kind: 'band'; label: string; lo: Num[]; hi: Num[]; color: string };
```

- `faint` keeps a line out of the end labels (it is named in the readout). `endLabel` is the text shown at the line's end beside its latest value.
- `opacity` is per bar (the latest-bar emphasis); `outline` is per bar (partial weeks); `color` as an array is per-bar colour (zones). A helper builds `opacity` from the values so panels do not repeat the rule.
- `DrawOpts` keeps `stacked`, `horizontal`, `whole`, `yRange`, `summary` and gains `fmt` (value formatter) and `unit`, which the readout needs; `tipTitle` becomes `readoutTitle: (index, label) => string`. `ChartEnv` is deleted.
- Lines drop null points and connect the rest (today's gap-spanning), with `curveMonotoneX`. Points other than the latest are not drawn.
- A chart with any `bar` or `range` series uses a band x scale and a y domain that includes zero; a line-only chart uses a point scale and fits the data. `yRange` overrides either.

## DESIGN.md changes (part of this piece)

- **Charts**: rewritten for visx SVG: the anatomy above, 230px tall and 210px on phone, the readout, emphasis, direct labels and the entry animation. The Chart.js version line goes.
- **The Flat Rule** and the "Don't add glows, gradients, drop shadows or blurred backdrops" line: amended so gradients are allowed in one place only, the single-ink fade under a chart line. Shadows, glows and blurs stay banned everywhere, and surfaces, controls and text stay flat. The latest-point ring is a cut-out, not a glow.
- **Shape**: bars in charts go from 2px to 4px rounded tops.
- **Motion**: the "300ms chart draw" becomes the 600ms line draw-in and the bar grow, still removed under reduced motion.
- **One Face Rule**: drops the `Chart.defaults.font.family` sentence; SVG text takes the system stack from CSS.

## Files

- Add: `src/components/Chart.tsx`.
- Rewrite: `src/chart.ts` (builders `line`, `bar`, `trend`, `weekBars`, `describe`, plus `domain`, `tickIndexes`, `nearestIndex`, `readoutRows`, `emphasis`), `src/components/ChartCard.tsx` (same props minus `type`; `canvasId` becomes the SVG `id`, so `c-hrv` and the other ids survive; it renders the readout).
- Change: `RecoveryPanel`, `TrainingPanel`, `ActivityPanel` (build `Series`, pass `var(--ink-*)`, add the band to stress, drop the `type` prop and the `useLayout` token use), `src/main.tsx` (remove `Chart.register` and the Chart.js font default), `src/style.css` (plot, readout, label and animation classes), `DESIGN.md`.
- Delete `src/layout.tsx` and its provider if a grep shows nothing else uses `useLayout` once the charts are migrated. If something does, keep it.
- Tests: `tests/chart.test.ts`, `e2e/helpers.ts` (`expectDrawn`), `e2e/charts.spec.ts` and `e2e/layout.spec.ts` (they count and inspect `canvas` elements).

## Tests

- Unit, ported: `describe`, `trend` (band is one `band` series plus the faint and 7-day lines), `weekBars` (partial weeks become outlines; the title names "partial week" and "so far").
- Unit, new: `domain` (bars include zero; ranges and band edges count; `yRange` overrides), `tickIndexes` (one per 90px, clamped to 3 to 6), `nearestIndex` (band and point scales, edges), `emphasis` (latest full strength, earlier at 60%, nulls skipped), `readoutRows` (rest versus pointed index, ranges, band "usual", the week and partial wording).
- E2E: `svg` charts are counted instead of `canvas:visible`; each keeps a non-empty `aria-label`; `expectDrawn` checks the chart has mark elements (`path` or `rect`) with a non-zero bounding box once the entry animation has finished (the helper waits for it). A series with no data still shows "No data for this period." A Playwright pointer move over a plot changes the readout and leaving restores it.
- No DOM component tests (same non-goal as the earlier restructure).

## Prototype gate

The plan's first task, before any panel migrates: a static prototype of three charts (the HRV banded trend, steps bars with the 7-day line, stacked sleep) in dark and light at phone and laptop width, with the entry animation and the readout working on sample data. The owner approves it, and any change to the look is made in this spec first. It can be published as a private page that opens on a phone. Verify under the production CSP that the two odd charts (floating range bars, banded trend) and the gradient render without violations.

## Risks

- This is now a redesign, so it is much larger than a library swap, and "calm but styled" can only be judged by eye. The prototype gate and a manual before/after screenshot pass over all ten charts (dark and light, phone and laptop) are the guard; E2E proves they draw, not that they look right.
- Scrubbing, nearest-point mapping and end-label collision are hand-built and are where regressions will hide.
- `DESIGN.md` is a user-confirmed document; the amendments above are deliberate and need the owner's sign-off in review.

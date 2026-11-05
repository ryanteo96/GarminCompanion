# Replace Chart.js with visx

Date: 2026-11-05. Status: awaiting review. Part 2 of 3 (after `2026-11-05-stylelint-design.md`).

## Goal

Draw every chart with visx (SVG) instead of Chart.js (canvas), and remove `chart.js`. This is a replacement, not a redesign: the same ten charts, the same data, colours, tooltips and legends. Nothing on the home page depends on it (its trend cards use the hand-rolled `Spark`), so it can ship before or after that piece.

Success means:

- No `chart.js` import or dependency remains. `npm run check` and `npm run test:e2e` pass.
- Each of the ten charts (Recovery 4, Training 3, Activity 3) renders the same shapes as today: smooth monotone lines that span gaps, the shaded "normal range" band, floating low-to-high Body Battery bars, stacked sleep stages, horizontal zone bars with one colour per bar, per-bar lighter partial weeks, a dashed goal line over bars, and the 7-day average over faint daily bars.
- Hover or touch shows one tooltip at the nearest x listing every visible series at that point (Chart.js "index" mode, `intersect: false`).
- Light and dark themes both draw correctly, and a theme or window-width change needs no JS rebuild.
- `e2e/csp.spec.ts` passes under the production CSP with no violations.

## Non-goals

New chart types or data; keyboard-operable tooltips (today's tooltips are mouse and touch only, and the chart keeps its `aria-label` summary); a data-table fallback for screen readers; automated visual regression; `@visx/xychart`.

## Decisions

| Question | Decision |
|---|---|
| Library layer | visx primitives, no `@visx/xychart`: `@visx/scale`, `shape`, `curve`, `axis`, `grid`, `tooltip`, `responsive` (all 4.0.0, React 19 compatible). xychart adds a `@react-spring/web` peer and does not obviously cover floating range bars or the band, which are both in use here |
| Structure | `src/chart.ts` stays the pure, unit-tested layer (series builders, domains, tick choice, nearest-index). A new `src/components/Chart.tsx` is the only code that draws |
| Series model | Our own `Series` type replaces Chart.js dataset objects (below) |
| Colours | Series carry CSS values such as `var(--ink-hrv)`. Opacity is `fill-opacity` / `stroke-opacity`, so `alpha()` and the JS token cache are no longer needed. SVG presentation attributes are not inline styles, so `style-src 'self'` is unaffected |
| Sizing | `ParentSize` supplies the width; height stays the existing 230px (`.cv`). Tick labels keep the "about one per 72px, 3 to 8" rule |
| Animation | Dropped. Chart.js animated for 300ms; reduced-motion is now trivially honoured. This is a visible change and is called out here on purpose |
| Legend | HTML list under the caption (line swatch, dashed stays dashed; filled swatch for bar, range and band), shown only with more than one visible series, as today |
| Tooltip | `useTooltip` plus a transparent overlay that maps pointer x to a category index (`touch-action: pan-y` so vertical scrolling still works on a phone). Band series never appear in it; ranges read "20 to 95" |

## Series model

```ts
type Num = number | null | undefined;
type Series =
  | { kind: 'line'; label: string; values: Num[]; color: string; dash?: boolean; width?: number; hidden?: boolean }
  | { kind: 'bar'; label: string; values: Num[]; color: string | string[]; opacity?: number[] }
  | { kind: 'range'; label: string; values: ([number, number] | null)[]; color: string }
  | { kind: 'band'; label: string; lo: Num[]; hi: Num[]; color: string };
```

- `hidden` keeps a line out of the tooltip and legend. The band replaces the old pair of `_low` / `Your normal range` datasets.
- `opacity` is per bar (partial weeks); `color` as an array is per-bar colour (heart-rate zones).
- Lines drop null points and connect the rest (today's `spanGaps: true`), with `curveMonotoneX`. Points are drawn only for 60 or fewer values.
- `DrawOpts` keeps `stacked`, `horizontal`, `whole`, `yRange`, `summary`; `tipTitle` becomes `(index, label) => string`. `ChartEnv` is deleted.
- A chart with any `bar` or `range` series uses a band x scale and a y domain that includes zero; a line-only chart uses a point scale and fits the data. `yRange` overrides either.

## Files

- Add: `src/components/Chart.tsx`.
- Rewrite: `src/chart.ts` (series builders `line`, `bar`, `trend`, `weekBars`, `describe`, plus `domain`, `tickIndexes`, `nearestIndex`), `src/components/ChartCard.tsx` (same props minus `type`; `canvasId` becomes the SVG `id`, so `c-hrv` and the other ids survive).
- Change: `RecoveryPanel`, `TrainingPanel`, `ActivityPanel` (build `Series`, pass `var(--ink-*)` instead of reading tokens; drop the `type` prop and the `useLayout` token use), `src/main.tsx` (remove `Chart.register` and the Chart.js font default; SVG text takes its font from CSS), `src/style.css` (chart text, grid, tooltip and legend classes).
- Delete `src/layout.tsx` and its provider if a grep shows nothing else uses `useLayout` once the charts are migrated. If something does, keep it.
- Tests: `tests/chart.test.ts` (below), `e2e/helpers.ts` (`expectDrawn`), `e2e/charts.spec.ts` and `e2e/layout.spec.ts` (they count and inspect `canvas` elements).

## Tests

- Unit, ported: `describe`, `trend` (now asserts the band is one `band` series plus the faint and 7-day lines), `weekBars` (partial weeks get lower opacity; the tooltip title names "partial week" and "so far").
- Unit, new: `domain` (bars include zero, ranges and band edges count, `yRange` overrides), `tickIndexes` (the 72px rule, clamped to 3 to 8, replaces the old `maxTicksLimit` test), `nearestIndex` (band and point scales, edges).
- E2E: `svg` charts are counted instead of `canvas:visible`; each keeps a non-empty `aria-label`; `expectDrawn` checks the chart has mark elements (`path` or `rect`) with a non-zero bounding box. A series with no data still shows "No data for this period."
- No DOM component tests (same non-goal as the earlier restructure).
- Manual: screenshot all ten charts on `main` and on the branch, in dark and light, at laptop and phone width, and compare by eye. E2E proves they draw, not that they look right.

## Risks

- Tooltip and touch behaviour are rebuilt by hand and are where regressions will hide; the manual comparison covers them. First task in the plan: a throwaway render of the two odd charts (floating range bars, banded trend) under the production CSP before migrating the rest.
- The 300ms animation is gone; this is intentional.

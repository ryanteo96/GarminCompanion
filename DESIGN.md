---
name: Garmin Companion
description: A calm, dense, standard recovery dashboard on a midnight-navy ground where the morning verdict leads and every signal keeps one ink.
colors:
  ground: "#0a1226"
  sidebar: "#0d1730"
  panel: "#111b38"
  panel-raised: "#18254d"
  hairline: "#25335e"
  field-stroke: "#6379a8"
  porcelain: "#e8eef7"
  muted-slate: "#a9b6d0"
  primary: "#7db0ff"
  on-primary: "#07122c"
  focus-ring: "#a9ccff"
  error: "#ff8a8a"
  ink-hrv: "#ff5a64"
  ink-rhr: "#5b9bff"
  ink-sleep: "#ffb224"
  ink-body-battery: "#35d07f"
  ink-load: "#ff8a3d"
  ink-steps: "#36d6c8"
  ink-intensity: "#b794ff"
  ink-stress: "#c3cde0"
  ink-calories: "#ff7ad9"
  state-strained: "#ff6b6b"
  state-below: "#ffa04d"
  state-typical: "#8fb8ff"
  state-well: "#4fdc8e"
  sleep-deep: "#b86a00"
  sleep-rem: "#ffb224"
  sleep-light: "#ffd98a"
  sleep-awake: "#7f8db0"
  zone-1: "#ffe0c2"
  zone-2: "#ffc08a"
  zone-3: "#ffa05a"
  zone-4: "#ff8a3d"
  zone-5: "#e8651a"
typography:
  poster:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "7rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.03em"
    fontFeature: "tnum"
  display:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "2.125rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "-0.01em"
  body:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.5
  readout:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "6px"
  md: "10px"
  lg: "14px"
  pill: "999px"
spacing:
  sp-1: "4px"
  sp-2: "8px"
  sp-3: "12px"
  sp-4: "16px"
  sp-5: "24px"
  sp-6: "32px"
components:
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.porcelain}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
  field:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.porcelain}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "44px"
  card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.porcelain}"
    rounded: "{rounded.lg}"
    padding: "16px 24px"
  metric-card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.porcelain}"
    rounded: "{rounded.lg}"
    padding: "16px"
  hero-panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.porcelain}"
    rounded: "{rounded.lg}"
    padding: "32px"
  tab:
    backgroundColor: "transparent"
    textColor: "{colors.muted-slate}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "44px"
  tab-selected:
    backgroundColor: "{colors.panel-raised}"
    textColor: "{colors.porcelain}"
  pill:
    backgroundColor: "transparent"
    textColor: "{colors.muted-slate}"
    typography: "{typography.readout}"
    rounded: "{rounded.pill}"
    padding: "1px 8px"
---

# Design System: Garmin Companion

## Overview

**Creative North Star: "The Night Instrument Panel"**

A phone in a dim room at 6:40am, or a laptop at a desk: the same calm, dense panel. A midnight-navy enamel ground carries deeper panels, porcelain text and hairline rules, and every Garmin or computed signal is given one vivid ink that it keeps on every surface. The category standard, played straight: sidebar and cards, system type, standard controls. Its one loud moment is the readiness numeral, set at poster size on a panel washed with the tone of the advice.

Density is deliberate: enough real data stays visible to justify the verdict. Depth is tonal, never decorative. Dark is the default theme; the light theme is composed separately (not an inversion) in a `prefers-color-scheme: light` block, so the hues of the inks are kept but each value is re-picked for contrast on white panels.

**Key Characteristics:**
- Navy ground, three tonal surface steps, hairline borders, no shadows.
- One ink per signal, repeated in dot, value line, sparkline, bars and charts.
- Poster tabular numeral against 12 to 14px readouts.
- System UI type only; 44px controls; sidebar on laptop, bottom tab bar on phone.
- Every number sits next to the owner's own "usual".

## Colors

A deep navy field with porcelain text, one cool blue for action, and a ring of saturated signal inks. Hex values in the frontmatter are the dark (default) theme; the light theme re-declares every token (see sidecar `colorMeta.*.light`).

### Primary
- **Daylight Azure** (`primary`): links, primary button, selected-tab icon, insight correlation figures, focus-adjacent accents. In light it becomes a deeper blue (#1f4fd8). Text on it is `on-primary`.

### Neutral
- **Midnight Enamel** (`ground`): page background.
- **Deep Harbour** (`sidebar`): sidebar and bottom tab bar.
- **Panel Navy** (`panel`): cards, fields, hero base.
- **Raised Navy** (`panel-raised`): selected tab, hover row, notices, gauge tracks, skeletons.
- **Hairline Navy** (`hairline`): card borders and table rules.
- **Control Stroke** (`field-stroke`): outlines of buttons and fields, the 3:1 graphic edge.
- **Porcelain** (`porcelain`): primary text.
- **Muted Slate** (`muted-slate`): captions, units, "usual" lines, labels.
- **Error Coral** (`error`) and **Focus Ring** (`focus-ring`): error text and the 2px focus outline.

### Signal inks (stable per signal)
HRV scarlet (`ink-hrv`), resting HR azure (`ink-rhr`), sleep amber (`ink-sleep`), Body Battery green (`ink-body-battery`), load orange (`ink-load`), steps teal (`ink-steps`), intensity violet (`ink-intensity`), stress pale slate (`ink-stress`), calories pink (`ink-calories`). Zone ramp `zone-1` to `zone-5` is a light-to-saturated orange for heart-rate zones; in light theme it runs dark-to-darker so each step stays at 3:1.

### State and sleep colors
- **Verdict states:** strained `state-strained`, below usual `state-below`, typical `state-typical`, well `state-well`. They tint the hero (11% wash), the verdict line, the state label, the scale zones (80% mixed into the panel), and good/bad deltas.
- **Sleep stages:** deep, REM, light, awake (`sleep-*`), distinct from the signal inks so a stage never reads as a metric.

### Named Rules
**The One Ink Rule.** A signal has exactly one ink and uses it everywhere; an ink is never reused for another signal or for decoration.
**The Tone Wash Rule.** The advice tone washes the hero panel at 11% and colors the verdict text; no other panel is tinted.
**The Contrast Floor Rule.** Text meets 4.5:1 and inks and graphics 3:1 in both themes, verified from the tokens. New inks are checked in both before they ship.

## Typography

**Display Font:** system UI stack (`system-ui`, `-apple-system`, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif)
**Body Font:** same
**Label/Mono Font:** none; numerals use `tabular-nums`.

**Character:** Plain and platform-native. Authority comes from scale contrast, not from a face: one weight jump (400 to 700) and a 7rem numeral against 12 to 14px readouts.

### Hierarchy
- **Poster** (700, 7rem, 1.3, -0.03em; 5.5rem on phone): the readiness score only, tabular, with a negative vertical margin so line-height does not push the layout.
- **Display** (700, 2.125rem; 1.625rem on phone): the verdict line and metric values (metric values drop to 1.75rem at 380px).
- **Headline** (700, 1.5rem; 1.375rem on phone): area title, gate heading, insight figures.
- **Title** (700, 1.125rem): brand name.
- **Body** (400, 1rem, 1.5): default; detail text is 1.0625rem capped at 60ch, "how it works" copy at 70ch.
- **Label** (600, 0.875rem): card captions, metric heads, table headers, buttons at 1rem/600.
- **Readout** (400 to 600, 0.75 to 0.8125rem): zone labels, ticks, pills, subtext, mobile tab labels.

### Named Rules
**The Tabular Rule.** Every number that can change (score, metric values, tables, insight figures) is tabular.
**The One Face Rule.** System UI only. Chart.js is pointed at the same stack through `Chart.defaults.font.family`.

## Layout

A shell of a 232px sticky sidebar and a fluid column; content is capped at 1180px and centered. Spacing is a six-step scale (4, 8, 12, 16, 24, 32px) used for every gap and padding. Card grids are `auto-fit` with a 340px minimum; metric cards are four across, then two across at 1060px and below. The hero is a two-column grid (340px numeral and scale, then headline and detail; 300px under 1060px) that collapses to one column at 819px with the headline first on phone.

Breakpoints: 1060px (metrics to 2x2, narrower hero), 819px (sidebar becomes a fixed bottom tab bar with 60px tabs and safe-area insets; main gets bottom padding to clear it), 820px and up (two-up insight cards with the strongest spanning), 560px (activity table becomes a list, charts 210px tall), 380px (tighter metric cards, delta pills hidden).

## Elevation & Depth

Flat and tonal. Depth is three navy steps (ground, panel, raised), 1px hairlines and the sidebar border; there are no drop shadows. The only `box-shadow` is a 0-offset 2px panel-colored halo around the scale marker, which separates it from the zones; it is a cut-out, not elevation.

### Named Rules
**The Flat Rule.** Surfaces never lift. State is shown by border color or a step up the tonal ladder, never a shadow or glow.

## Shapes

Soft but restrained: controls, tabs, notices and chips at 10px; cards and the hero at 14px; the sleep bar at 8px; gauge tracks and zones at 4 to 6px; badges and pills fully round; legend swatches 3px; bars in charts 2px. Borders are 1px; controls use the stronger `field-stroke`, surfaces the quieter `hairline`.

## Components

### Buttons
- **Shape:** 10px radius, 44px minimum height, 16px side padding, 600 weight.
- **Secondary (default):** transparent, porcelain text, `field-stroke` border; hover shifts the border to primary.
- **Primary:** primary fill with `on-primary` text; hover mixes 14% porcelain into the fill.
- **Link button:** underlined primary text, 44px hit area; hover turns porcelain.
- **Disabled:** 60% opacity.

### Fields
Select and password: panel fill, `field-stroke` border, 10px radius, 44px tall, primary caret and accent color.

### Cards / Containers
14px radius, `panel` fill, 1px hairline, 16px by 24px padding (16px on phone). No shadow.

### Navigation
Sidebar tabs: 44px, 10px radius, muted text with 22px outline icons (1.75 stroke); hover and selected use the raised fill and porcelain text; the selected icon takes primary. Background and color transition at 150ms. On phone the tabs are a fixed bottom bar, icon above 12px label, 60px tall.

### Readiness Hero (signature)
A tone-washed panel (panel plus 11% state color). Left: the poster numeral with "of 100", the state label in the state color, a 12px zoned scale (30/20/20/30 for strained, below, typical, well) with a 4px porcelain marker and tick labels. Right: the verdict in the tone color, detail, load line, and an expandable "how it works". The training variant reuses the scale with load-ratio zones (40/25/10/25 for light, sweet, ramp, spike). Sessions sit below on a hairline.

### Metric Cards (signature)
Grid of four. Head: 10px ink dot, name, delta pill (good or bad tinted by state colors, outlined). Value at 2.125rem tabular with unit in muted slate, a "usual" subline, and a 40px sparkline in the signal ink with a dashed muted "usual" reference line (2px stroke, non-scaling). Variants: goal bar (10px, ink fill) and a 34 by 18 battery glyph for Body Battery.

### Sleep Night Bar
A 28px segmented bar of the four stage colors with 2px gaps and a legend of 12px swatches.

### Charts
Chart.js 4.4.1 vendored, 230px tall (210px on phone), series in their signal inks, 2px rounded bars, a 300ms draw that is disabled under reduced motion. Charts carry text alternatives.

### Motion
Only 150ms color/background transitions on tabs, the 300ms chart draw, and a 1.4s opacity pulse on loading skeletons. `prefers-reduced-motion: reduce` removes transitions, animations and the chart draw.

## Do's and Don'ts

### Do:
- **Do** give every new signal one ink, declared as `--ink-*` in both themes, and route it through `data-ink`.
- **Do** place each value beside the owner's "usual" and the delta from it.
- **Do** use the six-step spacing scale and 10px/14px radii.
- **Do** keep controls at 44px and keep focus visible (2px ring, 2px offset).
- **Do** say what is computed here: the readiness score and load ratio are not Garmin metrics, and the UI states it.
- **Do** compose a new color for light separately and check it at 4.5:1 (text) or 3:1 (ink, graphics).

### Don't:
- **Don't** replace the hero with a gauge ring plus equal-weight cards.
- **Don't** add glows, gradients, drop shadows or blurred backdrops.
- **Don't** use color as the only cue for state; pair it with a word, arrow or sign.
- **Don't** introduce a second typeface or a non-tabular figure for changing numbers.
- **Don't** reuse one signal's ink for another signal or for decoration.
- **Don't** tint any panel other than the hero with the advice tone.

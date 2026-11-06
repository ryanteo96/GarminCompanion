---
name: Garmin Companion
description: A health app's calm with its own voice. Monochrome chrome, colour only for data, borderless rounded cards on graphite, and every trend drawn over the owner's own normal range.
colors:
  ground: "#0b0c0f"
  card: "#17191d"
  fill-secondary: "#23262c"
  fill-tertiary: "#3a3e46"
  separator: "#2d3037"
  field-stroke: "#7a7f8a"
  label: "#f4f5f7"
  label-secondary: "#9a9fa9"
  primary: "#ffffff"
  on-primary: "#000000"
  focus-ring: "#409cff"
  error: "#ff6961"
  ink-hrv: "#ff5fc8"
  ink-rhr: "#0a84ff"
  ink-sleep: "#7d7aff"
  ink-body-battery: "#b6e03c"
  ink-load: "#ff9f0a"
  ink-steps: "#40c8e0"
  ink-intensity: "#bf5af2"
  ink-stress: "#aeaeb2"
  ink-calories: "#ffd60a"
  state-strained: "#ff453a"
  state-below: "#ff9f0a"
  state-typical: "#64d2ff"
  state-well: "#30d158"
  sleep-deep: "#5e5ce6"
  sleep-light: "#a5a3ff"
  sleep-rem: "#6ad8ff"
  sleep-awake: "#ff8a65"
  zone-1: "#ffe0c2"
  zone-2: "#ffc08a"
  zone-3: "#ffa05a"
  zone-4: "#ff8a3d"
  zone-5: "#e8651a"
typography:
  poster:
    fontFamily: "'Nunito Variable', 'Nunito Sans Variable', system-ui, sans-serif"
    fontSize: "7rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.03em"
    fontFeature: "tnum"
  large-title:
    fontFamily: "'Nunito Sans Variable', system-ui, sans-serif"
    fontSize: "2.125rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  value:
    fontFamily: "'Nunito Variable', 'Nunito Sans Variable', system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  section-title:
    fontFamily: "'Nunito Sans Variable', system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  figure:
    fontFamily: "'Nunito Variable', 'Nunito Sans Variable', system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  body:
    fontFamily: "'Nunito Sans Variable', system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  card-title:
    fontFamily: "'Nunito Sans Variable', system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-0.01em"
  label:
    fontFamily: "'Nunito Sans Variable', system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.5
  readout:
    fontFamily: "'Nunito Sans Variable', system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.3
  control-text:
    fontFamily: "'Nunito Sans Variable', system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.5
  detail:
    fontFamily: "'Nunito Sans Variable', system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.5
  section-compact:
    fontFamily: "'Nunito Sans Variable', system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.2
  title-phone:
    fontFamily: "'Nunito Sans Variable', system-ui, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 700
    lineHeight: 1.2
  figure-large:
    fontFamily: "'Nunito Variable', 'Nunito Sans Variable', system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.3
  page-title-phone:
    fontFamily: "'Nunito Sans Variable', system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
  poster-compact:
    fontFamily: "'Nunito Variable', 'Nunito Sans Variable', system-ui, sans-serif"
    fontSize: "3.5rem"
    fontWeight: 700
    lineHeight: 1.3
  poster-phone:
    fontFamily: "'Nunito Variable', 'Nunito Sans Variable', system-ui, sans-serif"
    fontSize: "5.5rem"
    fontWeight: 700
    lineHeight: 1.3
rounded:
  segment: "9px"
  control: "12px"
  card: "18px"
  sheet: "20px"
  tick: "2px"
  bar: "4px"
  cell: "6px"
  switch: "13px"
  pill: "999px"
spacing:
  sp-1: "4px"
  sp-2: "8px"
  sp-3: "12px"
  sp-4: "16px"
  sp-5: "24px"
  sp-6: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.fill-secondary}"
    textColor: "{colors.label}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "44px"
  button-customize:
    backgroundColor: "{colors.fill-secondary}"
    textColor: "{colors.label}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  link:
    backgroundColor: "transparent"
    textColor: "{colors.label}"
    padding: "0 8px"
    height: "44px"
  field:
    backgroundColor: "{colors.card}"
    textColor: "{colors.label}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "44px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.label}"
    rounded: "{rounded.card}"
    padding: "16px 24px 24px"
  metric-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.label}"
    rounded: "{rounded.card}"
    padding: "16px"
  readiness-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.label}"
    rounded: "{rounded.card}"
    padding: "32px"
  readiness-card-compact:
    backgroundColor: "{colors.card}"
    textColor: "{colors.label}"
    rounded: "{rounded.card}"
    padding: "16px"
  nav-tab:
    backgroundColor: "transparent"
    textColor: "{colors.label-secondary}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "44px"
  nav-tab-selected:
    backgroundColor: "{colors.card}"
    textColor: "{colors.label}"
  segmented-control:
    backgroundColor: "{colors.fill-secondary}"
    rounded: "{rounded.control}"
    padding: "3px"
  segment:
    backgroundColor: "transparent"
    textColor: "{colors.label-secondary}"
    rounded: "{rounded.segment}"
    padding: "0 16px"
    height: "36px"
  segment-current:
    backgroundColor: "{colors.fill-tertiary}"
    textColor: "{colors.label}"
  switch:
    backgroundColor: "{colors.fill-secondary}"
    rounded: "13px"
    width: "44px"
    height: "26px"
  switch-on:
    backgroundColor: "{colors.state-well}"
  sheet:
    backgroundColor: "{colors.card}"
    textColor: "{colors.label}"
    rounded: "{rounded.sheet}"
    padding: "16px"
---

# Design System: Garmin Companion

## Overview

**Creative North Star: "Your Own Normal, Drawn Calmly"**

Bevel and Apple Health are the philosophy, not the template. The app takes their calm (monochrome chrome, colour only for data, borderless rounded cards, big numbers) and speaks in its own voice: a graphite ground instead of true black, bundled Nunito faces instead of the platform's, and a signature that neither source has: every trend line is drawn over a band of the owner's own normal range. It is deliberately not a pixel copy of iOS.

The page is a graphite ground holding borderless rounded cards. The chrome around them (sidebar, buttons, links, segmented control, sheet) is drawn only in the text colour and greys, so a hue on screen always belongs to the owner's data. Each signal keeps one ink and wears it in its card header, its sparkline and its charts. The loudest moment is the readiness numeral, at poster size in its state colour over a capsule zone scale.

The theme follows the system. Dark is the default in `:root`; light is composed separately in a `prefers-color-scheme: light` block, never inverted, and every ink keeps its hue while being re-picked for contrast on the white card. Both faces are bundled, so every OS and browser renders the same letters and the same figures.

**Key Characteristics:**
- Graphite ground with slightly lifted cards (dark), cool grouped grey with white cards (light); no borders, no shadows, 18px corners.
- Monochrome chrome; one ink per signal, used in its header, sparkline and charts.
- Bundled Nunito Sans for text and Nunito for numerals, tabular, at 700.
- Every sparkline sits on the owner's normal-range band, with the usual dashed inside and a ringed dot on the latest reading.
- Each card answers "how does this compare with my usual" in words first: the verdict word leads the comparison line.
- Home grouped under Recovery, Training and Today in the owner's own order.
- Pill buttons, a segmented control, green switches, 44px targets; motion is feedback only.

## Colors

Graphite and grey for every piece of chrome, and a ring of saturated system-style colours reserved for data. Frontmatter hex values are the dark theme; the light theme re-declares every token (sidecar `colorMeta.*.light`).

### Primary
- **Pure White** (`primary`): the primary pill button's fill, with `on-primary` text; black in light. The strongest action is monochrome too. It is a touch brighter than the label colour.

### Neutral
- **Graphite Ground** (`ground`): page and sidebar background; cool grouped grey (#eef0f3) in light.
- **Graphite Card** (`card`): every card, field, sheet and the selected nav row; white in light.
- **Secondary Fill** (`fill-secondary`): secondary and Customize buttons, the segmented-control track, the switch-off track, badges and the stale-reading chip, empty heatmap cells, goal-bar and gauge tracks, hovered table rows, the heatmap detail card.
- **Tertiary Fill** (`fill-tertiary`): the current segment in the segmented control (white in light).
- **Separator** (`separator`): table rules, the sessions divider, the sheet footer, the phone tab bar's top edge, the phone account foot, chart axes.
- **Field Stroke** (`field-stroke`): link underlines at rest.
- **Label** (`label`) and **Secondary Label** (`label-secondary`): primary text; captions, units, time contexts, comparison lines, axis labels.
- **Focus Blue** (`focus-ring`) and **Error Red** (`error`): the 2px focus outline and error text; never decoration.

### Signal inks (one per signal)
HRV magenta (`ink-hrv`), resting HR blue (`ink-rhr`), sleep indigo (`ink-sleep`), Body Battery lime (`ink-body-battery`), load orange (`ink-load`), steps cyan (`ink-steps`), intensity purple (`ink-intensity`), stress grey (`ink-stress`), calories yellow (`ink-calories`). Fitness, pace and distance take the text colour (`--ink-fit` is `var(--text)`). Form and running Feel take `label-secondary`, and Form is drawn dashed (5/4). Heart rate on running plots borrows `ink-hrv`; RPE and Fatigue borrow `ink-load`.

### State, sleep and zone colours
- **Readiness states:** `state-strained`, `state-below`, `state-typical`, `state-well`. They colour the poster numeral and its state word, the capsule zone scale, the load scale and its dot legend, and "Better" / "Worse" verdicts and deltas. No panel is tinted.
- **Sleep stages:** deep indigo (`sleep-deep`), light lavender (`sleep-light`), REM cyan (`sleep-rem`), awake coral (`sleep-awake`); graphics only, in the night bar and the stacked sleep chart.
- **Heart-rate zones:** `zone-1` to `zone-5`, light to saturated orange in dark; in light they run dark to darker so each step clears 3:1.

### Named Rules
**The Monochrome Chrome Rule.** Buttons, nav, links, the segmented control and the sheet are drawn in the text colour and greys. A hue on screen always means data. The one exception is a switch that is on, which turns `state-well` green.
**The One Ink Rule.** A signal has exactly one ink and uses it everywhere it appears; an ink is never reused for decoration or for another signal, apart from the borrowed heart-rate and RPE/Fatigue lines on training plots.
**The Contrast Floor Rule.** Every ink and state colour is 4.5:1 or better on the card in both themes (measured: lowest is resting HR blue at 4.8:1 on the dark card). Sleep stages and zones are graphics only and clear 3:1. A new colour is composed for light separately and checked in both themes before it ships.

## Typography

**Body Font:** Nunito Sans (bundled, `@fontsource-variable/nunito-sans`, as `--sans`; fallback system-ui)
**Numeral Font:** Nunito (bundled, `@fontsource-variable/nunito`, as `--round`; falls back to Nunito Sans)

**Character:** Soft and friendly without being cute. Nunito Sans carries every word; Nunito's rounded terminals are kept for numbers, so values read like a health app's figures on every OS and browser. Both faces ship true tabular figures. Hierarchy comes from size and a 400-to-700 weight jump, not from a third family.

### Hierarchy
- **Poster** (700, 7rem, 1.3, -0.03em; 5.5rem on phone, 3.5rem in the compact Home card): the readiness score and the load ratio, Nunito, in the state colour, with a negative block margin so its line height does not push the layout.
- **Large title** (700, 2.125rem, 1.2, -0.025em; 1.875rem page title and 1.625rem verdict on phone, 1.375rem verdict in the compact card, 1.625rem when it is full width): the page title and the readiness/load verdict.
- **Value** (700, 2.25rem, 1.15, Nunito; 1.75rem at 380px): metric card values, with the unit in 1rem/600 Nunito Sans in `label-secondary`.
- **Section title** (700, 1.375rem, -0.02em): the Recovery / Training / Today headings on Home and the sheet title.
- **Figure** (700, 1.5rem, Nunito; 1.75rem for the Fitness/Fatigue/Form readout): month stats, session facts, insight figures.
- **Body** (400, 1rem, 1.5): default; readiness detail 1.0625rem capped at 60ch.
- **Card title** (600, 0.9375rem, -0.01em): card captions and the metric header's signal name.
- **Label** (500, 0.8125rem): the time context, comparison lines, table headers.
- **Readout** (400, 0.75rem): zone labels and ticks, axis labels, phone tab labels, heatmap detail meta.

### Named Rules
**The Bundled Face Rule.** Text is Nunito Sans and numerals are Nunito, both bundled with the app; never rely on a platform face (`ui-rounded`, SF, Segoe) for either. Chart.js reads the same `--sans` through `Chart.defaults.font.family`. Every changing number is tabular.
**The 700 Numeral Rule.** Numerals are set at 700. The owner found 800 to 900 too playful in Nunito; heavier weights are out for every number, poster included.

## Layout

A 232px sticky sidebar beside a fluid column; the top bar and content cap at 1180px and centre. Spacing is a six-step scale (4, 8, 12, 16, 24, 32px); cards sit 12px apart; Home sections sit 32px apart.

Home is a phone-first grid. Cards are grouped into Recovery (readiness, HRV, resting HR, sleep, Body Battery), Training (load, recent sessions, this week, month heatmap) and Today (steps, intensity minutes, stress). The owner orders the cards freely; a section heading appears wherever the group changes in that order, so a group can appear twice if the owner splits it. Each section's grid is two columns below 1061px and four from 1061px. A card spans one column, two (full width below 1061px) or the full row: readiness is full; the four recovery signals and the three Today cards span one; every Training card spans two. Home sparklines show 7 days; the area pages show 14.

Area pages use an `auto-fit` grid with a 340px minimum and a four-across metric row (two-across at 1060px and below). The full readiness card puts a 340px score column beside the verdict (300px at 1060px and below); on phone it is one column with the verdict first. The compact Home readiness card is one column, with a 300px score column beside the verdict when full width from 1061px.

The title row holds the page title, the freshness meta (data badge, "Updated…", Refresh link) and, on Home, the Customize pill pinned to its right edge. Account actions (Sign out, Delete stored data, and the cache note) live at the foot of the sidebar on a laptop and at the end of the page, above a hairline, on a phone; never in the title row.

Breakpoints: 1061px (Home to four columns), 1060px (metrics to 2x2, narrower readiness), 820px (two-up insight cards; Customize becomes a right-hand panel), 819px (the sidebar becomes a fixed bottom tab bar with safe-area insets; main gains bottom padding to clear it; the account block moves to the page foot), 560px (the metric header's time context drops under the name; activity table becomes a list; charts 210px), 380px (tighter metric cards and a 1.75rem value).

## Elevation & Depth

Flat. Depth is one step of fill: the graphite card on the graphite ground in dark, the white card on cool grey in light. Nothing casts a shadow and cards carry no border. Two cut-outs, not elevation: the 2px card-coloured ring around the sparkline's latest dot and the 4px ring around the zone-scale marker. The one floating surface is the heatmap detail card, on `fill-secondary` with a 1px `separator` edge. The Customize sheet dims the page with a 50% black backdrop on a phone and none from 820px.

### Named Rules
**The Borderless Rule.** Cards are separated by fill and gap, never by an outline or a shadow. Hairlines appear only inside a card (table rows, the sessions divider, the heatmap detail), on the phone tab bar, the sheet footer and the phone account foot.

## Shapes

Continuous and soft: cards at 18px; controls, notices, the selected nav row and the heatmap detail card at 12px; segments at 9px; the bottom sheet's top corners at 20px. Buttons, badges and the stale-reading chip are full pills. Data marks are capsules: zone segments, goal bars and gauge tracks at 4px on an 8px bar; sleep segments at 6px on a 24px bar; heatmap cells at 6px on 20px; chart bars at 2px. Legend keys and sparkline dots are circles.

## Components

### Buttons
- **Shape:** full pill (999px), 44px minimum height, 24px side padding, 600 weight.
- **Primary:** `primary` fill with `on-primary` text (white pill on graphite, black pill on grey); hover mixes 18% of the ground into it.
- **Secondary (default):** `fill-secondary` pill with label text; hover mixes 20% of the text colour in.
- **Customize:** a compact secondary pill (16px sides, 0.875rem) pinned to the right of Home's title row.
- **Link:** label-coloured 600 text at 0.875rem with a `field-stroke` underline (4px offset) that turns the text colour on hover; a 44px hit area. Refresh, Sign out and Delete stored data are links.
- **Disabled:** 60% opacity.

### Fields
Select and password: card fill, 1px `separator` border, 12px radius, 44px tall, caret and accent in `primary`.

### Cards / Containers
- **Corner Style:** 18px.
- **Background:** `card`.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** none.
- **Internal Padding:** 16px top, 24px sides and bottom; 16px for metric cards, the compact readiness card and every card on phone; 32px for the full readiness card.

### Navigation
Sidebar: brand, three areas (Home, Activity, Recovery) with indented sub-pages, and the account block at its foot. Tabs are 44px rows with 22px outline icons (1.75 stroke) in `label-secondary`; hover turns them label-coloured; selected takes the card fill, 600 weight and a 2.25 stroke. On phone the tabs become a fixed bottom bar (card fill at 92% over the ground, a top hairline, icon above a 0.75rem label, 60px tall, no selected fill) and sub-pages and the brand are hidden.

### Segmented Control
Sub-pages use a segmented control: a `fill-secondary` track (12px radius, 3px inset) holding 36px segments at least 88px wide; the current one takes `fill-tertiary` and the text colour. It scrolls horizontally rather than wrapping.

### Switches
44 by 26px track in `fill-secondary` with a 22px white thumb; on, the track turns `state-well` green and the thumb slides 18px (150ms).

### Metric Cards (signature)
- **Header:** an 18px drawn icon (24-unit grid, 2.25 stroke, Lucide shapes) and the signal name, both in the signal ink, card-title type. The time context sits on the right in `label-secondary` label type: "Last night" (HRV, sleep), "Daily" (resting HR), "Daily peak" (Body Battery), "Today so far" or the reading's date (steps, stress, calories), "This week" or "This week so far" (intensity). At 560px and below it drops under the name at 0.75rem and the icon shrinks to 16px.
- **Value:** Nunito at 700 with its unit; Body Battery puts a 34 by 18 drawn battery before it.
- **Comparison line:** the verdict word leads it, then a middle dot and the change from usual ("About usual · −1 ms vs usual 50 ms"). "Better" is `state-well`, "Worse" is `state-strained`, "About usual" is the label colour; all 600. A second line may follow (sleep score, reading age).
- **Trend:** the Normal Range Sparkline, or an 8px goal bar in the ink for goal-type signals.

### Normal Range Sparkline (signature)
A 40px trend, 7 days on Home and 14 on the area pages. Behind the line, a band of the owner's normal range (usual ± 1 SD over the last 28 days, the same baseline readiness uses), filled with the ink at 15%. Inside it, the usual as a 1px dashed line (2/3) in the ink at 60% opacity. The line is 2.5px in the ink, round-capped, non-scaling, broken at gaps. The latest reading is a 10px ink dot ringed 2px in the card colour. The band and the usual appear only when a usual exists; the image's text alternative names the range of values and the shaded normal range.

**The Normal Range Rule.** Every trend is read against the owner's own normal, never against a population norm or a bare axis. A new sparkline gets the band, the dashed usual and the ringed latest dot; area-page charts carry the same band as "Your normal range".

**The Verdict First Rule.** A comparison is stated in a word before a number, and the word carries the meaning on its own; colour only reinforces it.

### Readiness Card (signature)
The poster numeral in its state colour with "of 100" and the state word below in the same colour; the text colour when there is no state. Under it, the capsule zone scale: four rounded segments with 3px gaps (30/20/20/30 for strained, below usual, typical, well recovered) and a ringed dot marker (18px, text colour, 4px card-coloured ring), tick values and zone names. Beside it, the verdict as a large title, the detail in `label-secondary`, and an expandable "How is this scored?". The load card reuses the scale with load-ratio zones (40/25/10/25 for lighter, sweet spot, ramping, spiking) and a dot legend.

### Home Sections
A section title (1.375rem, 700, nudged 4px in) above each run of same-group cards, then that run's grid. The heading text is the group name, sentence case.

### Sleep Night Bar
A 24px bar of the four stage colours with 3px gaps and 6px corners, and a legend of 10px stage circles.

### Charts
Two renderers share one look. Chart.js draws the area-page charts (230px tall, 210px at 560px and below; 300ms draw): faint raw readings, a bold 7-day line in the ink and a grey "Your normal range" band at 18%. visx SVG draws Fitness/Fatigue/Form, the Running pace, heart-rate, RPE and Feel plots and the weekly bars (140px, 220px or 110px). Lines are 2px (1.5px at half opacity with dots on Running); Form is dashed 5/4. Axes use `separator` lines and 0.75rem `label-secondary` labels; guide lines are 3px dashes. Hover shows a vertical guide, dots in the series ink and a text readout haloed in the card colour, no box. Every chart carries a text alternative.

### Month Heatmap (signature)
Daily training load as 20px cells (6px radius, 24px step), one row per week with the oldest first and one column per weekday under single-letter headers. Cells fill with `ink-load` at an opacity scaled by load; empty days are `fill-secondary`. Under the pointer the grid swells like the Dock: the cell under it scales 1.3x and lifts, falling off over about 1.1 cells. A 1.5px text-colour ring glides to the nearest day and breathes while the pointer rests. A detail card shows the day's date, load and each activity, below the cell or above in the last rows; on touch it dismisses with a tap elsewhere. Beside it sit four Nunito figures (load, training effect, sessions, hours) in a two-column list.

### Weekly Overview
A table card: the last 7 days against the 21 before, one row per metric, the change stated in words, and past 3% "better" or "worse" in the state colours.

### Customize Sheet
A modal dialog listing Home's cards as Shown and Hidden, each row naming its group. A bottom sheet on a phone (85dvh, 20px top corners), a 360px full-height right panel from 820px. Rows are 44px with a drag handle (dnd-kit, keyboard and pointer, announced in a live region) and a switch. A sticky footer holds "Reset to default" and the primary "Done". Escape cancels a keyboard drag first and closes the sheet only on the second press.

### Motion
Feedback only. 150ms background, colour and transform transitions on buttons, tabs, segments and the switch; the 300ms Chart.js draw; a 1.4s opacity pulse on loading skeletons; a 0.97 press on buttons and tabs; the readiness and load marker gliding from 0 to its place on mount (0.9s expo-out); every headline number counting up from 0 (or from its previous value) over 0.7s expo-out via `Num`, off under reduced motion; the Customize sheet sliding in (0.4s expo-out, up on a phone, from the right on a laptop) over a fading backdrop, entrance only. GSAP runs only the heatmap: per-cell `quickTo` swell (0.5s, power3.out), the ring's entrance (0.5s, back.out) and glide (0.45s, power3.out) and a 1.6s sine breathing loop, and the card's expo.out entrance (0.55s). Under `prefers-reduced-motion: reduce` CSS transitions and animations stop, the chart draw is off, and the heatmap zeroes its durations and skips the swell and the breathing.

## Do's and Don'ts

### Do:
- **Do** give every new signal one ink, declared as `--ink-*` in both theme blocks, and route it through `data-ink`.
- **Do** head every metric card with its drawn icon and signal name in the ink, and the time context on the right in `label-secondary`.
- **Do** lead every comparison line with the verdict word ("Better", "Worse", "About usual"), then the change from usual.
- **Do** draw every sparkline over the owner's normal-range band (usual ± 1 SD, 28 days), with the usual dashed in the ink and a ringed dot on the latest reading.
- **Do** set numbers in Nunito (`--round`) at 700 with tabular figures, and all text in Nunito Sans (`--sans`).
- **Do** keep chrome monochrome: pill buttons in `primary` or `fill-secondary`, links in the text colour, a segmented control for sub-pages, green only for a switch that is on.
- **Do** compose each new colour for light separately and check it at 4.5:1 on the card (inks, state colours) or 3:1 (graphics only).
- **Do** keep controls at 44px and focus visible (2px `focus-ring`, 2px offset).
- **Do** make every Home card a self-contained grid cell (one, two or full span) in one of the Recovery, Training or Today groups, and every drag or toggle reachable by keyboard.
- **Do** keep account actions out of the title row: sidebar foot on a laptop, page end on a phone.
- **Do** gate any JS-driven motion on `prefers-reduced-motion` and keep it a response to the pointer or a state change.

### Don't:
- **Don't** outline cards or tint them; no navy ground, no coloured panel washes.
- **Don't** put colour on chrome: no blue links, accent buttons or coloured nav states.
- **Don't** head a card with a coloured dot in place of the drawn icon.
- **Don't** add drop shadows, glows or gradients.
- **Don't** set numerals at 800 or 900, or swap in a platform or system face for the bundled ones.
- **Don't** draw a trend against a bare axis or a population norm when the owner's usual is known.
- **Don't** use colour as the only cue for state; pair it with a word, arrow or sign.
- **Don't** reuse one signal's ink for another signal or for decoration.
- **Don't** copy iOS pixel for pixel; take the philosophy, keep the graphite, Nunito and the normal-range band.

### Known gaps (open, not rules)
- The heatmap and recent-sessions cards leave empty space at the bottom on desktop, where they share a row with taller cards.
- "Below usual" wraps onto two lines under the compact readiness scale.
- The white switch thumb is about 2:1 against the dark-theme green track (#30d158); the light track clears 5:1.

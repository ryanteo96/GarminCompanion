---
target: the dashboard (public/index.html), third run
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
target_identity: "file:/home/user/garmincompanion/public/index.html"
target_fingerprint: "sha256:0fe4a4990f87e0ac56a64e2190b48fc6c5dad1c7355607e29449b5f637fd8409"
target_path: /home/user/garmincompanion/public/index.html
timestamp: 2026-11-04T12-05-29Z
slug: public-index-html
---
# Critique (third run): Garmin Companion dashboard (public/index.html)

Method: dual-agent (A: design review · B: detector + browser measurements), isolated; neither read earlier reports. Overlay skipped: no human-visible browser.

## Design Health Score: 29/40 (Good, 72%); previous runs 24 -> 28
1 Visibility 3 | 2 Match real world 3 | 3 User control 3 | 4 Consistency 3 | 5 Error prevention 3 | 6 Recognition 3 | 7 Flexibility 2 | 8 Aesthetic/minimalist 3 | 9 Error recovery 3 | 10 Help/docs 3

## Design Specificity Verdict
Partially authored: the two heroes (verdict fusing recovery and load, tone-matched colour; sentence-first load hero) are specific; the lower ~70% of each tab is a competent interchangeable Chart.js grid; Activity is the most generic tab.
Deterministic: 1 cramped-padding warning on .tabs (false positive, tab underline, 14px clear under text). Scripts/CSS clean. CDP scans of all 4 tabs in light and dark clean (scanner verified live by injection). Login view clean at two widths. Extra narrow-width scans: advisory stragglers only. Overlay skipped.

## Priority Issues
- [P2] Freshness told in four places, some wrong or silent: sleep header "Last night, Nov 3" for a two-night-old reading; header "Updated just now" pre-sync (behind counts steps); offline+cache chip blames Garmin; stale verdict keeps full colour; no refetch on tab return. (clarify, harden)
- [P2] Hash/focus bugs: <div id="insights"> collides with #insights tab hash, so opening /#insights scrolls past header and first Tab lands on Sign out (5/5 loads); skip link rewrites hash to #main so reload loses the tab; keyboard Refresh drops focus to body after load. (harden)
- [P2] Chart range looks global but is scoped; note is last line of footer; resets to 90; empty-data copy says "try a longer range" with no control; demo hero flips with range (demo reseeding). (layout, clarify)
- [P2] Authoring stops at the hero: each metric repeated as driver, KPI card, chart; 90-bar Body Battery and steps read as texture; Activity generic; Training table repeats hero sessions. (distill, bolder)
- [P2] Phone navigation top-anchored: ~2,200px Recovery panel, tab rail not sticky, small underlined Refresh. (adapt)

## Persona Red Flags
Alex: no tab shortcuts, range resets, charts not drillable, table not sortable, no auto-refresh on return. Sam: charts have one-line summary only, Activity has no heading below h1, partial-week bars differ by lightness at ~2:1, skeleton pulse not covered by reduced-motion, first Tab skips skip link after /#insights. Owner 6:40am: must return and tap small Refresh after syncing; 69/70 cliff; "today so far" steps vs full-day averages.

## Minor Observations
Copy "Your last 3 sessions: 8 in the last 7 days"; "lighter = partial week" false in dark; faint graphics (partial bars 2.0:1, raw line 2.1:1, band 1.3:1); load scale clamps at 2.0, 1.3/1.5 ticks 4px apart at 320; skip-link focus shifts page 60px (by design); footer fine print; render-blocking Google Fonts; bare error title; r shown twice; narrow-width stragglers; dev server lacks compression/CSP (vercel.json only). Measured: all text roles pass WCAG (lowest 4.60:1), 17 targets >=44px, no overflow at 5 widths x 4 tabs, CLS ~0.001, cold load ~410 KB uncompressed.

## Questions
1. Recovery = hero + 14-day strip, rest on a History tab? 2. Grey the hero when stale and refresh on return? 3. A "borderline" band around the 70 cut-off?

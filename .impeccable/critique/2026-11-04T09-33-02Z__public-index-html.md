---
target: the dashboard (public/index.html)
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/home/user/garmincompanion/public/index.html"
target_fingerprint: "sha256:cd5c37ed986e2bf271b6874af10abdd2b0780e3b9bbc39c93f537c7051633ac0"
target_path: /home/user/garmincompanion/public/index.html
timestamp: 2026-11-04T09-33-02Z
slug: public-index-html
closed: true
---
# Critique: Garmin Companion dashboard (public/index.html)

Method: dual-agent (A: design review · B: detector + browser measurements). Overlay skipped: no human-visible browser.

## Design Health Score: 24/40 (Acceptable)
1 Visibility of System Status 2 | 2 Match Real World 3 | 3 User Control 3 | 4 Consistency 3 | 5 Error Prevention 3 | 6 Recognition vs Recall 2 | 7 Flexibility 2 | 8 Aesthetic/Minimalist 3 | 9 Error Recovery 1 | 10 Help/Docs 2

## Design Specificity Verdict
Generic: tab bar + equal KPI cards + default Chart.js grid; palette from a category recommendation. Product-specific content (own-baseline readiness, plain load labels, honest caveats) is the most buried.
Deterministic scan: 1 warning (cramped-padding on .tabs, false positive: selected-tab underline). Scripts/CSS regex-only, no findings. --cdp scan of Training tab clean. Detector blind to canvas text and hierarchy.

## Priority Issues
- [P1] Dashboard does not answer "should I train hard today?" -> hero Today block with large readiness, verdict, driver bars, load chip; distinct state colours. (layout, clarify)
- [P1] Loading/failure states missing: #status inside hidden #app, no try/catch, no retry, 502 leaves panels empty. (harden)
- [P2] Phone first screen and activities table: header ~190px, numeric columns hidden behind unfocusable scroll. (adapt)
- [P2] Chart choices/colour roles: 90 stacked sleep bars, autoscaled lines, dashed semantics inconsistent, amber overloaded, flat zone colour. (distill, colorize)
- [P2] Freshness/partial data unlabelled: latest() fallback, fetchedAt vs sync time, partial current week, 7-day avg vs weekly avg mismatch. (clarify)

## Persona Red Flags
Alex: range resets, no refresh, KPI cards inert, range scope unclear. Sam: tab focus ring clipped by overflow-x, panels lack tabindex, table not keyboard-scrollable, status inside hidden container, no chart table alternative. Dana (owner 6:40am): verdict is 12px tag, no scale/reason, load ratio contradicts "Strained", no sync time, best insight on tab 4.

## Minor Observations
Orphan cards in grid; navy body text everywhere; KPI units full size; insights table lacks valence and mixes load scales; insight cards equal weight at r=0.03 and 0.73; "Week of" labels; Demo badge brightest in dark; skip link unthemed; card border contrast 1.17 light; amber series 3.19:1; canvas text 12px. Code bugs: dev.js crashes on missing static file (ERR_HTTP_HEADERS_SENT); load() leaves 401 body unread.

## Questions
1. Number or sentence before 7am? 2. Should "Today" be the default view with tabs as drill-downs? 3. Which of the 11 charts would a watch-wearer cut?

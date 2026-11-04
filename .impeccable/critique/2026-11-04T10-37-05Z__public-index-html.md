---
target: the dashboard (public/index.html), re-run after polish
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/home/user/garmincompanion/public/index.html"
target_fingerprint: "sha256:dfb66bd446fd96a52677cd80c4137ecdf7bdde425ff9aeaa0929d950b08793ac"
target_path: /home/user/garmincompanion/public/index.html
timestamp: 2026-11-04T10-37-05Z
slug: public-index-html
---
# Critique (re-run): Garmin Companion dashboard (public/index.html)

Method: dual-agent (A: design review · B: detector + browser measurements), isolated; neither read the earlier report. Overlay skipped: no human-visible browser.

## Design Health Score: 28/40 (Good, low end); previous run 24/40
1 Visibility 3 | 2 Match real world 3 | 3 User control 2 | 4 Consistency 3 | 5 Error prevention 3 | 6 Recognition 3 | 7 Flexibility 2 | 8 Aesthetic/minimalist 3 | 9 Error recovery 3 | 10 Help/docs 3

## Design Specificity Verdict
Hero is authored (verdict, personal-baseline scale and drivers, battery glyph, stage bar, normal-range band, age labels). Rest is a competent template: generated navy/amber palette, Fira, identical cards, KPI row + chart grid on Training/Activity. About 25% authored.
Deterministic: 1 cramped-padding warning on .tabs (false positive, tab underline; 14px clear below text). Scripts/CSS clean. CDP scans of all 4 tabs in light and dark clean (detector verified live by injecting violations). Login view: 1 straggler advisory. Overlay skipped.

## Priority Issues
- [P1] Sign out does not lock the page: /api/data is Cache-Control private,max-age=300, so reload/new tab after Sign out serves the dashboard from HTTP cache; footer claim "clears the copy cached in this browser" is false for 5 min; no way to force fresh data. Fix: no-store, Clear-Site-Data "cache" on logout, visible Refresh. (harden)
- [P1] Headline verdict ignores load and staleness: score 100 + load ratio 1.94 still says "Good day for a hard session"; bad day says "Keep today easy" above "lighter than usual". Fix: fold ratio into verdict, data-date chip, state colour on verdict. (clarify, layout)
- [P2] Thin/empty data: r=1.00 with full meter at n=3; empty deltas table; days:[] leaks JS error, "Invalid Date", collapsed hero. Fix: r=null below 14 days, empty row/message, empty-data error card. (harden)
- [P2] Small-screen/keyboard defects: tab rail clips Insights at 320 and select/End do not scroll it into view; focused skip link covers 139 of 174px of title and its target is hidden on login; title never changes per tab; no hashchange handling. (adapt)
- [P2] Recovery repeats each metric 3-4 times; Body Battery range chart is a comb; Training/Activity have no focal point (load ratio is one of four equal cards). (distill, layout)

## Persona Red Flags
Alex: range/tab not remembered, no refresh, cached reload, no drill-down. Sam: password input and select borders ~1.2:1, tab switches not announced, tooltips not keyboard-reachable, drivers group unnamed, focus drops to body after login. Owner 6:40am: verdict can say "good day" under a spiking load, stale headline with no refresh, nothing defines "easy".

## Minor Observations
Mobile insights Change column wraps to 3 lines; Chart.js text is Helvetica (options.font.family ignored; set Chart.defaults.font.family); spline overshoot on thin data; 7-day avg includes partial today; score clamps to 100; top insight near-circular; dark band muddy; faint raw line 2.1:1 and band 1.3:1 are decorative; login straggler. Measured: all text pairs AA (min 4.8:1), targets >=44px, CLS 0.0002, ~407 KB cold.

## Questions
1. Would verdict-with-load make the KPI cards and charts redundant? 2. Should state colour own the top of the page? 3. Are Training/Activity/Insights drill-downs behind the verdict?

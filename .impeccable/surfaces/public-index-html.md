---
version: 1
slug: "public-index-html"
primary_target: "public/index.html"
related_targets: []
---

# Surface brief: the Garmin Companion dashboard (all areas, login and states)

## Scope and mode
Operate. The whole app: Home, Activity (Running, Strength), Recovery, plus login, loading, error and empty states. A visual replacement of the navy "Night Instrument Panel"; every function, string and behaviour is kept.

## Audience, task, constraints
One owner. Phone at 6:40am in a dim room (decide hard or easy), laptop at a desk (review trends). Dense enough to trust. Standard controls only.

## Chosen direction
Pinned by the user (round 2, Nov 2026): Bevel + Apple Health. Round 3: keep their philosophy, not a direct copy; add our own spin. Numerals bundled so every device matches; card names shortened; Sign out moved out of the header; Home sections. Theme follows the system, both first-class. Kept by the user: the poster readiness numeral with its zoned scale, one colour per signal, the laptop sidebar with a phone tab bar, and the density. Craft bar: Bevel, Apple Health, Strava, Hevy.

## Unresolved
None blocking.

## Direction contract

THESIS: A health app's calm, with its own voice. Taken from Bevel and Apple Health as philosophy, not copied: monochrome chrome, colour only for data, borderless rounded cards, big numbers. Our own spin is that every trend is drawn over the owner's own normal range. It refuses the outlined-card-on-navy dashboard, coloured dot captions, tinted panels, and a pixel copy of iOS.

OWN-WORLD: Graphite ground (#0b0c0f, cards #17191d) in dark, cool grouped grey (#eef0f3, white cards) in light; theme follows the system. Cards borderless at 18px. Bundled Nunito Sans for text and Nunito (rounded, tabular) for numbers, so every OS and browser renders identically. Each card: drawn icon plus signal name in its ink, the time context on the right, the value, then the verdict word leading the comparison line. Signature: every sparkline that has a usual sits on a band of the owner's normal range (usual +/- 1 SD over 28 days) with the usual dashed inside and a ringed dot on the latest reading. Home is grouped under Recovery, Training and Today. Pill buttons, segmented control, green switches.

STORY: The owner opens it, reads the readiness number in its state colour and the verdict beside it, scans the signal cards by their coloured headers, and acts.

FIRST VIEWPORT: 1440x900: borderless sidebar (name, three areas, sub-pages), large title with freshness and actions, the readiness card with the poster numeral tinted by state and a capsule zone scale, then four signal cards, each with an ink header, a rounded value, its usual and a trend line (7 days on Home, 14 on the area pages). Phone: large title, readiness card, 2x2 cards, tab bar.

FORM: User-pinned direction, not rolled: the user chose "Bevel + Apple Health" in the structured question (round 2, Nov 2026), so no concept-seed ran and there is no seed reference. seed: none (user-pinned)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

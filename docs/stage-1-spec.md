# Stage 1 spec

Stage 1 is a modern, read-only analytics dashboard on the owner's Garmin Personal API key, good enough to stop using Garmin Connect and Intervals.icu. This spec gathers the decisions made in the product plan map ([#4](https://github.com/ryanteo96/GarminCompanion/issues/4)). Each decision lives in its ticket; this page is the build-facing summary. Terms are defined in `GLOSSARY.md`; the decisions that are hard to reverse are in `docs/adr/`.

## Done means

For four weeks the owner does the morning check and weekly review here without opening Garmin Connect or Intervals.icu. Every page runs on real Garmin data and every derived metric cites its method. Anything not computable from real data is cut or deferred, never faked.

## Rules

- **Read-only.** Nothing is written back to Garmin.
- **No gamification.** Consistency is shown as neutral weekly facts: no streaks, badges or goals to chase.
- **Derived metrics cite a published method**, with a quiet per-metric note and one disclaimer that computed values are estimates, not Garmin's numbers, and not medical advice. Impact says association, not cause (ADR 0004).
- **Real data first.** The numbers must match Garmin Connect for the same day. Garmin returns `movement.steps` as an object (`goal`, `value`, `distanceInMeters`), not a number; `lib/garmin.ts` and `lib/types.ts` treat it as a number, and the demo data hid it.
- **Free tiers only:** Vercel Hobby and Neon Free.

## Navigation

Three top-level destinations on both phone and laptop: Home, Activity, Recovery.

- **Routes:** `/home`, `/recovery`, `/activity` (the "All" view, Training merged in), `/activity/<sport>` for each Sport page, and `/activity/<sport>/<id>` for a Session.
- **Phone:** the bottom bar holds exactly those three items.
- **Laptop:** the sidebar shows the same three, with sports as indented sub-items under Activity. One route table drives both.
- **Sport switcher:** chips at the top of Activity (All, Running, Strength, later Swimming and Cycling). All is the default. A sport with no recorded Sessions is hidden. The chips scroll horizontally if they overflow.
- **History:** tab and chip changes use `replace`; opening a Session uses `push`.
- **Old routes:** `/training` redirects to `/activity`; `/insights` is removed.

## Pages

### Home

Daily values, a weekly overview, and a small month heatmap. The weekly overview takes over the 7-day versus prior-21-day table from the old Insights page. A latest-Session tile opens that Session's page. Tiles stay showable, hideable and reorderable (ADR 0001, 0002).

### Recovery

Readiness (the app's own verdict, ADR 0003), its Signals (HRV, resting heart rate, sleep, Body Battery peak) and last night's sleep stages. Refreshed late in the build order.

### Activity

General, sport-agnostic fitness metrics, with Training merged in:

- Fitness, Fatigue and Form. Garmin's per-Session load first; a cited heart-rate-based estimate as the fallback. Fixed 42-day and 7-day constants.
- Load (7-day against the 28-day norm), steps, intensity minutes and stress.
- The Session list for all sports.

### Running (Sport page)

- Per-run pace and heart rate charts, laps or splits.
- Trends: Z2 heart rate against pace, weekly distance and load.
- Heart rate against feel and RPE, which exist for runs (`directWorkoutFeel`, `directWorkoutRpe`).
- Impact: how the Signals change after runs, compared with the owner's usual.

### Strength (Sport page)

- Per-Session summary: exercises, sets, reps, weight, volume, muscle groups targeted.
- Weekly and monthly consistency, and a trend chart per muscle group.
- **Muscle mapping:** category level only (the specific exercise is on only some FIT sets). Nine groups: chest, back, shoulders, biceps, triceps, quads, hamstrings and glutes, calves, core. A primary mover counts 1.0 set and a secondary 0.5, summed per week (fractional sets, Pelland et al. 2025). The per-category table is our own reasoned assignment, labelled as such.
- The activity list already carries per-category sets, reps, volume and load, so the summaries and trends need no FIT parsing.
- Strength has no feel or RPE.

### Session page

- **A page, not inline.** The detail is fetched on demand by activity id from the stored `activities` table (ADR 0005), not loaded with the lists.
- **Shared header:** name, date, duration, load, average heart rate. Then a per-sport body: runs get pace and heart rate charts, laps, decoupling and Z2 efficiency; strength gets sets, reps and volume by category. Sports with no body yet show the header only.
- **Impact on the page:** the Session's own next-night HRV and resting heart rate against the owner's usual, labelled as an association, shown once that night's data exists. This is the one thing the competitors don't do.
- **Entry points:** every Session row (Activity list, each Sport page, the Home tile) opens it, through the shared `SessionItem`.
- **Detail not stored yet:** the summary header plus a "detail still syncing" note; it fills in later and never downloads a FIT file in the page request. Sessions older than the 90-day backfill show the header only, with a note.

## Metrics and sources

| Metric | Method | Notes |
| --- | --- | --- |
| Fitness, Fatigue, Form | 42-day and 7-day load model, as in Intervals.icu and COROS | Values won't match theirs; Garmin's load is its own figure |
| Decoupling (Pa:Hr), Z2 efficiency | Plain arithmetic on per-second FIT records (Friel/TrainingPeaks) | The 5% cut-off is practitioner guidance, not validated |
| Next-day HRV and resting heart rate | 7-day mean of ln rMSSD and its variation (Plews et al.) | Small elite samples; needs training context (Buchheit 2014) |
| Heart rate against effort | Borg 1982, Foster 2001 session-RPE | Runs only |
| Weekly sets per muscle group | Fractional sets (Pelland et al. 2025); sets per group as the unit (Schoenfeld, Ogborn and Krieger) | Category assignments are our own |

Decoupling, efficiency and time in zone are computed once at parse time and carry a method version.

## Data and storage (ADR 0005)

- Daily summaries are fetched live, as today.
- Each activity's parsed detail is stored in one Neon `activities` table: summary columns plus JSONB (laps and sets in full; heart rate, pace, cadence, altitude and a simplified route downsampled to about 500 points), keyed by activity id and tagged with a parser version. Original FIT files are not kept.
- Cross-activity metrics (Fitness/Fatigue/Form, Readiness, Load, Impact) are computed on read.
- Sync runs on user load, after the response, capped per load (about 10); the first backfill covers 90 days over a few loads and the UI shows "syncing N activities". No scheduled job; older Sessions parse when opened. Parse failures retry a few times, then are skipped.
- The live Garmin activity list decides what is shown. A manual "Delete my stored activity data" action wipes the table; sign-out does not.

## Design

- Charts move to visx with distinct chart forms; Chart.js is still in the app today.
- Apple Health and Bevel cues inside the current design language: no overhaul.
- The existing accessibility practice in `PRODUCT.md` still applies.

## Out of scope

- Stage 2 (other Garmin users) and Stage 3 (other brands), including accounts, hosting for many users, and a brand-neutral data model. See the Garmin Developer Program and other-brand API findings ([#5](https://github.com/ryanteo96/GarminCompanion/issues/5), [#6](https://github.com/ryanteo96/GarminCompanion/issues/6)).
- Swimming and cycling, to come as a fresh effort before Stages 2 and 3.
- The full month calendar.
- Native app (Stage 1 stays a phone-first web app).
- The central Insights page, until after the four-week trial. The old ranked correlations of arbitrary metric pairs are dropped.
- Device management, workout and course planning, social features and challenges.

## Build order

1. The real-data gate: fix steps, then confirm every page's numbers against Garmin Connect.
2. Navigation rework: the three destinations, the route table, the Sport switcher, redirects.
3. Activity, with Fitness/Fatigue/Form.
4. Home, with the weekly overview and heatmap.
5. Storage and sync (ADR 0005), then the Session page.
6. Running.
7. Strength.
8. Recovery refresh.
9. Impact, distributed across the Session and Sport pages.

Running and the Session page need stored FIT detail, so storage comes before them.

## `PRODUCT.md` amendments

- Replace the "Four areas" line (Recovery, Training, Activity, Insights) with the three destinations and Sport pages above.
- Amend the voice line to say consistency is neutral weekly facts, not streaks or badges.
- Replace "Be honest about provenance" with the quiet per-metric citation and single disclaimer from ADR 0004.

# Intervals.icu and Coros Training Hub: what they offer that Garmin Connect lacks

Issue: #7 (parent #4). Researched 2026-11-05. Primary sources only; each claim cites its source. Section 5 lists what could not be verified.

Sources used:
- [II-home] https://www.intervals.icu/ (official site)
- [II-well] https://www.intervals.icu/features/wellness/
- [II-track] https://www.intervals.icu/features/track/
- [II-api] https://forum.intervals.icu/t/api-access-to-intervals-icu/609 (maintainer "david")
- [II-fit] https://forum.intervals.icu/t/fitness-page-a-guide-to-getting-started/17702 (community guide, with maintainer replies)
- [II-const] https://forum.intervals.icu/t/change-fatigue-atl-and-fitness-ctl-factors/300 (maintainer announcement, Jan 2020)
- [II-act] https://forum.intervals.icu/t/activities-page-a-guide-to-getting-started/17698 (community guide)
- [C-metrics] https://support.coros.com/hc/en-us/articles/360061452651 (COROS Fitness Metrics Explained)
- [C-evo] https://support.coros.com/hc/en-us/articles/4412789816724 (EvoLab)
- [C-hub] https://support.coros.com/hc/en-us/articles/4412383468180 (Training Hub Athlete Tutorial)
- [C-prog] https://support.coros.com/hc/en-us/articles/15284442160532 (Progress Page)
- [C-welcome] https://coros.com/uk/stories/coros-coaches/c/welcome-to-the-training-hub
- [C-status] https://coros.com/stories/coros-coaches/c/prepare-for-your-next-race-with-training-status
- [C-recov] https://coros.com/stories/coros-metrics/c/your-coros-recovery-metrics-explained
- [G-api] https://github.com/garmin/connect-personal-api-python README endpoint table
- [G-status] Garmin owner's manuals and blog (www8.garmin.com/manuals/..., garmin.com/en-US/blog/fitness/garmin-training-status-and-how-to-use-it/)
- Repo: `lib/garmin.ts`, `lib/types.ts`

## 1. Feature survey

### Training load and fitness/fatigue models

| Item | Intervals.icu | COROS Training Hub |
|---|---|---|
| Model | Fitness / Fatigue / Form chart (Performance Management Chart). Names avoid the trademarked CTL/ATL/TSB; Form = Fitness minus Fatigue [II-fit]. | Training Status: Base Fitness, Load Impact, Intensity Trend [C-metrics, C-evo]. |
| Windows | Fitness default time constant 42 days; Fatigue about 7 days [II-fit]. User-adjustable per date ("Fitness days") [II-const]. | Base Fitness = 42-day rolling average of daily load; Load Impact = 7-day rolling average [C-status, C-evo]. |
| Derived signal | Form as absolute value or percent of Fitness [II-fit]. | Intensity Trend = Load Impact / Base Fitness, banded Excessive (>=150%), Optimized (100-149%), Maintaining (80-99%), Resuming/Performance (50-79%), Decreasing (0-49%) [C-evo]. |
| Per-activity load | Calendar shows load per ride; zone breakdown depends on the "load priority" setting (power or HR) [II-act]. The load formula itself was not found in the sources fetched. | Every activity with heart-rate data gets a Training Load scored Low/Medium/High [C-metrics]. COROS also recommends a 7-day load on a 3:1 build/recovery cycle [C-metrics]. |
| Forward projection | Maintainer said no planned-Fitness projection existed in that thread [II-fit]. | Calendar "predictive modeling" shows how planned workouts change Base Fitness, Load Impact and fatigue [C-hub]. |

### Activity analysis
- Intervals.icu: interval detection, power charts, decoupling [II-home]; power-curve comparison across seasons, W/kg, MAP estimate via eFTP, Morton 3P or Monod-Scherrer [II-home, II-track]; per-activity JSON including intervals, and CSV export [II-api, II-act]; grade-adjusted pace is a display option [II-act]; 70+ custom chart metrics and custom formulas [II-track].
- COROS: activity window with layered custom charts (pace, HR, cadence, elevation), drag-zoom, laps and splits, second-by-second data [C-welcome, C-hub]. Per-run Efficiency score, Running Performance (80-120%), Training Effect aerobic/anaerobic 0-5+, Training Focus, VO2 Max, Race Predictor, Running Fitness breakdown [C-metrics, C-evo].

### Calendar and planning
- Intervals.icu: drag-and-drop calendar, structured workouts (power/HR/pace/cadence), training plans, import from other calendars, weekly totals; annual plan builder is a paid tier [II-home]. Events and workouts are exposed via API, with .zwo/.mrc/.erg export [II-api].
- COROS: calendar with workouts, events, plan library, periodization phases (Preparation to Transition), workout library drag-and-drop, predicted metrics [C-hub]. Completed workouts get an adherence "accuracy" score (quality plus quantity) [C-prog]. Coach tools to edit athlete calendars [C-welcome].

### Wellness and recovery
- Intervals.icu: weight, sleep, HRV, readiness, glucose, menstrual cycle, stress, mood, hydration, SpO2, blood pressure, plus user-defined custom fields; auto-sync from Garmin, Polar, Suunto, Coros, Huawei, Amazfit, Oura, WHOOP [II-well]. Wellness can be plotted next to Fitness [II-fit].
- COROS: Recovery percentage (0-19 Exhausted to 90-100 Fresh) from Base Fitness, Training Load and energy remaining since last workout; the Recovery Widget article states it does not currently factor in sleep, HRV or stress (that article was only seen via a search summary, see section 5) [C-metrics, C-recov]. Overnight HRV (Elevated/Normal/Reduced/Low) and resting HR are shown as trends [C-recov]. The Recovery Timer caps at 96 hours [C-evo].

### Long-range trends
- Intervals.icu: Fitness chart over imported full history (Strava, Garmin), season-over-season power curve, "Compare" any time periods, totals tables by day/week/month/year/season, route progress, submax fatigue testing [II-track]. How far back charts reach is not stated.
- COROS: EvoLab day-by-day and week-by-week metrics, Marathon Level compared to similar runners, personal records, 7-day fatigue trend [C-hub, C-welcome].

### What Garmin Connect has (for contrast)
Garmin documents Training Status (about 10 categories, based on VO2 max trend vs acute load, with HRV status), Acute Load (an activity's impact fades after about 10 days), HRV Status (7-day average vs baseline, needs about 3 weeks of data), Training Readiness 1-100 (sleep, recovery time, HRV, acute load, stress history) and Body Battery [G-status]. So Garmin does not "lack" a load model. Per these sources, what it lacks versus the others is: a user-editable Fitness/Fatigue/Form chart with adjustable constants, power-curve season comparison, custom charts and formulas (Intervals.icu); user-defined wellness fields and cross-brand aggregation (Intervals.icu); and forward projection of planned load (COROS). A Garmin Connect calendar and chart inventory was not verified (section 5).

## 2. What this repo already uses from the Garmin Personal API

From `lib/garmin.ts` and `lib/types.ts`:

| Repo call | Fields read |
|---|---|
| `/usersummary-service/v2/dailysummaries` | steps, burned calories, resting HR, intensity minutes, avg stress, body battery max/min |
| `/hrv-service/hrv/daily/{s}/{e}` | `lastNightAvg`, `weeklyAvg` |
| `/sleep-service/sleep/dailySleepSummariesByDate` | sleep stage seconds, overall sleep score, sleep start/end |
| `/activitylist-service/activities/search/activities` | type, duration, distance, avg HR, `activityTrainingLoad`, `aerobicTrainingEffect`, `hrTimeInZone_1..5` |

## 3. Garmin Personal API endpoints (README table [G-api], 24 rows)

stress daily, steps daily, hydration daily, weight goals, weight measurements, food logs, profile settings, daily sleep, sleep summaries, body battery daily report, daily summaries, daily heart rate, daily HRV, HRV summaries, heart rate zones, menstrual cycle summary and day view, fitness age, SpO2 acclimation, wellness activity summaries, activity search, activity detail (`/activity-service/activity/{id}`), activity workouts, and activity file download (`/download-service/files/activity/{id}`, ZIP bytes). The README says endpoints without wrappers can be reached with `GarminPersonalApiClient.get()` and points to a Swagger reference for the full list.

## 4. Mapping: which features the Garmin API can feed

Judged by the README endpoint table and the fields the repo already reads.

| Feature | Verdict | Basis |
|---|---|---|
| Fitness/Fatigue/Form or Base Fitness/Load Impact/Intensity Trend | Feasible from API data | Needs only a daily load series. The repo already reads per-activity `activityTrainingLoad`; the 42/7-day averages in [II-fit]/[C-status] can be computed client-side. Caveat: Garmin's load is Garmin's own figure, so numbers will not match Intervals.icu or COROS. Garmin's own Acute Load is not in the table. |
| Per-activity time-in-zone, training effect, load | Already in use | `hrTimeInZone_*`, `aerobicTrainingEffect`, `activityTrainingLoad`. |
| Sleep, HRV, resting HR, stress, body battery, steps views | Already in use or in table | Daily summaries, HRV, sleep, body battery endpoints. |
| Wellness extras: weight, hydration, SpO2, menstrual cycle, HR zones | In table, not yet used by repo | Rows exist. |
| Wellness extras: glucose, blood pressure, mood, custom fields | Not exposed | No such row. These are user-entered in Intervals.icu [II-well]. |
| Activity stream analysis (power curve, decoupling, GAP, interval detection, layered charts, laps/splits) | Possible but heavier | `activity` detail and `activity-download` (FIT in a ZIP) are in the table, so streams are reachable; needs FIT parsing and, for power curves, a power meter. Not fetched by the repo today. Whether the detail JSON includes laps/splits was not verified. |
| Long-range trends and period comparison | Feasible | Aggregation over fetched history; limited by how many days the repo fetches and by API date-range limits (not verified). |
| Training Status, Training Readiness, Acute Load, VO2 max, race predictor | Not in table | No rows. They may exist in the unlisted Swagger reference (not checked). COROS-proprietary scores (Recovery %, Running Performance, Efficiency, Race Predictor) cannot be reproduced exactly. |
| Calendar, planned workouts, plan adherence, forward load projection | Not exposed for planning | The table has `activity-workouts` for a completed activity only; no calendar or workout-write endpoints. A projection could be computed locally from plans the user enters in this app. |
| Data from other brands (Oura, WHOOP, Polar, Apple Health) | Out of scope | Garmin API returns only Garmin data. |

## 5. What could not be verified

- COROS help-centre pages returned HTTP 403 to the page fetcher; their text was read through the help centre's public article JSON for the same official articles (Fitness Metrics, EvoLab, Athlete Tutorial, Progress Page). The Recovery Widget article (support.coros.com/hc/en-us/articles/15406707571732) could not be read; its "does not factor sleep/HRV/stress" statement is from a search-result summary only.
- Intervals.icu publishes no single official manual. Feature claims come from the official site and guide posts on the maintainer's forum; the Fitness and Activities guides are partly community-written with maintainer replies. The 42-day and about-7-day constants are stated there, not as an exact formula from the maintainer.
- Intervals.icu load formulas for HR-only activities (HRSS/TRIMP) and the eFTP algorithm were not found in the sources fetched.
- Fitness values appear in Intervals.icu API event responses as `icu_ctl`/`icu_atl` [II-api]; no dedicated fitness endpoint was confirmed. The OpenAPI reference itself was not read (the api-docs page only links to forum posts).
- Garmin Connect (web/app) pages were not fetched directly. Garmin material comes from owner's manuals and blog posts of varying age, and nothing was found on Garmin Connect's calendar, Performance Condition or custom charting. The claim of what Garmin Connect "lacks" is limited to what those sources do not mention.
- The Garmin Personal API Swagger reference was not read; "not in table" means not in the README table only. Rate limits, date-range limits and which activity-detail fields exist were not checked.
- No live API calls were made and no personal data was used.

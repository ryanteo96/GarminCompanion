# How can strength exercises be mapped to muscle groups?

Answers issue #12. Derived method under ADR 0004 (the ADR text was not available in the research worktree and was not read).

## Short answer

- Garmin gives no muscle data in the FIT file. It gives an exercise **category** and **subtype** per set. Muscles must be derived by a lookup table we own.
- Use a **category-level** table (about 30 strength categories) to **9 coarse muscle groups**, with weights **1.0 primary, 0.5 secondary**, summed into weekly per-group "set equivalents".
- The 0.5 weight is the best-supported published convention. The per-exercise assignments themselves are our judgement, not a published dataset.

## What Garmin exposes

1. **FIT `set` message.** Fields `category` (type `exercise_category`, array) and `category_subtype` (uint16, array; the profile comment says "Based on the associated category, see [category]_exercise_names"). Source: FIT Profile 21.221.0 as shipped in the [Garmin FIT JavaScript SDK `profile.js`](https://github.com/garmin/fit-javascript-sdk/blob/21.221.0/src/profile.js) (set message near line 14519). Both fields are arrays, so one set can carry several exercises.
2. **`exercise_category` enum.** About 50 values, e.g. benchPress=0, calfRaise=1, curl=7, deadlift=8, lunge=17, pullUp=21, pushUp=22, row=23, shoulderPress=24, squat=28, tricepsExtension=30, plus non-strength ones (cardio, run, bike, warmUp, pose, elliptical...) and unknown=65534. Same source (`exerciseCategory`).
3. **Per-category subtype enums.** 51 `*ExerciseName` enums with about 1,850 named entries in total (counted from the same file), e.g. `benchPressExerciseName` includes barbellBenchPress, inclineDumbbellBenchPress, closeGripBarbellBenchPress. Names encode equipment and angle, which can refine weights but are too many to map by hand.
4. **No muscle field.** A search of that profile for "muscle" finds only exercise names (e.g. muscleUp) and `muscleOxygen`/`muscleMass`, not muscle-group data.
5. **Garmin Connect muscle map.** Device manuals say the muscle map is shown "if available" for strength activities ([vivoactive 5 manual](https://www8.garmin.com/manuals/webhelp/GUID-5D183A14-BB43-4A9B-B441-5F824214CE40/EN-US/GUID-E86E82B5-6FF6-47C9-B46D-D3F6333697E4.html)). I found no official Garmin documentation of how it is generated, which muscles map to which exercise, or any API field carrying it. Forum posts (not authoritative) say it depends on exercises being assigned to the activity, e.g. [this thread](https://forums.garmin.com/apps-software/mobile-apps-web/f/garmin-connect-mobile-ios/359170/cant-see-body-diagram-with-muscles-used).
6. **Garmin Connect Developer Program Activity API.** The [overview page](https://developer.garmin.com/gc-developer-program/enterprise/activity-api) offers JSON summaries or FIT files, lists "Strength Training" as an activity type, and says nothing about sets or muscle data. Muscle groups are therefore not available from Garmin; derive them from the FIT sets.

## Published exercise-science basis for weighting

- Schoenfeld, Ogborn, Krieger (2017, online 2016), [Dose-response relationship between weekly resistance training volume and increases in muscle mass, J Sports Sci, doi:10.1080/02640414.2016.1210197](https://doi.org/10.1080/02640414.2016.1210197). Volume is expressed as weekly sets **per muscle group**; hypertrophy rises with volume (secondary summaries say evidence is clear up to about 10 weekly sets; I read only abstracts and summaries, not the full text).
- Pelland, Remmert, Robinson, Hinson, Zourdos (2025), [The Resistance Training Dose Response: Meta-Regressions..., Sports Medicine, doi:10.1007/s40279-025-02344-w](https://doi.org/10.1007/s40279-025-02344-w) ([preprint](https://sportrxiv.org/index.php/server/preprint/view/537)). Compared ways to count indirect sets: "total" (1), "fractional" (0.5), "direct" (0). Per the preprint abstract, fractional counting gave the strongest relative evidence for hypertrophy and direct for strength; diminishing returns appear in both. This is the basis for the 1.0 / 0.5 weights. I read the preprint abstract only, not the published full text.

## Proposed method for Stage 1

**Muscle groups (9):** chest, back, shoulders, biceps, triceps, quads, hamstrings and glutes, calves, core. Rationale: matches the granularity of the volume literature (sets per muscle group), and category-level data cannot support finer splits (e.g. upper vs lower chest needs the subtype).

**Algorithm:** for each set, for each `category[i]`, add 1 set-equivalent to each primary group and 0.5 to each secondary group; sum per week. Skip sets whose category is non-strength (cardio, run, bike, warmUp, etc.) or unknown. Optional: an override table keyed by `(category, subtype)` for common exceptions.

**Starter category table (author's judgement from standard anatomy, not a cited dataset):**

| Category | Primary (1.0) | Secondary (0.5) |
|---|---|---|
| benchPress | chest | triceps, shoulders |
| shoulderPress | shoulders | triceps |
| pushUp | chest | triceps, shoulders, core |
| flye | chest | shoulders |
| lateralRaise, shoulderStability | shoulders | none |
| shrug | shoulders (traps) | back |
| tricepsExtension | triceps | none |
| curl | biceps | none |
| pullUp | back | biceps |
| row | back | biceps, shoulders |
| deadlift | hamstrings and glutes, back | quads, core |
| squat | quads | hamstrings and glutes, core |
| lunge | quads | hamstrings and glutes |
| legCurl | hamstrings and glutes | none |
| hipRaise, hipSwing, hipStability | hamstrings and glutes | core |
| hyperextension | back, hamstrings and glutes | none |
| calfRaise | calves | none |
| core, crunch, sitUp, legRaise, plank, chop | core | none |
| olympicLift, totalBody, plyo, carry, sled, sandbag | no mapping (or whole body) | none |

## Limits and what could not be verified

- **No per-exercise primary/secondary dataset from a primary source was found.** ExRx.net, the usual reference, returned HTTP 403 to my fetch and was not read, so the table above is not sourced from it. Validate the table against a kinesiology reference or EMG studies before relying on it.
- The 0.5 weight is a modelling convention that fit meta-analytic data best, not a measured per-muscle stimulus. Real contribution varies by exercise, range of motion and load.
- Category granularity loses information: `row` covers both back-dominant and rear-delt variants; `squat` includes front, goblet, and hack squats with different quad/glute emphasis. Subtype overrides can fix the most common ones.
- Garmin muscle-map logic, and whether any Connect API exposes it, could not be verified from official sources.
- Exact enum counts are from my parse of the profile at release 21.221.0 and may change in later releases.
- The Schoenfeld 10-set threshold and the Pelland numbers come from abstracts and summaries; full texts were not read. Do not hard-code volume targets from this note.
- The Garmin forum thread is anecdotal.

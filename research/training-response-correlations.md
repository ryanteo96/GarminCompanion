# Which published training-response correlations can we compute?

Answers issue #11. Research date: 2026-11-05. Contains no personal data.

Short version: all four families are computable from per-second FIT records plus daily HRV and resting HR. The methods are well-known, but most have weak or context-dependent peer-reviewed validation. Distinctiveness comes from linking them (e.g. HRV response to a specific session type), not from the individual metrics.

## Stage 1 inputs (what I could and could not confirm)

- FIT `Record` messages hold per-sample heart rate, speed, distance, power, at up to 1 s resolution ([Garmin FIT Activity File](https://developer.garmin.com/fit/articles/file-types/activity.html)). Exact field names/units live in Profile.xlsx in the FIT SDK ([FIT SDK](https://developer.garmin.com/fit/)).
- Garmin's Health API covers all-day summaries incl. heart rate and sleep ([Garmin developer program](https://developer.garmin.com/gc-developer-program/)).
- NOT verified: that the owner's Personal API key exposes FIT files, nightly HRV, or resting HR. I found no official page for the Personal API itself (only a press piece). Third-party reports that Garmin strips undocumented fields from API-delivered FIT files are also unverified. Treat "Stage 1 can supply it" below as conditional on a spike against the real API.

## 1. Cardiac drift and aerobic decoupling (Pa:Hr / Pw:Hr)

- Method: compare pace-or-power per heartbeat between first and second half of a steady effort; percent change is decoupling. Bands: under 5% strong, 5-10% moderate, over 10% likely above aerobic threshold or limited endurance. Excludes warm-up/cool-down; steady efforts only. Source: [Friel, TrainingPeaks](https://www.trainingpeaks.com/learn/articles/aerobic-endurance-and-decoupling/). Note the article gives no formula and says no hard research rule exists for the durations; the 5% cut-off is practitioner guidance, not a peer-reviewed threshold.
- Physiology of drift (stroke volume falls, HR rises after ~10-20 min): [Coyle and Gonzalez-Alonso 2001, PMID 11337829](https://pubmed.ncbi.nlm.nih.gov/11337829/) (abstract only read).
- Inputs: per-second HR and speed (or power), activity segmenting. Optional: grade-adjusted pace for hills (TrainingPeaks coaches reportedly use NGP; secondary report only).
- Limits: heat, dehydration, hills, intervals, HR lag; sensor type (wrist optical HR is noisier than chest strap, not verified here).
- Stage 1: yes if FIT records are available. Pure arithmetic.

## 2. HR or pace at fixed effort (Z2 efficiency, Efficiency Factor)

- Method: Efficiency Factor = normalised (graded) pace or power divided by average HR over the aerobic-threshold portion ([Friel guidance as quoted in Intervals.icu forum](https://forum.intervals.icu/t/efficiency-factor/38610), secondary). I did not find Friel's primary EF text, and no peer-reviewed validation.
- Inputs: per-second HR, speed/power, a defined Z2 range (needs a user-set or derived aerobic threshold).
- Limits: Intervals.icu users report EF/decoupling are hard to trend because too many external factors move HR (same thread, anecdotal).
- Stage 1: yes with FIT records; zone definition is a product decision.

## 3. Next-day HRV and resting HR after training

- Method: nightly or morning ln rMSSD, smoothed as 7-day rolling mean with coefficient of variation: [Plews et al. 2012, PMID 22367011, doi:10.1007/s00421-012-2354-4](https://doi.org/10.1007/s00421-012-2354-4) (two elite triathletes, case comparison; abstract-level read). Review: [Plews et al. 2013, Sports Med, doi:10.1007/s40279-013-0071-8](https://link.springer.com/article/10.1007/s40279-013-0071-8) (abstract only).
- Sampling: at least 3 valid days per week are needed to approximate the weekly mean: [Plews et al. 2014, PMID 24334285](https://pubmed.ncbi.nlm.nih.gov/24334285/). A search summary reported weak performance correlations (about -0.02 to -0.28); I could not read the full text to confirm.
- Caution: [Buchheit 2014, doi:10.3389/fphys.2014.00073](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2014.00073/full): HR measures should be read in training context; HRV may be less sensitive to training status than assumed.
- Inputs: nightly HRV (rMSSD) and resting HR per day, daily training load from activities.
- Limits: evidence is mostly small elite-athlete samples; Garmin's own HRV is an overnight value whose algorithm is not documented in what I read, so equivalence with lab ln rMSSD is unverified.
- Stage 1: depends on whether the Personal API returns HRV and resting HR. Intervals.icu already shows HRV and an HRV:HR normalisation (rMSSD x resting HR / 600) per [forum post](https://forum.intervals.icu/t/normalised-hrv-added-to-fitness-page/106679), so a plain trend is not distinctive.

## 4. Heart rate versus perceived effort

- Methods: [Borg 1982, PMID 7154893](https://pubmed.ncbi.nlm.nih.gov/7154893/) (RPE scale); [Foster et al. 2001, PMID 11708692](https://pubmed.ncbi.nlm.nih.gov/11708692/) (session-RPE = RPE x duration, for load).
- Inputs: an RPE per activity. Garmin records a self-evaluation feeling/effort on activities, but I did not verify that it is exposed through the API or FIT summary.
- Limits: RPE is subjective; HR-vs-RPE needs many sessions per athlete before trends mean anything (my inference, not sourced).
- Stage 1: only if RPE reaches the data; otherwise the app would need its own RPE entry, which conflicts with the read-only scope.

## Competitor baseline and distinctiveness

- Intervals.icu: decoupling, efficiency factor, HRV and resting HR on wellness/fitness pages (forum evidence only; the official manual was not found by my search).
- Coros Training Hub: Base Fitness (weighted 42-day load average), Load Impact (7 days), Intensity Trend, Running Fitness ([Coros](https://coros.com/us/stories/coros-metrics/c/base-fitness)). I found nothing on per-session decoupling or HRV-response correlations there; absence from search is not proof.
- Candidate differentiators (my judgement, not published methods):
  1. Per-session decoupling and Z2 EF plotted against next-night HRV and resting HR (links families 1-3).
  2. Decoupling/EF trend normalised for temperature, if weather or device temperature is available.
  3. HR-vs-RPE drift over time, if RPE is available.

## Could not verify

- Personal API access to FIT files, HRV, resting HR, RPE.
- Friel primary source for EF; any peer-reviewed validation of the 5% decoupling threshold.
- Full texts of Plews 2012/2013/2014 and Coyle 2001 (abstract-level only); the CV formula.
- Intervals.icu official docs; Coros features beyond load metrics.
- Garmin Health API field lists (page 404'd; search only gave overviews).

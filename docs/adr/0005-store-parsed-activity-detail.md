# Parsed activity detail is stored in the owner's Neon

The app fetched everything live from Garmin and stored nothing but the Home layout. Strength sets, laps and per-second heart rate and pace come from FIT files, which are costly to download and parse on every view, so each activity's parsed detail is now stored in a Neon `activities` table (summary columns plus a JSONB detail column), keyed by activity id and tagged with a parser version. Daily summaries are still fetched live, and cross-activity metrics (Fitness/Fatigue/Form, Readiness, Impact) are computed on read so a method change updates the whole history. Original FIT files are not kept; Garmin retains them and the file is re-downloaded when the parser changes.

This is the app's first health data held server-side. The browser rules are unchanged (`no-store`, cleared on sign-out); sign-out does not delete server data, and a manual action wipes the stored detail. Sync runs on user load, after the response, capped per load, with a 90-day first backfill; there is no scheduled job. The design stays within Vercel Hobby and Neon Free.

## Considered options

- Fetch everything live (rejected: FIT parsing per view is too heavy).
- A separate NoSQL service such as MongoDB Atlas or Redis (rejected: a second vendor and secret for no gain, since the data is document-shaped but needs date-range queries Neon JSONB already gives).
- Vercel Blob for JSON files (rejected: no queries).
- Storing raw FIT files (rejected: it would use up the free storage quickly).

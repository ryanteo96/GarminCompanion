# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One person: the owner, who wears a Garmin watch and uses this to read their own Garmin Connect data. Two equally weighted situations, both confirmed by the owner:

- **Phone, first thing in the morning**, half awake, usually one-handed, deciding whether to train hard or easy today.
- **Laptop, at a desk**, reviewing trends over weeks and months: recovery, training load, activity, and how they relate.

It is private behind a password. Sharing with a partner or coach was offered as an option and not chosen; the Garmin Personal API itself only exposes the key-holder's own data.

## Product Purpose

Answer "should I train hard or easy today?" in one plain sentence, then let the owner check the answer against their own numbers. Success is that the owner trusts the verdict enough to act on it, and can see why: which signals moved, against what baseline, and how fresh the data is.

## Positioning

It judges today's recovery against the owner's own previous 28 days (HRV, resting heart rate, sleep, Body Battery peak) and combines that with training load into a single instruction. The score and the load ratio are computed in this app from Personal API data; they are not Garmin metrics and the app says so.

## Operating Context

- Data comes from the Garmin Connect Personal API: the owner creates a key in Garmin Connect Web (expiry 30 days to 1 year), the server exchanges it for a 24-hour token, and the browser never sees the key.
- Hosted on Vercel as static files plus three serverless functions (`/api/login`, `/api/data`, `/api/logout`). Login is a shared password with a signed cookie.
- The watch syncs on its own schedule, so the newest night is often missing early in the morning. Staleness is a normal state, not an error.
- The owner can set a chart range of 30, 90, 180 or 365 days.

## Capabilities and Constraints

- Three destinations: Home (daily values, weekly overview, month heatmap), Activity (Training merged in: Fitness/Fatigue/Form, load, steps, intensity minutes, stress, the Session list; Running and Strength Sport pages beneath it), Recovery (verdict, readiness score and drivers, HRV, resting heart rate, Body Battery, last-night sleep stages). See `docs/stage-1-spec.md`.
- The Garmin Personal API is read-only. Sleep arrives as stage totals and bed and wake times, not a per-minute timeline, so a true hypnogram is not possible.
- Readiness uses z-scores against the owner's 28-day baseline (60 is typical for them). The load ratio is the last 7 days of activity load divided by the 28-day total divided by 4. Cut-offs: under 0.8 light, to 1.3 sweet spot, to 1.5 ramping, above that spiking. Both are heuristics and the app states they are not medical advice.
- Terminology to keep: "readiness", "load ratio", "usual" (the owner's own baseline), "normal range", "Chart range".
- Health data must never be cached by the browser: responses are `no-store`, Sign out ends the server session and clears the local copy, and the last good payload is kept only in local storage for offline fallback.
- Real Garmin responses have not yet been inspected by the design work; field shapes (sleep score, activity type, bed and wake timestamps) are assumed from Garmin's published Swagger spec. `/api/data?debug=1` shows field names and types without values.

## Brand Commitments

- The name is "Garmin Companion".
- No Garmin logos or brand assets are used; it is a personal tool, not an official Garmin product.
- Voice today: plain, specific, second person, no hype, no gamification: consistency is shown as neutral weekly facts, never streaks or badges. A bad recovery day is information, not a failure.
- Design language (user confirmed in the second redesign round, Nov 2026): Bevel and Apple Health on the web. Native health-app grammar: monochrome chrome with colour reserved for data, borderless rounded cards on a true-black (dark) or grouped-grey (light) ground, a drawn icon plus label in the signal's colour on each card. The theme follows the system, both first-class. Kept by the user's choice from the earlier round: the poster-size readiness numeral with "of 100" and the zoned 0 to 100 scale, one colour per signal, the laptop sidebar with a phone tab bar, and the density.
- Craft bar (user confirmed): it should sit alongside Garmin Connect and Apple Health.

## Evidence on Hand

- A deterministic demo-data generator (`lib/sample.js`) in the exact shape of the real payload. It is synthetic and every page using it shows a "Demo data" badge.
- Nothing from a real Garmin account has been used in design work. No testimonials, customers, benchmarks or external claims exist and none should be invented.
- Previous critique snapshots under `.impeccable/critique/` (scores 24, 28 and 29 out of 40) document what the replaced design did well and badly.

## Product Principles

1. **The morning answer leads; everything else is its evidence.** The verdict is read first on every screen size and every other element exists to confirm or challenge it.
2. **Compare to the owner's own baseline, never a generic target.** Every number appears next to what is usual for this person.
3. **Be honest about provenance and freshness.** Say which day a reading is from and when something is missing. Computed metrics cite their published method in a quiet note, with one disclaimer that they are estimates, not Garmin's numbers and not medical advice (ADR 0004). Never fake precision.
4. **Dense enough to act on.** The owner explicitly named "too sparse to trust" as the failure to avoid, so enough real data must stay visible to justify the verdict, especially on the laptop.
5. **Private by default.** Health data is never cached by the browser and signing out means signed out.

## Accessibility & Inclusion

Project practice established during the build, not an externally stated requirement: WCAG AA text contrast (4.5:1, 3:1 for large text), 3:1 for controls and informational graphics, 44px touch targets, full keyboard operation with a skip link and visible focus, reduced motion respected, text alternatives for charts, and colour never the only cue for state.

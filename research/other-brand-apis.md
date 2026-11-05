# Do Coros and other watch brands offer usable public APIs?

Issue: #6. Researched 2026-11-05 from vendor-owned documentation only. Items marked **UNVERIFIED** could not be confirmed from a page I could read.

## Summary

| Brand | Access path | Personal / small-project use | Wellness (sleep / HRV / daily) | Activities |
|---|---|---|---|---|
| Coros | Partner API (application, company, user base); MCP route self-service | MCP route only (single-user) | Daily health data (Partner API); sleep, HRV via MCP connector | Yes, incl. FIT |
| Polar | AccessLink, OAuth2, self-service client | Yes (any Flow user can create a client) | Daily activity, sleep, Nightly Recharge (incl. HRV average and samples) | Yes, FIT/TCX/GPX |
| Suunto | APIZone, reviewed application | No ("no API access for personal use") | Not documented on the page read | Yes, FIT, samples (HR, R-R), GPS |
| Wahoo | Developer portal, sandbox then reviewed production | Sandbox only (very limited throughput) | None documented | Workouts + FIT |
| WHOOP | Developer dashboard app, OAuth2 | Yes, default 10 users per app; more needs approval | Recovery (HRV RMSSD, RHR), sleep stages, cycles | Workouts |
| Oura | OAuth2 (PATs deprecated) | Yes via OAuth2; approval/user cap UNVERIFIED | `daily`, `heartrate`, `spo2` scopes (sleep, readiness, HR) | Workouts |
| Apple Health | HealthKit, on-device only (UNVERIFIED against Apple docs) | Needs an iOS app | HRV (SDNN), sleep analysis | Yes |

## Per brand

### Coros
- Partner API is for established platforms: user base, registered company with technical representative, security/privacy compliance, API terms; apply via form, credentials issued after checks. Sources: [Submit an API Application](https://support.coros.com/hc/en-us/articles/17085887816340-Submit-an-API-Application), [Partner API Access](https://support.coros.com/hc/en-us/articles/53181766856724-Partner-API-Access).
- Self-service route is the COROS MCP / "Connect Your COROS to AI": no application, but single-user, no webhooks, no two-way sync; exposes sleep, daily HRV, stress, resting HR; FIT downloads capped at 50 requests/day. Sources: [Build on COROS MCP](https://support.coros.com/hc/en-us/articles/53181619102996-Build-on-COROS-MCP), [Connect Your COROS to AI](https://support.coros.com/hc/en-us/articles/50841795180948-Connect-Your-COROS-to-AI).
- A bulk data export exists: [Requesting a Bulk Export](https://support.coros.com/hc/en-us/articles/25002333092500-Requesting-a-Bulk-Export-of-COROS-Data).
- **UNVERIFIED:** every support.coros.com page returned HTTP 403 to my fetcher. The Coros claims above come from search-result summaries of those official pages, not from reading them. The Partner API's exact sleep/HRV endpoints, the application form, and any contact email were not confirmed.

### Polar
- AccessLink REST API, OAuth2, base `https://www.polaraccesslink.com/`; any registered Flow user can create a client at the admin portal; each end user must accept consents (else 403). Tokens do not expire unless revoked. Rate limits: 500 + users x 20 per 15 min; 5,000 + users x 100 per 24 h. One webhook per client. Source: [AccessLink docs](https://www.polar.com/accesslink-api/).
- Data: daily activity, sleep, Nightly Recharge (`heart_rate_variability_avg`, `hrv_samples`), continuous HR, exercises with FIT/TCX/GPX. Exercises only from the last 30 days and after user registration. Same source.
- Governed by the Polar AccessLink Limited License Agreement (not read). About 200k of 343k characters of the page were read.

### Suunto
- OAuth2; apply via webform, reviewed weekly, max two-week wait; for organizations serving a public audience; "We currently don't offer the API access for personal use." Free. Dev API has smaller limits (values not stated); production needs a further submission and public listing on Suunto.com. Source: [APIZone](https://apizone.suunto.com/).
- Data: activity summaries, samples (HR, R-R, power, altitude, temperature), GPS, FIT. Daily wellness/sleep not mentioned on the page read.

### Wahoo
- OAuth2 (PKCE available); sandbox immediately (25 req/5 min, 100/h, 250/day); production requires Wahoo review (200/5 min, 1,000/h, 5,000/day). Tokens expire in 2 h; 10 unrevoked tokens per user per app from 2026-01-01. Source: [Wahoo Cloud API](https://cloud-api.wahooligan.com/).
- Data: workouts, FIT files, plans/routes upload. Wahoo does not share completed workouts that originate from third-party apps. No sleep/HRV documented.

### WHOOP
- Create an app in the developer dashboard (needs a Team); max 5 apps; default 10-user cap per app, wider release needs approval. Source: [Getting started](https://developer.whoop.com/docs/developing/getting-started/).
- Scopes `read:recovery`, `read:cycles`, `read:sleep`, `read:workout`; recovery includes `hrv_rmssd_milli`, `resting_heart_rate`, `spo2_percentage`, `skin_temp_celsius`; sleep by stage; page size max 25. Source: [API reference](https://developer.whoop.com/api).
- Rate limit numbers and the approval process were not stated on the pages read.

### Oura
- OAuth2 (authorize `cloud.ouraring.com/oauth/authorize`, token `api.ouraring.com/oauth/token`), PKCE recommended, scopes `email personal daily heartrate workout tag session spo2`. Every request needs a User-Agent. Personal access tokens are labelled deprecated. Sources: [Oura authentication](https://cloud.ouraring.com/docs/authentication), [API v2](https://cloud.ouraring.com/v2/docs).
- Gen3 and later users without an active Oura Membership reportedly cannot access their data via the API (from a search summary of Oura support, not read directly).
- **UNVERIFIED:** app approval process and user cap; the endpoint list (the v2 reference page returned only a topic list); the claim that PATs were removed in December 2025 (search summary only).

### Apple Health
- The developer.apple.com pages fetched returned only titles. These facts are **UNVERIFIED against Apple docs** (from general knowledge): HealthKit is accessed on-device via `HKHealthStore`, there is no server-side API, read authorization is per type, HRV is `heartRateVariabilitySDNN`, sleep stages are in `sleepAnalysis` (iOS 16+).
- Verified: Apple's security guide says HealthKit data is encrypted on device and iCloud sync is optional ([Protecting access to user health data](https://support.apple.com/guide/security/sec88be9900f/web)). It does not state "no server API".

## Is a brand-neutral Stage 3 realistic?

Partly. Self-service OAuth for a personal or small app: Polar, WHOOP, Oura (and Coros via MCP, single user). Needs a business application or review: Suunto (explicitly no personal use), Wahoo production, Coros Partner API. Apple Health needs an on-device iOS component. Sleep and HRV, the data a Garmin companion most needs, are documented for Polar, WHOOP, Oura and (via MCP) Coros only. Schemas differ per vendor, so a normalizing adapter layer would be required.

## Could not verify
- Coros pages (all 403), so Coros details are secondhand search summaries.
- Oura approval/user cap and full endpoint list; Suunto wellness data and limit values; WHOOP rate limits and approval process; Apple developer docs content; vendor license terms (none read in full).
- No live API calls were made; nothing here was tested with credentials.

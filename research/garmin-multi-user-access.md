# How can other users' Garmin data be accessed?

Research for issue #5 (parent #4, blocks #10). Date researched: 2026-11-05.
Sources are primary only: developer.garmin.com, the Garmin developer portal, and github.com/garmin.

## Short answer

The only official route to other Garmin users' data is the **Garmin Connect Developer Program, Business tier**. The Personal tier is own-data only. Business has two levels: **Starter** (request form, push only, limited users, no historical data) and **Enterprise** (negotiated terms, push or ping/pull, unlimited users, 1+ month historical). Garmin reviews and approves applications, and a developer agreement must be accepted, so a hobby app cannot simply start reading other users' data.

## Findings

### Access tiers
Source: [Program overview](https://developer.garmin.com/gc-developer-program/overview/).

| | Personal | Business: Starter | Business: Enterprise |
|---|---|---|---|
| Data | Your own Garmin Connect data | Users who authorize your app | Same, plus Golf API |
| How to get it | Personal API key from Garmin Connect settings | Request form, then approval | Request via the Garmin Developer Portal; terms "tailored based on business and technical requirements" |
| APIs | Activity (JSON and .FIT), Health (JSON), Women's Health (JSON) | Activity (JSON and .FIT), Courses, Health, Training, Women's Health | Starter set plus Golf |
| Delivery | Pull only | Push only | Push or Ping/Pull |
| Historical data | n/a | Not included | 1 month+ |
| User capacity | Key holder only | Limited | Unlimited |
| Support | n/a | n/a | Included |

The overview says the program supports "a broad range of organizations, from individual developers and startups to companies operating at significant scale." That is the only official eligibility wording I could read.

### Application and approval
- Starter: apply with the [Starter Access request form](https://www.garmin.com/en-US/forms/StarterGarminConnectDeveloperAccess/) (linked from the overview).
- Enterprise: requested through the Garmin Developer Portal.
- The [Developer Program Agreement](https://developerportal.garmin.com/sites/default/files/Garmin%20Connect%20Developer%20Program%20Agreement.pdf) (14 pages, "Rev. B") says Garmin delivers "a single License Key" after you accept it (s3.1), and that Garmin may decline a Licensee Application that does not meet the Application Requirements (s4.2). So there is an application review step, not self-serve.

### Commercial-use and licence terms
From the [Developer Program Agreement](https://developerportal.garmin.com/sites/default/files/Garmin%20Connect%20Developer%20Program%20Agreement.pdf):
- s4.1: licence is "limited, non-exclusive, non-transferable, revocable, and non-sublicensable", to embed the API in applications "solely for internal business purposes".
- s5.1(e): you must not "sell, lease, share, transfer, or sublicense the License Key, provide access to the API, or derive income from the use or provision of the API, whether for direct commercial or monetary gain or otherwise, without Garmin's prior written permission".
- s10.1: no licence fees are due under the agreement; s10.2 reserves Garmin's right to charge fees for request volume above limits set in the Application Requirements. Enterprise commercial terms are separate and negotiated (overview page).
- s5.1(f): excessive or abusive request volume is prohibited. No numeric rate limit appears in the agreement text I read.
- s4.5 and s15: every app must give end users notice and obtain consent before data moves, link the Garmin Connect privacy notice, honour data-subject rights, may not sell End User Personal Data, and must follow applicable data protection law (step counts, calories and similar metrics count as Personal Data under the agreement's definition).
- s5.3: you must have a written agreement with each end user with protections for Garmin.
- s15.8: do not implement an authorization system Garmin has not approved in writing.
- Brand rules apply ([Brand guidelines](https://developer.garmin.com/brand-guidelines/overview/), referenced in the agreement).

### Authentication
- Personal: the [Personal API page](https://developer.garmin.com/gc-developer-program/personal/personal-api) says you exchange the key for an access token at `https://personal.connectapi.garmin.com/personalapitoken-service/personal-api/personal-api-key/token` with header `Authorization: ApiKey [your-api-key]`. The key is shown once and has a chosen expiry. The official [garmin/connect-personal-api-python](https://github.com/garmin/connect-personal-api-python) README shows the same flow (key to bearer token).
- Business (other users): see "Could not verify" below. The agreement (s15.8) requires Garmin-approved authorization, and the end user must consent, but the protocol details were not readable from primary sources.

### Data types
Primary-source confirmation is at API-family level only: Activity, Courses, Health, Training, Women's Health (and Golf for Enterprise) per the overview and the agreement's API definitions. Field-level lists (sleep, stress, HRV, body battery, etc.) were not readable; see below.

### Push versus pull
Per the overview: Starter is push only (Garmin sends data to your endpoint, no historical data); Enterprise adds ping/pull and 1+ month of history. Practical consequence: with Starter you only receive data generated after a user connects.

## What decides whether Stage 2 is feasible

1. Whether the project can apply and be approved (the Starter form is the gate; the Personal key cannot serve other users, and agreement s5.1(e) bars sharing the key or access).
2. Push-only delivery: needs a public HTTPS endpoint that stores incoming data; no backfill on Starter.
3. User cap on Starter (size not published on pages I could read).
4. Privacy and consent duties (agreement s4.5, s15), which apply to any app holding other users' health data.
5. Monetisation: any income from API use needs Garmin's written permission (s5.1(e)); Enterprise terms are negotiated.

## Could not verify (primary sources)

- **Eligibility for individuals / hobby / non-commercial apps on Starter.** The overview says individual developers are supported, but the Starter form body, any eligibility text and any approval criteria did not render in my fetches.
- **Whether applications are currently open.** I found no official statement either way. Third-party posts conflict (a pause, then a reported reopening); I did not rely on them.
- **Starter user cap, price, approval timeline.** Not stated on the pages I could read.
- **OAuth version and flow for Business apps (OAuth 1.0a vs 2.0, PKCE), token refresh behaviour.** The Health/Activity API docs, program FAQ and Business page returned 404 or empty content to my fetcher (client-rendered). Only third-party sources mention OAuth 2.0, so this is unconfirmed.
- **Rate limits.** No numeric limits found in primary sources (the Personal API page lists none; the agreement defers to Application Requirements).
- **Field-level data types and data-retention windows** for the Health and Activity APIs.
- **Personal-key terms and conditions text** (the page only says you must accept them).
- The agreement PDF's metadata calls it a template dated 2023, and the text I extracted from it is fragmentary; the version signed at approval may differ.

Next step to close the gaps: open the Business page, API docs and FAQ in a logged-in browser on developer.garmin.com, or ask via the [developer contact form](https://www.garmin.com/en-US/forms/developercontactus/).

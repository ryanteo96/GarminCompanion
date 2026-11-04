# Garmin Companion

Personal fitness dashboard on the [Garmin Connect Personal API](https://developer.garmin.com/gc-developer-program/personal/personal-api): Recovery, Training, Activity and Insights tabs. Static page plus three tiny serverless functions, deployed on Vercel. Your Garmin key never reaches the browser.

## Run locally

```bash
cp .env.example .env   # set DASHBOARD_PASSWORD and SESSION_SECRET; leave GARMIN_API_KEY empty for demo data
npm run dev            # http://localhost:3000
npm test
```

With no `GARMIN_API_KEY`, the app serves generated demo data and shows a "Demo data" badge.

## Deploy on Vercel

1. Import this repo in Vercel (Framework preset: Other, no build command).
2. Add environment variables: `GARMIN_API_KEY`, `DASHBOARD_PASSWORD`, `SESSION_SECRET`.
3. Deploy. The page is public but empty; all data comes from `/api/data`, which needs the login cookie.

## Privacy

The page is public but empty; all data comes from `/api/data`, which needs the login cookie. The last good payload per range is cached in this browser's local storage so a bad connection still shows something. **Sign out** (page footer) ends the session on the server, clears that cached copy, and asks the browser to clear its HTTP cache and storage (`Clear-Site-Data`, honoured over HTTPS). Data responses are sent `no-store` and fetched with `cache: 'no-store'`, so a reload or new tab after signing out cannot show the dashboard from the browser cache. **Refresh** (header) always asks the server for fresh data. Anyone with access to your unlocked browser profile can read the cache until then.

## Garmin key

Garmin Connect Web > Personal API Key > Create Key. The key is shown once and expires after the period you choose (30 days to 1 year); create a new one and update the Vercel variable when it expires. Access tokens last 24 hours and are renewed automatically.

## Layout

- `api/login.js`, `api/data.js`: password login (signed HttpOnly cookie) and the data endpoint
- `lib/garmin.js`: token exchange, date-window chunking, field mapping
- `lib/sample.js`: demo data
- `public/`: page, styles, Chart.js (vendored), `stats.js` (readiness, load ratio, correlations)

# Garmin Companion

Personal fitness dashboard on the [Garmin Connect Personal API](https://developer.garmin.com/gc-developer-program/personal/personal-api): Recovery, Training, Activity and Insights tabs. A React + TypeScript single-page app plus three tiny serverless functions, deployed on Vercel. Your Garmin key never reaches the browser.

## Run locally

```bash
cp .env.example .env   # set DASHBOARD_PASSWORD and SESSION_SECRET; leave GARMIN_API_KEY empty for demo data
npm install
npm run dev            # http://localhost:5173
```

With no `GARMIN_API_KEY`, the app serves generated demo data and shows a "Demo data" badge.

## Checks

```bash
npm run check          # typecheck, lint and unit tests (Vitest)
npx playwright install chromium   # once
npm run test:e2e       # end-to-end tests in a real browser (Playwright), against a production build
```

CI runs both on every push and pull request as two jobs, `check` and `e2e` (`.github/workflows/ci.yml`).

## Deploy on Vercel

1. Import this repo in Vercel. Framework preset: **Vite** (build command `vite build`, output directory `dist`; both are also set in `vercel.json`). The files in `api/` deploy as serverless functions.
2. Add environment variables: `GARMIN_API_KEY`, `DASHBOARD_PASSWORD`, `SESSION_SECRET`.
3. Deploy. The page is public but empty; all data comes from `/api/data`, which needs the login cookie.

### Block deployments until CI passes

Vercel can hold a production deployment off your domain until named GitHub checks pass. This is a setting in the Vercel dashboard, not in this repo, so turn it on once:

1. Merge this branch to `main` first, so the CI workflow exists there. A required check that never reports would hold every production deployment forever.
2. In Vercel: your project, **Settings**, **Deployment Checks**. Add the GitHub checks **`check`** and **`e2e`** (the job names in `ci.yml`). Menu labels can differ between Vercel versions, and availability can depend on your plan.
3. From then on each production deployment is built but is only assigned to your production domain once both checks pass. A failing commit still lands on `main`; the live site stays on the last good deployment. Preview deployments are not held.

If you rename a job in `ci.yml` or stop it running on `push`, update the setting too.

## Privacy

The page is public but empty; all data comes from `/api/data`, which needs the login cookie. The last good payload per range is cached in this browser's local storage so a bad connection still shows something. **Sign out** (page footer) ends the session on the server, clears that cached copy, and asks the browser to clear its HTTP cache and storage (`Clear-Site-Data`, honoured over HTTPS). Data responses are sent `no-store` and fetched with `cache: 'no-store'`, so a reload or new tab after signing out cannot show the dashboard from the browser cache. **Refresh** (header) always asks the server for fresh data. Anyone with access to your unlocked browser profile can read the cache until then.

## Garmin key

Garmin Connect Web > Personal API Key > Create Key. The key is shown once and expires after the period you choose (30 days to 1 year); create a new one and update the Vercel variable when it expires. Access tokens last 24 hours and are renewed automatically.

## Layout

- `index.html`, `src/`: the React app
  - `main.tsx` / `App.tsx`: startup, routing (hash routes such as `/#/training`), and the loading / login / error / dashboard views
  - `store.ts`, `data/`: Zustand store, fetching, and the per-range local cache
  - `panels/`, `components/`: one panel per tab, and the shared cards, charts and controls
  - `logic/`: readiness, load ratio, correlations and formatting (pure functions)
  - `chart.ts`, `layout.tsx`: Chart.js dataset builders, and the colour-scheme / width context that rebuilds charts
- `api/login.ts`, `api/data.ts`, `api/logout.ts`: password login (signed HttpOnly cookie), the data endpoint, and sign-out
- `lib/`: `garmin.ts` (token exchange, date-window chunking, field mapping), `sample.ts` (demo data), `types.ts` (the payload shared with the app)
- `tools/api-plugin.ts`: serves `api/` under `npm run dev` and `npm run preview`
- `tests/`: unit tests; `e2e/`: browser tests

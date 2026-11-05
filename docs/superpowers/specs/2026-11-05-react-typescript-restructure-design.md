# Restructure to React + TypeScript

Date: 2026-11-05. Status: awaiting review.

## Goal

Move Garmin Companion from vanilla JS (no build step, imperative DOM in `public/app.js`) to a React + TypeScript codebase, front to back. The dashboard looks and behaves exactly as it does today. This is a restructure, not a redesign: `DESIGN.md`, `PRODUCT.md` and `style.css` are unchanged, and no feature is added or removed.

Success means:

- Everything is TypeScript (`strict`), including `api/` and `lib/`. `npm run typecheck` passes.
- The payload contract between `normalize()` and the UI is one shared type, so a field rename fails to compile on both sides.
- The existing unit assertions all still pass, and a new Playwright suite, first proven against the current app, passes against the new one.
- Deploy on Vercel still works with the same env vars, the same routes and the same CSP.

## Non-goals

Redesign or new features; changes to the API contract, auth, or Garmin mapping logic; SSR; component (DOM) unit tests; `react-chartjs-2`; browsers other than Chromium in e2e.

## Decisions (made with the project owner)

| Question | Decision |
|---|---|
| TS scope | Everything: frontend, `api/`, `lib/` |
| Build and dev | Vite + React + TS. A small Vite plugin mounts `api/*.ts` in dev and preview and replaces `dev.js` |
| Router | React Router, hash mode (`/#/recovery`) |
| State | Zustand store |
| Context | One `LayoutContext` for chart layout |
| Unit tests | Vitest (keeps `node:assert/strict`) |
| E2E tests | Playwright, Chromium only |

## Layout

```
index.html            Vite entry (moved from public/)
src/
  main.tsx            Chart.js registration + defaults, legacy-hash redirect, mounts the router
  App.tsx             view gate: boot | login | error | dashboard
  store.ts            Zustand store and actions
  data/               cache.ts (localStorage), fetchData.ts
  logic/              stats.ts, errors.ts, time.ts (moved, typed, behavior unchanged); format.ts, days.ts
  components/         Dashboard, Sidebar/Tabs, Header, Notice, Hero, Scale, MetricCard, Spark, Battery,
                      ChartCard, NightBar, SessionItem, ErrorBoundary, Boot, ErrorGate, LoginGate
  panels/             RecoveryPanel, TrainingPanel, ActivityPanel, InsightsPanel
  layout.tsx          LayoutContext + provider
  chart.ts            dataset builders and shared Chart.js options
  style.css           moved unchanged
api/                  data.ts, login.ts, logout.ts   (same routes)
lib/                  auth.ts, garmin.ts, http.ts, sample.ts, types.ts
tests/                app.test.ts (Vitest)
e2e/                  *.spec.ts (Playwright)
vite.config.ts        react plugin, dev/preview API plugin, Vitest config
playwright.config.ts
tsconfig.json         strict
public/               static assets only; vendored Chart.js deleted
```

Relative imports keep the `.js` suffix (`'../lib/auth.js'`), the form Vercel's ESM output, Vite and Vitest all accept.

## Types and backend

`lib/types.ts` defines `Day`, `Activity` and `Payload` (including `demo`, `fetchedAt`, `skipped`). `normalize()` and `sample()` return it and the client imports it with `import type`, which is erased at build. Handlers are typed with `IncomingMessage`/`ServerResponse` (what `send` and `readJson` already take). Logic in `lib/` is ported as is, preserving error handling and validation (`pickToday`, the body-size limit in `readJson`, the cookie checks).

## State, routing and context

**Store (Zustand)** replaces the module globals in `app.js`: view (`boot | login | error | app`), payload (with `withLoad` applied), range, stale-cache info, notice, freshness, in-flight/loading and the `refocus` flag. Actions: `load`, `login`, `logout`, `setRange`. They wrap `fetchData` (abort previous request, 25 s timeout, `cache: 'no-store'`, 401 handling) and the cache module (save per range, load, wipe on 401 and sign-out). Panels read with selectors; there is no prop drilling of data.

**Router** owns the tab only. Hash routes `/recovery`, `/training`, `/activity`, `/insights`; the index route and any unknown path redirect to `/recovery`. Tab buttons keep `role="tab"`, roving `tabindex` and Arrow/Home/End keys, and call `navigate()`. Title is `<Tab> · Garmin Companion`. `main.tsx` rewrites a legacy `#recovery` hash to `#/recovery` before the router starts, so old bookmarks still work.

**Login, loading and error are store-driven gates, not routes**, so a 401 mid-session returns to the same tab after unlock, as today. Focus handoff is preserved: login focuses the password field, the error view focuses Retry, and when a card the user was working in closes the selected tab takes focus (`refocus`).

**LayoutContext** holds a layout key (changes on a colour-scheme change or a debounced width change, as the old `matchMedia`/`resize` listeners did) and the resolved CSS-token colours. `ChartCard` and `Spark` read it, so there is one listener rather than one per chart, and charts rebuild with fresh colours and tick counts.

## Components

All four `role="tabpanel"` sections stay in the DOM so every tab's `aria-controls` resolves; only the selected panel's contents mount. Components emit the same classes, ids and aria text as `index.html`/`app.js`, so `style.css` needs no change. An `ErrorBoundary` around the active panel shows the existing "Couldn't draw this view" notice, so one failed chart does not blank the app. Scroll regions (`.tablewrap`) set `tabIndex` from their overflow as `scrollFocus` does now. The sr-only live region ("Data refreshed at …") is kept.

`ChartCard` renders the `<figure>`, caption and canvas (or "No data for this period.") and creates a Chart.js instance in an effect, destroyed on cleanup. Dataset builders (`line`, `bar`, `trend`, `weekBars`, `describe`) and the shared options block move into `chart.ts` essentially verbatim. `Chart.defaults.font.family` is set once in `main.tsx`. `chart.js` comes from npm; the vendored copy is removed.

Helpers that read `state` today (`latest`, `avg7`, `newest`, `withAge`, `dayLabel`, `series14`) become pure functions of `days` in `logic/days.ts`; formatters (`num`, `hm`, `fmtDate`, `ymd`, `localToday`, `fmtStamp`) go in `logic/format.ts`.

## Build, dev and deploy

- Scripts: `dev` (Vite, `.env` loaded with `--env-file-if-exists` as now), `build` (`vite build`), `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `test:e2e` (`playwright test`).
- A Vite plugin implements `configureServer` and `configurePreviewServer`: it loads `api/*.ts` handlers, 404s unknown `/api/*` routes, and in preview applies the headers from `vercel.json` so the production CSP is exercised.
- `vercel.json` gains `buildCommand: "vite build"` and `outputDirectory: "dist"`; the CSP and other headers are unchanged. Vercel compiles `api/*.ts` natively. The README's "Framework preset: Other, no build command" becomes Vite with that build command.
- The production build must contain no inline script or style (`style-src 'self'`; React sets styles through the DOM as `app.js` does). Vite and plugin versions are chosen to work with the declared `engines.node >= 20`.
- New dependencies: `react`, `react-dom`, `react-router`, `zustand`, `chart.js`. New dev dependencies: `vite`, `@vitejs/plugin-react`, `typescript`, `vitest`, `@playwright/test`, `@types/react`, `@types/react-dom`, `@types/node`.

## Testing

**Vitest** (`tests/**/*.test.ts`, default `node` environment). `tests/app.test.js` becomes `app.test.ts`; the only edit is `import { test } from 'vitest'` and the new import paths, and every assertion stays. The dev-server child-process 404 test is replaced by a handler-level test that the plugin 404s an unknown `/api/x`. New store tests, with `fetch` stubbed via `vi.stubGlobal` and a small in-memory `localStorage` stub (without it `cache.ts` would silently no-op and the stale-notice test would pass for the wrong reason):

1. A successful load sets the payload.
2. A 401 moves to login and wipes the cache.
3. A failed fetch with a cached copy shows the stale notice.
4. A superseded request is ignored.

**Playwright** (`e2e/`, Chromium; config starts `vite build && vite preview` in demo mode with a test password; `E2E_BASE_URL` skips the config's web server). Selectors use roles and labels so the same specs run against the old and new app. Coverage:

- Wrong password shows an error; the right one loads the dashboard with the "Demo data" badge.
- Tabs by click and by Arrow/Home/End; URL becomes `#/training` (spec regex tolerates the old `#training`); title follows; deep link `#/insights` opens Insights; legacy `#recovery` redirects.
- Each tab draws its charts: canvases present, no "Couldn't draw this view", no console errors.
- Changing the range requests `/api/data?days=30`.
- Sign out returns to login and removes `gc:data:*` keys; reload still shows login.
- With `/api/data` aborted, Refresh shows "Showing data saved…" with Retry.
- A mid-session 401 shows login; unlocking returns to the same tab.
- At 320 px there is no horizontal overflow.
- No CSP violations against the production build.

## Migration order

Work happens on the `react-ts` branch; each step ends with tests green and a commit.

1. Tooling: `package.json`, `tsconfig`, `vite.config`, dependencies, Vitest and Playwright installed.
1b. E2E suite written against the **current** app, run from a git worktree of `main` on another port via `E2E_BASE_URL`. This pins today's behavior before anything moves.
2. Backend to TS (`lib/`, `api/`, `types.ts`); dev/preview plugin replaces `dev.js`; tests ported.
3. Logic to TS under `src/logic/`; format and day helpers extracted.
4. Store, cache and fetch, with store tests.
5. App shell: gates, router, tabs, header, notice, `LayoutContext`.
6. Panels one at a time: Recovery (with Hero, MetricCard, ChartCard, NightBar), Training, Activity, Insights.
7. Delete `public/app.js`, the old `index.html`, the vendored Chart.js and `dev.js`; update README and `vercel.json`. The full e2e suite must pass against the new app.

## Parity check

Beyond the e2e gate, a one-off script (scratchpad, not committed, using the installed Playwright) runs old and new apps on demo data and compares the normalized `#app` markup per tab (classes and ids are kept, so the diff should be near-empty) plus screenshots at desktop and 320 px, light and dark, against `.impeccable/review/`. A manual pass covers keyboard navigation and the focus handoff.

## Risks

- `vite preview` has no module graph, so loading the TS `api/` handlers there may need a small middleware-mode Vite instance. This is the one non-trivial part of the e2e setup; the plan settles it.
- Focus handoff after login/retry and `document.title` under hash routing are the likeliest behavioral drifts; both are covered by e2e.
- Chart rebuild timing now depends on the layout key; checked in the parity pass.
- Chromium for Playwright is roughly 150 MB to download.

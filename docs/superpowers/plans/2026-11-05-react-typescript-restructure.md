# React + TypeScript Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Garmin Companion from vanilla JS to React + strict TypeScript (frontend, `api/`, `lib/`) with identical look and behavior, gated by lint, unit tests, Playwright e2e and Vercel Deployment Checks.

**Architecture:** Vite builds a React SPA from `src/`. A Zustand store owns session and data state, React Router (hash mode) owns the selected tab, and one `LayoutContext` serves chart layout. `api/*.ts` stay Vercel functions; a Vite plugin mounts them in dev and preview. A Playwright suite is written first against the current app, then used as the parity gate.

**Tech Stack:** TypeScript (strict), React, React Router, Zustand, Chart.js, Vite, Vitest, Playwright (Chromium), ESLint (typescript-eslint, react-hooks, jsx-a11y), GitHub Actions, Vercel.

**Spec:** `docs/superpowers/specs/2026-11-05-react-typescript-restructure-design.md`

## Global Constraints

- Branch `react-ts` (already checked out). Never push without being asked.
- `commit "<msg>"` in steps means `git -c user.name="Ryan Teo" -c user.email="ryanteo1996@gmail.com" commit -m "<msg>"`, with **no** `Co-Authored-By` or `Claude-Session` trailers.
- TypeScript `strict`; no `allowJs` at the end. Relative imports keep the `.js` suffix (`'../lib/auth.js'`).
- `package.json` keeps `"type": "module"` and `"engines": { "node": ">=20" }`. Use the latest major of each dependency whose `engines.node` accepts Node 20.19 (check with `npm view <pkg> engines`).
- Scripts, exact names: `dev`, `build`, `preview`, `typecheck`, `lint`, `test`, `check`, `test:e2e`. `lint` is `eslint . --max-warnings 0`; `check` runs typecheck, lint, test in that order; `test` is `vitest run` (from Task 3; Tasks 1–2 still run the legacy node:test file).
- No new runtime dependencies beyond `react`, `react-dom`, `react-router`, `zustand`, `chart.js`. No `react-chartjs-2`, jsdom/DOM component tests, Prettier, or browsers other than Chromium.
- Class names, element ids and aria text stay exactly as in `public/index.html` and `public/app.js`; `style.css` is moved, not edited.
- Routes `/recovery`, `/training`, `/activity`, `/insights` (hash URLs `#/recovery`); document title `<Tab> · Garmin Companion`; `Sign in · Garmin Companion` on login; `Garmin Companion` otherwise.
- Cache keys `gc:data:<days>`; fetch uses `cache: 'no-store'` and a 25 s timeout; the cache is wiped on 401 and on sign-out.
- CSP unchanged: `default-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'`. The production build has no inline script or style.
- CI jobs are named exactly `check` and `e2e`.
- Existing behavior is the spec: every assertion in `tests/app.test.js` survives unchanged.
- Legacy files `public/app.js`, `public/index.html`, `dev.js` stay in the tree as reference until Task 12; they stop running once Task 3 lands and that is expected.

## Review Focus

Inputs the spec implies but does not enumerate; each has a test in the named task.

1. A 200 response with `days: []` → error view "Garmin returned no data for this range", not an empty dashboard (Task 6 store test).
2. `localStorage` unavailable or throwing (private window) → the app still loads and renders; with a failed fetch it shows the error view, not a crash (Task 6 store test).
3. A garbled or unknown hash (`#/nope`, `#nope`, empty) → lands on a valid tab with a matching title (Task 2 `tabs.spec.ts`, verified on the new app in Task 7).
4. A series that is entirely null (no HRV for the range) → "No data for this period." and no console errors (Task 2 `charts.spec.ts`, verified in Task 8).
5. Narrow viewport and a dark-scheme switch mid-session → charts rebuild with no errors and no horizontal overflow (Task 2 `layout.spec.ts`, verified in Task 8).

---

### Task 1: Tooling and static checks

**Files:**
- Modify: `package.json`, `.gitignore`
- Create: `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `.github/workflows/ci.yml`, `package-lock.json`

**Interfaces:**
- Produces: scripts `typecheck`, `lint`, `check`; `test` stays `node --test tests/*.test.js` and `dev` stays `dev.js` until Tasks 3 and 5. `vite.config.ts` default-exports `defineConfig` (from `vitest/config`) with `plugins: [react()]` and `test.include: ['tests/**/*.test.ts']`.

- [ ] **Step 1: Install dependencies.** Runtime: `react react-dom react-router zustand chart.js`. Dev: `vite @vitejs/plugin-react typescript vitest @playwright/test eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-jsx-a11y @types/react @types/react-dom @types/node`. Do not run `npx playwright install` yet.
- [ ] **Step 2: Write `tsconfig.json`:** `strict`, `noEmit`, `module: ESNext`, `moduleResolution: Bundler`, `jsx: react-jsx`, `lib: [ES2023, DOM, DOM.Iterable]`, `types: [node]`, `skipLibCheck`, `isolatedModules`; include `src`, `api`, `lib`, `tests`, `e2e`, `tools`, `vite.config.ts`, `playwright.config.ts`.
- [ ] **Step 3: Write `eslint.config.js`** (flat config, TS and TSX files only): ignores `dist`, `playwright-report`, `test-results`, `docs`, `.impeccable`, `public`, `dev.js`; `@eslint/js` recommended; `typescript-eslint` `recommendedTypeChecked` with `parserOptions.projectService: true`; `eslint-plugin-react-hooks` with `rules-of-hooks` and `exhaustive-deps` set to `error`; `jsx-a11y` recommended flat config.
- [ ] **Step 4: Prove the config bites.** Create scratch `src/probe.tsx` with a floating promise, a `useEffect` missing a dependency, and `<div onClick>` with no key handler. Run `npx eslint src/probe.tsx`. Expected: errors for `@typescript-eslint/no-floating-promises`, `react-hooks/exhaustive-deps`, `jsx-a11y/click-events-have-key-events`. Delete the file.
- [ ] **Step 5: Add scripts** `typecheck` (`tsc --noEmit`), `lint`, `check`; add `dist/`, `playwright-report/`, `test-results/` to `.gitignore`.
- [ ] **Step 6: Write `.github/workflows/ci.yml`:** triggers `push` and `pull_request`; `concurrency` cancels in-progress runs per ref; one job named `check` on `ubuntu-latest` with `actions/setup-node` (`node-version: 20`, npm cache), `npm ci`, `npm run check`.
- [ ] **Step 7: Run `npm run check`.** Expected: typecheck, lint and the legacy node:test suite all exit 0. Then `commit "Add TypeScript, Vite, ESLint tooling and CI check job"` after `git add package.json package-lock.json .gitignore tsconfig.json vite.config.ts eslint.config.js .github`.

### Task 2: E2E suite pinned to the current app

**Files:**
- Create: `playwright.config.ts`, `e2e/helpers.ts`, `e2e/auth.spec.ts`, `e2e/tabs.spec.ts`, `e2e/session.spec.ts`, `e2e/charts.spec.ts`, `e2e/layout.spec.ts`, `e2e/csp.spec.ts`
- Modify: `package.json` (add `test:e2e`: `playwright test`)

**Interfaces:**
- Produces: `E2E_BASE_URL` env var (when set, no web server is started and the suite targets that URL); `e2e/helpers.ts` exports `PASSWORD` (`process.env.E2E_PASSWORD ?? 'e2e-password'`), `signIn(page: Page): Promise<void>`, `watchErrors(page: Page): string[]` (collects `pageerror` messages and `console` errors). Default web server: `npm run build && npm run preview -- --port 4173 --strictPort` on `http://localhost:4173` with env `DASHBOARD_PASSWORD=e2e-password`, `SESSION_SECRET=e2e-secret-0123456789`, `GARMIN_API_KEY=` (demo mode); this only works from Task 7.
- Selectors use roles and labels (`getByRole('tab', { name: 'Training' })`, `getByLabel('Password')`, `getByLabel('Chart range')`, `getByRole('button', { name: 'Refresh' })`) plus `locator('canvas')`, so one suite runs on both apps. URL assertions use `/#\/?training/` so `#training` and `#/training` both pass.

- [ ] **Step 1: Start the legacy app.** `git worktree add ../GarminCompanion-legacy main`; there run `DASHBOARD_PASSWORD=e2e-password SESSION_SECRET=e2e-secret-0123456789 PORT=3001 node dev.js` in the background. Expected: prints `http://localhost:3001`.
- [ ] **Step 2: Install Chromium** (`npx playwright install chromium`) and write `playwright.config.ts` (Chromium only, `testDir: 'e2e'`, `baseURL` from `E2E_BASE_URL`, `webServer` omitted when it is set) and `helpers.ts`.
- [ ] **Step 3: `auth.spec.ts`:** wrong password shows "Wrong password" in an alert and stays on the login form; correct password shows the dashboard, the "Demo data" badge and the Recovery tab selected.
- [ ] **Step 4: `tabs.spec.ts`:** clicking each tab sets `aria-selected`, the URL matches `/#\/?<tab>/` and `document.title` is `<Tab> · Garmin Companion`; ArrowRight/ArrowLeft/Home/End move selection and focus; deep links `/#/insights` and `/#insights` open Insights; `#/nope`, `#nope` and no hash land on Recovery with title `Recovery · Garmin Companion` (Review Focus 3); skip link: Tab then Enter focuses `main` and leaves Recovery selected.
- [ ] **Step 5: `session.spec.ts`:** changing the range to 30 days requests `/api/data?days=30`; Sign out shows login, leaves no `gc:data:*` localStorage keys, and a reload still shows login; with `/api/data` aborted via `page.route`, Refresh shows a status containing "Showing data saved" and a Retry button, and clicking Retry after unrouting leaves the Recovery tab focused; aborting before the first load shows "Can't reach the dashboard", and "Try again" after unrouting loads the app with the Recovery tab focused; a mid-session 401 shows login and unlocking returns to the same tab; a payload with `skipped: { daily: 2 }` shows "2 Garmin records had no date and were left out." (use `route.fetch()` and patch the JSON).
- [ ] **Step 6: `charts.spec.ts`**, with these exact test titles (later tasks filter on them): `Recovery draws its charts`, `Training draws its charts`, `Activity draws its charts` (expected visible `canvas` counts 4, 3 and 3, `watchErrors` empty, no "Couldn't draw this view" text); `Insights shows its cards` (5 insight cards); `a series with no data shows an empty state` (every `hrv` patched to `null`: Recovery shows "No data for this period." and no errors; Review Focus 4).
- [ ] **Step 7: `layout.spec.ts`**, titles `no horizontal overflow at 320 px` (every tab satisfies `scrollWidth <= innerWidth`) and `charts rebuild after a resize and a dark-scheme switch` (on Recovery: resize from 1280 to 320 mid-session, then `page.emulateMedia({ colorScheme: 'dark' })`; canvases still present, no errors; Review Focus 5).
- [ ] **Step 8: `csp.spec.ts`:** `test.skip(!!process.env.E2E_BASE_URL, 'dev.js sends no CSP')`; otherwise register a `securitypolicyviolation` listener with `addInitScript`, visit every tab, and assert no violations were recorded.
- [ ] **Step 9: Run the suite against the legacy app:** `E2E_BASE_URL=http://localhost:3001 npx playwright test`. Expected: all pass, `csp.spec.ts` skipped. Fix any test that fails; never change the app. Then `commit "Add Playwright e2e suite pinned to the current app"`.

### Task 3: Port `lib/`, `api/` and logic to TypeScript

**Files:**
- Create: `lib/types.ts`
- Rename and type (`git mv`): `lib/{auth,garmin,http,sample}.js` → `.ts`; `api/{data,login,logout}.js` → `.ts`; `public/stats.js` → `src/logic/stats.ts`; `public/errors.js` → `src/logic/errors.ts`; `public/time.js` → `src/logic/time.ts`; `tests/app.test.js` → `tests/app.test.ts`
- Modify: `package.json` (`test`: `vitest run`)

**Interfaces:**
- Produces in `lib/types.ts`: `Day` (`date: string`; optional nullable numbers `steps, calories, restingHr, intensityMin, stress, bbHigh, bbLow, hrv, hrvWeekly, sleepH, deepH, remH, lightH, awakeH, sleepScore`; optional nullable strings `bedtime, wake`); `DayWithLoad = Day & { load: number }`; `DayKey` (union of the numeric keys plus `'load'`); `Activity` (`id: number; date: string; name: string; type: string; minutes, km, avgHr, load, te: number | null; zones: number[]`); `Skipped` (`daily, hrv, sleep, activities: number`); `Payload` (`demo: boolean; fetchedAt: string; days: Day[]; activities: Activity[]; skipped?: Skipped`); `RawInput` (the `{ daily, hrv, sleep, acts }` arrays, each `unknown[]`-style records as `normalize` reads them).
- `lib/http.ts`: `type Req = IncomingMessage & { body?: unknown }`, `type Handler = (req: Req, res: ServerResponse) => void | Promise<void>`, `send(res: ServerResponse, status: number, body: unknown, headers?: Record<string, string>): void`, `readJson(req: Req, limit?: number): Promise<Record<string, unknown>>`.
- `lib/garmin.ts`: `normalize(input: Partial<RawInput>): { days: Day[]; activities: Activity[]; skipped: Skipped }`, `pickToday(param: string | null | undefined, now?: Date): string`, `clock(ts: unknown): string | null`, `parseToken(raw: string): string`, `token(): Promise<string>`, `addDays(d: string, n: number): string`, `ranges(start: string, end: string, size: number): [string, string][]`, `fetchRaw(days: number, end?: string): Promise<RawInput>`, `fetchAll(days: number, end?: string)`, `shape(raw: RawInput)`. `lib/sample.ts`: `sample(n: number, today?: string): { days: Day[]; activities: Activity[] }`. `lib/auth.ts`: `same`, `MAX_AGE`, `mintCookie(): string`, `authed(req: Pick<Req, 'headers'>): boolean`. Handlers: `export default async function handler(req: Req, res: ServerResponse): Promise<void>`.
- `src/logic/stats.ts` keeps every current export name. New types: `Readiness` (`score, label, state: 'well' | 'typical' | 'below' | 'strained', date, parts: ReadinessPart[]`), `ReadinessPart` (`k: 'hrv' | 'restingHr' | 'sleepH' | 'bbHigh'; z; value; base`), `LoadPoint` (`date; acute; chronic: number | null; ratio: number | null`), `LoadSummary`, `Insight`, `WeekPoint` (`week: string; v: number | null`), `WeekDelta`. Signatures: `withLoad(days: Day[], activities: Activity[]): DayWithLoad[]`, `readiness(days: Day[]): Readiness | null`, `loadSeries(days: DayWithLoad[]): LoadPoint[]`, `weekly(days: DayWithLoad[], key: DayKey, agg?: 'sum' | 'mean'): WeekPoint[]`, `mean(a: (number | null | undefined)[]): number | null`, `insights(days: DayWithLoad[]): Insight[]`, `weekDeltas(days: DayWithLoad[]): WeekDelta[]`. `errors.ts`: `friendly(e: { status: number | string; message?: string }): [string, string]`. `time.ts`: `ago(ts: number, now?: number): string`.

- [ ] **Step 1: Port the test file first.** `git mv tests/app.test.js tests/app.test.ts`; change `import { test } from 'node:test'` to `'vitest'`; point the `public/*` imports at `../src/logic/*.js`; delete the `spawn` import and the "dev server returns 404 for a missing static file" test (Task 5 replaces it); cast the fake request/response objects in the `call` helpers with `as unknown as Req` / `as unknown as ServerResponse`. Change the `test` script to `vitest run`.
- [ ] **Step 2: Run `npx vitest run`.** Expected: FAIL, imports cannot be resolved.
- [ ] **Step 3: Write `lib/types.ts` and port `lib/` then `api/`** with the signatures above. Moves keep all behavior, validation and error handling (`pickToday` checks, the `readJson` size limit, cookie checks, the login delay with its `shortcut:` comment).
- [ ] **Step 4: Move and type `stats`, `errors`, `time`** into `src/logic/`; logic is unchanged, and the `stats.ts` header comment no longer calls it a browser-only module (the server-side tests import it too).
- [ ] **Step 5: Run `npm run check`.** Expected: typecheck, lint and all ported assertions pass. Fix lint findings in the ported code; do not disable rules without a one-line reason beside the disable.
- [ ] **Step 6: `commit "Port lib, api and logic to TypeScript"`** after `git add -A lib api src tests package.json`.

### Task 4: Format and day helpers

**Files:**
- Create: `src/logic/format.ts`, `src/logic/days.ts`, `tests/days.test.ts`

**Interfaces:**
- Consumes: `Day`, `DayWithLoad`, `DayKey` (Task 3); `mean` from `stats.ts`.
- Produces (logic moved from `public/app.js` lines 13–35 and 110–114, unchanged): `format.ts`: `fmtDate(d: string): string`, `num(x: number | null | undefined, dp?: number): string`, `hm(h: number | null | undefined): string`, `ymd(d: Date): string`, `localToday(): string`, `fmtStamp(ts: number): string`, `clock12(hhmm: string): string`. `days.ts`: `lastRow(days: DayWithLoad[], key: DayKey)`, `latest(days, key): number | null`, `avg7(days, key): number | null`, `newest(days): string | undefined`, `withAge(days, key, sub: string): string`, `dayLabel(days, key, base: string): string`, `series14(days, key, name: string, usual: number | null, f?: (x: number) => string): [(number | null | undefined)[], number | null, string]`.

- [ ] **Step 1: Write `tests/days.test.ts`:** `hm(7.5)` is `7h 30m` and `hm(null)` is `—`; `num(null)` is `—` and `num(1234.5, 1)` keeps one decimal; `fmtDate('2026-11-03')` matches `/Nov.*3|3.*Nov/`; `withAge` returns `From <date> · <sub>` when the key's last row is older than `newest(days)` and just `sub` when it is current; `dayLabel` returns `Steps, today so far` when the last row is `localToday()` and `Steps, <date>` otherwise; `series14` label for `[50, null, 60]` is `HRV, last 14 days: 50 to 60` and for all-null is just the name.
- [ ] **Step 2: Run `npx vitest run tests/days.test.ts`.** Expected: FAIL, modules missing.
- [ ] **Step 3: Implement both files** by lifting the named functions out of `app.js`, turning the `state.days` reads into a `days` parameter.
- [ ] **Step 4: Run `npm run check`.** Expected: PASS. `commit "Extract format and day helpers"`.

### Task 5: API plugin for dev and preview

**Files:**
- Create: `tools/api-plugin.ts`, `tests/api-plugin.test.ts`
- Modify: `vite.config.ts` (add `apiPlugin()`), `package.json` (`dev`: `node --env-file-if-exists=.env ./node_modules/vite/bin/vite.js`; `preview`: same with `preview`; `build`: `vite build`)
- Delete: `dev.js`

**Interfaces:**
- Produces: `type Loader = (name: string) => Promise<Handler | undefined>`; `apiMiddleware(load: Loader): Connect.NextHandleFunction` (calls `next()` for non-`/api/` paths; 404 for names not matching `/^\/api\/[a-z]+$/` or when `load` returns `undefined`; 500 JSON if a handler throws); `vercelHeaders(path?: string): Record<string, string>` (header pairs from the first entry of `headers` in `vercel.json`); `apiPlugin(): Plugin` with `configureServer` (loads `/api/<name>.ts` through `server.ssrLoadModule`) and `configurePreviewServer` (registers the headers middleware and the API middleware directly, not in the returned post-hook, so both run before static serving; loads handlers through a lazily created middleware-mode Vite server and closes it when the preview server closes).

- [ ] **Step 1: Write `tests/api-plugin.test.ts`:** an unknown name, `/api/a.b` and `/api/../x` each get 404 without calling a handler or `next`; `/index.html` calls `next` once; a known handler is called with the request and response; a throwing handler yields 500 and the middleware promise resolves; `vercelHeaders()['Content-Security-Policy']` contains `default-src 'self'`.
- [ ] **Step 2: Run `npx vitest run tests/api-plugin.test.ts`.** Expected: FAIL, module missing.
- [ ] **Step 3: Implement `tools/api-plugin.ts`** and wire it into `vite.config.ts`. If `ssrLoadModule` proves unusable in preview mode, stop and report to the user; do not substitute a different approach silently.
- [ ] **Step 4: Run `npm run check`.** Expected: PASS. `commit "Replace dev.js with a Vite API plugin"` after deleting `dev.js`.

### Task 6: Store, cache and fetch

**Files:**
- Create: `src/data/cache.ts`, `src/data/fetchData.ts`, `src/store.ts`, `tests/store.test.ts`, `tests/stubs.ts`

**Interfaces:**
- Consumes: `Payload`, `Activity`, `DayWithLoad` (Task 3); `withLoad`, `friendly`, `ago` (Task 3); `localToday`, `fmtStamp` (Task 4).
- Produces: `cache.ts`: `saveCache(days: number, payload: Payload): void`, `loadCache(days: number): { savedAt: number; payload: Payload } | null`, `wipeCache(): void` (all storage access guarded by `try/catch`). `fetchData.ts`: `type LoadError = { status: number | 'timeout' | 'empty'; message: string }`, `type FetchOutcome = { j: Payload } | { err: LoadError } | { unauthorized: true } | { superseded: true }`, `fetchData(days: number): Promise<FetchOutcome>` (aborts the previous request; 25 s timeout; GET `/api/data?days=<n>&today=<localToday()>` with `cache: 'no-store'`). `store.ts`: `useStore` (Zustand) with state `view: 'boot' | 'login' | 'error' | 'app'`, `range: number` (default 90), `days: DayWithLoad[]`, `activities: Activity[]`, `demo: boolean`, `stale: { savedAt: number; err: LoadError } | null`, `notice: { text: string; retry: boolean } | null`, `fresh: { ts: number; label: 'Updated' | 'Last synced'; through?: string; behind: boolean } | null`, `error: LoadError | null`, `loading: boolean`, `refocus: boolean`, `srStatus: string`, `loginError: string | null`; actions `load(): Promise<void>`, `retry(): Promise<void>` (sets `refocus`, then loads), `setRange(days: number): Promise<void>`, `login(password: string): Promise<void>`, `logout(): Promise<void>`, `notify(text: string | null, retry?: boolean): void`, `clearRefocus(): void`. Behavior is the logic of `public/app.js` lines 539–685, unchanged. `tests/stubs.ts`: `memoryStorage(): Storage` and `throwingStorage(): Storage`.

- [ ] **Step 1: Write `tests/store.test.ts`** (each test resets with `useStore.setState(useStore.getInitialState(), true)`, stubs `fetch` with `vi.stubGlobal` and `localStorage` with the stubs):
  - `a successful load shows the app with load attached to each day`: `sample(30, '2026-11-04')` payload → `view` is `app`, 30 days each with numeric `load`, `notice` is `null`, `gc:data:90` is stored.
  - `a 401 sends you to login and wipes the cache`: prefilled cache; `view` is `login`, no `gc:data:` keys remain.
  - `a failed fetch with a cached copy shows the stale notice`: `notice.text` matches `/^Showing data saved/`, `notice.retry` is true, `fresh.label` is `Last synced`.
  - `a superseded request is ignored`: two overlapping loads where the stubbed fetch honors `signal`; only the second payload's days end up in the store.
  - `a request that never answers times out after 25 seconds`: fake timers; `error.status` is `'timeout'`.
  - `a 200 with no days is an error, not a dashboard`: `view` is `error`, `error.status` is `'empty'` (Review Focus 1).
  - `a storage that throws does not stop the app`: with `throwingStorage()`, a good fetch reaches `app`; a failed fetch reaches `error` (Review Focus 2).
  - `sign out wipes the cache and says when the server was unreachable`: fetch rejects → `view` is `login`, `loginError` matches `/couldn't reach the server/`.
  - `a wrong password keeps you on login with the server message`: 401 `{ error: 'Wrong password' }` → `loginError` is `Wrong password`, `view` is `login`.
- [ ] **Step 2: Run `npx vitest run tests/store.test.ts`.** Expected: FAIL, modules missing.
- [ ] **Step 3: Implement `cache.ts`, `fetchData.ts`, `store.ts`.** Notice, freshness and `srStatus` strings are copied verbatim from `app.js`; a concurrent-load counter drives `loading`.
- [ ] **Step 4: Run `npm run check`.** Expected: PASS. `commit "Add Zustand store, cache and fetch"`.

### Task 7: App shell

**Files:**
- Create: `index.html`, `src/main.tsx`, `src/App.tsx`, `src/tabs.ts`, `src/layout.tsx`, `src/vite-env.d.ts`, `src/panels/index.ts`, `src/components/{Boot,ErrorGate,LoginGate,Dashboard,Sidebar,Header,Notice,ErrorBoundary}.tsx`
- Move: `git mv public/style.css src/style.css`

**Interfaces:**
- Consumes: `useStore` and its actions (Task 6); `ago`, `fmtDate`, `newest` (Tasks 3, 4).
- Produces: `tabs.ts`: `TABS = ['recovery', 'training', 'activity', 'insights'] as const`, `type Tab`, `TAB_NAMES: Record<Tab, string>`. `layout.tsx`: `LayoutProvider({ children })` and `useLayout(): { key: number; token(name: string): string }` (`key` changes on a `prefers-color-scheme` change or a width change after a 250 ms debounce, ignoring height-only changes; `token` resolves a CSS custom property, cached per key). `panels/index.ts`: `PANELS: Record<Tab, ComponentType>`, each initially `() => null` (Tasks 8–11 replace them).

- [ ] **Step 1: Write `index.html`** (Vite entry): the head of `public/index.html` plus `<div id="root">` and `<script type="module" src="/src/main.tsx">`.
- [ ] **Step 2: `main.tsx`:** import `./style.css`; `Chart.register(...registerables)` and set `Chart.defaults.font.family` from `--sans`; rewrite a legacy `#recovery`-style hash to `#/recovery` with `history.replaceState` before the router is created; `createHashRouter` with `/:tab` and `*` redirecting to `/recovery`; call `useStore.getState().load()` once at module level (not in an effect, so StrictMode cannot fire it twice); render inside `LayoutProvider`.
- [ ] **Step 3: Gates and shell.** `App` renders `Boot`, `ErrorGate`, `LoginGate` or `Dashboard` from `view`, with markup and copy from `public/index.html` lines 12–180 and the behavior of `show()`, `select()`, `notify()`, `showFresh()` in `public/app.js`. Specifics the markup does not show:
  - An invalid `:tab` renders `<Navigate to="/recovery" replace />`.
  - Tab buttons keep `role="tab"`, roving `tabindex` and Arrow/Home/End handling, and call `navigate`.
  - All four `section[role=tabpanel]` stay in the DOM with `hidden`; only the selected panel's `PANELS[tab]` mounts, inside `ErrorBoundary`, which calls `notify("Couldn't draw this view: <message>")`.
  - The skip link calls `preventDefault()` and focuses `main` (a real `#main` hash would hit the router's unknown-route redirect and reset the tab).
  - Focus handoff: login focuses the password field, the error view focuses its retry button, and when `refocus` is set or the previous view was login/error, the selected tab takes focus (`preventScroll`) and `clearRefocus()` runs; plain boot → app never moves focus.
  - Titles follow the Global Constraints; the freshness line re-renders every 60 s; Refresh is disabled while `loading`.
- [ ] **Step 4: Run `npm run check`, then `npm run build`.** Expected: both exit 0; `dist/index.html` exists.
- [ ] **Step 5: Run the shell subset of e2e:** `npx playwright test auth tabs session csp` and `npx playwright test layout -g "no horizontal overflow"`. Expected: PASS (panels are still empty, so `charts.spec.ts` and the rebuild test wait for Task 8). Fix the app, never the tests. `commit "Add React app shell with router, gates and layout context"`.

### Task 8: Recovery panel and chart foundations

**Files:**
- Create: `src/chart.ts`, `src/components/{ChartCard,Hero,Scale,MetricCard,Spark,Battery,NightBar}.tsx`, `src/panels/RecoveryPanel.tsx`, `tests/chart.test.ts`
- Modify: `src/panels/index.ts`

**Interfaces:**
- Consumes: `useStore`, `useLayout` (Tasks 6, 7); `readiness`, `verdict`, `verdictTone`, `explain`, `loadSeries`, `ratioLabel`, `rolling`, `band`, `weekly`, `mean` (Task 3); format and day helpers (Task 4).
- Produces in `chart.ts` (logic of `app.js` lines 109–227 and 308–329, with CSS reads replaced by arguments): `alpha(hex: string, a: number): string`, `line(label, data, color, dash?)`, `bar(label, data, color)`, `trend(values, color, name, band?: string): ChartDataset[]` (band fill colour passed in, no `getComputedStyle`), `describe(name, values, unit?): string`, `weekBars(w: WeekPoint[], d: DayWithLoad[], color: string): { any: boolean; colors: string[]; title: (items) => string; last: boolean }`, `interface DrawOpts { stacked?; summary?; horizontal?; whole?; yRange?; tipTitle? }`, `chartConfig(type, labels, datasets, opts: DrawOpts, env: { mfg: string; rule: string; width: number; reduced: boolean }): ChartConfiguration`. `ChartCard` props: `{ caption: ReactNode; captionId?: string; canvasId: string; type: 'line' | 'bar'; labels: string[]; datasets: ChartDataset[]; opts?: DrawOpts; wide?: boolean; children?: ReactNode }` (creates the Chart in an effect keyed on the data and `useLayout().key`, destroys it on cleanup, renders "No data for this period." when every value is null). `Hero` renders the shared `.today` card for both the readiness and the load verdicts; `Scale` renders the 0–100 and load-ratio scales (marker and tick positions set through the DOM `style`, not inline attributes in markup).

- [ ] **Step 1: Write `tests/chart.test.ts`:** `describe('HRV', [null, null], ' ms')` is `HRV: no data.`; `describe('HRV', [50, 60], ' ms')` contains `latest 60.0 ms, average 55.0 ms, range 50.0 to 60.0 ms over 2 points`; `alpha('#112233', 0.5)` is `#11223380`; `trend(v, '#111111', 'Daily HRV', '#222222')` has 4 datasets labelled `_low`, `Your normal range`, `Daily HRV`, `7-day average` and 2 without the band; `weekBars` flags the first and last week partial and sets the title suffixes `(partial week)` and `(so far)`; `chartConfig` hides `_`-prefixed datasets from the legend and caps x ticks between 3 and 8 by `width / 72`.
- [ ] **Step 2: Run `npx vitest run tests/chart.test.ts`.** Expected: FAIL, module missing.
- [ ] **Step 3: Implement `chart.ts`, then the components and `RecoveryPanel`** from `public/index.html` lines 71–118 and `app.js` functions `today`, `recoveryCards`, `recovery`, `night`, `sleepChart`, `metric`, `spark`, `battery`. Canvas ids stay `c-hrv`, `c-rhr`, `c-bb`, `c-sleep`; the Body Battery and Sleep chart switch between nightly and weekly at 31 days as today.
- [ ] **Step 4: Run `npm run check`, then `npx playwright test auth tabs session csp` and `npx playwright test charts layout -g "Recovery draws|series with no data|charts rebuild|no horizontal overflow"`.** Expected: PASS (the Training, Activity and Insights chart tests wait for Tasks 9–11). `commit "Add Recovery panel, chart helpers and ChartCard"`.

### Task 9: Training panel

**Files:**
- Create: `src/components/{SessionItem,ScrollRegion}.tsx`, `src/panels/TrainingPanel.tsx`
- Modify: `src/panels/index.ts`

**Interfaces:**
- Consumes: `Hero`, `Scale`, `ChartCard`, `chart.ts` (Task 8); `loadSummary`, `ratioLabel`, `ratioPos`, `weekly` (Task 3).
- Produces: `SessionItem({ a }: { a: Activity })`; `ScrollRegion({ label, children })` renders the `.tablewrap` region and sets `tabIndex` to 0 only while it overflows (ResizeObserver), else -1.

- [ ] **Step 1: Implement** from `public/index.html` lines 121–157 and `app.js` functions `loadHero`, `training`, `sessionItem`: load hero with sessions list, weekly load bars with partial weeks, acute/chronic lines, horizontal heart-rate-zone bars, and the recent-activities table plus phone list. Canvas ids `c-wload`, `c-ac`, `c-zones`.
- [ ] **Step 2: Run `npm run check`, then `npx playwright test auth tabs session csp` and `npx playwright test charts layout -g "Recovery draws|Training draws|series with no data|charts rebuild|no horizontal overflow"`.** Expected: PASS. `commit "Add Training panel"`.

### Task 10: Activity panel

**Files:**
- Create: `src/panels/ActivityPanel.tsx`
- Modify: `src/panels/index.ts`

**Interfaces:**
- Consumes: `MetricCard`, `ChartCard`, `chart.ts` (Task 8); `weekly`, `mean` (Task 3); `dayLabel`, `series14`, `avg7`, `latest` (Task 4).

- [ ] **Step 1: Implement** from `public/index.html` lines 159–167 and `app.js` `activity`: four metric cards (steps, intensity minutes with goal 150 and progress bar, calories, stress), steps bars with a 7-day line, weekly intensity bars with a dashed goal line and partial-week shading, and the stress trend. Canvas ids `c-steps`, `c-im`, `c-stress`.
- [ ] **Step 2: Run `npm run check`, then `npx playwright test auth tabs session csp` and `npx playwright test charts layout -g "Recovery draws|Training draws|Activity draws|series with no data|charts rebuild|no horizontal overflow"`.** Expected: PASS. `commit "Add Activity panel"`.

### Task 11: Insights panel

**Files:**
- Create: `src/panels/InsightsPanel.tsx`
- Modify: `src/panels/index.ts`

**Interfaces:**
- Consumes: `insights`, `weekDeltas`, `ScrollRegion` (Tasks 3, 9); `num`, `fmtDate`, `newest` (Task 4).

- [ ] **Step 1: Implement** from `public/index.html` lines 169–177 and `app.js` `insightsPanel`: the weekly-delta table (empty-state row, change cell with up/down arrow icon, "better"/"worse" words and screen-reader text) and the insight cards ranked by `|r|` with weak ones dimmed and the strength bar (`.dfill` width and side set through DOM `style`).
- [ ] **Step 2: Run `npm run check` and the full `npx playwright test` against the built app.** Expected: every spec passes including `csp.spec.ts` and the Insights card count. `commit "Add Insights panel"`.

### Task 12: Cleanup, deploy config and CI e2e

**Files:**
- Delete: `public/` (everything left: `app.js`, `index.html`, `vendor/`)
- Modify: `vercel.json`, `README.md`, `.github/workflows/ci.yml`

- [ ] **Step 1: Delete `public/`.** Run `npm run check`. Expected: PASS with `allowJs` absent from `tsconfig.json`.
- [ ] **Step 2: `vercel.json`:** add `"buildCommand": "vite build"` and `"outputDirectory": "dist"`; leave `headers` untouched.
- [ ] **Step 3: README:** Run locally (same commands), Deploy (Vite preset, build command, the three env vars, then the Deployment Checks click-through: Vercel project → Settings → Deployment Checks → add the GitHub checks `check` and `e2e`; do this only after this branch is merged; UI labels may differ), Layout (new structure), and `npm run check` / `npm run test:e2e`.
- [ ] **Step 4: CI:** add the `e2e` job (`npm ci`, `npx playwright install --with-deps chromium`, `npm run test:e2e`; upload `playwright-report/` as an artifact when the job fails).
- [ ] **Step 5: Verify the production build is CSP-clean.** `npm run build`, then `grep -E '<script[^>]*>' dist/index.html | grep -v 'src='`, `grep -E '<style| style=' dist/index.html`. Expected: no output from either. Run `npm run test:e2e`. Expected: all specs pass with no skips.
- [ ] **Step 6: `commit "Remove legacy frontend; configure Vite deploy and CI e2e job"`.**

### Task 13: Parity check

**Files:** none committed; script and outputs live in a scratch directory outside the repo.

- [ ] **Step 1: Run both apps on demo data:** the legacy worktree from Task 2 on port 3001 and `npm run build && npm run preview -- --port 4173` here, both with the Task 2 env vars.
- [ ] **Step 2: Write a Playwright script** that signs in to each app, visits each tab, and saves the normalized `#app` HTML (strip the `#/` vs `#` hash differences and whitespace) plus screenshots at 1280 px and 320 px, light and dark.
- [ ] **Step 3: Diff the markup per tab.** Expected: identical or only whitespace/attribute-order differences; explain and fix any real difference in the React components. Compare screenshots against the old ones and `.impeccable/review/`.
- [ ] **Step 4: Manual pass:** keyboard tab navigation, wrong and right password, sign out, offline stale banner, mid-session 401 (DevTools).
- [ ] **Step 5: Clean up:** stop the legacy server, `git worktree remove ../GarminCompanion-legacy`. Report results to the user; no commit.

### Task 14: Deployment gate (manual, after merge)

**Files:** none (Vercel and GitHub settings, done by the user).

- [ ] **Step 1: User merges `react-ts` to `main`** so `ci.yml` exists there and both jobs run on `main`.
- [ ] **Step 2: In Vercel:** Project → Settings → Deployment Checks → add `check` and `e2e` from GitHub. If the settings page does not offer Deployment Checks on the current plan, report that instead of proceeding.
- [ ] **Step 3: Verify the gate once, on purpose:** with the user's approval, push a commit to `main` that fails `check` (a deliberate lint error). Expected: the deployment builds but is not promoted to the production domain and the live site stays on the last good deployment. Revert the commit.

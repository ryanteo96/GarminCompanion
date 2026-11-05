# Home page: a customizable overview of today

Date: 2026-11-05. Status: awaiting review. Part 3 of 3 (after `2026-11-05-stylelint-design.md`; independent of `2026-11-05-visx-charts-design.md`).

## Goal

A new Home tab, the default landing page, showing today's data as cards: the morning verdict first, then health and training signals. The metric cards carry a 7-day trend. The owner chooses which cards appear and in what order, and that layout follows them between phone and laptop.

Success means:

- Opening the app lands on Home. It answers the product's one question (train hard or easy today) before anything else, per `PRODUCT.md` principle 1, and every card keeps its existing honesty about which day its reading is from.
- Cards can be removed, added back, reordered by drag (mouse and touch) and by keyboard, and reset to the default order.
- The layout persists across reloads and syncs between devices. If the server is unreachable, or unconfigured in dev and demo, the local layout still works.
- Trends on Home always cover 7 days, whatever the chart range is set to.
- `npm run check`, `npm run test:e2e` and the CSP e2e (dnd-kit under `style-src 'self'`) pass.

## Non-goals

New metrics or new cards beyond the ten below; resizing cards or free-form x/y placement; a compact variant of the readiness and load heroes (they are reused as they are); per-device layouts; layout history or undo; an error banner for failed saves; a migration tool (see Storage).

## Decisions

| Question | Decision |
|---|---|
| Where Home lives | `home` is the first entry of `TABS`; `/` and unknown routes redirect to `/home` (was `/recovery`). The four existing tabs stay as the detail views |
| Cards | Registry of ten: `readiness` (2 wide), `load`, `hrv`, `resting-hr`, `sleep`, `body-battery`, `sessions` (2 wide), `steps`, `intensity`, `stress`. Each is a component that reads the store itself. Default order is the list above with `readiness` first |
| Trend window | 7 days, fixed. `series14` / `Spark` gain a length parameter (default 14, so Recovery and Activity are untouched); Home passes 7 |
| Layout model | Ordered list of card ids. Present means shown; removing drops the id; Add re-appends it. Cards flow through a responsive grid (one column on a phone). A card added to the registry later does not appear on its own; it shows in the Add list |
| Reorder | `@dnd-kit/core` + `@dnd-kit/sortable` (stable 6.3 / 10.0, React 19 within their peer range). The newer `@dnd-kit/react` is 0.x and is not used |
| Persistence | Neon Postgres, one row in a generic `settings` table. localStorage is the instant, offline copy |
| Conflict rule | Newest `updatedAt` wins, on both client and server |
| Sign-out | Does not clear the layout; it holds no health data |
| Chart range control | Hidden on Home (nothing there follows it), along with its screen-reader note |

## Cards

- Existing logic moves out of the panels into shared pieces that both the panels and the registry call, so nothing is duplicated:
  - `RecoveryPanel`: the `Today` hero becomes the `readiness` card; the `SIGNALS` loop body becomes one function building a `MetricCard` for a given signal (used for `hrv`, `resting-hr`, `sleep`, `body-battery`).
  - `TrainingPanel`: `LoadHero` already takes its sessions list as `children`. The `load` card is that `Hero` without children; `sessions` is a card holding the same three `SessionItem`s. Training keeps its combined hero.
  - `ActivityPanel`: the steps, intensity and stress `MetricCard`s are extracted the same way (calories stays on Activity).
- Each card computes what it needs (`readiness(days)` runs per card; it is cheap, and a shared context is not worth it).
- Registry shape, in `src/home/cards.tsx`: `{ id, title, group: 'health' | 'training', span: 1 | 2, Component }`. Ids match `^[a-z][a-z0-9-]{0,31}$`.

## Layout state

```ts
interface HomeLayout { cards: string[]; updatedAt: number } // updatedAt: Date.now() at the last edit
```

- Pure functions in `src/home/layout.ts`: `DEFAULT_CARDS`, `sanitize(input, known)`, `move`, `add`, `remove`, `reset`, `merge(local, remote)`. `sanitize` drops unknown ids and duplicates; a non-array input becomes the default; an empty array is valid (the owner removed everything).
- A small zustand store, `src/home/store.ts`, holds `cards`, `updatedAt`, `editing`. It hydrates synchronously from localStorage (key `home-layout`), so the first paint already has the owner's layout.
- Every edit sets `updatedAt`, writes localStorage, and schedules a PUT 800ms later. Leaving Home and `pagehide` flush a pending PUT immediately (`keepalive`).
- On entering Home the client does `GET /api/layout` (so a change made on the other device appears without a reload). If the remote copy is newer it replaces the local one, unless the owner is mid-edit. If the local copy is newer it is sent. Equal or `synced: false`: nothing happens.
- A 401 from the layout calls is ignored; the data load already owns the signed-out flow. Network errors keep the local layout and retry on the next edit.

## Storage and API

- `lib/settings.ts`: `getSetting(key)` and `putSetting(key, value)` over `@neondatabase/serverless` (HTTP `neon()` client). It creates `settings (key text primary key, value jsonb not null)` with `create table if not exists`, once per process. When `DATABASE_URL` is unset it reports "not configured" instead of throwing. The route never names the backend.
- `api/layout.ts`, same shape as `api/data.ts` (default-exported handler, `authed(req)` first, `send`, `readJson` with its 4096-byte default limit):
  - `GET` returns `{ synced: true, layout: HomeLayout | null }`, or `{ synced: false }` when storage is not configured.
  - `PUT` validates the body, stores it only if its `updatedAt` is greater than the stored one, and returns `{ synced: true, layout }` with whatever is now stored (so a stale device learns it lost).
  - Validation (trust boundary): `cards` is an array of at most 32 unique strings matching the id pattern; `updatedAt` is a finite number no more than a day in the future. Anything else, including a body that is over the size limit or not valid JSON, is 400. Other methods are 405. A storage failure is 502, as in `api/data.ts`.
  - The server does not import the UI registry; unknown ids are the client's to drop.
- CSRF: the session cookie is `SameSite=Strict`, the body is JSON, and the endpoint changes only this one preference.
- `tools/api-plugin.ts` needs no change: it mounts any `api/<lowercase name>.ts` in dev and preview. `vercel.json` needs none either; Neon is reached from the function, so `connect-src 'self'` still holds.
- Config: `DATABASE_URL` is added to `.env.example` and the README. On Vercel, install Neon from the Marketplace on the project (the owner's step); if the integration names the variable differently, map it to `DATABASE_URL` in the project's environment settings.

## Edit mode

- An "Edit layout" button (`aria-pressed`) sits at the top of the Home panel. In edit mode each card shows a handle button (name: "Move {title}") and a remove button ("Remove {title}"). Below the grid: an Add list of hidden cards grouped Health and Training, "Reset to default", and "Done".
- dnd-kit: pointer sensor attached to the handle only, with `touch-action: none` on the handle so the page still scrolls on a phone; keyboard sensor with the sortable coordinates (Space lifts, arrows move, Space drops, Esc cancels). `rectSortingStrategy` for the grid. Announcements name the card and its position ("Picked up Resting HR, position 3 of 10"). Transitions are off under `prefers-reduced-motion`.
- Focus: removing a card moves focus to the next card's handle (or to the Add list if none); adding moves focus to the new card's handle.
- An empty layout shows an empty state with an "Add a card" prompt, and stays in edit mode.
- Handles and remove buttons are at least 44px, as every control in `style.css` is.

## Files

- Add: `src/home/{cards.tsx,layout.ts,store.ts}`, `src/panels/HomePanel.tsx`, `lib/settings.ts`, `api/layout.ts`, `tests/home.test.ts`, `tests/layout-api.test.ts`, `e2e/home.spec.ts`.
- Change: `src/tabs.ts` (`home`, name "Home"), `src/panels/index.ts`, `src/components/Sidebar.tsx` (icon; its `ICONS` is `Record<Tab, …>`), `src/App.tsx` (redirect), `src/components/Dashboard.tsx` (the "all four tabpanels" comment), `src/components/Header.tsx` (hide the chart range on Home), `src/logic/days.ts` and `src/components/Spark.tsx` (length parameter), the three panels (call the extracted pieces), `src/style.css`, `package.json` (`@dnd-kit/core`, `@dnd-kit/sortable`, `@neondatabase/serverless`), `.env.example`, `README.md`.
- E2E that enumerate tabs or assume the old default: `e2e/helpers.ts` (`TAB_NAMES`, and `signIn` expects the Recovery tab to be visible, which stays true), `e2e/tabs.spec.ts` (line 61 expects the fresh-visit URL to end in `#/recovery`), `e2e/csp.spec.ts`, `e2e/layout.spec.ts`.

## Tests

- Unit (`tests/home.test.ts`): `move`, `add`, `remove`, `reset`; `sanitize` (unknown ids, duplicates, non-array, empty array); `merge` (remote newer, local newer, equal).
- Unit (`tests/layout-api.test.ts`): the handler against a fake settings store: 401 without a cookie; GET with nothing stored; PUT accepted; PUT with an older `updatedAt` returns the stored layout; 400 for duplicates, over 32 ids, bad id characters, non-numeric or far-future `updatedAt`; 405; `synced: false` when storage is not configured.
- E2E (`e2e/home.spec.ts`, no database, so local-only): Home is the default landing page; a keyboard reorder, a remove, an Add and a Reset each survive a reload; the chart range control is hidden on Home. Server sync is exercised with `page.route('**/api/layout', …)` standing in for the server: a newer remote layout is adopted on entering Home, and a newer local one is sent.
- CSP: `e2e/csp.spec.ts` gains a step that enters edit mode and lifts and drops a card, so dnd-kit runs under the production CSP.
- Pointer drag is not covered in Playwright (flaky with dnd-kit); the keyboard path covers the same reorder logic and the accessibility requirement.

## Build order (three shippable increments)

1. Home tab, the extracted card pieces, the registry and the default layout, with no editing.
2. Edit mode with dnd-kit and localStorage persistence.
3. Neon, `lib/settings.ts`, `api/layout.ts` and client sync. Needs the owner to install Neon on the Vercel project first.

## Risks and shortcuts

- Neon's free tier scales to zero after about 5 minutes idle and that cannot be turned off, so the first request after a quiet period can take roughly 0.5 to 2 seconds. Home renders from localStorage first, so this is not visible; anything later that waits on the database would feel it.
- Shortcut: the server's compare-then-write is two statements, not atomic. Two devices saving within the same instant could lose one edit. Acceptable for one owner; the code carries a `shortcut:` comment, to be replaced by a single conditional upsert if a second writer ever exists.
- Shortcut: `updatedAt` comes from each device's clock. A device with a badly wrong clock can win or lose a conflict wrongly. Acceptable for one owner.
- Shortcut: the table is created with `create table if not exists` on first use; there is no migration tool. Adopt one when a second table arrives.
- The readiness and load heroes are tall (a 7rem numeral). Two-wide cards will dominate a short layout; a compact variant is a follow-up, not part of this.

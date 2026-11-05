# Home page: a customizable overview of today

Date: 2026-11-05 (revised the same day after review). Status: awaiting review. Part 3 of 3 (after `2026-11-05-stylelint-design.md`; independent of `2026-11-05-visx-charts-design.md`).

## Goal

A new Home tab, the default landing page, showing today's data as cards: the morning verdict first, then health and training signals. The metric cards carry a 7-day trend. The owner chooses which cards appear and in what order, and that layout follows them between phone and laptop.

It is designed phone-first. `PRODUCT.md` names the first situation as a phone, first thing in the morning, half awake, one-handed, deciding whether to train hard or easy. Home is built for that screen and then widened to the existing laptop layout, not shrunk from it.

Success means:

- Opening the app lands on Home. At 375 by 667 the verdict is visible without scrolling and the page has no horizontal overflow. At 1280 wide it uses the sidebar and a four-column grid.
- Every card keeps its existing honesty about which day its reading is from (the "From Nov 3" labels and the stale chip).
- Cards can be hidden, shown again, reordered and reset from one Customize sheet, by touch, mouse and keyboard.
- The layout persists across reloads and syncs between devices. If the server is unreachable, or unconfigured in dev and demo, the local layout still works.
- Trends on Home always cover 7 days, whatever the chart range is set to.
- `npm run check`, `npm run test:e2e` and the CSP e2e (dnd-kit and a modal `<dialog>` under `style-src 'self'`) pass.

## Non-goals

New metrics or new cards beyond the ten below; resizing cards or free-form x/y placement; dragging the live cards in place on the grid; per-device layouts; layout history or undo; an error banner for failed saves; making each card a link to its detail tab; a migration tool (see Storage).

## Decisions

| Question | Decision |
|---|---|
| Where Home lives | `home` is the first entry of `TABS`; `/` and unknown routes redirect to `/home` (was `/recovery`). The four existing tabs stay as the detail views |
| CSS approach | Home's CSS is written phone-first (base styles are the phone's) and widens with `min-width` queries at the shell's existing breakpoints: 820px (sidebar appears) and 1061px (four columns). The existing `max-width` CSS is not touched |
| Cards | Registry of ten: `readiness`, `hrv`, `resting-hr`, `sleep`, `body-battery`, `load`, `sessions`, `steps`, `intensity`, `stress`. Each is a component that reads the store itself. This default order is evidence-first: the verdict, then the four recovery signals, then training, then activity, and it pairs into rows on both the two-column phone grid and the four-column laptop grid |
| Card widths | `span: 1 \| 2 \| 'full'`. `readiness` is full, `load` and `sessions` are 2, the other seven are 1 |
| Grid | Two columns on a phone; four from 1061px. Full always spans the row; a width of 2 is the whole row on a phone and half on a laptop |
| Compact heroes | The `readiness` and `load` cards use `Hero` with a `compact` flag: a smaller numeral, verdict and padding. They drop the load line and "How is this scored?" (both stay on Recovery) and keep the stale chip, the "Based on…" line and the scale. Compact heroes are single-column, except full-width `readiness` at 1061px and up, which keeps the two-column hero |
| Trend window | 7 days, fixed. `series14` / `Spark` gain a length parameter (default 14, so Recovery and Activity are untouched); Home passes 7 |
| Customizing | A **Customize sheet**, not in-place dragging. A "Customize" button at the top of the Home panel opens a native modal `<dialog>`: a bottom sheet on a phone, a right-hand side panel from 820px up. The grid updates live behind it. Reason: dragging tall cards fights page scrolling on a phone, sortable grids of mixed sizes are fragile, and one list gives reorder, hide and show with large touch targets |
| Reorder | `@dnd-kit/core` + `@dnd-kit/sortable` (stable 6.3 / 10.0, React 19 within their peer range) on a plain vertical list. The newer `@dnd-kit/react` is 0.x and is not used |
| Persistence | Neon Postgres, one row in a generic `settings` table. localStorage is the instant, offline copy |
| Conflict rule | Newest `updatedAt` wins, on both client and server |
| Sign-out | Does not clear the layout; it holds no health data |
| Chart range control | Hidden on Home (nothing there follows it), along with its screen-reader note |

## Cards

- Existing logic moves out of the panels into shared pieces that both the panels and the registry call, so nothing is duplicated:
  - `RecoveryPanel`: the `Today` hero becomes the `readiness` card; the `SIGNALS` loop body becomes one function building a `MetricCard` for a given signal (used for `hrv`, `resting-hr`, `sleep`, `body-battery`).
  - `TrainingPanel`: `LoadHero` already takes its sessions list as `children`. The `load` card is that `Hero` without children; `sessions` is a card holding the same three `SessionItem`s. Training keeps its combined hero and is not made compact.
  - `ActivityPanel`: the steps, intensity and stress `MetricCard`s are extracted the same way (calories stays on Activity).
- Each card computes what it needs (`readiness(days)` runs per card; it is cheap, and a shared context is not worth it).
- Registry shape, in `src/home/cards.tsx`: `{ id, title, group: 'health' | 'training', span, Component }`. Ids match `^[a-z][a-z0-9-]{0,31}$`.

## Layout state

```ts
interface HomeLayout { cards: string[]; updatedAt: number } // updatedAt: Date.now() at the last edit
```

- `cards` is the shown cards in order. Hidden cards are the registry minus `cards`; showing one appends it. A card added to the registry later does not appear on its own; it is listed as hidden.
- Pure functions in `src/home/layout.ts`: `DEFAULT_CARDS`, `sanitize(input, known)`, `move`, `show`, `hide`, `reset`, `merge(local, remote)`. `sanitize` drops unknown ids and duplicates; a non-array input becomes the default; an empty array is valid (the owner hid everything).
- A small zustand store, `src/home/store.ts`, holds `cards` and `updatedAt`. Whether the sheet is open is local component state. The store hydrates synchronously from localStorage (key `home-layout`), so the first paint already has the owner's layout.
- Every change sets `updatedAt`, writes localStorage, and schedules a PUT 800ms later. Leaving Home and `pagehide` flush a pending PUT immediately (`keepalive`).
- On entering Home the client does `GET /api/layout` (so a change made on the other device appears without a reload). If the remote copy is newer it replaces the local one, unless the sheet is open. If the local copy is newer it is sent. Equal, or `synced: false`: nothing happens.
- A 401 from the layout calls is ignored; the data load already owns the signed-out flow. Network errors keep the local layout and retry on the next change.

## Customize sheet

- `<dialog>` opened with `showModal()`: focus is trapped, Esc closes, the page behind is inert, and focus returns to the Customize button. It is labelled "Customize Home". Base styles are the phone's bottom sheet (full width, up to 85dvh tall, 14px top corners, safe-area padding, clear of the bottom tab bar because a modal dialog sits above it); from 820px it is a 360px side panel on the right with a transparent backdrop so the live grid stays visible.
- Contents: a "Shown" list of sortable rows, then a "Hidden" list. Each row is at least 44px tall: on shown rows a drag handle (named "Move {title}"), the card title with its group (Health or Training) in muted text, and a show/hide switch (a labelled checkbox with `role="switch"`). Hidden rows have the switch off and no handle. Footer: "Reset to default" and "Done".
- dnd-kit: `verticalListSortingStrategy`; a pointer sensor attached to the handle only, with `touch-action: none` on the handle so the sheet still scrolls under a thumb; a keyboard sensor with the sortable coordinates (Space lifts, arrows move, Space drops, Esc cancels). Auto-scroll is limited to the sheet's own scroll container. Announcements name the card and its position ("Picked up Resting HR, position 3 of 10"). Transitions are off under `prefers-reduced-motion`.
- Focus stays on the switch you toggled when its row moves between lists.
- Hiding every card leaves an empty state on the page with a "Customize" prompt.

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

## Files

- Add: `src/home/{cards.tsx,layout.ts,store.ts,CustomizeSheet.tsx}`, `src/panels/HomePanel.tsx`, `lib/settings.ts`, `api/layout.ts`, `tests/home.test.ts`, `tests/layout-api.test.ts`, `e2e/home.spec.ts`.
- Change: `src/tabs.ts` (`home`, name "Home"), `src/panels/index.ts`, `src/components/Sidebar.tsx` (icon; its `ICONS` is `Record<Tab, …>`), `src/App.tsx` (redirect), `src/components/Dashboard.tsx` (the "all four tabpanels" comment), `src/components/Header.tsx` (hide the chart range on Home), `src/components/Hero.tsx` (`compact`), `src/logic/days.ts` and `src/components/Spark.tsx` (length parameter), the three panels (call the extracted pieces), `src/style.css` (a new phone-first Home section), `package.json` (`@dnd-kit/core`, `@dnd-kit/sortable`, `@neondatabase/serverless`), `.env.example`, `README.md`.
- E2E that enumerate tabs or assume the old default: `e2e/helpers.ts` (`TAB_NAMES`, and `signIn` expects the Recovery tab to be visible, which stays true), `e2e/tabs.spec.ts` (line 61 expects the fresh-visit URL to end in `#/recovery`), `e2e/csp.spec.ts`, `e2e/layout.spec.ts` (walks every tab through `TAB_NAMES`, so Home is covered once it is added there).

## Tests

- Unit (`tests/home.test.ts`): `move`, `show`, `hide`, `reset`; `sanitize` (unknown ids, duplicates, non-array, empty array); `merge` (remote newer, local newer, equal).
- Unit (`tests/layout-api.test.ts`): the handler against a fake settings store: 401 without a cookie; GET with nothing stored; PUT accepted; PUT with an older `updatedAt` returns the stored layout; 400 for duplicates, over 32 ids, bad id characters, non-numeric or far-future `updatedAt`; 405; `synced: false` when storage is not configured.
- E2E (`e2e/home.spec.ts`, no database, so local-only):
  - Home is the default landing page, and the chart range control is hidden on it.
  - At 375 by 667 the verdict heading is inside the viewport and the page has no horizontal overflow; at 1280 wide the sidebar and four-column grid are present.
  - Open Customize, reorder with the keyboard, hide a card, show it again, and Reset; each survives a reload. Esc closes the sheet and focus returns to the Customize button.
  - Server sync uses `page.route('**/api/layout', …)` standing in for the server: a newer remote layout is adopted on entering Home, and a newer local one is sent.
- CSP: `e2e/csp.spec.ts` gains a step that opens the sheet and lifts and drops a row, so dnd-kit and the modal dialog run under the production CSP.
- Pointer drag is not covered in Playwright (flaky with dnd-kit); the keyboard path covers the same reorder logic and the accessibility requirement.

## Build order (three shippable increments)

1. Home tab, the extracted card pieces, compact heroes, the registry, the phone-first grid and the default layout, with no customizing.
2. The Customize sheet with dnd-kit and localStorage persistence.
3. Neon, `lib/settings.ts`, `api/layout.ts` and client sync. Needs the owner to install Neon on the Vercel project first.

## Risks and shortcuts

- A drag inside a top-layer modal `<dialog>` is the least-proven combination here (pointer capture, auto-scroll inside the sheet, `touch-action`). The second increment starts by proving it on a real phone-sized viewport before building the rest.
- Neon's free tier scales to zero after about 5 minutes idle and that cannot be turned off, so the first request after a quiet period can take roughly 0.5 to 2 seconds. Home renders from localStorage first, so this is not visible; anything later that waits on the database would feel it.
- Shortcut: the server's compare-then-write is two statements, not atomic. Two devices saving within the same instant could lose one edit. Acceptable for one owner; the code carries a `shortcut:` comment, to be replaced by a single conditional upsert if a second writer ever exists.
- Shortcut: `updatedAt` comes from each device's clock. A device with a badly wrong clock can win or lose a conflict wrongly. Acceptable for one owner.
- Shortcut: the table is created with `create table if not exists` on first use; there is no migration tool. Adopt one when a second table arrives.

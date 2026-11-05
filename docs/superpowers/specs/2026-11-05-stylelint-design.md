# Stylelint for CSS

Date: 2026-11-05. Status: awaiting review. Part 1 of 3 (then `2026-11-05-visx-charts-design.md`, then `2026-11-05-home-page-design.md`).

## Goal

Lint the project's CSS the way ESLint lints its TypeScript: one command, part of `npm run check`, so the CI `check` job enforces it. It goes first so the CSS added by the next two pieces is linted from its first line.

Success means:

- `npm run lint:css` exits 0 on `src/style.css` with `--max-warnings 0`.
- `npm run check` runs it (`typecheck`, `lint`, `lint:css`, `test`). CI needs no workflow change, because the `check` job already runs `npm run check`.
- The stylesheet renders exactly as before: `npm run test:e2e` passes unchanged and a before/after look at the built app on Recovery and Training shows no difference.

## Non-goals

Reformatting `style.css` (it deliberately packs several rules and declarations per line); a formatter (Prettier); SCSS, CSS modules or CSS-in-JS; linting inline `style` props in TSX.

## Decisions

| Question | Decision |
|---|---|
| Tool and base config | `stylelint` with `stylelint-config-standard` (both resolve to the latest at install: 18.x and 41.x today) |
| Config file | `stylelint.config.js` (ESM, the package is `"type": "module"`) |
| Existing violations | Run `stylelint --fix` and review the diff. Any rule that cannot be satisfied without changing how the CSS looks, or without giving up the compact one-line style, is turned off in the config with a one-line reason beside it. Nothing is turned off to hide a real defect |
| Scope | `src/**/*.css`. Ignore `dist`, `playwright-report`, `test-results`, `docs`, `.impeccable` (mirrors the ESLint ignores) |
| Script | `"lint:css": "stylelint \"src/**/*.css\" --max-warnings 0"`; `check` becomes `npm run typecheck && npm run lint && npm run lint:css && npm test` |

## Files

- Add: `stylelint.config.js`.
- Change: `package.json` (two devDependencies, one script, `check`), `src/style.css` (only fixes the review accepts).
- README: line 18 ("`npm run check` # typecheck, lint and unit tests") gains "CSS lint".

## Verification

1. Run `npm run lint:css` before fixing and record the rule counts, so the disabled-rule list is justified by evidence, not guessed.
2. Run `--fix`, read the whole diff, and revert any change that alters rendering (for example shortening a colour is neutral; reordering a cascade is not).
3. `npm run build`, then `npm run test:e2e`, then open the built app on Recovery and Training and compare with `main`.

## Risks

- A rule's autofix could change specificity or order in a way e2e does not catch. The diff review and the visual comparison are the guard; there is no automated visual regression in this repo.
- The standard config's naming patterns (kebab-case classes and custom properties) could flag existing names. Renaming a class touches TSX; if a rename is needed, disable that pattern rule instead of renaming.

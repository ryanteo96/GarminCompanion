# Stylelint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lint `src/style.css` with Stylelint as part of `npm run check`, so the CI `check` job enforces it, without changing how anything renders.

**Architecture:** `stylelint` + `stylelint-config-standard`, configured in an ESM `stylelint.config.js` at the repo root. A `lint:css` script runs it on `src/**/*.css` with `--max-warnings 0`, and `check` calls it between `lint` and `test`. Existing violations are autofixed where the fix does not change rendering. Rules that would force the multi-line style, or a visual change, are turned off in the config with a one-line reason each.

**Tech Stack:** Stylelint 18.x, stylelint-config-standard 41.x, Node 26, npm.

**Spec:** `docs/superpowers/specs/2026-11-05-stylelint-design.md`

## Global Constraints

- Branch `home-page` (already checked out). Never push without being asked.
- `commit "<msg>"` in a step means `git -c user.name="Ryan Teo" -c user.email="ryanteo1996@gmail.com" commit -m "<msg>"`, with **no** `Co-Authored-By` or `Claude-Session` trailer.
- Dev dependencies: exactly `stylelint` and `stylelint-config-standard`, latest at install (18.x and 41.x today). Nothing else: no Prettier, no SCSS, no plugins.
- Config file: `stylelint.config.js`, ESM (`export default`), `extends: ['stylelint-config-standard']`.
- Scope: `src/**/*.css`. `ignoreFiles` covers `dist`, `playwright-report`, `test-results`, `docs`, `.impeccable` (the same list as `eslint.config.js`).
- Script, verbatim: `"lint:css": "stylelint \"src/**/*.css\" --max-warnings 0"`.
- `check`, verbatim: `npm run typecheck && npm run lint && npm run lint:css && npm test`.
- `.github/workflows/ci.yml` is not edited. Its `check` job already runs `npm run check`.
- No visual change. Do not reformat `style.css`: it keeps several rules and declarations per line. No class or id renames, so no TSX edits. If a naming-pattern rule flags a name, turn the rule off rather than rename.
- Every rule that is turned off or re-optioned gets a one-line `//` reason beside it. Nothing is turned off to hide a real defect.
- README line 18 becomes `npm run check          # typecheck, lint, CSS lint and unit tests (Vitest)`.

## Review Focus

Failure modes the spec implies but no automated check catches. Each one is pinned to a step.

1. **Autofix changes the cascade or specificity.** For example, merging longhands into a shorthand across other declarations, or a reorder to satisfy `no-descending-specificity` (Task 2 Step 3 diff review and Step 7 visual comparison).
2. **Autofix drops a prefix the app needs.** `property-no-vendor-prefix` can remove `-webkit-text-size-adjust: 100%` from `body` (line 28), which changes text sizing on iOS Safari. It must survive (Task 2 Step 3: `grep -c -- '-webkit-text-size-adjust' src/style.css` prints `1`).
3. **The config flags existing names, or breaks the compact style.** Naming-pattern rules, and whitespace rules whose fix splits lines (`declaration-block-single-line-max-declarations`, `*-empty-line-before`), must be turned off, not obeyed (Task 2 Step 2, decided from the Task 1 counts. Task 2 Step 3 checks `wc -l` and that `src/*.tsx` is untouched).
4. **The ESM config is not the one being loaded, or the ignores do nothing.** A silent fallback would still exit 0 (Task 1 Step 3 `--print-config`, Task 1 Step 4 ignore probe).
5. **CI does not run the new script.** `lint:css` exists, but `check` or the CI job does not call it (Task 2 Step 5 prove-it-bites probe through `npm run check`, plus a grep of `ci.yml`).

---

### Task 1: Install, config, script, baseline

**Files:**
- Create: `stylelint.config.js`
- Modify: `package.json` (two devDependencies, `lint:css` script), `package-lock.json`

**Interfaces:**
- Consumes: `src/style.css` (unchanged in this task), the ignore list in `eslint.config.js`.
- Produces: `npm run lint:css`, not yet in `check`. A recorded per-rule violation count. Baseline screenshots in the scratchpad.

- [ ] **Step 1: Baseline visuals, before anything changes.** `src/style.css` is identical to `main`, so HEAD is the baseline. Run `DASHBOARD_PASSWORD=e2e-password SESSION_SECRET=e2e-secret-0123456789 GARMIN_API_KEY= npm run build && DASHBOARD_PASSWORD=e2e-password SESSION_SECRET=e2e-secret-0123456789 GARMIN_API_KEY= npm run preview -- --port 4173`. Sign in with `e2e-password`. Screenshot Recovery (`#/recovery`) and Training (`#/training`) at 1280 px and 375 px wide, in both dark and light scheme (DevTools > Rendering > prefers-color-scheme). That makes 8 images; keep them outside the repo. Expected: the "Demo data" badge is visible and the charts are drawn.
- [ ] **Step 2: Install.** `npm install -D stylelint stylelint-config-standard`. Expected: `npm ls stylelint stylelint-config-standard` shows `stylelint@18.x` and `stylelint-config-standard@41.x`.
- [ ] **Step 3: Write `stylelint.config.js`** with `export default { extends: ['stylelint-config-standard'], ignoreFiles: ['dist/**', 'playwright-report/**', 'test-results/**', 'docs/**', '.impeccable/**'] }`. No rules yet. Check that it loads: `npx stylelint --print-config src/style.css | grep -c '"rules"'`. Expected: `1`, and the output lists standard-config rules such as `selector-class-pattern`.
- [ ] **Step 4: Prove the ignores work.** Run `npx stylelint "dist/**/*.css" --allow-empty-input; echo $?`. Expected: no reports and exit `0`, even though `dist/` holds built CSS. Then run `npx stylelint "**/*.css" --formatter unix | cut -d: -f1 | sort -u`. Expected: only `src/style.css`.
- [ ] **Step 5: Add the script** `"lint:css": "stylelint \"src/**/*.css\" --max-warnings 0"` to `package.json`. Leave `check` unchanged for now.
- [ ] **Step 6: Record the counts.** Run `npx stylelint "src/**/*.css" --formatter json | node -e 'const r=JSON.parse(require("fs").readFileSync(0)).flatMap(f=>f.warnings);const c={};for(const w of r)c[w.rule]=(c[w.rule]||0)+1;console.log(c)'`. Paste the `rule: count` list into the Task 1 report. It is the evidence for every disable in Task 2. Expected: a non-empty list, because `npm run lint:css` exits non-zero at this point.
- [ ] **Step 7: Commit.** `git add stylelint.config.js package.json package-lock.json`, then `commit "Add Stylelint with the standard config and a lint:css script"`.

### Task 2: Clear violations, wire into check

**Files:**
- Modify: `stylelint.config.js` (`rules`), `src/style.css` (only fixes accepted in review), `package.json` (`check`), `README.md` (line 18)

**Interfaces:**
- Consumes: the Task 1 counts and baseline screenshots, and `npm run lint:css`.
- Produces: `npm run check` includes `lint:css` and exits 0.

- [ ] **Step 1: Sort each counted rule into one of three groups.**
  (a) The fix leaves rendering the same (for example `color-hex-length`, `alpha-value-notation`, `color-function-notation`, `media-feature-range-notation`; range syntax is inside Vite 8's default browser target): accept the fix.
  (b) The fix splits lines or adds blank lines (expected: `declaration-block-single-line-max-declarations`, `rule-empty-line-before`, `custom-property-empty-line-before`, `declaration-empty-line-before`, `comment-empty-line-before`, `at-rule-empty-line-before`), or the rule is a naming pattern that would need a rename: turn it off.
  (c) The rule cannot be satisfied without a visual change (likely `no-descending-specificity`, because the fix is a reorder): turn it off. The exception is a real defect, such as a duplicate or misspelled property, or an unknown value. Fix that in the CSS instead.
  Write the (b) and (c) rules into `stylelint.config.js` `rules`. Each line looks like `'rule-name': null, // <one-line reason>`. For a prefix the app needs, re-option the rule instead of turning it off: `'property-no-vendor-prefix': [true, { ignoreProperties: ['text-size-adjust'] }], // iOS Safari still needs -webkit-text-size-adjust`.
- [ ] **Step 2: Autofix.** `npx stylelint "src/**/*.css" --fix`. Then `npm run lint:css; echo $?`. Expected: `0`. If not, return to Step 1 for the rule that remains. Do not add a disable comment inside `style.css`.
- [ ] **Step 3: Read the whole diff:** `git diff src/style.css`. Revert any hunk that changes declaration order, merges longhands across other declarations, changes a selector, or drops a prefix. If a revert makes lint fail, turn that rule off in Step 1 with a reason. Then check:
  - `grep -c -- '-webkit-text-size-adjust' src/style.css` prints `1`.
  - `wc -l src/style.css` prints at most `236` (the file did not grow, so the compact style held).
  - `git diff --stat -- src '*.tsx'` lists only `src/style.css`.
- [ ] **Step 4: Audit the disables.** Run `grep -nE "null|ignore" stylelint.config.js`. Expected: every hit ends in a `//` reason, and every rule named appears in the Task 1 counts. For each (c) rule, find at least one flagged line in the Task 1 output and confirm that fixing it would mean a reorder or a visual change, not that it is a defect.
- [ ] **Step 5: Wire up `check` and README.** Set `check` to `npm run typecheck && npm run lint && npm run lint:css && npm test`, and edit README line 18 to the text in Global Constraints. Prove it bites: append `a { colr: red; }` to `src/style.css`, run `npm run check`, and expect it to fail with `property-no-unknown`. Then delete that line by hand. Do not use `git checkout`, which would also throw away the accepted fixes. `npm run lint:css` exits 0 again. Check that `grep -n "npm run check" .github/workflows/ci.yml` shows the `check` job step.
- [ ] **Step 6: Run the gates.** `npm run check` exits 0 (typecheck, lint, lint:css, Vitest). Then `npm run build` exits 0, then `npm run test:e2e` passes with the same specs and counts as before, and no spec is edited.
- [ ] **Step 7: Compare the visuals.** Repeat the 8 screenshots from Task 1 Step 1 on the new build and compare them side by side. Expected: no difference in spacing, colours, focus rings, breakpoints at 375 px, or the light scheme. Any difference: find the hunk responsible, revert it, and go back to Step 2.
- [ ] **Step 8: Commit.** `git add stylelint.config.js src/style.css package.json README.md`, then `commit "Fix Stylelint findings in style.css and run CSS lint in npm run check"`.

## Self-review

- **Spec coverage:** Tool and config (T1 S2–S3). ESM config (T1 S3). Scope and ignores (T1 S3–S4). Script (T1 S5). `check` (T2 S5). No CI change (T2 S5 grep). Counts before fixing (T1 S6). `--fix` plus full diff review (T2 S2–S3). Disables with reasons and no hidden defects (T2 S1, S4). Build, e2e, and the Recovery/Training comparison against `main` (T1 S1, T2 S6–S7). README (T2 S5). Non-goals respected: no reformat (T2 S3 `wc -l`), no Prettier, no TSX.
- **Step scan:** every step has one action and a checkable result. The only manual checks are T1 S1 and T2 S7, which the spec requires.
- **Names:** `lint:css`, `stylelint.config.js`, the `check` text and the ignore list match the spec and Global Constraints everywhere they appear.
- **Review Focus:** 1 → T2 S3/S7; 2 → T2 S1/S3; 3 → T2 S1/S3; 4 → T1 S3/S4; 5 → T2 S5.
- **Proportion:** two tasks for one config file, one script, and a single-file CSS cleanup. No config is pasted beyond the parts the spec pins.

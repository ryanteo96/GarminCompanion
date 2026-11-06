import { test } from '@playwright/test';
import { showView, signIn, VIEWS } from './helpers.js';

// `npm run shots` saves one viewport-sized PNG per view, size and theme to shots/ for eyeballing a UI change.
// Skipped in the normal suite. Viewport-sized on purpose: full-page captures are several times larger to read back.
test.skip(!process.env.SHOTS, 'run with npm run shots');

const SIZES = { phone: { width: 390, height: 844 }, desktop: { width: 1280, height: 800 } };

for (const [size, viewport] of Object.entries(SIZES))
  for (const theme of ['light', 'dark'] as const)
    test(`${size} ${theme}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await signIn(page);
      for (const view of VIEWS) {
        await showView(page, view);
        await page.waitForTimeout(2000); // shortcut: lets session detail load after the view shows; wait on a selector if shots come out half-drawn
        await page.screenshot({ path: `shots/${view.toLowerCase()}-${size}-${theme}.png` });
      }
    });

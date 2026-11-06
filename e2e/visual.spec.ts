import { expect, test } from '@playwright/test';
import { showView, signIn, VIEWS } from './helpers.js';

// Both regressions here were once caught only by eye: visx charts lost their readout, and Running cards sat flush.

test('every visx chart shows a readout on hover', async ({ page }) => {
  await signIn(page);
  let seen = 0;
  for (const view of VIEWS) {
    await showView(page, view);
    for (const layer of await page.locator('rect.hover:visible').all()) {
      await layer.scrollIntoViewIfNeeded();
      await layer.hover();
      await expect(layer.locator('xpath=..').locator('text.tip'), `${view}: a chart has no readout`).toBeVisible();
      seen++;
    }
  }
  expect(seen).toBeGreaterThan(0);
});

for (const width of [320, 1280]) {
  test(`no two cards touch at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await signIn(page);
    for (const view of VIEWS) {
      await showView(page, view);
      const touching = await page.evaluate(() => {
        const cards = [...document.querySelectorAll<HTMLElement>('.card')].filter((el) => el.checkVisibility());
        const hits: string[] = [];
        cards.forEach((a, i) =>
          cards.slice(i + 1).forEach((b) => {
            if (a.contains(b) || b.contains(a)) return;
            const r = a.getBoundingClientRect();
            const s = b.getBoundingClientRect();
            // Within 1 px on both axes means the two share an edge or overlap.
            if (r.left <= s.right + 1 && s.left <= r.right + 1 && r.top <= s.bottom + 1 && s.top <= r.bottom + 1)
              hits.push(`${a.className} | ${b.className}`);
          }),
        );
        return hits;
      });
      expect(touching, `${view} at ${width} px`).toEqual([]);
    }
  });
}

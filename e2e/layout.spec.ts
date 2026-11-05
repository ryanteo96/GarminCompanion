import { expect, test } from '@playwright/test';
import { LEGACY, signIn, TAB_NAMES, watchErrors } from './helpers.js';

test('no horizontal overflow at 320 px', async ({ page }) => {
  // Known defect in the old app: the absolutely positioned .sr-only spans in the Insights table escape
  // .tablewrap's scrolling and widen the page by 108 px. The new build fixes it with `.tablewrap { position: relative }`.
  test.fail(LEGACY, 'Insights overflows the page at 320 px in the old app');
  await page.setViewportSize({ width: 320, height: 700 });
  await signIn(page);
  for (const name of TAB_NAMES) {
    await page.getByRole('tab', { name }).click();
    await expect(page.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'true');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${name} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
  }
});

test('charts rebuild after a resize and a dark-scheme switch', async ({ page }) => {
  const errors = watchErrors(page);
  await signIn(page);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.emulateMedia({ colorScheme: 'dark' });
  const canvases = page.locator('canvas:visible');
  await expect(canvases).toHaveCount(4);
  for (const canvas of await canvases.all()) await expect(canvas).toHaveAttribute('aria-label', /\S/);
  await expect(page.getByText("Couldn't draw this view")).toHaveCount(0);
  expect(errors).toEqual([]);
});

import { expect, test, type Page } from '@playwright/test';
import { expectDrawn, patchData, signIn, watchErrors } from './helpers.js';

async function expectCharts(page: Page, tab: string, count: number): Promise<void> {
  const errors = watchErrors(page);
  await signIn(page);
  await page.getByRole('tab', { name: tab }).click();
  const canvases = page.locator('canvas:visible');
  await expect(canvases).toHaveCount(count);
  for (const canvas of await canvases.all()) await expect(canvas).toHaveAttribute('aria-label', /\S/);
  await expectDrawn(canvases);
  await expect(page.getByText("Couldn't draw this view")).toHaveCount(0);
  expect(errors).toEqual([]);
}

test('Recovery draws its charts', async ({ page }) => expectCharts(page, 'Recovery', 4));
test('Training draws its charts', async ({ page }) => expectCharts(page, 'Training', 3));
test('Activity draws its charts', async ({ page }) => expectCharts(page, 'Activity', 3));

test('Insights shows its cards', async ({ page }) => {
  await signIn(page);
  await page.getByRole('tab', { name: 'Insights' }).click();
  await expect(page.getByText(/^r = /)).toHaveCount(5);
});

test('a series with no data shows an empty state', async ({ page }) => {
  const errors = watchErrors(page);
  await patchData(page, (json) => {
    for (const day of json.days) day.hrv = null;
  });
  await signIn(page);
  await page.getByRole('tab', { name: 'Recovery' }).click();
  await expect(page.getByText('No data for this period.').first()).toBeVisible();
  expect(errors).toEqual([]);
});

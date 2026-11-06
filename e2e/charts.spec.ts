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
test('Activity draws its charts', async ({ page }) => expectCharts(page, 'Activity', 6));

test('Activity draws Fitness, Fatigue and Form with visx', async ({ page }) => {
  const errors = watchErrors(page);
  await signIn(page);
  await page.getByRole('tab', { name: 'Activity' }).click();
  const card = page.locator('#fitness');
  await expect(card.getByRole('img', { name: /^Fitness and Fatigue over time/ })).toBeVisible();
  await expect(card.locator('path.ln')).toHaveCount(3);
  await expect(card.locator('.fit-now dd')).toHaveCount(3);
  expect(errors).toEqual([]);
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

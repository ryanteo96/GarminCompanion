import { expect, test } from '@playwright/test';
import { patchData, signIn } from './helpers.js';

test('the detail tabs keep their full heroes and cards', async ({ page }) => {
  await signIn(page);
  await page.getByRole('tab', { name: 'Recovery' }).click();
  await expect(page.locator('#today-load')).toBeAttached();
  await expect(page.getByText('How is this scored?')).toBeVisible();
  await expect(page.locator('#k-recovery .metric')).toHaveCount(4);
  await expect(page.locator('#k-recovery svg.spark').first()).toHaveAttribute('aria-label', /last 14 days/);
  await page.getByRole('tab', { name: 'Training' }).click();
  await expect(page.locator('#load #sessions li')).toHaveCount(3);
  await expect(page.getByText('What is training load?')).toBeVisible();
  await page.getByRole('tab', { name: 'Activity' }).click();
  await expect(page.locator('#k-activity .metric')).toHaveCount(4);
});

test('Home is the landing tab and hides the chart range', async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole('tab', { name: 'Home' })).toHaveAttribute('aria-selected', 'true');
  await expect(page).toHaveURL(/#\/home$/);
  await expect(page.locator('#range')).toHaveCount(0);
  await expect(page.locator('#range-note')).toHaveCount(0);
  await expect(page.locator('[aria-describedby="range-note"]')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Recovery' }).click();
  await expect(page.getByLabel('Chart range')).toBeVisible();
  await expect(page.locator('#range-note')).toBeAttached();
});

test('Home fits a phone and widens to four columns', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await signIn(page);
  await expect(page.locator('#today-h')).toBeInViewport({ ratio: 1 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  const tracks = () => page.locator('.home-grid').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  expect(await tracks()).toBe(2);
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.locator('.side')).toBeVisible();
  expect(await tracks()).toBe(4);
  const grid = (await page.locator('.home-grid').boundingBox())!.width;
  const load = (await page.locator('[data-card="load"]').boundingBox())!.width;
  expect(Math.abs(load - grid / 2)).toBeLessThanOrEqual(grid * 0.02);
});

test('Home cards say which day a reading is from', async ({ page }) => {
  await patchData(page, (json) => {
    json.days.at(-1)!.hrv = null;
  });
  await signIn(page);
  await expect(page.locator('#today-chip')).toBeVisible();
  await expect(page.locator('#today-chip')).toContainText(/not today/);
  await expect(page.locator('#today-date')).toBeHidden();
  await expect(page.locator('[data-card="hrv"]')).toContainText(/From /);
});

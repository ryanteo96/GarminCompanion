import { expect, test } from '@playwright/test';
import { signIn } from './helpers.js';

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

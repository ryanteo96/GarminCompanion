import { expect, test } from '@playwright/test';
import { signIn } from './helpers.js';

test('the detail tabs keep their full heroes and cards', async ({ page }) => {
  await signIn(page);
  await page.getByRole('tab', { name: 'Recovery' }).click();
  await expect(page.locator('#today-load')).toBeAttached();
  await expect(page.getByText('How is this scored?')).toBeVisible();
  await expect(page.locator('#k-recovery .metric')).toHaveCount(4);
  await expect(page.locator('#k-recovery svg.spark').first()).toHaveAttribute('aria-label', /last 14 days/);
});

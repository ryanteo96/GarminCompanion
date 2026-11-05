import { expect, test } from '@playwright/test';
import { signIn } from './helpers.js';

test('a wrong password shows an error and stays on the form', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Password', { exact: true }).fill('not-the-password');
  await page.getByRole('button', { name: 'Unlock' }).click();
  await expect(page.getByRole('alert')).toHaveText('Wrong password');
  await expect(page.getByRole('button', { name: 'Unlock' })).toBeVisible();
});

test('the right password opens the dashboard in demo mode', async ({ page }) => {
  await signIn(page);
  await expect(page.getByText('Demo data')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Home' })).toHaveAttribute('aria-selected', 'true');
});

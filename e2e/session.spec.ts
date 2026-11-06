import { expect, test } from '@playwright/test';
import { cachedKeys, patchData, signIn } from './helpers.js';

test('changing the range asks the server for that many days', async ({ page }) => {
  await signIn(page);
  await page.getByRole('tab', { name: 'Recovery' }).click();
  const request = page.waitForRequest((r) => r.url().includes('/api/data?days=30'));
  await page.getByLabel('Chart range').selectOption('30');
  await request;
});

test('signing out clears the cached data and a reload stays signed out', async ({ page }) => {
  await signIn(page);
  expect(await cachedKeys(page)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
  expect(await cachedKeys(page)).toBe(0);
  await page.reload();
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
});

test('a failed refresh shows the saved copy with a Retry that returns focus to the tab', async ({ page }) => {
  await signIn(page);
  await page.route('**/api/data*', (route) => route.abort());
  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.getByText(/Showing data saved/)).toBeVisible();
  await page.unroute('**/api/data*');
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByText(/Showing data saved/)).toBeHidden();
  await expect(page.getByRole('tab', { name: 'Home' })).toBeFocused();
});

test('with nothing cached, a failed first load shows the error view and Try again recovers', async ({ page }) => {
  await signIn(page);
  await page.evaluate(() => localStorage.clear());
  await page.route('**/api/data*', (route) => route.abort());
  await page.reload();
  await expect(page.getByRole('heading', { name: "Can't reach the dashboard" })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeFocused();
  await page.unroute('**/api/data*');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('tab', { name: 'Home' })).toBeFocused();
});

test('a 401 mid-session shows login and unlocking returns to the same tab', async ({ page }) => {
  await signIn(page);
  await page.getByRole('tab', { name: 'Activity' }).click();
  await page.route('**/api/data*', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
  await page.getByRole('button', { name: 'Refresh' }).click();
  const password = page.getByLabel('Password', { exact: true });
  await expect(password).toBeVisible();
  await page.unroute('**/api/data*');
  await password.fill(process.env.E2E_PASSWORD ?? 'e2e-password');
  await page.getByRole('button', { name: 'Unlock' }).click();
  await expect(page.getByRole('tab', { name: 'Activity' })).toHaveAttribute('aria-selected', 'true');
});

test('records Garmin sent without a date are reported, not hidden', async ({ page }) => {
  await patchData(page, (json) => {
    json.skipped = { daily: 2, hrv: 0, sleep: 0, activities: 0 };
  });
  await signIn(page);
  await expect(page.getByText('2 Garmin records had no date and were left out.')).toBeVisible();
});

test('a Session row opens its page, and Back returns to the list', async ({ page }) => {
  await signIn(page);
  await page.getByRole('tab', { name: 'Activity' }).click();
  await page.locator('#load #sessions li a').first().click();
  await expect(page).toHaveURL(/#\/activity\/(running|strength)\/\d+$/);
  await expect(page.locator('#session-h')).toBeVisible();
  await expect(page.getByText('Average heart rate')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/#\/activity$/);
});

test('a Session under the wrong Sport redirects to its own, and an unknown id to the Sport page', async ({ page }) => {
  await signIn(page);
  await page.getByRole('tab', { name: 'Activity' }).click();
  await page.locator('#load #sessions li a').first().click();
  const [, sport, id] = /#\/activity\/(\w+)\/(\d+)$/.exec(page.url())!;
  const other = sport === 'running' ? 'strength' : 'running';
  await page.goto(`/#/activity/${other}/${id}`);
  await expect(page).toHaveURL(new RegExp(`#/activity/(${sport}/${id}|${other})$`));
  await page.goto(`/#/activity/${sport}/999999999`);
  await expect(page).toHaveURL(new RegExp(`#/activity/${sport}$`));
});

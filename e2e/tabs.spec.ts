import { expect, test, type Page } from '@playwright/test';
import { LEGACY, signIn, TAB_NAMES } from './helpers.js';

const tab = (page: Page, name: string) => page.getByRole('tab', { name });

test('clicking a tab selects it, updates the URL and the page title', async ({ page }) => {
  await signIn(page);
  for (const name of TAB_NAMES) {
    await tab(page, name).click();
    await expect(tab(page, name)).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(new RegExp(`#/?${name.toLowerCase()}$`));
    await expect(page).toHaveTitle(`${name} · Garmin Companion`);
  }
});

test('arrow keys, Home and End move the selection and the focus', async ({ page }) => {
  await signIn(page);
  await tab(page, 'Recovery').focus();
  const press = async (key: string, expected: string) => {
    await page.keyboard.press(key);
    await expect(tab(page, expected)).toBeFocused();
    await expect(tab(page, expected)).toHaveAttribute('aria-selected', 'true');
  };
  await press('ArrowRight', 'Training');
  await press('ArrowDown', 'Activity');
  await press('End', 'Insights');
  await press('ArrowRight', 'Recovery');
  await press('ArrowLeft', 'Insights');
  await press('ArrowUp', 'Activity');
  await press('Home', 'Recovery');
});

// A fresh page in the signed-in context loads straight onto the hash, like a bookmark would.
async function openFresh(page: Page, hash: string): Promise<Page> {
  const fresh = await page.context().newPage();
  await fresh.goto(`/${hash}`);
  return fresh;
}

test('a bookmark to #insights opens Insights', async ({ page }) => {
  await signIn(page);
  const fresh = await openFresh(page, '#insights');
  await expect(tab(fresh, 'Insights')).toHaveAttribute('aria-selected', 'true');
  await expect(fresh).toHaveTitle('Insights · Garmin Companion');
});

test('a router-style link to #/insights opens Insights', async ({ page }) => {
  test.skip(LEGACY, 'the old app only understands #insights');
  await signIn(page);
  const fresh = await openFresh(page, '#/insights');
  await expect(tab(fresh, 'Insights')).toHaveAttribute('aria-selected', 'true');
  await expect(fresh).toHaveTitle('Insights · Garmin Companion');
});

for (const hash of ['#/nope', '#nope', '']) {
  test(`an unknown hash "${hash}" lands on Recovery`, async ({ page }) => {
    await signIn(page);
    const fresh = await openFresh(page, hash);
    await expect(tab(fresh, 'Recovery')).toHaveAttribute('aria-selected', 'true');
    await expect(fresh).toHaveTitle('Recovery · Garmin Companion');
    await expect(fresh).toHaveURL(/#\/?recovery$/);
  });
}

test('the skip link moves focus to the main area without changing the tab', async ({ page }) => {
  await signIn(page);
  await page.reload(); // a plain load leaves focus alone, so the skip link is the first Tab stop
  await expect(tab(page, 'Recovery')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await expect(tab(page, 'Recovery')).toHaveAttribute('aria-selected', 'true');
});

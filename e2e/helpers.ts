import { expect, type Page } from '@playwright/test';

export const PASSWORD = process.env.E2E_PASSWORD ?? 'e2e-password';
export const LEGACY = !!process.env.E2E_LEGACY;
export const TAB_NAMES = ['Recovery', 'Training', 'Activity', 'Insights'] as const;

type DataJson = { days: Record<string, unknown>[]; skipped?: Record<string, number> };

export async function signIn(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Unlock' }).click();
  await expect(page.getByRole('tab', { name: 'Recovery' })).toBeVisible();
}

// Collects uncaught page errors and console errors. Failed network requests are ignored: the
// pre-login 401 and the requests the specs abort on purpose both log "Failed to load resource".
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(m.text());
  });
  return errors;
}

// Lets a spec edit the real /api/data payload on its way to the page. Install before signIn.
export async function patchData(page: Page, edit: (json: DataJson) => void): Promise<void> {
  await page.route('**/api/data*', async (route) => {
    const res = await route.fetch();
    if (res.status() !== 200) return route.fulfill({ response: res });
    const json = (await res.json()) as DataJson;
    edit(json);
    return route.fulfill({ response: res, json });
  });
}

export const cachedKeys = (page: Page): Promise<number> =>
  page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('gc:data:')).length);

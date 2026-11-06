import { expect, test, type Page } from '@playwright/test';
import { patchData, signIn, watchErrors } from './helpers.js';

test('the detail tabs keep their full heroes and cards', async ({ page }) => {
  await signIn(page);
  await page.getByRole('tab', { name: 'Recovery' }).click();
  await expect(page.locator('#today-load')).toBeAttached();
  await expect(page.getByText('How is this scored?')).toBeVisible();
  await expect(page.locator('#k-recovery .metric')).toHaveCount(4);
  await expect(page.locator('#k-recovery svg.spark').first()).toHaveAttribute('aria-label', /last 14 days/);
  await page.getByRole('tab', { name: 'Activity' }).click();
  await expect(page.locator('#load #sessions li')).toHaveCount(3);
  await expect(page.getByText('What is training load?')).toBeVisible();
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
  const tracks = () => page.locator('.home-grid').first().evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  expect(await tracks()).toBe(2);
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.locator('.side')).toBeVisible();
  expect(await tracks()).toBe(4);
  const grid = (await page.locator('.home-grid').first().boundingBox())!.width;
  const load = (await page.locator('[data-card="month"]').boundingBox())!.width;
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

const phone = { width: 375, height: 667 };
const rowTitles = (page: Page) => page.getByRole('dialog', { name: 'Customize Home' }).locator('.sheet-row .sheet-title').allTextContents();

test('the sheet reorders rows with the keyboard', async ({ page }) => {
  await page.setViewportSize(phone);
  await signIn(page);
  await page.getByRole('button', { name: 'Customize' }).click();
  await expect(page.getByRole('dialog', { name: 'Customize Home' })).toBeVisible();
  const dialog = page.getByRole('dialog', { name: 'Customize Home' });
  await page.getByRole('button', { name: 'Move Resting HR' }).focus();
  await page.keyboard.press('Space');
  await expect(dialog).toContainText('Picked up Resting HR, position 3 of 11');
  await page.waitForTimeout(100); // dnd-kit starts listening for arrow keys one tick after the lift; a person is never that fast
  await page.keyboard.press('ArrowUp');
  await expect(dialog).toContainText('Resting HR moved to position 2 of 11');
  await page.keyboard.press('Space');
  await expect(dialog).toContainText('Resting HR dropped at position 2 of 11');
  expect((await rowTitles(page)).slice(0, 3)).toEqual(['Readiness', 'Resting HR', 'HRV']);
  const order = () => page.locator('.home-grid [data-card]').evaluateAll((els) => els.map((el) => el.getAttribute('data-card')));
  expect((await order()).slice(0, 3)).toEqual(['readiness', 'resting-hr', 'hrv']);
  await page.reload();
  await expect(page.locator('.home-grid [data-card]').first()).toBeVisible();
  expect((await order()).slice(0, 3)).toEqual(['readiness', 'resting-hr', 'hrv']);
});

test('Escape during a drag cancels the drag, not the sheet', async ({ page }) => {
  await page.setViewportSize(phone);
  await signIn(page);
  const opener = page.getByRole('button', { name: 'Customize' });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'Customize Home' });
  await page.getByRole('button', { name: 'Move Sleep' }).focus();
  await page.keyboard.press('Space');
  await expect(dialog).toContainText('Picked up Sleep, position 4 of 11');
  await page.waitForTimeout(100); // as above
  await page.keyboard.press('ArrowDown');
  await expect(dialog).toContainText('Sleep moved to position 5 of 11');
  await page.keyboard.press('Escape');
  await expect(dialog).toContainText('Moving Sleep cancelled');
  await expect(dialog).toBeVisible();
  expect((await rowTitles(page))[3]).toBe('Sleep');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test('holding a row at the sheet edge does not make the sheet grow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 500 });
  await signIn(page);
  await page.getByRole('button', { name: 'Customize' }).click();
  const sheet = page.locator('dialog.sheet');
  const height = () => sheet.evaluate((el) => el.scrollHeight);
  const before = await height();
  const handle = (await page.getByRole('button', { name: 'Move HRV' }).boundingBox())!;
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + 60, { steps: 6 });
  await page.mouse.move(handle.x + handle.width / 2, 495, { steps: 6 });
  await page.waitForTimeout(1200);
  expect(await height()).toBeLessThanOrEqual(before + 2);
  await page.mouse.up();
});

test('a saved layout is there on first paint and unknown ids are ignored', async ({ page }) => {
  const errors = watchErrors(page);
  await page.addInitScript(() => {
    localStorage.setItem('home-layout', '{"cards":["gone","stress","hrv"],"updatedAt":1}');
    (window as unknown as { __sawReadiness: boolean }).__sawReadiness = false;
    new MutationObserver(() => {
      if (document.querySelector('[data-card="readiness"]')) (window as unknown as { __sawReadiness: boolean }).__sawReadiness = true;
    }).observe(document, { subtree: true, childList: true });
  });
  await signIn(page);
  await expect(page.locator('.home-grid [data-card]').first()).toBeVisible();
  expect(await page.locator('.home-grid [data-card]').evaluateAll((els) => els.map((el) => el.getAttribute('data-card')))).toEqual(['stress', 'hrv']);
  expect(await page.evaluate(() => (window as unknown as { __sawReadiness: boolean }).__sawReadiness)).toBe(false);
  expect(errors).toEqual([]);
});

const order = (page: Page) => page.locator('.home-grid [data-card]').evaluateAll((els) => els.map((el) => el.getAttribute('data-card')));
const DEFAULT = ['readiness', 'hrv', 'resting-hr', 'sleep', 'body-battery', 'month', 'sessions', 'week', 'steps', 'intensity', 'stress'];

test('hide, show and reset from the sheet survive a reload', async ({ page }) => {
  await signIn(page);
  const opener = page.getByRole('button', { name: 'Customize' });
  const dialog = page.getByRole('dialog', { name: 'Customize Home' });
  await opener.click();
  const hrv = dialog.getByRole('switch', { name: 'Show HRV' });
  await expect(hrv).toBeChecked();
  await hrv.click();
  await expect(hrv).not.toBeChecked();
  await expect(hrv).toBeFocused();
  await expect(dialog.locator('.sheet-hidden .sheet-title')).toHaveText(['HRV']);
  await expect(page.locator('[data-card="hrv"]')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.home-grid [data-card]').first()).toBeVisible();
  await opener.click();
  await expect(dialog.getByRole('switch', { name: 'Show HRV' })).not.toBeChecked();
  await dialog.getByRole('switch', { name: 'Show HRV' }).click();
  await expect(dialog.getByRole('switch', { name: 'Show HRV' })).toBeChecked();
  await expect(dialog.getByRole('switch', { name: 'Show HRV' })).toBeFocused();
  expect((await order(page)).at(-1)).toBe('hrv');
  await dialog.getByRole('button', { name: 'Reset to default' }).click();
  expect(await order(page)).toEqual(DEFAULT);
  await page.reload();
  await expect(page.locator('.home-grid [data-card]').first()).toBeVisible();
  expect(await order(page)).toEqual(DEFAULT);
  await opener.click();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test('hiding every card leaves a prompt', async ({ page }) => {
  await signIn(page);
  await page.getByRole('button', { name: 'Customize' }).click();
  const dialog = page.getByRole('dialog', { name: 'Customize Home' });
  // A hidden row moves to the other list, so always take the first one still on.
  for (let i = 0; i < DEFAULT.length; i++) await dialog.getByRole('switch', { checked: true }).first().click();
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(page.locator('.home-empty')).toContainText(/Use Customize/);
  await expect(page.locator('.home-grid [data-card]')).toHaveCount(0);
});

// Stands in for /api/layout. `get` answers GET; PUTs are recorded and echoed back as stored.
async function fakeServer(page: Page, get: () => object | Promise<{ status: number } | object>) {
  const puts: { cards: string[]; updatedAt: number }[] = [];
  await page.route('**/api/layout', async (route) => {
    const method = route.request().method();
    if (method === 'PUT') {
      const body = route.request().postDataJSON() as { cards: string[]; updatedAt: number };
      puts.push(body);
      return route.fulfill({ json: { synced: true, layout: body } });
    }
    const answer = await get();
    if ('status' in answer) return route.fulfill({ status: answer.status, json: { error: 'unauthorized' } });
    return route.fulfill({ json: answer });
  });
  return puts;
}

test('a newer remote layout is adopted on entering Home', async ({ page }) => {
  await fakeServer(page, () => ({ synced: true, layout: { cards: ['steps', 'hrv'], updatedAt: Date.now() } }));
  await signIn(page);
  await expect.poll(() => order(page)).toEqual(['steps', 'hrv']);
  expect(await page.evaluate(() => localStorage.getItem('home-layout'))).toContain('"cards":["steps","hrv"]');
});

test('a newer local layout is sent', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('home-layout', '{"cards":["hrv"],"updatedAt":5000}'));
  const puts = await fakeServer(page, () => ({ synced: true, layout: { cards: ['steps'], updatedAt: 1000 } }));
  await signIn(page);
  await expect.poll(() => puts).toEqual([{ cards: ['hrv'], updatedAt: 5000 }]);
  expect(await order(page)).toEqual(['hrv']);
});

test('a change is sent after a pause', async ({ page }) => {
  const puts = await fakeServer(page, () => ({ synced: false }));
  await signIn(page);
  await page.getByRole('button', { name: 'Customize' }).click();
  await page.getByRole('switch', { name: 'Show HRV' }).click();
  await expect.poll(() => puts.length, { timeout: 2500 }).toBe(1);
  expect(puts[0].cards).not.toContain('hrv');
  expect(puts[0].updatedAt).toBeGreaterThan(0);
});

test('a remote layout that arrives while the sheet is open waits', async ({ page }) => {
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => (release = resolve));
  await fakeServer(page, async () => {
    await held;
    return { synced: true, layout: { cards: ['steps'], updatedAt: Date.now() + 1000 } };
  });
  await signIn(page);
  await page.getByRole('button', { name: 'Customize' }).click();
  const answered = page.waitForResponse('**/api/layout');
  release();
  await answered;
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
  expect(await order(page)).toHaveLength(11);
  await expect(page.getByRole('dialog', { name: 'Customize Home' }).locator('.sheet-shown .sheet-row')).toHaveCount(11);
});

test('a 401 from the layout calls is ignored', async ({ page }) => {
  const sent: string[] = [];
  page.on('request', (r) => r.url().endsWith('/api/layout') && r.method() === 'PUT' && sent.push('put'));
  await page.route('**/api/layout', (route) => route.fulfill({ status: 401, json: { error: 'unauthorized' } }));
  await signIn(page);
  await page.getByRole('button', { name: 'Customize' }).click();
  await page.getByRole('switch', { name: 'Show HRV' }).click();
  await expect.poll(() => sent.length, { timeout: 2500 }).toBe(1);
  await expect(page.getByRole('tab', { name: 'Home' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByLabel('Password', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('switch', { name: 'Show HRV' })).not.toBeChecked();
});

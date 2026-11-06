import { expect, test } from '@playwright/test';
import { LEGACY, signIn, TAB_NAMES, watchErrors } from './helpers.js';

test.skip(LEGACY, 'the old dev server sends no CSP headers');

type WithViolations = { __csp: string[] };

test('the production build runs without CSP violations', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as WithViolations).__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => (window as unknown as WithViolations).__csp.push(e.violatedDirective));
  });
  const errors = watchErrors(page);
  await signIn(page);
  for (const name of TAB_NAMES) {
    await page.getByRole('tab', { name }).click();
    await expect(page.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'true');
  }
  // dnd-kit and the modal dialog must also run under the policy.
  await page.getByRole('tab', { name: 'Home' }).click();
  await page.getByRole('button', { name: 'Customize' }).click();
  const dialog = page.getByRole('dialog', { name: 'Customize Home' });
  await page.getByRole('button', { name: 'Move HRV' }).focus();
  await page.keyboard.press('Space');
  await expect(dialog).toContainText('Picked up HRV');
  await page.waitForTimeout(100); // dnd-kit starts listening for arrow keys one tick after the lift
  await page.keyboard.press('ArrowDown');
  await expect(dialog).toContainText('HRV moved to position 3 of 12');
  await page.keyboard.press('Space');
  await expect(dialog).toContainText('HRV dropped at position 3 of 12');
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => (window as unknown as WithViolations).__csp)).toEqual([]);
  expect(errors).toEqual([]);
});

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
  expect(await page.evaluate(() => (window as unknown as WithViolations).__csp)).toEqual([]);
  expect(errors).toEqual([]);
});

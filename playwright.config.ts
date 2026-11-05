import { defineConfig, devices } from '@playwright/test';

// E2E_BASE_URL points the suite at an already-running app (no web server is started).
// E2E_LEGACY=1 marks that app as the pre-React one, so specs that only the new build can satisfy are skipped.
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:4173';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run build && npm run preview -- --port 4173 --strictPort',
        url: baseURL,
        env: { DASHBOARD_PASSWORD: 'e2e-password', SESSION_SECRET: 'e2e-secret-0123456789', GARMIN_API_KEY: '', DATABASE_URL: '' },
        reuseExistingServer: false,
        timeout: 120_000,
      },
});

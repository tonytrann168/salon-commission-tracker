import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

/**
 * Story 029: the end-to-end suite (npm run e2e). Phone size (320 × 568), headless, against `vite preview` of the e2e
 * build. Every /api call and every Supabase call is answered by the tests, so it needs no keys and no network.
 * In the cloud container the preinstalled Chromium is used; elsewhere, `npx playwright install chromium` once.
 */
const preinstalled = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium';
const PORT = 5190;

export default defineConfig({
  testDir: 'tests/integration',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 320, height: 568 },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
    // The service worker would hide /api requests from the mocks; the offline test turns it on.
    serviceWorkers: 'block',
    trace: 'off',
    launchOptions: { args: ['--use-angle=swiftshader'], ...(existsSync(preinstalled) ? { executablePath: preinstalled } : {}) },
  },
  webServer: {
    command: `node scripts/e2e-build.mjs && npx vite preview --outDir dist-e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});

import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run against the dev server. Each app's tests open the app's
// own page (/token-maker/ or /frame-maker/) on the sizes that app was built
// for; e2e/shell tests the main page with both apps in it.
// CHROMIUM_PATH lets a pre-installed browser be used instead of Playwright's own.
// Every test starts with Frame Maker's welcome card already seen, except the
// ones that clear it to test the card.
const desktop = { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } };

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    storageState: { cookies: [], origins: [{ origin: 'http://localhost:5173', localStorage: [{ name: 'frame-studio:welcomed', value: '1' }] }] },
    trace: 'retain-on-failure',
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || undefined },
  },
  projects: [
    { name: 'shell', testDir: './e2e/shell', use: desktop },
    { name: 'tm-desktop', testDir: './e2e/token-maker', use: desktop },
    { name: 'tm-tablet', testDir: './e2e/token-maker', use: { ...devices['Desktop Chrome'], viewport: { width: 900, height: 1100 }, hasTouch: true } },
    { name: 'tm-phone', testDir: './e2e/token-maker', use: { ...devices['Pixel 7'] } },
    { name: 'fm-desktop', testDir: './e2e/frame-maker', testIgnore: /\.phone\.spec\.ts$/, use: desktop },
    { name: 'fm-laptop', testDir: './e2e/frame-maker', testIgnore: /\.phone\.spec\.ts$/, use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
    { name: 'fm-phone', testDir: './e2e/frame-maker', testMatch: /\.phone\.spec\.ts$/, use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});

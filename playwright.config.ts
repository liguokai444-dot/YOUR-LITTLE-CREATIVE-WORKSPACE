import { defineConfig } from '@playwright/test';

const externalURL = process.env.STUDIO_TEST_URL;

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  workers: 1,
  timeout: 60000,
  reporter: 'list',
  use: {
    baseURL: externalURL || 'http://127.0.0.1:5178',
    viewport: { width: 1440, height: 900 },
    headless: true,
    launchOptions: { env: process.platform === 'linux' ? { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } : process.env },
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
  },
  webServer: externalURL ? undefined : {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5178',
    reuseExistingServer: true,
    timeout: 120000,
  },
});

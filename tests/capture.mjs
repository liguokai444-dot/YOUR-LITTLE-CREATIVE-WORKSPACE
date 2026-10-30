import { chromium } from '@playwright/test';
import fs from 'node:fs';

const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
  env: process.platform === 'linux' ? { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } : process.env,
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(process.env.STUDIO_TEST_URL || 'http://127.0.0.1:4178', { waitUntil: 'networkidle' });
  await page.frameLocator('iframe[title="HTML 渲染预览"]').locator('h1').waitFor();
  await page.waitForTimeout(800);
  fs.mkdirSync('docs', { recursive: true });
  await page.screenshot({ path: 'docs/screenshot.png', fullPage: true });
  console.log('Saved docs/screenshot.png');
} finally { await browser.close(); }

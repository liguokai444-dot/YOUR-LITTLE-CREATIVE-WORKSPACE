import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function edit(page: Page, code: string) {
  const editor = page.getByRole('textbox', { name: 'HTML 代码编辑器', exact: true });
  await editor.click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText(code);
}

test('paste HTML, render scripts, and keep the parent isolated', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await expect(page).toHaveTitle(/HTML Studio/);
  await expect(page.getByRole('textbox', { name: 'HTML 代码编辑器', exact: true })).toBeVisible();
  const frame = page.frameLocator('iframe[title="HTML 渲染预览"]');
  await expect(frame.locator('h1')).toContainText('FORM');
  const code = '<!doctype html><html><body><h1>粘贴成功</h1><button id="test-button">点我</button><script>document.querySelector("#test-button").onclick=()=>{document.querySelector("h1").textContent="交互成功"; console.log("button clicked")}; try {parent.localStorage.getItem("test")} catch {console.log("parent storage is isolated")}</script></body></html>';
  await page.evaluate(text => navigator.clipboard.writeText(text), code);
  await page.getByRole('button', { name: '粘贴 HTML', exact: true }).click();
  await expect(frame.locator('h1')).toHaveText('粘贴成功');
  await frame.getByRole('button', { name: '点我' }).click();
  await expect(frame.locator('h1')).toHaveText('交互成功');
  const sandbox = await page.locator('iframe[title="HTML 渲染预览"]').getAttribute('sandbox');
  expect(sandbox).toBe('allow-scripts');
  await page.getByRole('button', { name: '控制台', exact: true }).click();
  await expect(page.locator('.console-entries')).toContainText('parent storage is isolated');
  await expect(page.locator('.console-entries')).toContainText('button clicked');
});

test('auto preview, manual execution, device widths, and script controls', async ({ page }) => {
  await page.goto('/');
  const frame = page.frameLocator('iframe[title="HTML 渲染预览"]');
  await edit(page, '<h1>自动更新</h1>');
  await expect(frame.locator('h1')).toHaveText('自动更新');
  await page.getByRole('checkbox', { name: '自动更新预览' }).uncheck();
  await edit(page, '<h1>手动更新</h1>');
  await page.waitForTimeout(500);
  await expect(frame.locator('h1')).toHaveText('自动更新');
  await page.getByRole('button', { name: /运行代码/ }).click();
  await expect(frame.locator('h1')).toHaveText('手动更新');
  await page.getByRole('button', { name: '手机视图', exact: true }).click();
  await expect(page.locator('iframe[title="HTML 渲染预览"]')).toHaveCSS('width', '390px');
  await page.getByRole('button', { name: '平板视图', exact: true }).click();
  await expect(page.locator('iframe[title="HTML 渲染预览"]')).toHaveCSS('width', '768px');
  await page.getByRole('button', { name: '桌面视图', exact: true }).click();
  await page.locator('.preview-status button').click();
  await expect(page.locator('iframe[title="HTML 渲染预览"]')).toHaveAttribute('sandbox', '');
  await page.getByRole('button', { name: '全屏预览', exact: true }).click();
  await expect(page.locator('.studio-app')).toHaveClass(/preview-focused/);
  await page.keyboard.press('Escape');
  await expect(page.locator('.studio-app')).not.toHaveClass(/preview-focused/);
});

test('format, import, export, and restore a local draft', async ({ page }) => {
  await page.goto('/');
  await edit(page, '<html><head><style>body{color:red;background:white}</style></head><body><h1>你好，格式化。</h1></body></html>');
  await page.getByRole('button', { name: '格式化', exact: true }).click();
  await expect(page.locator('.studio-toast')).toContainText('整整齐齐');
  await expect.poll(() => page.locator('.cm-line').count()).toBeGreaterThan(2);
  await page.locator('input[type=file]').setInputFiles({ name: '我的页面.html', mimeType: 'text/html', buffer: Buffer.from('<!doctype html><html><body><h1>导入成功</h1></body></html>') });
  await page.getByRole('dialog').getByRole('button', { name: '打开文件', exact: true }).click();
  await expect(page.frameLocator('iframe[title="HTML 渲染预览"]').locator('h1')).toHaveText('导入成功');
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出 HTML', exact: true }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe('我的页面.html');
  const path = await download.path();
  const content = await readFile(path!, 'utf8');
  expect(content).toContain('导入成功');
  expect(content).not.toContain('html-studio-preview');
  await expect(page.locator('.save-state')).toContainText('所有更改');
  await page.reload();
  await expect(page.frameLocator('iframe[title="HTML 渲染预览"]').locator('h1')).toHaveText('导入成功');
  await expect(page.getByRole('textbox', { name: '文件名' })).toHaveValue('我的页面.html');
});

test('templates, confirmation, theme, resizer, and sandboxed popout', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '切换深色主题' }).click();
  await expect(page.locator('.studio-app')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: '切换浅色主题' }).click();
  const separator = page.getByRole('separator', { name: '调整编辑器和预览宽度' });
  const previous = await separator.getAttribute('aria-valuenow');
  await separator.focus();
  await page.keyboard.press('ArrowRight');
  expect(await separator.getAttribute('aria-valuenow')).not.toBe(previous);
  await page.getByRole('button', { name: '示例库', exact: true }).click();
  await page.getByRole('button', { name: /一点点小交互/ }).click();
  const frame = page.frameLocator('iframe[title="HTML 渲染预览"]');
  await expect(frame.locator('#count')).toHaveText('0');
  await frame.getByRole('button', { name: '增加' }).click();
  await expect(frame.locator('#count')).toHaveText('1');
  await page.getByRole('button', { name: '桌面视图', exact: true }).click();
  await page.getByRole('button', { name: '全屏预览', exact: true }).click();
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: '新窗口预览', exact: true }).click();
  const popup = await popupPromise;
  await expect(popup.locator('iframe')).toHaveAttribute('sandbox', 'allow-scripts');
  expect(await popup.evaluate(() => window.opener)).toBeNull();
  await popup.close();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '更多编辑操作' }).click();
  await page.getByRole('button', { name: '清空编辑器', exact: true }).click();
  await page.getByRole('button', { name: '清空代码', exact: true }).click();
  await expect(page.locator('.empty-preview')).toBeVisible();
});

test('the mobile workbench stays usable without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.locator('.mobile-pane-tabs').getByRole('button', { name: '代码', exact: true }).click();
  await edit(page, '<h1>手机上的灵感</h1>');
  await page.locator('.mobile-pane-tabs').getByRole('button', { name: '预览', exact: true }).click();
  await expect(page.frameLocator('iframe[title="HTML 渲染预览"]').locator('h1')).toHaveText('手机上的灵感');
  await page.getByRole('button', { name: '示例模板', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '从一个小灵感开始。' })).toBeVisible();
  await page.getByRole('button', { name: '关闭示例库' }).click();
});

test('mobile HTTP remains usable without secure-context clipboard or randomUUID', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true });
  await context.addInitScript(() => {
    Object.defineProperty(Crypto.prototype, 'randomUUID', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
  });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.frameLocator('iframe[title="HTML 渲染预览"]').locator('h1')).toContainText('FORM');
  await page.getByRole('button', { name: '粘贴 HTML', exact: true }).click();
  await expect(page.locator('.studio-toast')).toContainText('长按');
  await expect(page.getByRole('textbox', { name: 'HTML 代码编辑器', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
  await context.close();
});

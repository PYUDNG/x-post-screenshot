import { statSync } from 'node:fs';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__xpsTest?.ready === true);
});

test('captures images, video frames and restores page state', async ({ page }) => {
  const result = await page.evaluate(() => window.__xpsTest.capture());
  expect(result.width).toBeGreaterThan(0);
  expect(result.height).toBeGreaterThan(0);
  expect(result.bluePixels).toBeGreaterThan(100);
  expect(result.redPixels).toBeGreaterThan(50);
  expect(result.videoRestored).toBe(true);
  expect(result.overlayCount).toBe(0);
  expect(result.scrollRestored).toBe(true);
});

test('injects the save item into a post menu', async ({ page }) => {
  await page.evaluate(() => {
    window.__xpsTest.menuClicked = false;
  });
  await page.locator('#caret').click();
  const menuItem = page.getByRole('menuitem', { name: '保存帖子截图' });
  await expect(menuItem).toBeVisible();
  await menuItem.click();
  expect(await page.evaluate(() => window.__xpsTest.menuClicked)).toBe(true);
});

test('downloads through a Blob URL without an empty file', async ({ page }) => {
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#download-test').click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(download.suggestedFilename()).toBe('xps-test.txt');
  expect(path).toBeTruthy();
  expect(statSync(path!).size).toBeGreaterThan(0);
});

test('uses an isolated closed shadow root for the toast', async ({ page }) => {
  const result = await page.evaluate(() => window.__xpsTest.toast());
  expect(result.hostFound).toBe(true);
  expect(result.closedShadow).toBe(true);
  expect(result.textLeaked).toBe(false);
});

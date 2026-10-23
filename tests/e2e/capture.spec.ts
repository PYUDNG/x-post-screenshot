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

test('injects the save item into a post menu and closes it after activation', async ({ page }) => {
  await page.evaluate(() => {
    window.__xpsTest.menuClicked = false;
  });
  await page.locator('#caret').click();
  const menuItem = page.getByRole('menuitem', { name: '保存帖子截图' });
  await expect(menuItem).toBeVisible();
  await menuItem.click();
  expect(await page.evaluate(() => window.__xpsTest.menuClicked)).toBe(true);
  await expect(page.locator('#menu-host [role="menu"]')).toHaveCount(0);
});

test('aligns the injected icon and text with the native menu item', async ({ page }) => {
  await page.locator('#caret').click();
  await page.getByRole('menuitem', { name: '保存帖子截图' }).waitFor();
  const alignment = await page.evaluate(() => {
    const items = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    const nativeItem = items.find((item) => item.innerText.includes('Embed post'));
    const ourItem = items.find((item) => item.innerText.includes('保存帖子截图'));
    if (!nativeItem || !ourItem) {
      throw new Error('Menu items are missing');
    }
    const nativeText = nativeItem.querySelector<HTMLElement>('.menu-text')!;
    const ourText = ourItem.querySelector<HTMLElement>('.menu-text')!;
    const nativeIcon = nativeItem.querySelector<SVGElement>('.menu-icon svg')!;
    const ourIcon = ourItem.querySelector<SVGElement>('.menu-icon svg')!;
    return {
      nativeTextLeft: nativeText.getBoundingClientRect().left,
      ourTextLeft: ourText.getBoundingClientRect().left,
      nativeIconWidth: nativeIcon.getBoundingClientRect().width,
      ourIconWidth: ourIcon.getBoundingClientRect().width,
    };
  });
  expect(Math.abs(alignment.ourTextLeft - alignment.nativeTextLeft)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(alignment.ourIconWidth - alignment.nativeIconWidth)).toBeLessThanOrEqual(0.5);
});

test('matches native hover feedback and restores it on leave', async ({ page }) => {
  await page.locator('#caret').click();
  const ourItem = page.getByRole('menuitem', { name: '保存帖子截图' });
  const nativeItem = page.getByRole('menuitem', { name: 'Embed post' });
  await ourItem.hover();
  const ourBackground = await ourItem.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  await nativeItem.hover();
  const nativeBackground = await nativeItem.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  expect(ourBackground).toBe('rgba(0, 0, 0, 0.03)');
  expect(ourBackground).toBe(nativeBackground);
  await page.mouse.move(0, 0);
  await expect
    .poll(() => ourItem.evaluate((element) => getComputedStyle(element).backgroundColor))
    .toBe('rgba(0, 0, 0, 0)');
});

test('excludes the detail footer row and restores it afterwards', async ({ page }) => {
  const result = await page.evaluate(() => window.__xpsTest.detailCapture());
  expect(result.captureHeight).toBeLessThan(result.beforeHeight);
  expect(result.footerSpace).toBeGreaterThan(0);
  expect(Math.abs(result.beforeHeight - result.captureHeight - result.footerSpace)).toBeLessThan(2);
  expect(result.footerRestored).toBe(true);
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

test('uses an isolated closed shadow root with state-specific toast icons', async ({ page }) => {
  for (const [kind, icon] of [
    ['progress', 'spinner'],
    ['success', 'success'],
    ['partial', 'partial'],
    ['error', 'error'],
  ] as const) {
    const result = await page.evaluate((kind) => window.__xpsTest.toast(kind), kind);
    expect(result.hostFound).toBe(true);
    expect(result.closedShadow).toBe(true);
    expect(result.textLeaked).toBe(false);
    expect(result.kind).toBe(kind);
    expect(result.icon).toBe(icon);
    expect(result.text).toBe(`${kind}-test`);
  }
});

import { captureArticle } from '../../../src/platform/capture';
import { buildCaptureTargetFromArticle, installMenuIntegration } from '../../../src/platform/menu';
import { setResourceTransportForTesting } from '../../../src/platform/resource-fetch';
import { hideToast, showToast } from '../../../src/platform/toast';
import { getPageTheme } from '../../../src/platform/theme';

interface TestApi {
  ready: boolean;
  menuClicked: boolean;
  capture: () => Promise<{
    width: number;
    height: number;
    bluePixels: number;
    redPixels: number;
    videoRestored: boolean;
    overlayCount: number;
    scrollRestored: boolean;
  }>;
  toast: () => { hostFound: boolean; closedShadow: boolean; textLeaked: boolean };
  theme: () => ReturnType<typeof getPageTheme>;
}

declare global {
  interface Window {
    __xpsTest: TestApi;
  }
}

setResourceTransportForTesting(async (request) => {
  const response = await fetch(request.url);
  return {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    body: await response.arrayBuffer(),
    finalUrl: response.url,
  };
}, true);

installMenuIntegration(() => {
  window.__xpsTest.menuClicked = true;
});

const caret = document.querySelector<HTMLButtonElement>('#caret');
caret?.addEventListener('click', () => {
  const menuHost = document.querySelector<HTMLElement>('#menu-host');
  if (!menuHost || menuHost.querySelector('[role="menu"]')) {
    return;
  }
  const menu = document.createElement('div');
  menu.setAttribute('role', 'menu');
  menu.style.cssText =
    'position:fixed;top:100px;left:100px;width:260px;background:#fff;padding:4px;';
  const item = document.createElement('div');
  item.setAttribute('role', 'menuitem');
  item.textContent = 'Embed post';
  item.style.cssText = 'padding:10px;';
  menu.append(item);
  menuHost.append(menu);
});

async function waitForImage(image: HTMLImageElement): Promise<void> {
  if (image.complete && image.naturalWidth > 0) {
    return;
  }
  await new Promise<void>((resolve) => {
    image.addEventListener('load', () => resolve(), { once: true });
    image.addEventListener('error', () => resolve(), { once: true });
  });
}

async function prepareVideo(video: HTMLVideoElement): Promise<void> {
  video.muted = true;
  try {
    await video.play();
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      video.currentTime = 0.4;
      await new Promise<void>((resolve) => {
        const done = () => {
          video.removeEventListener('seeked', done);
          resolve();
        };
        video.addEventListener('seeked', done, { once: true });
        setTimeout(done, 2_000);
      });
    }
    video.pause();
  } catch {
    // The still frame path is still exercised when playback is unavailable.
  }
}

async function pngPixels(blob: Blob): Promise<{
  width: number;
  height: number;
  bluePixels: number;
  redPixels: number;
}> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not create a canvas context');
  }
  context.drawImage(bitmap, 0, 0);
  const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
  let bluePixels = 0;
  let redPixels = 0;
  for (let index = 0; index < data.length; index += 4) {
    const red = data[index] ?? 0;
    const green = data[index + 1] ?? 0;
    const blue = data[index + 2] ?? 0;
    if (blue > 130 && blue > red + 35 && blue > green + 20) {
      bluePixels += 1;
    }
    if (red > 150 && red > green + 60 && red > blue + 60) {
      redPixels += 1;
    }
  }
  return { width, height, bluePixels, redPixels };
}

window.__xpsTest = {
  ready: false,
  menuClicked: false,
  capture: async () => {
    const article = document.querySelector<HTMLElement>('#post');
    const image = document.querySelector<HTMLImageElement>('#photo');
    const video = document.querySelector<HTMLVideoElement>('#video');
    const carousel = document.querySelector<HTMLElement>('#carousel');
    if (!article || !image || !video || !carousel) {
      throw new Error('Fixture is incomplete');
    }

    await waitForImage(image);
    await prepareVideo(video);
    carousel.scrollLeft = 120;
    const scrollBefore = carousel.scrollLeft;
    const result = await captureArticle(buildCaptureTargetFromArticle(article), {
      pixelRatio: 1,
      timeoutMs: 30_000,
    });
    const pixels = await pngPixels(result.blob);
    return {
      ...pixels,
      videoRestored: video.style.visibility !== 'hidden',
      overlayCount: article.querySelectorAll('img[src^="data:image/png"]').length,
      scrollRestored: Math.abs(carousel.scrollLeft - scrollBefore) < 1,
    };
  },
  toast: () => {
    showToast('progress', 'shadow-test', 0);
    const host = document.body.lastElementChild as HTMLElement | null;
    const result = {
      hostFound: Boolean(host),
      closedShadow: host?.shadowRoot === null,
      textLeaked: document.body.innerText.includes('shadow-test'),
    };
    hideToast();
    return result;
  },
  theme: () => getPageTheme(),
};

window.__xpsTest.ready = true;

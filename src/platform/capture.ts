import { toBlob } from 'html-to-image';
import type { CaptureOptions, CaptureResult, CaptureTarget } from '../types';
import { XpsError } from './errors';
import { logger } from './logging';
import {
  nativeClosest,
  nativeGetComputedStyle,
  nativeSetTimeout,
  nativeClearTimeout,
  nativeToDataURL,
  nativeQuerySelectorAll,
} from './native';
import { makeScreenshotFilename } from './menu';
import { getCaptureBackground } from './theme';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const MAX_CANVAS_DIMENSION = 16_000;
const IMAGE_PLACEHOLDER =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="#8a8f98" opacity=".35"/></svg>',
  );

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, stage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = nativeSetTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new XpsError('timeout', stage, 'The operation timed out'));
    }, timeoutMs);

    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        nativeClearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        if (settled) return;
        settled = true;
        nativeClearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function waitForFonts(): Promise<void> {
  const fonts = document.fonts;
  if (!fonts?.ready) {
    return;
  }
  await withTimeout(
    Promise.resolve(fonts.ready).then(
      () => undefined,
      () => undefined,
    ),
    1_000,
    'fonts',
  ).catch(() => undefined);
}

function freezeScrollableContainers(article: HTMLElement, restore: Array<() => void>): void {
  const elements = Array.from(article.querySelectorAll<HTMLElement>('*'));
  for (const element of elements) {
    const style = nativeGetComputedStyle(element);
    if (
      (style.overflowX !== 'auto' && style.overflowX !== 'scroll') ||
      element.scrollWidth <= element.clientWidth + 8 ||
      element.scrollLeft === 0
    ) {
      continue;
    }

    const originalScroll = element.scrollLeft;
    const children = Array.from(element.children).filter(
      (child): child is HTMLElement => child.nodeType === 1,
    );
    const originalTransforms = children.map((child) => ({
      child,
      transform: child.style.transform,
    }));

    for (const child of children) {
      const computed = nativeGetComputedStyle(child).transform;
      const extra = child.style.transform || (computed !== 'none' ? computed : '');
      child.style.transform = `translateX(${-originalScroll}px)${extra ? ` ${extra}` : ''}`;
    }
    element.scrollLeft = 0;

    restore.push(() => {
      for (const item of originalTransforms) {
        item.child.style.transform = item.transform;
      }
      try {
        element.scrollLeft = originalScroll;
      } catch {
        // The node may have been replaced by the SPA.
      }
    });
  }
}

function inlineSvgUseReferences(article: HTMLElement, restore: Array<() => void>): void {
  const uses = Array.from(article.querySelectorAll<SVGUseElement>('svg use'));
  for (const use of uses) {
    const href = use.getAttribute('href') ?? use.getAttribute('xlink:href') ?? '';
    if (!href.startsWith('#')) {
      continue;
    }
    const target = document.getElementById(href.slice(1));
    if (!target) {
      continue;
    }

    const replacement = document.createElementNS(SVG_NAMESPACE, 'g');
    for (const attribute of Array.from(use.attributes)) {
      if (attribute.name !== 'href' && attribute.name !== 'xlink:href') {
        replacement.setAttribute(attribute.name, attribute.value);
      }
    }
    for (const attribute of Array.from(target.attributes)) {
      if (attribute.name !== 'viewBox' && attribute.name !== 'id') {
        replacement.setAttribute(attribute.name, attribute.value);
      }
    }
    const viewBox = target.getAttribute('viewBox');
    if (viewBox && !use.ownerSVGElement?.getAttribute('viewBox')) {
      use.ownerSVGElement?.setAttribute('viewBox', viewBox);
    }
    for (const child of Array.from(target.childNodes)) {
      replacement.append(child.cloneNode(true));
    }

    const parent = use.parentNode;
    if (!parent) {
      continue;
    }
    parent.replaceChild(replacement, use);
    restore.push(() => {
      try {
        replacement.replaceWith(use);
      } catch {
        // The cloned subtree may already be detached.
      }
    });
  }
}

function videoFrame(video: HTMLVideoElement): string | null {
  try {
    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (!context) {
        return null;
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      return nativeToDataURL(canvas);
    }
  } catch {
    return null;
  }
  return null;
}

const QUOTE_PATH_PATTERN = /\/status\/(\d+)\/(?:_engagements\/)?quotes(?:[?#]|$)/;

export function findStatusQuoteRow(
  article: HTMLElement,
  statusId: string | null,
): HTMLElement | null {
  const quoteLinks = nativeQuerySelectorAll<HTMLAnchorElement>(article, 'a[href*="/quotes"]');
  const quoteLink = quoteLinks.find((link) => {
    if (nativeClosest(link, 'article') !== article) {
      return false;
    }
    const match = (link.getAttribute('href') ?? '').match(QUOTE_PATH_PATTERN);
    return Boolean(match?.[1]) && (!statusId || match?.[1] === statusId);
  });
  if (!quoteLink) {
    return null;
  }

  let candidate = quoteLink.parentElement;
  while (candidate && candidate !== article) {
    const hasSortTrigger = nativeQuerySelectorAll(
      candidate,
      '[aria-haspopup="menu"], [aria-haspopup="listbox"]',
    ).length;
    const hasEngagementAction = nativeQuerySelectorAll(
      candidate,
      '[data-engagement-action]',
    ).length;
    if (hasSortTrigger > 0 && hasEngagementAction === 0) {
      return candidate;
    }
    candidate = candidate.parentElement;
  }
  return null;
}

function hideDetailQuoteRow(
  article: HTMLElement,
  statusId: string | null,
  restore: Array<() => void>,
): void {
  const row = findStatusQuoteRow(article, statusId);
  if (!row) {
    return;
  }

  const display = row.style.getPropertyValue('display');
  const priority = row.style.getPropertyPriority('display');
  row.style.setProperty('display', 'none', 'important');
  restore.push(() => {
    if (display) {
      row.style.setProperty('display', display, priority);
    } else {
      row.style.removeProperty('display');
    }
  });
  logger.debugLog('detail-quote-row-hidden', {
    data: { statusId: statusId ?? 'unknown' },
  });
}

function addVideoOverlays(article: HTMLElement, restore: Array<() => void>): boolean {
  let usedFallback = false;
  const videos = nativeQuerySelectorAll<HTMLVideoElement>(article, 'video');
  for (const video of videos) {
    const parent = video.parentElement;
    if (!parent) {
      continue;
    }
    const frame = videoFrame(video);
    const poster = video.poster || '';
    const source = frame ?? poster;
    if (!frame) {
      usedFallback = true;
    }
    if (!source) {
      continue;
    }

    const overlay = document.createElement('img');
    overlay.alt = '';
    overlay.draggable = false;
    overlay.src = source === poster ? poster : source;
    const computed = nativeGetComputedStyle(video);
    overlay.style.position = 'absolute';
    overlay.style.left = computed.left;
    overlay.style.top = computed.top;
    overlay.style.width = computed.width || '100%';
    overlay.style.height = computed.height || '100%';
    overlay.style.transform = computed.transform;
    overlay.style.transformOrigin = computed.transformOrigin;
    overlay.style.objectFit = computed.objectFit || 'contain';
    overlay.style.objectPosition = computed.objectPosition;
    overlay.style.pointerEvents = 'none';
    overlay.style.visibility = 'visible';
    overlay.style.zIndex = computed.zIndex === 'auto' ? '0' : computed.zIndex;

    const originalVisibility = video.style.visibility;
    parent.insertBefore(overlay, video.nextSibling);
    video.style.visibility = 'hidden';
    restore.push(() => {
      overlay.remove();
      video.style.visibility = originalVisibility;
    });
  }
  return usedFallback;
}

export async function captureArticle(
  target: CaptureTarget,
  options: CaptureOptions = {},
): Promise<CaptureResult> {
  const article = target.article;
  if (!article.isConnected) {
    throw new XpsError('article-detached', 'capture', 'The post is no longer in the document');
  }

  const startedAt = Date.now();
  const partialRef = { partial: false };
  const restore: Array<() => void> = [];
  logger.debugLog('capture-started', {
    data: {
      handle: target.handle ?? 'unknown',
      statusId: target.statusId ?? 'unknown',
    },
  });

  try {
    await waitForFonts();
    freezeScrollableContainers(article, restore);
    inlineSvgUseReferences(article, restore);
    partialRef.partial = addVideoOverlays(article, restore);
    hideDetailQuoteRow(article, target.statusId, restore);

    const rect = article.getBoundingClientRect();
    const width = Math.max(1, Math.ceil(rect.width || article.clientWidth || 1));
    const height = Math.max(1, Math.ceil(rect.height || article.clientHeight || 1));
    const backgroundColor = getCaptureBackground(article);
    let pixelRatio = options.pixelRatio ?? 2;
    if (height * pixelRatio > MAX_CANVAS_DIMENSION) {
      pixelRatio = Math.max(1, Math.floor(MAX_CANVAS_DIMENSION / height));
    }

    const render = async (ratio: number): Promise<Blob> => {
      const blob = await withTimeout(
        toBlob(article, {
          width,
          height,
          pixelRatio: ratio,
          backgroundColor,
          cacheBust: false,
          includeQueryParams: true,
          preferredFontFormat: 'woff2',
          imagePlaceholder: IMAGE_PLACEHOLDER,
          filter: (node: Node) =>
            node.nodeType !== 1 || (node as Element).tagName.toUpperCase() !== 'VIDEO',
          onImageErrorHandler: (event: string | Event) => {
            partialRef.partial = true;
            logger.warn('image-embed-failed', {
              message: typeof event === 'string' ? event : event.type,
            });
          },
        }),
        options.timeoutMs ?? 60_000,
        'render',
      );
      if (!blob) {
        throw new XpsError('empty-output', 'render', 'The image renderer returned no data');
      }
      return blob;
    };

    let blob: Blob;
    try {
      blob = await render(pixelRatio);
    } catch (error) {
      if (pixelRatio <= 1) {
        throw error;
      }
      logger.warn('render-retry', { message: 'Retrying at 1x pixel ratio' });
      blob = await render(1);
      pixelRatio = 1;
    }

    const filename = makeScreenshotFilename(target.handle, target.statusId);
    logger.info('capture-complete', {
      durationMs: Date.now() - startedAt,
      data: {
        width,
        height,
        pixelRatio,
        partial: partialRef.partial,
      },
    });
    return { blob, filename, partial: partialRef.partial, width, height };
  } finally {
    for (const undo of restore.reverse()) {
      try {
        undo();
      } catch {
        // Best-effort restoration must not hide the original failure.
      }
    }
    logger.flush();
  }
}

export { IMAGE_PLACEHOLDER };

import { getLocale, translate } from '../i18n';
import type { CaptureTarget, MenuInjection } from '../types';
import {
  native,
  nativeAddEventListener,
  nativeApply,
  nativeClearTimeout,
  nativeClosest,
  nativeMatches,
  nativeQuerySelectorAll,
  nativeSetTimeout,
} from './native';
import { logger } from './logging';

const MENU_TRIGGER_SELECTOR = '[data-testid="caret"], button[aria-haspopup="menu"]';
const MENU_SELECTOR = '[role="menu"]';
const ITEM_SELECTOR = 'div[role="menuitem"], [role="menuitem"]';

const injections = new WeakMap<HTMLElement, MenuInjection>();

const CAMERA_PATH =
  'M9 4h6l2 2h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-2Zm3 4.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z';

function isMoreTrigger(element: Element): boolean {
  if (nativeMatches(element, '[data-testid="caret"]')) {
    return true;
  }
  if (!nativeMatches(element, 'button[aria-haspopup="menu"]')) {
    return false;
  }
  const use = element.querySelector('svg use');
  const href = use?.getAttribute('href') ?? use?.getAttribute('xlink:href');
  if (href === '#icon-more') {
    return true;
  }
  const label = element.getAttribute('aria-label')?.trim().toLowerCase() ?? '';
  return label === 'more' || label === '更多' || label === '詳細' || label === '详细';
}

export function findPostTrigger(target: EventTarget | null): HTMLElement | null {
  if (!target) {
    return null;
  }
  const targetNode = target as Node | null;
  const element =
    targetNode && targetNode.nodeType === 1
      ? (targetNode as Element)
      : (targetNode?.parentElement ?? null);
  if (!element) {
    return null;
  }
  const candidate = nativeClosest<HTMLElement>(element, MENU_TRIGGER_SELECTOR);
  if (!candidate || !isMoreTrigger(candidate)) {
    return null;
  }
  const article = nativeClosest<HTMLElement>(candidate, 'article');
  return article ? candidate : null;
}

function directStatusLinks(article: HTMLElement): HTMLAnchorElement[] {
  return nativeQuerySelectorAll<HTMLAnchorElement>(article, 'a[href*="/status/"]').filter(
    (link) => nativeClosest(link, 'article') === article,
  );
}

export function extractStatusId(article: HTMLElement): string | null {
  for (const link of directStatusLinks(article)) {
    const href = link.getAttribute('href') ?? '';
    const match = href.match(/\/status\/(\d+)/);
    if (match?.[1]) {
      return match[1];
    }
    const webMatch = href.match(/\/i\/web\/status\/(\d+)/);
    if (webMatch?.[1]) {
      return webMatch[1];
    }
  }
  return null;
}

function extractHandleFromStatusLink(article: HTMLElement): string | null {
  for (const link of directStatusLinks(article)) {
    const href = link.getAttribute('href') ?? '';
    const match = href.match(/^\/([^/]+)\/status\/\d+/);
    if (match?.[1] && match[1] !== 'i') {
      return match[1];
    }
  }
  return null;
}

function extractHandleFromProfileLink(article: HTMLElement): string | null {
  const usernameLink = article.querySelector('[data-testid="User-Name"] a[href^="/"]');
  const genericLinks = nativeQuerySelectorAll<HTMLAnchorElement>(article, 'a[href^="/"]');
  const link =
    usernameLink ??
    genericLinks.find((candidate) => {
      const href = candidate.getAttribute('href') ?? '';
      return /^\/[A-Za-z0-9_]+$/.test(href);
    });
  const href = link?.getAttribute('href') ?? '';
  return href.match(/^\/([A-Za-z0-9_]+)$/)?.[1] ?? null;
}

export function sanitizeFilenamePart(value: string | null | undefined, maxLength = 40): string {
  const sanitized = (value ?? '')
    .normalize('NFKC')
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength);
  return sanitized || 'post';
}

export function makeScreenshotFilename(
  handle: string | null,
  statusId: string | null,
  now = Date.now(),
): string {
  const safeHandle = sanitizeFilenamePart(handle, 40);
  const safeStatus = statusId ? sanitizeFilenamePart(statusId, 40) : String(now);
  return `x-post-screenshot-${safeHandle}-${safeStatus}.png`;
}

export function buildCaptureTargetFromArticle(article: HTMLElement): CaptureTarget {
  const statusId = extractStatusId(article);
  const handle = extractHandleFromStatusLink(article) ?? extractHandleFromProfileLink(article);
  return { article, trigger: article, statusId, handle };
}

export function buildCaptureTarget(trigger: HTMLElement): CaptureTarget | null {
  const article = nativeClosest<HTMLElement>(trigger, 'article');
  if (!article) {
    return null;
  }
  return buildCaptureTargetFromArticle(article);
}

function visibleMenus(): HTMLElement[] {
  return nativeQuerySelectorAll<HTMLElement>(document, MENU_SELECTOR).filter((menu) => {
    const rect = menu.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
}

function distanceToTrigger(menu: HTMLElement, trigger: HTMLElement): number {
  const menuRect = menu.getBoundingClientRect();
  const triggerRect = trigger.getBoundingClientRect();
  const dx = menuRect.left - triggerRect.left;
  const dy = menuRect.top - triggerRect.top;
  return dx * dx + dy * dy;
}

function chooseMenu(trigger: HTMLElement, existing: ReadonlySet<HTMLElement>): HTMLElement | null {
  const menus = visibleMenus();
  const fresh = menus.filter((menu) => !existing.has(menu));
  const candidates = fresh.length > 0 ? fresh : menus;
  if (candidates.length === 0) {
    return null;
  }
  return (
    [...candidates].sort(
      (left, right) => distanceToTrigger(left, trigger) - distanceToTrigger(right, trigger),
    )[0] ?? null
  );
}

function createCameraIcon(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '1em');
  svg.setAttribute('height', '1em');
  svg.setAttribute('fill', 'currentColor');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', CAMERA_PATH);
  svg.append(path);
  return svg;
}

function setFirstText(node: Node, text: string): boolean {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === 3 && child.nodeValue?.trim()) {
      child.nodeValue = text;
      return true;
    }
    if (child.nodeType === 1 && setFirstText(child, text)) {
      return true;
    }
  }
  return false;
}

function createMenuItem(template: HTMLElement, label: string): HTMLElement | null {
  const item = nativeApply<HTMLElement>(native.cloneNode, template, [true]);
  item.removeAttribute('id');
  for (const node of item.querySelectorAll('[id]')) {
    node.removeAttribute('id');
  }
  item.removeAttribute('data-testid');
  item.setAttribute('role', 'menuitem');
  item.setAttribute('tabindex', '0');

  const oldIcon = item.querySelector('svg');
  const newIcon = createCameraIcon();
  if (oldIcon) {
    oldIcon.replaceWith(newIcon);
  } else {
    const iconHolder = item.querySelector('div');
    iconHolder?.append(newIcon);
  }

  const textHolder = item.lastElementChild ?? item;
  if (!setFirstText(textHolder, label)) {
    textHolder.append(label);
  }

  return item;
}

function injectMenu(
  trigger: HTMLElement,
  menu: HTMLElement,
  onCapture: (target: CaptureTarget) => void,
): boolean {
  const target = buildCaptureTarget(trigger);
  if (!target) {
    return false;
  }
  const previous = injections.get(menu);
  if (previous?.item.isConnected) {
    return true;
  }

  const template = menu.querySelector('div[role="menuitem"]') ?? menu.querySelector(ITEM_SELECTOR);
  if (!template || template.nodeType !== 1) {
    return false;
  }
  const templateElement = template as HTMLElement;
  const label = translate(getLocale(), 'menuSavePost');
  const item = createMenuItem(templateElement, label);
  if (!item) {
    return false;
  }

  let currentItem = item;
  let observer: MutationObserver | null = null;
  let timeoutId: number | null = null;

  const closeMenu = () => {
    try {
      menu.dispatchEvent(
        new native.pageWindow.KeyboardEvent('keydown', {
          key: 'Escape',
          code: 'Escape',
          bubbles: true,
          cancelable: true,
        }),
      );
    } catch {
      // Closing the menu is best-effort; the capture target is already stored.
    }
  };

  const activate = () => {
    onCapture(target);
    closeMenu();
  };

  const attach = (node: HTMLElement) => {
    nativeAddEventListener(node, 'click', (event) => {
      event.preventDefault();
      activate();
    });
    nativeAddEventListener(node, 'keydown', (event) => {
      const keyboard = event as KeyboardEvent;
      if (keyboard.key === 'Enter' || keyboard.key === ' ') {
        keyboard.preventDefault();
        activate();
      }
    });
  };

  const insert = () => {
    const first = menu.querySelector('div[role="menuitem"]') ?? menu.querySelector(ITEM_SELECTOR);
    const parent = first?.parentElement;
    if (!parent) {
      return false;
    }
    parent.insertBefore(currentItem, first);
    return true;
  };

  attach(currentItem);
  if (!insert()) {
    return false;
  }

  const reinject = () => {
    if (!menu.isConnected) {
      observer?.disconnect();
      observer = null;
      if (timeoutId !== null) {
        nativeClearTimeout(timeoutId);
        timeoutId = null;
      }
      return;
    }
    if (!currentItem.isConnected) {
      const replacement = createMenuItem(templateElement, translate(getLocale(), 'menuSavePost'));
      if (replacement) {
        attach(replacement);
        currentItem = replacement;
        insert();
        const record = injections.get(menu);
        if (record) {
          record.item = replacement;
        }
      }
    }
  };

  const menuObserver = new native.MutationObserver(reinject);
  menuObserver.observe(menu, { childList: true, subtree: true });
  observer = menuObserver;
  timeoutId = nativeSetTimeout(() => {
    menuObserver.disconnect();
    timeoutId = null;
    if (observer === menuObserver) {
      observer = null;
    }
  }, 5000);

  injections.set(menu, {
    menu,
    item: currentItem,
    target,
    observer,
    timeoutId,
  });
  logger.debugLog('menu-item-injected', {
    data: { handle: target.handle ?? 'unknown', statusId: target.statusId ?? 'unknown' },
  });
  return true;
}

function scheduleInjection(
  trigger: HTMLElement,
  existing: ReadonlySet<HTMLElement>,
  onCapture: (target: CaptureTarget) => void,
): void {
  const timers: number[] = [];
  const delays = [0, 16, 50, 100, 200, 400, 800];
  const clearTimers = () => {
    for (const id of timers) {
      nativeClearTimeout(id);
    }
    timers.length = 0;
  };

  for (const delay of delays) {
    const id = nativeSetTimeout(() => {
      const menu = chooseMenu(trigger, existing);
      if (menu && injectMenu(trigger, menu, onCapture)) {
        clearTimers();
      }
    }, delay);
    timers.push(id);
  }
}

export function installMenuIntegration(onCapture: (target: CaptureTarget) => void): () => void {
  const onClick = (event: Event) => {
    const trigger = findPostTrigger(event.target);
    if (!trigger) {
      return;
    }
    const existing = new Set(visibleMenus());
    scheduleInjection(trigger, existing, onCapture);
  };

  const onKeyDown = (event: Event) => {
    const keyboard = event as KeyboardEvent;
    if (keyboard.key !== 'Enter' && keyboard.key !== ' ') {
      return;
    }
    const trigger = findPostTrigger(event.target);
    if (!trigger) {
      return;
    }
    const existing = new Set(visibleMenus());
    scheduleInjection(trigger, existing, onCapture);
  };

  nativeAddEventListener(document, 'click', onClick, true);
  nativeAddEventListener(document, 'keydown', onKeyDown, true);
  logger.debugLog('menu-integration-installed');

  return () => {
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
  };
}

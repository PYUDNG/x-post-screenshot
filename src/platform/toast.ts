import { getPageTheme } from './theme';
import {
  native,
  nativeApply,
  nativeAttachClosedShadow,
  nativeClearTimeout,
  nativeSetTimeout,
} from './native';

export type ToastKind = 'progress' | 'success' | 'partial' | 'error';
type ToastIcon = 'spinner' | 'success' | 'partial' | 'error';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

const ICON_PATHS: Record<Exclude<ToastIcon, 'spinner'>, string> = {
  success: 'M20 6 9 17l-5-5',
  partial:
    'M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  error: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm-4-14 8 8m0-8-8 8',
};

const SHADOW_CSS = `
:host { all: initial; }
.toast {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 9px;
  max-width: min(440px, calc(100vw - 32px));
  padding: 10px 15px;
  border: 1px solid var(--xps-border, rgba(127, 127, 127, .35));
  border-radius: 999px;
  background: var(--xps-bg, #fff);
  color: var(--xps-fg, #0f1419);
  box-shadow: 0 8px 28px rgba(0, 0, 0, .28);
  font: 500 14px/1.35 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  letter-spacing: .01em;
  pointer-events: none;
}
.toast[data-kind="error"] { border-color: color-mix(in srgb, #f4212e 55%, transparent); }
.toast[data-kind="partial"] { border-color: color-mix(in srgb, #d99b00 55%, transparent); }
.toast[data-kind="success"] { border-color: color-mix(in srgb, #00ba7c 55%, transparent); }
.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
}
.icon svg { display: block; width: 18px; height: 18px; }
`;

let host: HTMLDivElement | null = null;
let content: HTMLDivElement | null = null;
let iconSlot: HTMLSpanElement | null = null;
let textSlot: HTMLSpanElement | null = null;
let usingShadowRoot = false;
let currentKind: ToastKind | null = null;
let timer: number | null = null;

function prefersReducedMotion(): boolean {
  try {
    const matchMedia = native.pageWindow.matchMedia;
    if (typeof matchMedia !== 'function') {
      return false;
    }
    return nativeApply<MediaQueryList>(matchMedia, native.pageWindow, [
      '(prefers-reduced-motion: reduce)',
    ]).matches;
  } catch {
    return false;
  }
}

function createSvgIcon(kind: Exclude<ToastIcon, 'spinner'>): SVGSVGElement {
  const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NAMESPACE, 'path');
  path.setAttribute('d', ICON_PATHS[kind]);
  svg.append(path);
  return svg;
}

function createSpinnerIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('aria-hidden', 'true');

  const track = document.createElementNS(SVG_NAMESPACE, 'circle');
  track.setAttribute('cx', '12');
  track.setAttribute('cy', '12');
  track.setAttribute('r', '9');
  track.setAttribute('opacity', '.25');
  svg.append(track);

  const arc = document.createElementNS(SVG_NAMESPACE, 'path');
  arc.setAttribute('d', 'M12 3a9 9 0 0 1 9 9');
  arc.setAttribute('stroke-linecap', 'round');
  if (!prefersReducedMotion()) {
    const animation = document.createElementNS(SVG_NAMESPACE, 'animateTransform');
    animation.setAttribute('attributeName', 'transform');
    animation.setAttribute('type', 'rotate');
    animation.setAttribute('from', '0 12 12');
    animation.setAttribute('to', '360 12 12');
    animation.setAttribute('dur', '.8s');
    animation.setAttribute('repeatCount', 'indefinite');
    arc.append(animation);
  }
  svg.append(arc);
  return svg;
}

function iconForKind(kind: ToastKind): ToastIcon {
  return kind === 'progress' ? 'spinner' : kind;
}

function renderIcon(kind: ToastKind, dark: boolean): void {
  if (!iconSlot) {
    return;
  }
  const icon = iconForKind(kind);
  iconSlot.replaceChildren(icon === 'spinner' ? createSpinnerIcon() : createSvgIcon(icon));
  iconSlot.style.color =
    icon === 'success'
      ? '#00ba7c'
      : icon === 'partial'
        ? dark
          ? '#ffd400'
          : '#9a6700'
        : icon === 'error'
          ? '#f4212e'
          : 'inherit';
}

function ensureToast(): HTMLDivElement | null {
  if (host?.isConnected && content && iconSlot && textSlot) {
    return content;
  }

  const parent = document.body ?? document.documentElement;
  if (!parent) {
    return null;
  }

  host = document.createElement('div');
  host.style.cssText =
    'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;display:none;pointer-events:none;';
  const shadow = nativeAttachClosedShadow(host);
  usingShadowRoot = Boolean(shadow);
  content = document.createElement('div');
  content.className = 'toast';
  content.setAttribute('role', 'status');
  content.setAttribute('aria-live', 'polite');
  content.setAttribute('aria-atomic', 'true');

  iconSlot = document.createElement('span');
  iconSlot.className = 'icon';
  iconSlot.style.cssText =
    'display:inline-flex;align-items:center;justify-content:center;flex:0 0 18px;width:18px;height:18px;';
  iconSlot.setAttribute('aria-hidden', 'true');
  textSlot = document.createElement('span');
  textSlot.className = 'text';
  content.append(iconSlot, textSlot);

  if (shadow) {
    const style = document.createElement('style');
    style.textContent = SHADOW_CSS;
    shadow.append(style, content);
  } else {
    content.style.cssText =
      'box-sizing:border-box;display:flex;align-items:center;gap:9px;max-width:min(440px,calc(100vw - 32px));padding:10px 15px;border-radius:999px;border:1px solid rgba(127,127,127,.35);box-shadow:0 8px 28px rgba(0,0,0,.28);font:500 14px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;pointer-events:none;background:var(--xps-bg,#fff);color:var(--xps-fg,#0f1419);';
    host.append(content);
  }

  parent.append(host);
  return content;
}

export function showToast(kind: ToastKind, message: string, durationMs = 3200): void {
  const node = ensureToast();
  if (!node || !host || !iconSlot || !textSlot) {
    return;
  }

  if (timer !== null) {
    nativeClearTimeout(timer);
    timer = null;
  }

  const theme = getPageTheme();
  const toastBackground = theme.dark ? '#1b1f24' : '#ffffff';
  const toastForeground = theme.dark ? '#e7e9ea' : '#0f1419';
  currentKind = kind;
  node.dataset.kind = kind;
  node.style.setProperty('--xps-bg', toastBackground);
  node.style.setProperty('--xps-fg', toastForeground);
  node.style.setProperty(
    '--xps-border',
    theme.dark ? 'rgba(255,255,255,.25)' : 'rgba(15,20,25,.18)',
  );
  if (!usingShadowRoot) {
    node.style.backgroundColor = toastBackground;
    node.style.color = toastForeground;
  }
  node.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  renderIcon(kind, theme.dark);
  textSlot.textContent = message;
  host.style.display = 'block';

  if (durationMs > 0) {
    timer = nativeSetTimeout(() => {
      hideToast();
    }, durationMs);
  }
}

export function hideToast(): void {
  if (timer !== null) {
    nativeClearTimeout(timer);
    timer = null;
  }
  if (host) {
    host.style.display = 'none';
  }
}

export interface ToastSnapshot {
  kind: ToastKind | null;
  icon: ToastIcon | null;
  text: string;
  closedShadow: boolean;
}

export function getToastSnapshotForTesting(): ToastSnapshot {
  return {
    kind: currentKind,
    icon: currentKind ? iconForKind(currentKind) : null,
    text: textSlot?.textContent ?? '',
    closedShadow: usingShadowRoot && host?.shadowRoot === null,
  };
}

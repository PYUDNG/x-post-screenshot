import { getPageTheme } from './theme';
import { nativeAttachClosedShadow, nativeClearTimeout, nativeSetTimeout } from './native';

type ToastKind = 'progress' | 'success' | 'error';

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
.toast[data-kind="success"] { border-color: color-mix(in srgb, #00ba7c 55%, transparent); }
.spinner {
  width: 14px;
  height: 14px;
  flex: 0 0 14px;
  border: 2px solid color-mix(in srgb, currentColor 25%, transparent);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: xps-spin .8s linear infinite;
}
.toast:not([data-kind="progress"]) .spinner { display: none; }
@keyframes xps-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .spinner { animation: none; }
}
`;

let host: HTMLDivElement | null = null;
let content: HTMLDivElement | null = null;
let usingShadowRoot = false;
let timer: number | null = null;

function ensureToast(): HTMLDivElement | null {
  if (host?.isConnected && content) {
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

  if (shadow) {
    const style = document.createElement('style');
    style.textContent = SHADOW_CSS;
    const spinner = document.createElement('span');
    spinner.className = 'spinner';
    spinner.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    text.className = 'text';
    content.append(spinner, text);
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
  if (!node || !host) {
    return;
  }

  if (timer !== null) {
    nativeClearTimeout(timer);
    timer = null;
  }

  const theme = getPageTheme();
  const toastBackground = theme.dark ? '#1b1f24' : '#ffffff';
  const toastForeground = theme.dark ? '#e7e9ea' : '#0f1419';
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

  const textNode = node.querySelector('.text') ?? node;
  textNode.textContent = message;
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

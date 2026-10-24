import { unsafeWindow } from '$';

type AnyFunction = (...args: never[]) => unknown;

const fallbackWindow = typeof window !== 'undefined' ? window : undefined;
const pageWindow = ((unsafeWindow as (Window & typeof globalThis) | undefined) ?? fallbackWindow) as
  (Window & typeof globalThis) | undefined;

if (!pageWindow) {
  throw new Error('X Post Screenshot requires a browser window');
}

const reflectApply = Reflect.apply;
const functionToString = pageWindow.Function.prototype.toString;

function call<T>(fn: AnyFunction, thisArg: unknown, args: readonly unknown[]): T {
  return reflectApply(fn, thisArg, args) as T;
}

export function isNativeFunction(fn: unknown): boolean {
  if (typeof fn !== 'function') {
    return false;
  }
  try {
    return /\[native code\]/.test(call<string>(functionToString, fn, []));
  } catch {
    return false;
  }
}

export function nativeApply<T>(fn: AnyFunction, thisArg: unknown, args: readonly unknown[]): T {
  return call<T>(fn, thisArg, args);
}

const nativeResponse = pageWindow.Response;
const nativeURL = pageWindow.URL;

export const native = {
  pageWindow,
  document: pageWindow.document,
  apply: <T>(fn: AnyFunction, thisArg: unknown, args: readonly unknown[]): T =>
    call<T>(fn, thisArg, args),
  addEventListener: pageWindow.EventTarget.prototype.addEventListener,
  removeEventListener: pageWindow.EventTarget.prototype.removeEventListener,
  querySelector: pageWindow.Document.prototype.querySelector,
  querySelectorAll: pageWindow.Document.prototype.querySelectorAll,
  elementQuerySelector: pageWindow.Element.prototype.querySelector,
  elementQuerySelectorAll: pageWindow.Element.prototype.querySelectorAll,
  getElementById: pageWindow.Document.prototype.getElementById,
  createElement: pageWindow.Document.prototype.createElement,
  createElementNS: pageWindow.Document.prototype.createElementNS,
  cloneNode: pageWindow.Node.prototype.cloneNode,
  closest: pageWindow.Element.prototype.closest,
  matches: pageWindow.Element.prototype.matches,
  attachShadow: pageWindow.Element.prototype.attachShadow,
  getComputedStyle: pageWindow.getComputedStyle,
  MutationObserver: pageWindow.MutationObserver,
  setTimeout: pageWindow.setTimeout,
  clearTimeout: pageWindow.clearTimeout,
  requestAnimationFrame: pageWindow.requestAnimationFrame,
  cancelAnimationFrame: pageWindow.cancelAnimationFrame,
  toDataURL: pageWindow.HTMLCanvasElement.prototype.toDataURL,
  toBlob: pageWindow.HTMLCanvasElement.prototype.toBlob,
  getContext: pageWindow.HTMLCanvasElement.prototype.getContext,
  anchorClick: pageWindow.HTMLAnchorElement.prototype.click,
  elementClick: pageWindow.HTMLElement.prototype.click,
  createObjectURL: pageWindow.URL.createObjectURL,
  revokeObjectURL: pageWindow.URL.revokeObjectURL,
  Response: nativeResponse,
  URL: nativeURL,
  console: {
    debug: pageWindow.console.debug,
    info: pageWindow.console.info,
    warn: pageWindow.console.warn,
    error: pageWindow.console.error,
  },
} as const;

export function nativeAddEventListener(
  target: EventTarget,
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
): void {
  call(native.addEventListener, target, [type, listener, options]);
}

export function nativeRemoveEventListener(
  target: EventTarget,
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | EventListenerOptions,
): void {
  call(native.removeEventListener, target, [type, listener, options]);
}

export function nativeQuerySelectorAll<T extends Element = Element>(
  root: ParentNode,
  selector: string,
): T[] {
  const isDocument = root.nodeType === 9;
  const fn = isDocument ? native.querySelectorAll : native.elementQuerySelectorAll;
  const list = call<ReturnType<typeof native.querySelectorAll>>(fn, root, [selector]);
  return Array.from(list) as T[];
}

export function nativeQuerySelector<T extends Element = Element>(
  root: ParentNode,
  selector: string,
): T | null {
  const isDocument = root.nodeType === 9;
  const fn = isDocument ? native.querySelector : native.elementQuerySelector;
  return call<T | null>(fn, root, [selector]);
}

export function nativeClosest<T extends Element = Element>(
  element: Element,
  selector: string,
): T | null {
  return call<T | null>(native.closest, element, [selector]);
}

export function nativeMatches(element: Element, selector: string): boolean {
  return call<boolean>(native.matches, element, [selector]);
}

export function nativeClickElement(element: HTMLElement): void {
  call<void>(native.elementClick, element, []);
}

export function nativeGetComputedStyle(element: Element): CSSStyleDeclaration {
  return call<CSSStyleDeclaration>(native.getComputedStyle, pageWindow, [element]);
}

export function nativeSetTimeout(handler: () => void, timeout: number): number {
  return call<number>(native.setTimeout, pageWindow, [handler, timeout]);
}

export function nativeClearTimeout(id: number): void {
  call<void>(native.clearTimeout, pageWindow, [id]);
}

export function nativeRequestAnimationFrame(handler: FrameRequestCallback): number {
  return call<number>(native.requestAnimationFrame, pageWindow, [handler]);
}

export function nativeCancelAnimationFrame(id: number): void {
  call<void>(native.cancelAnimationFrame, pageWindow, [id]);
}

export function nativeToDataURL(canvas: HTMLCanvasElement, type = 'image/png'): string {
  return call<string>(native.toDataURL, canvas, [type]);
}

export function nativeToBlob(
  canvas: HTMLCanvasElement,
  type = 'image/png',
  quality?: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    call<void>(native.toBlob, canvas, [(blob: Blob | null) => resolve(blob), type, quality]);
  });
}

export function nativeAttachClosedShadow(host: HTMLElement): ShadowRoot | null {
  if (!isNativeFunction(native.attachShadow)) {
    return null;
  }
  try {
    return call<ShadowRoot>(native.attachShadow, host, [{ mode: 'closed' }]);
  } catch {
    return null;
  }
}

export function nativeCreateResponse(body: BodyInit | null, init: ResponseInit): Response {
  if (typeof nativeResponse === 'function') {
    return new nativeResponse(body, init);
  }
  return new Response(body, init);
}

export function nativeCreateURL(input: string, base?: string): URL {
  if (typeof nativeURL === 'function') {
    return new nativeURL(input, base);
  }
  return new URL(input, base);
}

export const nativeIsAttachShadowNative = isNativeFunction(native.attachShadow);

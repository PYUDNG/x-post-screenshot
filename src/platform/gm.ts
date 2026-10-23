import { native } from './native';

export interface GmRequestResult {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: ArrayBuffer | null;
  finalUrl?: string;
}

export interface GmRequestOptions {
  url: string;
  timeoutMs: number;
  signal?: AbortSignal;
}

export interface GmDownloadOptions {
  blob: Blob;
  name: string;
  timeoutMs?: number;
}

interface GmAbortHandle {
  abort: () => void;
}

interface GmResponseEvent {
  status: number;
  statusText: string;
  responseHeaders: string;
  response: ArrayBuffer;
  finalUrl?: string;
}

interface GmDownloadError {
  error?: string;
  details?: string;
}

function getGlobal(name: string): unknown {
  return (globalThis as Record<string, unknown>)[name];
}

export function hasGmRequest(): boolean {
  return typeof getGlobal('GM_xmlhttpRequest') === 'function';
}

export function gmGetValue<T>(key: string, fallback: T): T {
  try {
    const getter = getGlobal('GM_getValue');
    if (typeof getter === 'function') {
      return (getter as (name: string, defaultValue: T) => T)(key, fallback);
    }
  } catch {
    // Fall through to the in-memory default.
  }
  return fallback;
}

export function gmSetValue(key: string, value: unknown): boolean {
  try {
    const setter = getGlobal('GM_setValue');
    if (typeof setter === 'function') {
      (setter as (name: string, nextValue: unknown) => void)(key, value);
      return true;
    }
  } catch {
    // Diagnostic storage must never break the page.
  }
  return false;
}

export function gmRegisterMenuCommand(name: string, onClick: () => void): boolean {
  try {
    const register = getGlobal('GM_registerMenuCommand');
    if (typeof register === 'function') {
      (register as (label: string, listener: () => void) => unknown)(name, onClick);
      return true;
    }
  } catch {
    // Ignore unsupported manager APIs.
  }
  return false;
}

export function gmSetClipboard(text: string, info = 'text'): boolean {
  try {
    const setClipboard = getGlobal('GM_setClipboard');
    if (typeof setClipboard === 'function') {
      (setClipboard as (data: string, type?: string) => void)(text, info);
      return true;
    }
  } catch {
    // Ignore unsupported manager APIs.
  }
  return false;
}

export function gmDownloadBlob(options: GmDownloadOptions): Promise<boolean> {
  const download = getGlobal('GM_download');
  if (typeof download !== 'function') {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let objectUrl = '';
    const finish = (ok: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timer !== undefined) {
        clearTimeout(timer);
      }
      if (objectUrl) {
        setTimeout(() => {
          try {
            native.URL.revokeObjectURL(objectUrl);
          } catch {
            // The browser may already have revoked it.
          }
        }, 5_000);
      }
      resolve(ok);
    };

    try {
      objectUrl = native.URL.createObjectURL(options.blob);
      (download as (details: unknown) => GmAbortHandle)({
        url: objectUrl,
        name: options.name,
        saveAs: false,
        timeout: options.timeoutMs ?? 30_000,
        onload: () => finish(true),
        onerror: (_error: GmDownloadError) => finish(false),
        ontimeout: () => finish(false),
      });
      timer = setTimeout(() => finish(false), (options.timeoutMs ?? 30_000) + 5_000);
    } catch {
      finish(false);
    }
  });
}

export function gmRequestArrayBuffer(options: GmRequestOptions): Promise<GmRequestResult> {
  const request = getGlobal('GM_xmlhttpRequest');
  if (typeof request !== 'function') {
    return Promise.reject(new Error('GM_xmlhttpRequest is not available'));
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let abortHandle: GmAbortHandle | null = null;

    const finish = (fn: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      if (options.signal) {
        options.signal.removeEventListener('abort', onAbort);
      }
      fn();
    };

    const onAbort = () => {
      try {
        abortHandle?.abort();
      } catch {
        // Ignore abort failures.
      }
      finish(() => reject(new Error('Request aborted')));
    };

    if (options.signal?.aborted) {
      finish(() => reject(new Error('Request aborted')));
      return;
    }

    try {
      abortHandle = (request as (details: unknown) => GmAbortHandle)({
        method: 'GET',
        url: options.url,
        responseType: 'arraybuffer',
        timeout: options.timeoutMs,
        anonymous: true,
        onload: (response: GmResponseEvent) => {
          finish(() =>
            resolve({
              status: response.status,
              statusText: response.statusText,
              headers: parseHeaders(response.responseHeaders),
              body: response.response ?? null,
              finalUrl: response.finalUrl,
            }),
          );
        },
        onerror: () => finish(() => reject(new Error('Resource request failed'))),
        ontimeout: () => finish(() => reject(new Error('Resource request timed out'))),
        onabort: () => finish(() => reject(new Error('Resource request aborted'))),
      });
      options.signal?.addEventListener('abort', onAbort, { once: true });
    } catch (error) {
      finish(() => reject(error));
    }
  });
}

export function parseHeaders(headers: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!headers) {
    return result;
  }
  for (const line of headers.split(/\r?\n/)) {
    const index = line.indexOf(':');
    if (index <= 0) {
      continue;
    }
    const name = line.slice(0, index).trim().toLowerCase();
    const value = line.slice(index + 1).trim();
    if (name) {
      result[name] = value;
    }
  }
  return result;
}

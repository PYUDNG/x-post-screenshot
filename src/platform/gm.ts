import {
  GM_download,
  GM_getValue,
  GM_registerMenuCommand,
  GM_setClipboard,
  GM_setValue,
  GM_xmlhttpRequest,
} from '$';
import { native, nativeClearTimeout, nativeSetTimeout } from './native';

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

export function gmGetValue<T>(key: string, fallback: T): T {
  try {
    if (typeof GM_getValue === 'function') {
      return GM_getValue<T>(key, fallback);
    }
  } catch {
    // Fall through to the in-memory default.
  }
  return fallback;
}

export function gmSetValue(key: string, value: unknown): boolean {
  try {
    if (typeof GM_setValue === 'function') {
      GM_setValue(key, value);
      return true;
    }
  } catch {
    // Diagnostic storage must never break the page.
  }
  return false;
}

export function gmRegisterMenuCommand(name: string, onClick: () => void): boolean {
  try {
    if (typeof GM_registerMenuCommand === 'function') {
      GM_registerMenuCommand(name, onClick);
      return true;
    }
  } catch {
    // Ignore unsupported manager APIs.
  }
  return false;
}

export function gmSetClipboard(text: string, info = 'text'): boolean {
  try {
    if (typeof GM_setClipboard === 'function') {
      GM_setClipboard(text, info);
      return true;
    }
  } catch {
    // Ignore unsupported manager APIs.
  }
  return false;
}

export function gmDownloadBlob(options: GmDownloadOptions): Promise<boolean> {
  if (typeof GM_download !== 'function') {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    let settled = false;
    let timer: number | undefined;
    let objectUrl = '';
    const timeoutMs = options.timeoutMs ?? 30_000;
    const finish = (ok: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timer !== undefined) {
        nativeClearTimeout(timer);
      }
      if (objectUrl) {
        nativeSetTimeout(() => {
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
      GM_download({
        url: objectUrl,
        name: options.name,
        saveAs: false,
        timeout: timeoutMs,
        onload: () => finish(true),
        onerror: () => finish(false),
        ontimeout: () => finish(false),
      });
      if (!settled) {
        timer = nativeSetTimeout(() => finish(false), timeoutMs + 5_000);
      }
    } catch {
      finish(false);
    }
  });
}

export function gmRequestArrayBuffer(options: GmRequestOptions): Promise<GmRequestResult> {
  if (typeof GM_xmlhttpRequest !== 'function') {
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
      abortHandle = GM_xmlhttpRequest({
        method: 'GET',
        url: options.url,
        responseType: 'arraybuffer',
        timeout: options.timeoutMs,
        anonymous: true,
        onload: (response) => {
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

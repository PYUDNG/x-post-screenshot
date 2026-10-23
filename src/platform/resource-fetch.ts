import { logger } from './logging';
import { gmRequestArrayBuffer } from './gm';
import { nativeCreateResponse, nativeCreateURL, nativeIsAttachShadowNative } from './native';
import type { ResourceRequest, ResourceResponse, ResourceTransport } from '../types';

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_CONCURRENT_REQUESTS = 6;

class Semaphore {
  private active = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly limit: number) {}

  async acquire(): Promise<void> {
    if (this.active < this.limit) {
      this.active += 1;
      return;
    }
    await new Promise<void>((resolve) => this.queue.push(resolve));
    this.active += 1;
  }

  release(): void {
    this.active -= 1;
    this.queue.shift()?.();
  }
}

const semaphore = new Semaphore(MAX_CONCURRENT_REQUESTS);

export function isAllowedXpsResourceHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === 'twimg.com' ||
    host.endsWith('.twimg.com') ||
    host === 'pscp.tv' ||
    host.endsWith('.pscp.tv')
  );
}

export function isAllowedXpsResourceUrl(url: URL): boolean {
  return url.protocol === 'https:' && isAllowedXpsResourceHost(url.hostname);
}

function inferContentType(url: URL): string {
  const format = url.searchParams.get('format')?.toLowerCase();
  if (format) {
    if (format === 'jpg' || format === 'jpeg') return 'image/jpeg';
    if (format === 'png') return 'image/png';
    if (format === 'gif') return 'image/gif';
    if (format === 'webp') return 'image/webp';
    if (format === 'svg') return 'image/svg+xml';
  }
  const path = url.pathname.toLowerCase();
  if (path.endsWith('.woff2')) return 'font/woff2';
  if (path.endsWith('.woff')) return 'font/woff';
  if (path.endsWith('.ttf')) return 'font/ttf';
  if (path.endsWith('.otf')) return 'font/otf';
  if (path.endsWith('.css')) return 'text/css';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  if (path.endsWith('.gif')) return 'image/gif';
  if (path.endsWith('.webp')) return 'image/webp';
  if (path.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

const defaultTransport: ResourceTransport = async (request) => {
  const response = await gmRequestArrayBuffer({
    url: request.url,
    timeoutMs: request.timeoutMs,
    signal: request.signal,
  });
  return {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    body: response.body,
    ...(response.finalUrl ? { finalUrl: response.finalUrl } : {}),
  };
};

let activeTransport: ResourceTransport = defaultTransport;
let testAllowAllHosts = false;

export function setResourceTransportForTesting(
  transport: ResourceTransport | null,
  allowAllHosts = false,
): void {
  activeTransport = transport ?? defaultTransport;
  testAllowAllHosts = transport !== null && allowAllHosts;
}

export function getResourceFetcher(): ResourceTransport {
  return activeTransport;
}

export async function withResourceResponse(
  request: ResourceRequest,
  transport: ResourceTransport = activeTransport,
): Promise<ResourceResponse> {
  await semaphore.acquire();
  try {
    return await transport(request);
  } finally {
    semaphore.release();
  }
}

function describeFailure(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function createXpsFetch(
  transport: ResourceTransport = activeTransport,
  allowAllHosts = false,
): typeof fetch {
  return async (input, init) => {
    const rawUrl =
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method =
      init?.method ?? (typeof input === 'object' && 'method' in input ? input.method : 'GET');

    if (method.toUpperCase() !== 'GET') {
      throw new Error('Only GET resource requests are allowed');
    }

    let url: URL;
    try {
      url = nativeCreateURL(rawUrl, document.baseURI);
    } catch (error) {
      throw new Error(`Invalid resource URL: ${describeFailure(error)}`, { cause: error });
    }

    if (!allowAllHosts && !isAllowedXpsResourceUrl(url)) {
      throw new Error(`Resource host is not allowed: ${url.hostname}`);
    }

    let response: ResourceResponse;
    try {
      response = await withResourceResponse(
        {
          url: url.href,
          timeoutMs: REQUEST_TIMEOUT_MS,
          ...(init?.signal ? { signal: init.signal } : {}),
        },
        transport,
      );
    } catch (error) {
      logger.warn('resource-fetch-failed', {
        message: describeFailure(error),
        data: { host: url.hostname },
      });
      throw error;
    }

    if (response.status === 0) {
      throw new Error('Resource request did not return an HTTP status');
    }

    if (response.finalUrl && !allowAllHosts) {
      try {
        const finalUrl = nativeCreateURL(response.finalUrl);
        if (!isAllowedXpsResourceUrl(finalUrl)) {
          throw new Error(`Resource redirect left the allowlist: ${finalUrl.hostname}`);
        }
      } catch (error) {
        logger.warn('resource-redirect-rejected', {
          message: describeFailure(error),
          data: { host: url.hostname },
        });
        throw new Error('Resource redirect was rejected', { cause: error });
      }
    }

    const headers: Record<string, string> = { ...response.headers };
    if (!headers['content-type']) {
      headers['content-type'] = inferContentType(url);
    }

    return nativeCreateResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

export const xpsFetch: typeof fetch = (input, init) =>
  createXpsFetch(activeTransport, testAllowAllHosts)(input, init);

export function createXpsConsole() {
  const stringify = (args: unknown[]) =>
    args
      .map((arg) => {
        if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
        if (typeof arg === 'string') return arg;
        if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
        return '[object]';
      })
      .join(' ');

  return {
    debug: (...args: unknown[]) => logger.debugLog('html-to-image', { message: stringify(args) }),
    log: (...args: unknown[]) => logger.debugLog('html-to-image', { message: stringify(args) }),
    info: (...args: unknown[]) => logger.debugLog('html-to-image', { message: stringify(args) }),
    warn: (...args: unknown[]) => logger.warn('html-to-image', { message: stringify(args) }),
    error: (...args: unknown[]) => logger.error('html-to-image', stringify(args)),
  };
}

export const xpsConsole = createXpsConsole();
export const nativeShadowDomAvailable = nativeIsAttachShadowNative;

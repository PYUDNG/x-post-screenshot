import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createXpsFetch,
  isAllowedXpsResourceUrl,
  setResourceTransportForTesting,
} from '../../src/platform/resource-fetch';
import type { ResourceTransport } from '../../src/types';

const originalFetch = globalThis.fetch;
const originalResponse = globalThis.Response;

afterEach(() => {
  setResourceTransportForTesting(null);
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
  globalThis.Response = originalResponse;
});

describe('resource fetching', () => {
  it('allows only X CDN hosts', () => {
    expect(isAllowedXpsResourceUrl(new URL('https://pbs.twimg.com/media/a.jpg'))).toBe(true);
    expect(isAllowedXpsResourceUrl(new URL('https://abs.twimg.com/a.css'))).toBe(true);
    expect(
      isAllowedXpsResourceUrl(new URL('https://prod-fastly-us-east-1.video.pscp.tv/a.jpg')),
    ).toBe(true);
    expect(isAllowedXpsResourceUrl(new URL('https://example.com/a.jpg'))).toBe(false);
    expect(isAllowedXpsResourceUrl(new URL('http://pbs.twimg.com/a.jpg'))).toBe(false);
  });

  it('returns a real Response backed by the injected transport', async () => {
    const transport = vi.fn<ResourceTransport>(async () => ({
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'image/png' },
      body: new Uint8Array([1, 2, 3, 4]).buffer,
    }));
    const fetcher = createXpsFetch(transport);
    const response = await fetcher('https://pbs.twimg.com/media/test.png');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 4]));
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it('rejects non-allowlisted URLs before calling the transport', async () => {
    const transport = vi.fn<ResourceTransport>();
    const fetcher = createXpsFetch(transport);
    await expect(fetcher('https://example.com/private.png')).rejects.toThrow(
      'Resource host is not allowed',
    );
    expect(transport).not.toHaveBeenCalled();
  });

  it('allows localhost in test mode', async () => {
    const transport = vi.fn<ResourceTransport>(async () => ({
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'image/png' },
      body: new ArrayBuffer(1),
    }));
    setResourceTransportForTesting(transport, true);
    const fetcher = createXpsFetch(transport, true);
    const response = await fetcher('http://127.0.0.1:4174/blue.svg');
    expect(response.status).toBe(200);
  });
});

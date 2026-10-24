import { beforeEach, describe, expect, it } from 'vitest';
import {
  gmDownloadBlob,
  gmGetValue,
  gmRegisterMenuCommand,
  gmRequestArrayBuffer,
  gmSetClipboard,
  gmSetValue,
  parseHeaders,
} from '../../src/platform/gm';
import { gmTestState, resetGmTestState } from '../support/gm-client';

beforeEach(() => {
  resetGmTestState();
});

describe('GM API wrappers', () => {
  it('reads and writes through GM storage', () => {
    expect(gmGetValue('missing', 'fallback')).toBe('fallback');
    expect(gmSetValue('key', 'value')).toBe(true);
    expect(gmTestState.values.get('key')).toBe('value');
    expect(gmGetValue('key', 'fallback')).toBe('value');
  });

  it('returns the fallback when GM storage throws', () => {
    gmTestState.throwOnStorage = true;
    expect(gmGetValue('key', 'fallback')).toBe('fallback');
    expect(gmSetValue('key', 'value')).toBe(false);
  });

  it('registers manager menu commands and writes the clipboard', () => {
    const onClick = () => undefined;
    expect(gmRegisterMenuCommand('Export', onClick)).toBe(true);
    expect(gmTestState.menuCommands.get('Export')).toBe(onClick);

    expect(gmSetClipboard('diagnostics')).toBe(true);
    expect(gmTestState.clipboard).toBe('text:diagnostics');
  });

  it('parses response headers case-insensitively', () => {
    expect(parseHeaders('Content-Type: image/png\r\nX-Test: yes')).toEqual({
      'content-type': 'image/png',
      'x-test': 'yes',
    });
  });

  it('maps GM_xmlhttpRequest responses to the internal result', async () => {
    const promise = gmRequestArrayBuffer({
      url: 'https://pbs.twimg.com/media/test.png',
      timeoutMs: 1_000,
    });
    const request = gmTestState.requests[0];
    expect(request?.method).toBe('GET');
    expect(request?.responseType).toBe('arraybuffer');
    expect(request?.anonymous).toBe(true);

    request?.onload?.({
      status: 200,
      statusText: 'OK',
      responseHeaders: 'Content-Type: image/png',
      response: new Uint8Array([1, 2, 3]).buffer,
      finalUrl: 'https://pbs.twimg.com/media/test.png',
    });

    await expect(promise).resolves.toMatchObject({
      status: 200,
      headers: { 'content-type': 'image/png' },
      finalUrl: 'https://pbs.twimg.com/media/test.png',
    });
  });

  it('aborts an in-flight GM_xmlhttpRequest', async () => {
    const controller = new AbortController();
    const promise = gmRequestArrayBuffer({
      url: 'https://pbs.twimg.com/media/test.png',
      timeoutMs: 1_000,
      signal: controller.signal,
    });
    controller.abort();
    await expect(promise).rejects.toThrow(/aborted/i);
  });

  it('rejects when GM_xmlhttpRequest cannot be called', async () => {
    gmTestState.throwOnRequest = true;
    await expect(
      gmRequestArrayBuffer({
        url: 'https://pbs.twimg.com/media/test.png',
        timeoutMs: 1_000,
      }),
    ).rejects.toThrow('GM_xmlhttpRequest failed');
  });

  it('resolves GM_download after its load callback', async () => {
    const promise = gmDownloadBlob({
      blob: new Blob(['image'], { type: 'image/png' }),
      name: 'test.png',
      timeoutMs: 1_000,
    });
    const download = gmTestState.downloads[0];
    expect(download?.name).toBe('test.png');
    expect(download?.saveAs).toBe(false);
    download?.onload?.();
    await expect(promise).resolves.toBe(true);
  });

  it('resolves false when GM_download throws', async () => {
    gmTestState.throwOnDownload = true;
    await expect(
      gmDownloadBlob({
        blob: new Blob(['image'], { type: 'image/png' }),
        name: 'test.png',
      }),
    ).resolves.toBe(false);
  });
});

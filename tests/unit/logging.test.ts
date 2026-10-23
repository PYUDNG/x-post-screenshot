import { describe, expect, it } from 'vitest';
import { DiagnosticLogger, MAX_ENTRIES, TTL_MS, sanitizeText } from '../../src/platform/logging';

function fakeStorage(initial: Record<string, unknown> = {}) {
  const values = { ...initial };
  return {
    values,
    get<T>(key: string, fallback: T): T {
      return (values[key] as T | undefined) ?? fallback;
    },
    set(key: string, value: unknown): boolean {
      values[key] = value;
      return true;
    },
  };
}

describe('diagnostic logging', () => {
  it('sanitizes URLs and data URLs', () => {
    expect(sanitizeText('failed https://pbs.twimg.com/media/a.jpg?x=1')).toBe(
      'failed [url:pbs.twimg.com]',
    );
    expect(sanitizeText('data:image/png;base64,AAAA')).toBe('[data-url]');
  });

  it('bounds the number of entries', () => {
    const storage = fakeStorage();
    const logger = new DiagnosticLogger({
      storage,
      initialize: false,
      now: () => 1,
    });
    for (let index = 0; index < MAX_ENTRIES + 20; index += 1) {
      logger.info(`event-${index}`);
    }
    logger.flush();
    expect(logger.getEntries()).toHaveLength(MAX_ENTRIES);
    expect((storage.values['xps:diagnostics:v1'] as string).length).toBeLessThanOrEqual(65536);
  });

  it('drops entries older than the TTL', () => {
    const storage = fakeStorage();
    let now = 0;
    const logger = new DiagnosticLogger({
      storage,
      initialize: false,
      now: () => now,
    });
    logger.info('old');
    logger.flush();
    now = TTL_MS + 1;
    logger.flush();
    expect(logger.getEntries()).toHaveLength(0);
  });

  it('captures error details in the diagnostic bundle', () => {
    const storage = fakeStorage();
    const logger = new DiagnosticLogger({ storage, initialize: false, now: () => 42 });
    logger.error('capture-failed', new Error('boom https://example.com/x?secret=1'));
    const bundle = JSON.parse(logger.createBundle({ locale: 'en' })) as {
      entries: Array<{ error?: { message: string } }>;
      lastError?: { message: string };
    };
    expect(bundle.entries[0]?.error?.message).toContain('[url:example.com]');
    expect(bundle.lastError?.message).toContain('[url:example.com]');
    expect(storage.values['xps:diagnostics:v1']).toBeTruthy();
  });
});

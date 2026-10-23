import { gmGetValue, gmSetValue } from './gm';
import { native, nativeApply, nativeClearTimeout, nativeSetTimeout } from './native';
import type {
  BuildTarget,
  DiagnosticBundleContext,
  DiagnosticEntry,
  DiagnosticError,
  LogLevel,
} from '../types';

const LOG_KEY = 'xps:diagnostics:v1';
const DEBUG_KEY = 'xps:debug:v1';
const MAX_ENTRIES = 100;
const MAX_BYTES = 64 * 1024;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PREFIX = '[X Post Screenshot]';

const VERSION = typeof __XPS_VERSION__ === 'string' && __XPS_VERSION__ ? __XPS_VERSION__ : 'dev';
const DEFAULT_BUILD_TARGET: BuildTarget =
  typeof __XPS_BUILD_TARGET__ === 'string' ? __XPS_BUILD_TARGET__ : 'dev';

export interface DiagnosticStorage {
  get: <T>(key: string, fallback: T) => T;
  set: (key: string, value: unknown) => boolean;
}

interface LoggerOptions {
  storage?: DiagnosticStorage;
  version?: string;
  buildTarget?: BuildTarget;
  now?: () => number;
  initialize?: boolean;
}

function sanitizeText(value: unknown, limit = 500): string {
  const text = String(value ?? '')
    .replace(/data:[^\s"'<>]+/g, '[data-url]')
    .replace(/https?:\/\/[^\s"'<>]+/g, (url) => {
      try {
        return `[url:${new URL(url).hostname}]`;
      } catch {
        return '[url]';
      }
    })
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

function sanitizeError(error: unknown): DiagnosticError {
  if (error instanceof Error) {
    return {
      name: sanitizeText(error.name, 100),
      message: sanitizeText(error.message, 1000),
      ...(error.stack ? { stack: sanitizeText(error.stack, 4000) } : {}),
    };
  }
  return {
    name: 'Error',
    message: sanitizeText(error, 1000),
  };
}

function sanitizeData(
  data: Record<string, unknown> | undefined,
): Record<string, string | number | boolean> | undefined {
  if (!data) {
    return undefined;
  }
  const result: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      result[key] = sanitizeText(value, 300);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      result[key] = value;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

export class DiagnosticLogger {
  private readonly storage: DiagnosticStorage;
  private readonly version: string;
  private readonly buildTarget: BuildTarget;
  private readonly now: () => number;
  private entries: DiagnosticEntry[] = [];
  private debugEnabled = false;
  private flushTimer: number | null = null;

  constructor(options: LoggerOptions = {}) {
    this.storage = options.storage ?? {
      get: gmGetValue,
      set: gmSetValue,
    };
    this.version = options.version ?? VERSION;
    this.buildTarget = options.buildTarget ?? DEFAULT_BUILD_TARGET;
    this.now = options.now ?? Date.now;
    if (options.initialize !== false) {
      this.load();
    }
  }

  get debug(): boolean {
    return this.debugEnabled;
  }

  getEntries(): DiagnosticEntry[] {
    return this.entries.map((entry) => ({
      ...entry,
      ...(entry.data ? { data: { ...entry.data } } : {}),
      ...(entry.error ? { error: { ...entry.error } } : {}),
    }));
  }

  setDebug(enabled: boolean): void {
    this.debugEnabled = enabled;
    this.storage.set(DEBUG_KEY, enabled);
    if (enabled) {
      this.writeConsole('debug', 'Diagnostics enabled');
    }
  }

  debugLog(event: string, options: Omit<DiagnosticEntry, 'ts' | 'level' | 'event'> = {}): void {
    if (this.debugEnabled) {
      this.add('debug', event, options);
    }
  }

  info(event: string, options: Omit<DiagnosticEntry, 'ts' | 'level' | 'event'> = {}): void {
    this.add('info', event, options);
  }

  warn(event: string, options: Omit<DiagnosticEntry, 'ts' | 'level' | 'event'> = {}): void {
    this.add('warn', event, options);
  }

  error(
    event: string,
    error: unknown,
    options: Omit<DiagnosticEntry, 'ts' | 'level' | 'event' | 'error'> = {},
  ): void {
    this.add('error', event, {
      ...options,
      error: sanitizeError(error),
      ...(options.message ? { message: sanitizeText(options.message, 1000) } : {}),
    });
    this.flush();
  }

  clear(): void {
    this.entries = [];
    this.storage.set(LOG_KEY, '[]');
  }

  flush(): void {
    if (this.flushTimer !== null) {
      nativeClearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.prune();
    try {
      this.storage.set(LOG_KEY, JSON.stringify(this.entries));
    } catch {
      // Keep the in-memory ring buffer if persistent storage fails.
    }
  }

  createBundle(context: DiagnosticBundleContext = {}): string {
    this.prune();
    const lastError = [...this.entries].reverse().find((entry) => entry.error)?.error;
    return JSON.stringify(
      {
        schema: 1,
        generatedAt: new Date(this.now()).toISOString(),
        version: this.version,
        buildTarget: this.buildTarget,
        context: {
          ...context,
          userAgent: sanitizeText(context.userAgent ?? navigator.userAgent, 300),
          page: sanitizePage(context.page ?? location.href),
        },
        entries: this.entries,
        lastError,
      },
      null,
      2,
    );
  }

  private load(): void {
    const debug = this.storage.get<unknown>(DEBUG_KEY, false);
    this.debugEnabled = debug === true;
    const raw = this.storage.get<string>(LOG_KEY, '[]');
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        this.entries = parsed.filter(isDiagnosticEntry);
      }
    } catch {
      this.entries = [];
    }
    this.prune();
  }

  private add(
    level: LogLevel,
    event: string,
    options: Omit<DiagnosticEntry, 'ts' | 'level' | 'event'> & { message?: string },
  ): void {
    const entry: DiagnosticEntry = {
      ts: this.now(),
      level,
      event,
      ...options,
      ...(options.message ? { message: sanitizeText(options.message, 1000) } : {}),
      ...(options.data ? { data: sanitizeData(options.data) } : {}),
    };
    this.entries.push(entry);
    this.prune();
    this.writeConsole(level, event, options.message, options.error);
    this.scheduleFlush();
  }

  private prune(): void {
    const cutoff = this.now() - TTL_MS;
    this.entries = this.entries.filter((entry) => entry.ts >= cutoff);
    if (this.entries.length > MAX_ENTRIES) {
      this.entries = this.entries.slice(this.entries.length - MAX_ENTRIES);
    }
    while (this.entries.length > 0 && byteLength(JSON.stringify(this.entries)) > MAX_BYTES) {
      this.entries.shift();
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimer !== null) {
      return;
    }
    this.flushTimer = nativeSetTimeout(() => {
      this.flushTimer = null;
      this.flush();
    }, 600);
  }

  private writeConsole(
    level: LogLevel,
    event: string,
    message?: string,
    error?: DiagnosticError,
  ): void {
    if (!this.debugEnabled) {
      return;
    }
    const method = native.console[level] ?? native.console.debug;
    try {
      nativeApply(method, native.pageWindow.console, [
        `${PREFIX} ${event}`,
        ...(message ? [message] : []),
        ...(error ? [error] : []),
      ]);
    } catch {
      // Console output is optional.
    }
  }
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function sanitizePage(value: string): string {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return '[page]';
  }
}

function isDiagnosticEntry(value: unknown): value is DiagnosticEntry {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const entry = value as Partial<DiagnosticEntry>;
  return (
    typeof entry.ts === 'number' &&
    typeof entry.event === 'string' &&
    (entry.level === 'debug' ||
      entry.level === 'info' ||
      entry.level === 'warn' ||
      entry.level === 'error')
  );
}

export const logger = new DiagnosticLogger();
export { LOG_KEY, DEBUG_KEY, MAX_ENTRIES, MAX_BYTES, TTL_MS, sanitizeText, sanitizeError };

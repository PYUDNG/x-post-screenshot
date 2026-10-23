export type Locale = 'en' | 'zh-CN' | 'zh-TW';
export type BuildTarget = 'github' | 'greasyfork' | 'dev';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface CaptureTarget {
  article: HTMLElement;
  trigger: HTMLElement;
  statusId: string | null;
  handle: string | null;
}

export interface CaptureResult {
  blob: Blob;
  filename: string;
  partial: boolean;
  width: number;
  height: number;
}

export interface CaptureOptions {
  pixelRatio?: number;
  timeoutMs?: number;
}

export interface DiagnosticError {
  name: string;
  message: string;
  stack?: string;
}

export interface DiagnosticEntry {
  ts: number;
  level: LogLevel;
  event: string;
  stage?: string;
  durationMs?: number;
  message?: string;
  data?: Record<string, string | number | boolean>;
  error?: DiagnosticError;
}

export interface DiagnosticBundleContext {
  locale?: Locale;
  theme?: 'light' | 'dark';
  page?: string;
  userAgent?: string;
}

export interface ResourceRequest {
  url: string;
  timeoutMs: number;
  signal?: AbortSignal;
}

export interface ResourceResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: ArrayBuffer | null;
  finalUrl?: string;
}

export type ResourceTransport = (request: ResourceRequest) => Promise<ResourceResponse>;

export interface ThemeInfo {
  background: string;
  foreground: string;
  dark: boolean;
}

export interface MenuInjection {
  menu: HTMLElement;
  item: HTMLElement;
  target: CaptureTarget;
  observer: MutationObserver | null;
  timeoutId: number | null;
}

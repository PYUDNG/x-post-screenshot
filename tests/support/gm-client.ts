export const unsafeWindow: Window | undefined =
  typeof window === 'undefined' ? undefined : window;

export interface GmTestResponseEvent {
  status: number;
  statusText: string;
  responseHeaders: string;
  response: ArrayBuffer;
  finalUrl?: string;
}

export interface GmTestRequestDetails {
  method?: string;
  url: string;
  responseType?: string;
  timeout?: number;
  anonymous?: boolean;
  onload?: (response: GmTestResponseEvent) => void;
  onerror?: () => void;
  ontimeout?: () => void;
  onabort?: () => void;
}

export interface GmTestDownloadDetails {
  url: string | Blob | File;
  name: string;
  saveAs?: boolean;
  timeout?: number;
  onload?: () => void;
  onerror?: (error: unknown) => void;
  ontimeout?: () => void;
}

interface GmAbortHandle {
  abort: () => void;
}

interface GmTestState {
  values: Map<string, unknown>;
  menuCommands: Map<string, () => void>;
  clipboard: string;
  requests: GmTestRequestDetails[];
  downloads: GmTestDownloadDetails[];
  throwOnRequest: boolean;
  throwOnDownload: boolean;
  throwOnStorage: boolean;
}

export const gmTestState: GmTestState = {
  values: new Map(),
  menuCommands: new Map(),
  clipboard: '',
  requests: [],
  downloads: [],
  throwOnRequest: false,
  throwOnDownload: false,
  throwOnStorage: false,
};

export function resetGmTestState(): void {
  gmTestState.values.clear();
  gmTestState.menuCommands.clear();
  gmTestState.clipboard = '';
  gmTestState.requests.length = 0;
  gmTestState.downloads.length = 0;
  gmTestState.throwOnRequest = false;
  gmTestState.throwOnDownload = false;
  gmTestState.throwOnStorage = false;
}

export function GM_getValue<T>(key: string, fallback?: T): T {
  if (gmTestState.throwOnStorage) {
    throw new Error('GM_getValue failed');
  }
  return (gmTestState.values.get(key) as T | undefined) ?? (fallback as T);
}

export function GM_setValue(key: string, value: unknown): void {
  if (gmTestState.throwOnStorage) {
    throw new Error('GM_setValue failed');
  }
  gmTestState.values.set(key, value);
}

export function GM_registerMenuCommand(caption: string, onClick: () => void): number {
  gmTestState.menuCommands.set(caption, onClick);
  return gmTestState.menuCommands.size;
}

export function GM_setClipboard(data: string, type: string): void {
  gmTestState.clipboard = `${type}:${data}`;
}

export function GM_download(details: GmTestDownloadDetails): GmAbortHandle {
  if (gmTestState.throwOnDownload) {
    throw new Error('GM_download failed');
  }
  gmTestState.downloads.push(details);
  return { abort: () => undefined };
}

export function GM_xmlhttpRequest(details: GmTestRequestDetails): GmAbortHandle {
  if (gmTestState.throwOnRequest) {
    throw new Error('GM_xmlhttpRequest failed');
  }
  gmTestState.requests.push(details);
  return {
    abort: () => details.onabort?.(),
  };
}

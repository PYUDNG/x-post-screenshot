import { getLocale, translate } from '../i18n';
import type { DiagnosticEntry, Locale } from '../types';
import { diagnosticsFilename, saveText } from './download';
import { gmRegisterMenuCommand, gmSetClipboard } from './gm';
import { logger } from './logging';
import { native, nativeAddEventListener, nativeQuerySelectorAll } from './native';
import { showToast } from './toast';
import { getPageTheme } from './theme';

interface DiagnosticsOptions {
  capture: (article?: HTMLElement) => Promise<void>;
}

interface DebugApi {
  version: string;
  capture: (article?: HTMLElement) => Promise<void>;
  inspectMenu: () => Array<Record<string, string | number | boolean>>;
  getLogs: () => DiagnosticEntry[];
  exportDiagnostics: () => Promise<boolean>;
  clearDiagnostics: () => void;
  getState: () => Record<string, string | boolean>;
}

let apiAttachedTo: Record<string, unknown> | null = null;
let optionsRef: DiagnosticsOptions | null = null;

function debugTarget(): Record<string, unknown> {
  return (typeof unsafeWindow !== 'undefined' ? unsafeWindow : globalThis) as unknown as Record<
    string,
    unknown
  >;
}

function diagnosticsContext(): { locale: Locale; theme: 'light' | 'dark'; page: string } {
  const theme = getPageTheme();
  return {
    locale: getLocale(),
    theme: theme.dark ? 'dark' : 'light',
    page: location.href,
  };
}

export async function exportDiagnostics(): Promise<boolean> {
  const bundle = logger.createBundle(diagnosticsContext());
  if (await saveText(bundle, diagnosticsFilename())) {
    showToast('success', translate(getLocale(), 'toastLogsExported'));
    return true;
  }
  if (gmSetClipboard(bundle, 'text')) {
    showToast('success', translate(getLocale(), 'toastLogsCopied'));
    return true;
  }
  showToast('error', translate(getLocale(), 'toastLogsExportFailed'), 5000);
  return false;
}

export function clearDiagnostics(): void {
  logger.clear();
  showToast('success', translate(getLocale(), 'toastLogsCleared'));
}

function inspectMenu(): Array<Record<string, string | number | boolean>> {
  return nativeQuerySelectorAll<HTMLElement>(document, '[role="menu"]').map((menu) => {
    const rect = menu.getBoundingClientRect();
    return {
      visibleWidth: Math.round(rect.width),
      visibleHeight: Math.round(rect.height),
      items: menu.querySelectorAll('[role="menuitem"]').length,
      hasOurItem: Array.from(menu.querySelectorAll('[role="menuitem"]')).some((item) =>
        item.textContent?.includes(translate(getLocale(), 'menuSavePost')),
      ),
    };
  });
}

function attachDebugApi(): void {
  if (!optionsRef || (!logger.debug && !import.meta.env.DEV)) {
    return;
  }
  const target = debugTarget();
  const api: DebugApi = Object.freeze({
    version: typeof __XPS_VERSION__ === 'string' && __XPS_VERSION__ ? __XPS_VERSION__ : 'dev',
    capture: optionsRef.capture,
    inspectMenu,
    getLogs: () => logger.getEntries(),
    exportDiagnostics,
    clearDiagnostics,
    getState: () => {
      const context = diagnosticsContext();
      return {
        version: typeof __XPS_VERSION__ === 'string' && __XPS_VERSION__ ? __XPS_VERSION__ : 'dev',
        build: typeof __XPS_BUILD_TARGET__ === 'string' ? __XPS_BUILD_TARGET__ : 'dev',
        debug: logger.debug,
        locale: context.locale,
        theme: context.theme,
      };
    },
  });
  target.__XPS_DEBUG__ = api;
  apiAttachedTo = target;
}

function detachDebugApi(): void {
  if (apiAttachedTo) {
    delete apiAttachedTo.__XPS_DEBUG__;
    apiAttachedTo = null;
  }
}

function toggleDiagnostics(): void {
  const enabled = !logger.debug;
  logger.setDebug(enabled);
  const locale = getLocale();
  if (enabled) {
    attachDebugApi();
    showToast('success', translate(locale, 'toastDebugEnabled'));
  } else {
    detachDebugApi();
    showToast('success', translate(locale, 'toastDebugDisabled'));
  }
  logger.flush();
}

function registerCommands(): void {
  const locale = getLocale();
  gmRegisterMenuCommand(translate(locale, 'menuToggleDiagnostics'), toggleDiagnostics);
  gmRegisterMenuCommand(translate(locale, 'menuExportDiagnostics'), () => {
    void exportDiagnostics();
  });
  gmRegisterMenuCommand(translate(locale, 'menuClearDiagnostics'), clearDiagnostics);
}

export function setupDiagnostics(options: DiagnosticsOptions): void {
  optionsRef = options;

  const onReady = () => {
    registerCommands();
    if (logger.debug || import.meta.env.DEV) {
      attachDebugApi();
    }
    logger.info('app-ready', {
      data: {
        locale: getLocale(),
        debug: logger.debug,
        theme: getPageTheme().dark ? 'dark' : 'light',
      },
    });
  };

  if (document.readyState === 'loading') {
    nativeAddEventListener(document, 'DOMContentLoaded', onReady, { once: true });
  } else {
    onReady();
  }

  nativeAddEventListener(native.pageWindow, 'pagehide', () => logger.flush(), {
    once: true,
  });
}

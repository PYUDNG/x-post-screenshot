import type { Locale } from './types';

export interface Messages {
  menuSavePost: string;
  toastCapturing: string;
  toastPreparingMedia: string;
  toastSaved: string;
  toastSavedPartial: string;
  toastFailed: string;
  toastDownloadFailed: string;
  toastBusy: string;
  toastDebugEnabled: string;
  toastDebugDisabled: string;
  toastLogsExported: string;
  toastLogsCopied: string;
  toastLogsExportFailed: string;
  toastLogsCleared: string;
  menuToggleDiagnostics: string;
  menuExportDiagnostics: string;
  menuClearDiagnostics: string;
}

const MESSAGES: Record<Locale, Messages> = {
  en: {
    menuSavePost: 'Save post as image',
    toastCapturing: 'Capturing post…',
    toastPreparingMedia: 'Preparing media…',
    toastSaved: 'Screenshot saved',
    toastSavedPartial: 'Screenshot saved; some media could not be loaded',
    toastFailed: 'Could not capture this post',
    toastDownloadFailed: 'Could not save the screenshot',
    toastBusy: 'A screenshot is already being generated',
    toastDebugEnabled: 'Diagnostics enabled',
    toastDebugDisabled: 'Diagnostics disabled',
    toastLogsExported: 'Diagnostics exported',
    toastLogsCopied: 'Diagnostics copied to clipboard',
    toastLogsExportFailed: 'Could not export diagnostics',
    toastLogsCleared: 'Diagnostics cleared',
    menuToggleDiagnostics: 'X Post Screenshot: Toggle diagnostics',
    menuExportDiagnostics: 'X Post Screenshot: Export diagnostics',
    menuClearDiagnostics: 'X Post Screenshot: Clear diagnostics',
  },
  'zh-CN': {
    menuSavePost: '保存帖子截图',
    toastCapturing: '正在生成帖子截图…',
    toastPreparingMedia: '正在准备媒体…',
    toastSaved: '截图已保存',
    toastSavedPartial: '截图已保存；部分媒体未能加载',
    toastFailed: '无法生成帖子截图',
    toastDownloadFailed: '无法保存截图文件',
    toastBusy: '正在生成另一张截图',
    toastDebugEnabled: '已开启诊断日志',
    toastDebugDisabled: '已关闭诊断日志',
    toastLogsExported: '诊断日志已导出',
    toastLogsCopied: '诊断日志已复制到剪贴板',
    toastLogsExportFailed: '无法导出诊断日志',
    toastLogsCleared: '诊断日志已清空',
    menuToggleDiagnostics: 'X 帖子截图：切换诊断日志',
    menuExportDiagnostics: 'X 帖子截图：导出诊断日志',
    menuClearDiagnostics: 'X 帖子截图：清空诊断日志',
  },
  'zh-TW': {
    menuSavePost: '儲存貼文截圖',
    toastCapturing: '正在產生貼文截圖…',
    toastPreparingMedia: '正在準備媒體…',
    toastSaved: '截圖已儲存',
    toastSavedPartial: '截圖已儲存；部分媒體未能載入',
    toastFailed: '無法產生貼文截圖',
    toastDownloadFailed: '無法儲存截圖檔案',
    toastBusy: '正在產生另一張截圖',
    toastDebugEnabled: '已開啟診斷日誌',
    toastDebugDisabled: '已關閉診斷日誌',
    toastLogsExported: '診斷日誌已匯出',
    toastLogsCopied: '診斷日誌已複製到剪貼簿',
    toastLogsExportFailed: '無法匯出診斷日誌',
    toastLogsCleared: '診斷日誌已清空',
    menuToggleDiagnostics: 'X 貼文截圖：切換診斷日誌',
    menuExportDiagnostics: 'X 貼文截圖：匯出診斷日誌',
    menuClearDiagnostics: 'X 貼文截圖：清空診斷日誌',
  },
};

export type MessageKey = keyof Messages;

export function isSupportedLocale(value: string): value is Locale {
  return value === 'en' || value === 'zh-CN' || value === 'zh-TW';
}

export function normalizeLocale(value: string | undefined): Locale {
  if (!value) {
    return 'en';
  }
  const normalized = value.trim().replace('_', '-').toLowerCase();
  if (
    normalized === 'zh-tw' ||
    normalized === 'zh-hk' ||
    normalized === 'zh-mo' ||
    normalized === 'zh-hant'
  ) {
    return 'zh-TW';
  }
  if (normalized === 'zh-cn' || normalized === 'zh-sg' || normalized === 'zh-hans') {
    return 'zh-CN';
  }
  if (normalized === 'zh') {
    return 'zh-CN';
  }
  return 'en';
}

export function detectLocale(
  pageLanguage: string | undefined,
  navigatorLanguages: readonly string[] | undefined,
): Locale {
  if (pageLanguage) {
    const trimmed = pageLanguage.trim().toLowerCase();
    if (trimmed === 'zh') {
      const navigatorLocale = navigatorLanguages?.find((language) =>
        language.toLowerCase().startsWith('zh'),
      );
      return normalizeLocale(navigatorLocale ?? 'zh-CN');
    }
    const normalized = normalizeLocale(pageLanguage);
    if (normalized !== 'en' || trimmed.startsWith('en')) {
      return normalized;
    }
  }
  const preferred = navigatorLanguages?.find((language) => normalizeLocale(language) !== 'en');
  return normalizeLocale(preferred ?? navigatorLanguages?.[0] ?? 'en');
}

export function getLocale(): Locale {
  const pageLanguage = typeof document !== 'undefined' ? document.documentElement.lang : undefined;
  const navigatorLanguages = typeof navigator !== 'undefined' ? navigator.languages : undefined;
  return detectLocale(pageLanguage, navigatorLanguages);
}

export function translate(locale: Locale, key: MessageKey): string {
  return (MESSAGES[locale] ?? MESSAGES.en)[key];
}

export function messagesFor(locale: Locale): Messages {
  return MESSAGES[locale] ?? MESSAGES.en;
}

import './platform/native';
import { getLocale, translate } from './i18n';
import { XpsError } from './platform/errors';
import { logger } from './platform/logging';
import { native, nativeAddEventListener, nativeRemoveEventListener } from './platform/native';
import { buildCaptureTargetFromArticle, installMenuIntegration } from './platform/menu';
import { captureArticle } from './platform/capture';
import { saveBlob } from './platform/download';
import { setupDiagnostics } from './platform/debug';
import { showToast } from './platform/toast';
import type { CaptureTarget } from './types';

let captureInFlight = false;
let lastTarget: CaptureTarget | null = null;

function isOurError(value: unknown): boolean {
  if (value instanceof XpsError) {
    return true;
  }
  if (value instanceof Error) {
    return value.stack?.includes('x-post-screenshot') ?? false;
  }
  return false;
}

async function runCapture(target: CaptureTarget): Promise<void> {
  if (captureInFlight) {
    showToast('progress', translate(getLocale(), 'toastBusy'), 2500);
    return;
  }

  captureInFlight = true;
  lastTarget = target;
  const locale = getLocale();
  showToast('progress', translate(locale, 'toastCapturing'), 0);
  logger.info('capture-requested', {
    data: {
      statusId: target.statusId ?? 'unknown',
      handle: target.handle ?? 'unknown',
    },
  });

  const onWindowError = (event: Event) => {
    const error = (event as ErrorEvent).error;
    if (isOurError(error)) {
      logger.error('window-error', error);
    }
  };
  const onUnhandledRejection = (event: Event) => {
    const reason = (event as PromiseRejectionEvent).reason;
    if (isOurError(reason)) {
      logger.error('unhandled-rejection', reason);
    }
  };

  nativeAddEventListener(native.pageWindow, 'error', onWindowError);
  nativeAddEventListener(native.pageWindow, 'unhandledrejection', onUnhandledRejection);

  try {
    const result = await captureArticle(target);
    const saved = await saveBlob(result.blob, result.filename);
    if (!saved) {
      throw new XpsError('download-failed', 'download', 'Could not save the screenshot');
    }
    if (result.partial) {
      showToast('success', translate(getLocale(), 'toastSavedPartial'), 5000);
    } else {
      showToast('success', translate(getLocale(), 'toastSaved'), 3200);
    }
    logger.info('capture-saved', {
      data: {
        width: result.width,
        height: result.height,
        partial: result.partial,
      },
    });
  } catch (error) {
    logger.error('capture-failed', error, {
      data: { statusId: target.statusId ?? 'unknown' },
    });
    if (error instanceof XpsError && error.code === 'download-failed') {
      showToast('error', translate(getLocale(), 'toastDownloadFailed'), 5000);
    } else {
      showToast('error', translate(getLocale(), 'toastFailed'), 5000);
    }
  } finally {
    captureInFlight = false;
    nativeRemoveEventListener(native.pageWindow, 'error', onWindowError);
    nativeRemoveEventListener(native.pageWindow, 'unhandledrejection', onUnhandledRejection);
    logger.flush();
  }
}

function debugCapture(article?: HTMLElement): Promise<void> {
  const targetArticle =
    article ?? lastTarget?.article ?? document.querySelector<HTMLElement>('article');
  if (!targetArticle) {
    return Promise.reject(new XpsError('no-article', 'debug', 'No post article found'));
  }
  return runCapture(buildCaptureTargetFromArticle(targetArticle));
}

try {
  installMenuIntegration((target) => {
    lastTarget = target;
    void runCapture(target);
  });

  setupDiagnostics({
    capture: debugCapture,
  });
} catch (error) {
  logger.error('app-init-failed', error);
}

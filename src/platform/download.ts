import { gmDownloadBlob } from './gm';
import { native, nativeApply, nativeSetTimeout } from './native';

function triggerAnchorDownload(blob: Blob, filename: string): boolean {
  try {
    const url = native.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    (document.body ?? document.documentElement).append(anchor);
    nativeApply(native.anchorClick, anchor, []);
    anchor.remove();
    nativeSetTimeout(() => {
      try {
        native.URL.revokeObjectURL(url);
      } catch {
        // The URL may already be revoked by the browser.
      }
    }, 60_000);
    return true;
  } catch {
    return false;
  }
}

export async function saveBlob(blob: Blob, filename: string): Promise<boolean> {
  if (await gmDownloadBlob({ blob, name: filename })) {
    return true;
  }
  return triggerAnchorDownload(blob, filename);
}

export function saveText(
  text: string,
  filename: string,
  type = 'application/json',
): Promise<boolean> {
  return saveBlob(new Blob([text], { type }), filename);
}

export function diagnosticsFilename(now = new Date()): string {
  const stamp = now
    .toISOString()
    .replaceAll(':', '-')
    .replace(/\.\d{3}Z$/, 'Z');
  return `xps-diagnostics-${stamp}.json`;
}

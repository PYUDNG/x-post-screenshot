import { resolve } from 'node:path';
import type { Plugin } from 'vite';

const VIRTUAL_MODULE_ID = 'virtual:xps-runtime';
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`;
const RUNTIME_PATH = resolve(process.cwd(), 'src/platform/xps-runtime.ts');
const TRANSFORMED_MODULES = new Set(['dataurl.js', 'embed-webfonts.js']);

/**
 * Replaces the two global fetch calls used by html-to-image with our
 * GM-backed resource fetcher. It also redirects html-to-image console calls
 * into the extension's diagnostic logger.
 */
export function transformHtmlToImageCode(code: string, id: string): string | null {
  const normalizedId = id.replaceAll('\\', '/').split('?')[0] ?? '';
  const fileName = normalizedId.split('/').at(-1);

  if (
    !normalizedId.includes('/html-to-image/') ||
    !fileName ||
    !TRANSFORMED_MODULES.has(fileName)
  ) {
    return null;
  }

  if (!/\bfetch\s*\(/.test(code)) {
    return null;
  }

  const transformed = code
    .replace(/\bfetch\s*\(/g, '__xpsFetch(')
    .replace(/\bconsole\./g, '__xpsConsole.');

  return [
    '/*! xps-html-to-image-runtime-injected */',
    `import { xpsFetch as __xpsFetch, xpsConsole as __xpsConsole } from '${VIRTUAL_MODULE_ID}';`,
    transformed,
  ].join('\n');
}

export function htmlToImageRuntimePlugin(): Plugin {
  return {
    name: 'xps-html-to-image-runtime',
    enforce: 'pre',
    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID;
      }
      return null;
    },
    load(id) {
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        return `export { xpsFetch, xpsConsole } from ${JSON.stringify(RUNTIME_PATH)};`;
      }
      return null;
    },
    transform(code, id) {
      const transformed = transformHtmlToImageCode(code, id);
      return transformed === null ? null : { code: transformed, map: null };
    },
  };
}

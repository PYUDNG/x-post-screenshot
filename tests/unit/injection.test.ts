import { describe, expect, it } from 'vitest';
import { transformHtmlToImageCode } from '../../vite/html-to-image-runtime';

describe('html-to-image runtime injection', () => {
  it('redirects the two library fetch calls to the virtual runtime', () => {
    const code = `
      export async function fetchAsDataURL(url) {
        const res = await fetch(url, undefined)
        return res
      }
      console.warn('remote css failed')
    `;
    const transformed = transformHtmlToImageCode(
      code,
      '/repo/node_modules/html-to-image/es/dataurl.js',
    );
    expect(transformed).toContain("from 'virtual:xps-runtime'");
    expect(transformed).toContain('__xpsFetch(url, undefined)');
    expect(transformed).toContain('__xpsConsole.warn');
    expect(transformed).not.toContain('await fetch(url');
  });

  it('does not touch unrelated modules', () => {
    const code = 'export const fetchCount = 1;';
    expect(
      transformHtmlToImageCode(code, '/repo/node_modules/html-to-image/es/index.js'),
    ).toBeNull();
    expect(transformHtmlToImageCode(code, '/repo/src/other.ts')).toBeNull();
  });
});

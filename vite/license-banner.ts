import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

export function licenseBannerPlugin(banner: string): Plugin {
  return {
    name: 'xps-license-banner',
    apply: 'build',
    closeBundle() {
      const dist = resolve(process.cwd(), 'dist');
      for (const name of readdirSync(dist)) {
        if (!name.endsWith('.user.js')) {
          continue;
        }
        const path = resolve(dist, name);
        const code = readFileSync(path, 'utf8');
        const metadataStart = code.indexOf('// ==UserScript==');
        if (metadataStart < 0) {
          throw new Error(`${name} does not contain a userscript metadata block`);
        }
        const source = code.slice(metadataStart).replace(banner, '');
        const marker = '// ==/UserScript==';
        const markerIndex = source.indexOf(marker);
        if (markerIndex < 0) {
          throw new Error(`${name} has an incomplete userscript metadata block`);
        }
        const insertAt = markerIndex + marker.length;
        const newline = source[insertAt] === '\r' ? '\r\n' : '\n';
        writeFileSync(
          path,
          `${source.slice(0, insertAt)}${newline}${banner}${source.slice(insertAt)}`,
        );
      }
    },
  };
}

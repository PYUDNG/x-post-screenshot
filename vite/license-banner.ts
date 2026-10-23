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
        if (!code.startsWith(banner)) {
          writeFileSync(path, `${banner}\n${code}`);
        }
      }
    },
  };
}

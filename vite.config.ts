import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';
import { htmlToImageRuntimePlugin } from './vite/html-to-image-runtime.ts';
import { licenseBannerPlugin } from './vite/license-banner.ts';

const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as {
  version: string;
};
const iconSvg = readFileSync(new URL('./assets/icon.svg', import.meta.url), 'utf8').trim();
const iconDataUrl = `data:image/svg+xml;base64,${Buffer.from(iconSvg).toString('base64')}`;
const repositoryUrl = 'https://github.com/PY-DNG/x-post-screenshot';
const releaseUrl = `${repositoryUrl}/releases/latest/download/x-post-screenshot.user.js`;

export default defineConfig(({ mode }) => {
  const isGreasyfork = mode === 'greasyfork';
  const fileName = isGreasyfork
    ? 'x-post-screenshot.greasyfork.user.js'
    : 'x-post-screenshot.user.js';

  return {
    plugins: [
      htmlToImageRuntimePlugin(),
      licenseBannerPlugin(
        `/*! X Post Screenshot v${packageJson.version} | MIT | bundled html-to-image 1.11.13 (MIT) https://github.com/bubkoo/html-to-image */`,
      ),
      monkey({
        entry: 'src/main.ts',
        userscript: {
          name: {
            '': 'X Post Screenshot',
            en: 'X Post Screenshot',
            'zh-CN': 'X 帖子截图',
            'zh-TW': 'X 貼文截圖',
          },
          description: {
            '': 'Save an X post as a PNG image.',
            en: 'Save an X post as a PNG image.',
            'zh-CN': '将 X 帖子保存为 PNG 图片。',
            'zh-TW': '將 X 貼文儲存為 PNG 圖片。',
          },
          namespace: repositoryUrl,
          version: packageJson.version,
          author: 'PY-DNG',
          license: 'MIT',
          icon: iconDataUrl,
          homepageURL: repositoryUrl,
          supportURL: `${repositoryUrl}/issues`,
          source: repositoryUrl,
          match: [
            'https://x.com/*',
            'https://www.x.com/*',
            'https://mobile.x.com/*',
            'https://twitter.com/*',
            'https://www.twitter.com/*',
            'https://mobile.twitter.com/*',
          ],
          grant: [
            'GM_xmlhttpRequest',
            'GM_getValue',
            'GM_setValue',
            'GM_registerMenuCommand',
            'GM_setClipboard',
            'GM_download',
          ],
          connect: ['*.twimg.com', '*.pscp.tv'],
          noframes: true,
          'run-at': 'document-start',
          ...(isGreasyfork
            ? {}
            : {
                updateURL: releaseUrl,
                downloadURL: releaseUrl,
              }),
        },
        build: {
          fileName,
          metaFileName: true,
          autoGrant: false,
        },
        server: {
          open: false,
        },
      }),
    ],
    optimizeDeps: {
      exclude: ['html-to-image'],
    },
    define: {
      __XPS_BUILD_TARGET__: JSON.stringify(isGreasyfork ? 'greasyfork' : 'github'),
      __XPS_VERSION__: JSON.stringify(packageJson.version),
    },
    build: {
      target: 'es2022',
      minify: isGreasyfork ? false : true,
      sourcemap: false,
      emptyOutDir: false,
      cssMinify: !isGreasyfork,
      rollupOptions: {},
    },
  };
});

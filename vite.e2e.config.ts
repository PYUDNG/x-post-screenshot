import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { htmlToImageRuntimePlugin } from './vite/html-to-image-runtime.ts';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: fileURLToPath(new URL('./tests/e2e/fixture', import.meta.url)),
  plugins: [htmlToImageRuntimePlugin()],
  resolve: {
    alias: {
      $: fileURLToPath(new URL('./tests/support/gm-client.ts', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['html-to-image'],
  },
  define: {
    __XPS_BUILD_TARGET__: JSON.stringify('dev'),
    __XPS_VERSION__: JSON.stringify('0.1.0'),
  },
  server: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
    fs: {
      allow: [projectRoot],
    },
  },
});

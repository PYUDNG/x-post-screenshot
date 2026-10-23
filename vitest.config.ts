import { defineConfig } from 'vitest/config';
import { htmlToImageRuntimePlugin } from './vite/html-to-image-runtime.ts';

export default defineConfig({
  plugins: [htmlToImageRuntimePlugin()],
  optimizeDeps: {
    exclude: ['html-to-image'],
  },
  define: {
    __XPS_BUILD_TARGET__: JSON.stringify('dev'),
    __XPS_VERSION__: JSON.stringify('0.1.0'),
  },
  test: {
    environment: 'happy-dom',
    include: ['tests/unit/**/*.test.ts'],
    restoreMocks: true,
    clearMocks: true,
  },
});

import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
      '.playwright-mcp/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'no-undef': 'off',
      'no-eval': 'error',
      'no-new-func': 'error',
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Use the GM-backed xpsFetch adapter.' },
        { name: 'XMLHttpRequest', message: 'Use GM_xmlhttpRequest.' },
        { name: 'localStorage', message: 'Use GM storage.' },
        { name: 'sessionStorage', message: 'Use GM storage.' },
        { name: 'indexedDB', message: 'Use GM storage.' },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: ['src/platform/native.ts', 'src/platform/logging.ts', 'src/platform/debug.ts'],
    rules: {
      'no-console': 'error',
    },
  },
  {
    files: ['tests/**/*.ts', 'tests/**/*.mjs', 'scripts/**/*.mjs', 'vite/**/*.ts'],
    rules: {
      'no-restricted-globals': 'off',
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.mjs', 'eslint.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  prettier,
);

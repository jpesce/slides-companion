import js from '@eslint/js';
import globals from 'globals';
import playwright from 'eslint-plugin-playwright';

export default [
  {
    ignores: [
      'benchmark/',
      'build/',
      'node_modules/',
      'playwright-report/',
      'test-results/',
      '.chromium-profile/',
      // Generated: npm run messages, npm run illustrations and npm run brand.
      'extension/messages.js',
      'extension/illustrations.js',
      'extension/companion-drawing.js',
    ],
  },
  js.configs.recommended,
  {
    rules: {
      // `catch {}` is how the code says "expected to fail, nothing to do", and each has its reason.
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
  // The extension: classic scripts (content scripts, its pages and the service worker), which share
  // what they need through globalThis.slidesCompanion.
  {
    files: ['extension/**/*.js'],
    languageOptions: {
      sourceType: 'script',
      globals: { ...globals.browser, ...globals.webextensions },
    },
  },
  {
    files: ['extension/background.js', 'extension/dev-reload.js'],
    languageOptions: { globals: globals.serviceworker },
  },
  // Scripts and tests run in Node, and hand functions to pages and to the extension's service worker
  // (evaluate), which run there.
  {
    files: ['scripts/**/*.{js,mjs}', 'tests/**/*.js', '*.js'],
    languageOptions: {
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser, ...globals.webextensions },
    },
  },
  {
    files: ['tests/**/*.js'],
    ...playwright.configs['flat/recommended'],
  },
];

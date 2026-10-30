import { test as base, chromium } from '@playwright/test';
import path from 'node:path';

export const extensionPath = path.resolve(import.meta.dirname, '../extension');

// Our test deck. The test browser is signed out, so it must be shared as "Anyone with the link".
// Override with TEST_DECK_URL.
export const deckUrl =
  process.env.TEST_DECK_URL ??
  'https://docs.google.com/presentation/d/1XouicC310558IOk_VJ7uu55kxBO7TY-19suR998ONOo/edit';

// Branded Chrome ignores --load-extension since v137, so this uses Playwright's Chromium.
export const test = base.extend({
  context: async ({ headless }, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless,
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    });
    await use(context);
    await context.close();
  },
  serviceWorker: async ({ context }, use) => {
    const [worker] = context.serviceWorkers();
    await use(worker ?? (await context.waitForEvent('serviceworker')));
  },
});

export const expect = test.expect;

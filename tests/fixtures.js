import { test as base, chromium } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const extensionPath = path.resolve(import.meta.dirname, '../extension');

// Our test deck. The test browser is signed out, so it must be shared as "Anyone with the link".
// Override with TEST_DECK_URL.
export const deckUrl =
  process.env.TEST_DECK_URL ??
  'https://docs.google.com/presentation/d/1XouicC310558IOk_VJ7uu55kxBO7TY-19suR998ONOo/edit';

// Chrome asks the presenter before giving the extension every site (Settings), and a test can't
// answer it. With `test.use({ allSites: true })`, the extension is loaded from a copy that has
// every site from the start.
let allSitesPath;
function allSitesExtension() {
  if (allSitesPath) return allSitesPath;
  allSitesPath = fs.mkdtempSync(path.join(os.tmpdir(), 'slides-companion-all-sites-'));
  fs.cpSync(extensionPath, allSitesPath, { recursive: true });
  const manifestPath = path.join(allSitesPath, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.host_permissions.push(...manifest.optional_host_permissions);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  return allSitesPath;
}

// Branded Chrome ignores --load-extension since v137, so this uses Playwright's Chromium.
export const test = base.extend({
  allSites: [false, { option: true }],
  context: async ({ headless, allSites }, use) => {
    const extension = allSites ? allSitesExtension() : extensionPath;
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless,
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
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

// Opens Settings from the companion, on a feature's page.
export async function openSettings(page, feature) {
  await page.locator('.slides-companion-button').click();
  await page.getByRole('dialog', { name: 'Slides Companion settings' }).getByRole('tab', { name: feature }).click();
}

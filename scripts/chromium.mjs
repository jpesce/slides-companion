// Opens Playwright's Chromium with the extension loaded, for poking at it by hand.
// Uses a persistent profile in .chromium-profile/ so settings survive between runs.
import { chromium } from '@playwright/test';
import path from 'node:path';
import { extensionPath, deckUrl } from '../tests/fixtures.js';

const profileDir = path.resolve(import.meta.dirname, '../.chromium-profile');
const context = await chromium.launchPersistentContext(profileDir, {
  channel: 'chromium',
  headless: false,
  viewport: null,
  args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
});
const page = context.pages()[0] ?? (await context.newPage());
await page.goto(process.argv[2] ?? deckUrl);
context.on('close', () => process.exit(0));

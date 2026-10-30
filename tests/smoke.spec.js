import { test, expect, deckUrl } from './fixtures.js';

test('service worker starts', async ({ serviceWorker }) => {
  expect(serviceWorker.url()).toMatch(/^chrome-extension:\/\/[a-p]{32}\/background\.js$/);
});

test('content script runs on a Slides deck', async ({ context }) => {
  const page = await context.newPage();
  await page.goto(deckUrl);
  await expect(page.locator('html')).toHaveAttribute('data-slides-companion', /^\d+\.\d+\.\d+$/);
});

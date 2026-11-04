import { test, expect, deckUrl } from './fixtures.js';

// With every site allowed from Settings (card 56). Chrome's header rule doesn't apply to pages a
// test plays, so these go to real sites: google.com refuses being shown inside another page.
test.use({ allSites: true });

// Slide 4 of the test deck: a photo linked to google.com.
const slide = `${deckUrl}#slide=id.h2c87d6044fe40693_46_0`;
const LINKED_PHOTO = 'h2c87d6044fe40693_46_2';
const link = (show) => show.locator(`[id="${LINKED_PHOTO}"] a`).first();
const stage = (show) => show.locator('.slides-companion-spotlight');
const website = (show) => stage(show).locator('iframe.slides-companion-spotlight-website');
const site = (show) => stage(show).locator('.slides-companion-spotlight-site');
const frameAt = (page, start) => page.frames().find((frame) => frame.url().startsWith(start));
const sessionRules = (serviceWorker) => serviceWorker.evaluate(() => chrome.declarativeNetRequest.getSessionRules());

async function centre(locator) {
  const box = await locator.boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function openLinkedPage(context) {
  const page = await context.newPage();
  await page.goto(slide);
  await expect(page.locator(`#workspace [id="editor-${LINKED_PHOTO}"] image`)).toBeVisible();
  await page.locator('#punch-start-presentation-left').click();
  const show = page.frameLocator('iframe.punch-present-iframe');
  await expect.poll(async () => (await link(show).boundingBox())?.y).toBeGreaterThan(0);
  const { x, y } = await centre(link(show));
  await page.mouse.click(x, y);
  await expect(website(show)).toBeVisible();
  await expect.poll(() => frameAt(page, 'https://www.google.com/')?.evaluate(() => document.readyState === 'complete').catch(() => false)).toBe(true);
  return { page, show, google: frameAt(page, 'https://www.google.com/') };
}

// Into the page: the pointer goes over it, and a click puts the keys there.
async function clickIntoPage(page, show) {
  const { x, y } = await centre(website(show));
  await page.mouse.move(x, y - 10, { steps: 5 });
  await page.mouse.click(x, y + 100);
}

test('a site that refuses to be shown in another page opens over the slide', async ({ context, serviceWorker }) => {
  expect(await sessionRules(serviceWorker)).toHaveLength(0);
  const { page, show, google } = await openLinkedPage(context);
  // Google's own page, not Chrome's "refused to connect".
  expect(await google.title()).toBe('Google');
  expect(await sessionRules(serviceWorker)).toHaveLength(1);

  await page.keyboard.press('Escape');
  await expect(stage(show)).toHaveCount(0);
  // Other pages and frames keep the sites' rules again.
  await expect.poll(() => sessionRules(serviceWorker)).toHaveLength(0);
});

test('Esc closes the page even after clicking into it', async ({ context }) => {
  const { page, show, google } = await openLinkedPage(context);
  await clickIntoPage(page, show);
  await expect.poll(() => google.evaluate(() => document.hasFocus())).toBe(true);

  await page.keyboard.press('Escape');
  await expect(stage(show)).toHaveCount(0);
  // Still presenting, on the same slide.
  await expect(page.locator('iframe.punch-present-iframe')).toBeVisible();
  await expect(show.locator('.punch-viewer-svgpage-a11yelement')).toHaveAttribute('aria-label', /^Slide 4\b/);
});

test('Open in new tab opens the page browsed to', async ({ context }) => {
  const { page, show, google } = await openLinkedPage(context);
  await google.evaluate(() => location.assign('https://example.com/'));
  await expect(site(show)).toHaveText('example.com');
  // A site moving to another of its pages without loading one.
  await frameAt(page, 'https://example.com/').evaluate(() => history.pushState(null, '', '/moved'));

  const opened = context.waitForEvent('page');
  await page.mouse.move((await centre(site(show))).x, (await centre(site(show))).y, { steps: 3 });
  await stage(show).locator('.slides-companion-spotlight-new-tab').click();
  expect((await opened).url()).toBe('https://example.com/moved');
  await expect(stage(show)).toHaveCount(0);
});

test('the Settings checkbox shows every site is allowed, like the dialog’s other checkboxes', async ({ context }) => {
  const page = await context.newPage();
  await page.goto(deckUrl);
  await page.locator('.slides-companion-button').click();
  const dialog = page.getByRole('dialog', { name: 'Slides Companion settings' });
  const allSites = dialog.frameLocator('iframe.slides-companion-dialog-frame').getByRole('checkbox', { name: /Show every site over the slide/ });
  await expect(allSites).toBeChecked();

  // The same box, place and type as "Spotlight an image when you click it".
  const own = dialog.locator('label', { hasText: 'Spotlight an image when you click it' });
  const framed = dialog.frameLocator('iframe.slides-companion-dialog-frame').locator('label');
  const type = (row) =>
    row.evaluate((label) => {
      const text = getComputedStyle(label.querySelector('.slides-companion-dialog-label'));
      const hint = getComputedStyle(label.querySelector('.slides-companion-dialog-hint'));
      return [text.font, text.color, text.letterSpacing, hint.font, hint.color, document.fonts.check(text.font)];
    });
  await expect.poll(() => own.locator('.slides-companion-checkbox').boundingBox().then((box) => box.width)).toBe(36);
  const box = (row) => row.locator('.slides-companion-checkbox').boundingBox();
  const [ownBox, framedBox] = [await box(own), await box(framed)];
  expect([framedBox.x, framedBox.width, framedBox.height]).toEqual([ownBox.x, ownBox.width, ownBox.height]);
  expect(await type(framed)).toEqual(await type(own));
});

test('Back and Forward go through the pages visited, never taking the tab anywhere', async ({ context }) => {
  const { page, show, google } = await openLinkedPage(context);
  const back = stage(show).locator('.slides-companion-spotlight-back');
  const forward = stage(show).locator('.slides-companion-spotlight-forward');
  const showBars = async () => {
    const { x, y } = await centre(site(show));
    await page.mouse.move(x, y + 2, { steps: 3 });
  };
  const shown = () => page.frames().find((frame) => frame.name() === 'slides-companion-page')?.url();
  const editor = page.url();
  const tabHistory = await page.evaluate(() => history.length);

  await expect(back).toBeDisabled();
  await expect(forward).toBeDisabled();
  await google.evaluate(() => location.assign('https://example.com/'));
  await expect(site(show)).toHaveText('example.com');
  await frameAt(page, 'https://example.com/').evaluate(() => history.pushState(null, '', '/moved'));
  await expect(back).toBeEnabled();

  await showBars();
  await back.click();
  await expect.poll(shown).toBe('https://example.com/');
  await back.click();
  await expect.poll(shown).toBe('https://www.google.com/');
  await expect(site(show)).toHaveText('google.com');
  await expect(back).toBeDisabled();
  await forward.click();
  await expect.poll(shown).toBe('https://example.com/');
  await expect(forward).toBeEnabled();

  // Somewhere new from the middle: the way forward goes.
  await frameAt(page, 'https://example.com/').evaluate(() => location.assign('https://example.org/'));
  await expect(site(show)).toHaveText('example.org');
  await expect(forward).toBeDisabled();
  await back.click();
  await expect.poll(shown).toBe('https://example.com/');

  expect(page.url()).toBe(editor);
  // The tab's history has only the page's own three moves; Back and Forward added none.
  expect(await page.evaluate(() => history.length)).toBe(tabHistory + 3);
});

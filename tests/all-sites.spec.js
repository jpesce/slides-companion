import { test, expect, deckUrl, press } from './fixtures.js';

// With every site allowed from Settings. Chrome's header rule doesn't apply to pages a
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
// The page's frame, by the name page.js knows it by (with which Back or Forward brought it there).
const shownIn = (page) => () =>
  page
    .frames()
    .find((frame) => frame.name().startsWith('slides-companion-page'))
    ?.url();
const sessionRules = (serviceWorker) =>
  serviceWorker.evaluate(() => chrome.declarativeNetRequest.getSessionRules());

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
  await expect
    .poll(() =>
      frameAt(page, 'https://www.google.com/')
        ?.evaluate(() => document.readyState === 'complete')
        .catch(() => false),
    )
    .toBe(true);
  return { page, show, google: frameAt(page, 'https://www.google.com/') };
}

// Into the page: the pointer goes over it, and a click puts the keys there.
async function clickIntoPage(page, show) {
  const { x, y } = await centre(website(show));
  await page.mouse.move(x, y - 10, { steps: 5 });
  await page.mouse.click(x, y + 100);
}

test('a site that refuses to be shown in another page opens over the slide', async ({
  context,
  serviceWorker,
}) => {
  expect(await sessionRules(serviceWorker)).toHaveLength(0);
  const { page, show, google } = await openLinkedPage(context);
  // Google's own page, not Chrome's "refused to connect".
  expect(await google.title()).toBe('Google');
  expect(await sessionRules(serviceWorker)).toHaveLength(1);
  // With every site allowed, Spotlight doesn't check whether it refuses, nor say so.
  await expect(
    stage(show).locator('.slides-companion-spotlight-probe, .slides-companion-spotlight-refused'),
  ).toHaveCount(0);

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
  await expect(show.locator('.punch-viewer-svgpage-a11yelement')).toHaveAttribute(
    'aria-label',
    /^Slide 4\b/,
  );
});

test('Open in new tab opens the page browsed to', async ({ context }) => {
  const { page, show, google } = await openLinkedPage(context);
  await google.evaluate(() => location.assign('https://example.com/'));
  await expect(site(show)).toHaveText('example.com');
  // A site moving to another of its pages without loading one.
  await frameAt(page, 'https://example.com/').evaluate(() => history.pushState(null, '', '/moved'));

  const opened = context.waitForEvent('page');
  await page.mouse.move((await centre(site(show))).x, (await centre(site(show))).y, { steps: 3 });
  await press(page, stage(show).locator('.slides-companion-spotlight-new-tab'));
  expect((await opened).url()).toBe('https://example.com/moved');
  await expect(stage(show)).toHaveCount(0);
});

// Google's viewer shows a PDF, page.js in it too, and the bar is the PDF's.
test('a PDF opens in Google’s viewer, with the PDF’s site, and Esc and Open in new tab work there', async ({
  context,
}) => {
  const PDF = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
  const page = await context.newPage();
  await page.goto(slide);
  await expect(page.locator(`#workspace [id="editor-${LINKED_PHOTO}"] image`)).toBeVisible();
  await page.locator('#punch-start-presentation-left').click();
  const show = page.frameLocator('iframe.punch-present-iframe');
  await expect.poll(async () => (await link(show).boundingBox())?.y).toBeGreaterThan(0);
  await show
    .locator(`[id="${LINKED_PHOTO}"] a`)
    .evaluateAll((links, href) => links.forEach((link) => link.setAttribute('href', href)), PDF);
  const open = async () => {
    const { x, y } = await centre(link(show));
    await page.mouse.click(x, y);
    await expect(
      show
        .frameLocator('iframe.slides-companion-spotlight-website')
        .locator('img[src^="blob:"]')
        .first(),
    ).toBeVisible({ timeout: 20000 });
  };
  await open();
  await expect(site(show)).toHaveText('w3.org');
  // page.js says where it is (Back shows), and no page was added to go back to.
  const back = stage(show).locator('.slides-companion-spotlight-back');
  await expect(back).toHaveJSProperty('hidden', false);
  await expect(back).toBeDisabled();

  // Into the viewer's page number. (A click on the PDF itself leaves the keys with the slideshow.)
  const { x, y } = await centre(website(show));
  await page.mouse.move(x, y - 10, { steps: 5 });
  const box = await show
    .frameLocator('iframe.slides-companion-spotlight-website')
    .locator('input')
    .first()
    .boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect
    .poll(() =>
      frameAt(page, 'https://docs.google.com/viewer')?.evaluate(() => document.hasFocus()),
    )
    .toBe(true);
  await page.keyboard.press('Escape');
  await expect(stage(show)).toHaveCount(0);
  await expect(show.locator('.punch-viewer-svgpage-a11yelement')).toHaveAttribute(
    'aria-label',
    /^Slide 4\b/,
  );

  await open();
  const opened = context.waitForEvent('page');
  await page.mouse.move((await centre(site(show))).x, (await centre(site(show))).y, { steps: 3 });
  await press(page, stage(show).locator('.slides-companion-spotlight-new-tab'));
  const tab = await opened;
  expect(tab.url()).toBe(PDF);
  // Chrome's viewer, left open, holds the browser's closing up for half a minute.
  await tab.close();
});

// Nothing refuses, so the extension asks the site what a link is; a PDF goes to Google's
// viewer, not Chrome's "blocked" page.
test('a PDF whose address doesn’t end in .pdf (arXiv’s) shows in Google’s viewer', async ({
  context,
}) => {
  const ARXIV = 'https://arxiv.org/pdf/1706.03762';
  const page = await context.newPage();
  await page.goto(slide);
  await expect(page.locator(`#workspace [id="editor-${LINKED_PHOTO}"] image`)).toBeVisible();
  await page.locator('#punch-start-presentation-left').click();
  const show = page.frameLocator('iframe.punch-present-iframe');
  await expect.poll(async () => (await link(show).boundingBox())?.y).toBeGreaterThan(0);
  await show
    .locator(`[id="${LINKED_PHOTO}"] a`)
    .evaluateAll((links, href) => links.forEach((link) => link.setAttribute('href', href)), ARXIV);
  const { x, y } = await centre(link(show));
  await page.mouse.click(x, y);
  const viewer = new URL('https://docs.google.com/viewer?embedded=true');
  viewer.searchParams.set('url', ARXIV);
  viewer.searchParams.set('hl', await show.locator('html').getAttribute('lang'));
  await expect(website(show)).toHaveAttribute('src', viewer.href, { timeout: 15000 });
  await expect(
    show
      .frameLocator('iframe.slides-companion-spotlight-website')
      .locator('img[src^="blob:"]')
      .first(),
  ).toBeVisible({ timeout: 20000 });
  await expect(site(show)).toHaveText('arxiv.org');
});

test('with every site allowed, Settings doesn’t ask for it', async ({ context }) => {
  const page = await context.newPage();
  await page.goto(deckUrl);
  await page.locator('.slides-companion-button').click();
  const dialog = page.getByRole('dialog', { name: 'Slides Companion settings' });
  const links = dialog.getByRole('tab', { name: 'Links' });
  await links.click();
  // The frame knows, and takes no room: the choices sit right under the intro, as on other pages.
  await expect(
    dialog.frameLocator('iframe.slides-companion-dialog-frame').locator('p'),
  ).toBeHidden();
  await expect
    .poll(() =>
      dialog
        .locator('iframe.slides-companion-dialog-frame')
        .evaluate((frame) => frame.offsetHeight),
    )
    .toBe(0);
  const intro = await dialog
    .getByRole('tabpanel')
    .locator('.slides-companion-dialog-text')
    .boundingBox();
  const group = await dialog
    .getByRole('group', { name: 'When you click a link during a slideshow' })
    .boundingBox();
  expect(Math.round(group.y)).toBe(Math.round(intro.y + intro.height + 16));
  // Nor is it a Tab stop.
  await links.focus();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('radio', { name: /Open it over the slide/ })).toBeFocused();
});

test('Back and Forward go through the pages visited, never taking the tab anywhere', async ({
  context,
}) => {
  const { page, show, google } = await openLinkedPage(context);
  const back = stage(show).locator('.slides-companion-spotlight-back');
  const forward = stage(show).locator('.slides-companion-spotlight-forward');
  const showBars = async () => {
    const { x, y } = await centre(site(show));
    await page.mouse.move(x, y + 2, { steps: 3 });
  };
  const shown = shownIn(page);
  const editor = page.url();
  const tabHistory = await page.evaluate(() => history.length);

  await expect(back).toBeDisabled();
  await expect(forward).toBeDisabled();
  await google.evaluate(() => location.assign('https://example.com/'));
  await expect(site(show)).toHaveText('example.com');
  await frameAt(page, 'https://example.com/').evaluate(() => history.pushState(null, '', '/moved'));
  await expect(back).toBeEnabled();

  await showBars();
  await press(page, back);
  await expect.poll(shown).toBe('https://example.com/');
  await press(page, back);
  await expect.poll(shown).toBe('https://www.google.com/');
  await expect(site(show)).toHaveText('google.com');
  await expect(back).toBeDisabled();
  await press(page, forward);
  await expect.poll(shown).toBe('https://example.com/');
  await expect(forward).toBeEnabled();

  // Somewhere new from the middle: the way forward goes.
  await frameAt(page, 'https://example.com/').evaluate(() =>
    location.assign('https://example.org/'),
  );
  await expect(site(show)).toHaveText('example.org');
  await expect(forward).toBeDisabled();
  await press(page, back);
  await expect.poll(shown).toBe('https://example.com/');

  expect(page.url()).toBe(editor);
  // The tab's history has only the page's own three moves; Back and Forward added none.
  expect(await page.evaluate(() => history.length)).toBe(tabHistory + 3);
});

test('Back and Forward keep up with the page: a tidied address, the tab’s own Back, Back pressed twice', async ({
  context,
  serviceWorker,
}) => {
  const { page, show, google } = await openLinkedPage(context);
  const back = stage(show).locator('.slides-companion-spotlight-back');
  const forward = stage(show).locator('.slides-companion-spotlight-forward');
  const shown = shownIn(page);
  await google.evaluate(() => location.assign('https://example.com/'));
  await expect(site(show)).toHaveText('example.com');
  // A site moving to another of its pages, then tidying that page's address.
  await frameAt(page, 'https://example.com/').evaluate(() => {
    history.pushState(null, '', '/moved');
    history.replaceState(null, '', '/tidied');
  });
  const { x, y } = await centre(site(show));
  await page.mouse.move(x, y + 2, { steps: 3 });

  // One page back, not the address it had before tidying.
  await press(page, back);
  await expect.poll(shown).toBe('https://example.com/');
  await press(page, forward);
  await expect.poll(shown).toBe('https://example.com/tidied');
  await expect(forward).toBeDisabled();

  // The tab's own Back (a mouse's back button) goes back in the page, keeping the way forward.
  await frameAt(page, 'https://example.com/tidied').evaluate(() => history.back());
  await expect.poll(shown).toBe('https://example.com/');
  await expect(forward).toBeEnabled();
  await press(page, forward);
  await expect.poll(shown).toBe('https://example.com/tidied');

  // Back twice, the page passed on the way saying where it is only after the second.
  await serviceWorker.evaluate(() => {
    const send = chrome.tabs.sendMessage.bind(chrome.tabs);
    chrome.tabs.sendMessage = (tabId, message, ...rest) =>
      message?.type === 'page-address'
        ? new Promise((done) => setTimeout(done, 500)).then(() => send(tabId, message, ...rest))
        : send(tabId, message, ...rest);
  });
  await press(page, back);
  await expect.poll(shown).toBe('https://example.com/');
  await press(page, back);
  await expect.poll(shown).toBe('https://www.google.com/');
  await page.waitForTimeout(1200);
  await expect(site(show)).toHaveText('google.com');
  await expect(back).toBeDisabled();
  await press(page, forward);
  await expect.poll(shown).toBe('https://example.com/');
  await press(page, forward);
  await expect.poll(shown).toBe('https://example.com/tidied');
});

test('after Forward to a part of the same page, a link clicked still adds a page', async ({
  context,
}) => {
  const { page, show, google } = await openLinkedPage(context);
  const back = stage(show).locator('.slides-companion-spotlight-back');
  const forward = stage(show).locator('.slides-companion-spotlight-forward');
  const shown = shownIn(page);
  await google.evaluate(() => location.assign('https://example.com/'));
  await expect(site(show)).toHaveText('example.com');
  await frameAt(page, 'https://example.com/').evaluate(() => (location.hash = 'part'));
  const { x, y } = await centre(site(show));
  await page.mouse.move(x, y + 2, { steps: 3 });
  await press(page, back);
  await expect.poll(shown).toBe('https://example.com/');
  // Within the page: no new page is loaded.
  await press(page, forward);
  await expect.poll(shown).toBe('https://example.com/#part');

  await frameAt(page, 'https://example.com/').evaluate(() =>
    location.assign('https://example.org/'),
  );
  await expect(site(show)).toHaveText('example.org');
  await press(page, back);
  await expect.poll(shown).toBe('https://example.com/#part');
});

import { test, expect, deckUrl, openSettings, press } from './fixtures.js';

// Slide 4 of the test deck: a photo linked to google.com, and a video. The photo flies in from
// above as the slide starts.
const slide = `${deckUrl}#slide=id.h2c87d6044fe40693_46_0`;
const LINKED_PHOTO = 'h2c87d6044fe40693_46_2';
const link = (show) => show.locator(`[id="${LINKED_PHOTO}"] a`).first();
const landed = (show) => expect.poll(async () => (await link(show).boundingBox())?.y).toBeGreaterThan(0);

// Slides sends the link through google.com/url; the page it goes to is played by these.
const PAGE = `<title>Linked page</title><h1>Hello from the link</h1><a href="/second">Second page</a>`;
async function servePages(context) {
  await context.route('https://www.google.com/', (route) => route.fulfill({ contentType: 'text/html', body: PAGE }));
  await context.route('https://www.google.com/second', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<title>Second</title><h1>The second page</h1>' }),
  );
}

async function startSlideshow(context) {
  await servePages(context);
  const page = await context.newPage();
  await page.goto(slide);
  await expect(page.locator(`#workspace [id="editor-${LINKED_PHOTO}"] image`)).toBeVisible();
  await page.locator('#punch-start-presentation-left').click();
  const show = page.frameLocator('iframe.punch-present-iframe');
  await landed(show);
  return { page, show };
}

const slideNumber = (show) =>
  show.locator('.punch-viewer-svgpage-a11yelement').getAttribute('aria-label').then((label) => Number(label.match(/\d+/)[0]));

async function clickCentre(page, locator, options) {
  const box = await locator.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, options);
}

const stage = (show) => show.locator('.slides-companion-spotlight');
const website = (show) => stage(show).locator('iframe.slides-companion-spotlight-website');
const clickLink = (page, show, options) => clickCentre(page, link(show), options);
// The page sleeps until the pointer moves over it.
async function overPage(page, show) {
  const box = await website(show).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 });
}
// Points the photo's link somewhere else, as if the deck linked there.
const linkTo = (show, href) =>
  show.locator(`[id="${LINKED_PHOTO}"] a`).evaluateAll((links, href) => {
    for (const link of links) link.setAttribute('href', href);
  }, href);

test('clicking a link during a slideshow opens its page over the slide, and Esc goes back', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  expect(await slideNumber(show)).toBe(4);
  const tabs = context.pages().length;

  await clickLink(page, show);
  await expect(stage(show)).toBeVisible();
  // The real address, not Google's redirect.
  await expect(website(show)).toHaveAttribute('src', 'https://www.google.com/');
  await expect(stage(show)).toHaveAttribute('aria-label', 'google.com');
  await expect(stage(show).locator('.slides-companion-spotlight-site')).toHaveText('google.com');
  const linked = show.frameLocator('iframe.slides-companion-spotlight-website');
  await expect(linked.getByRole('heading', { name: 'Hello from the link' })).toBeVisible();
  // The page fills the space the gallery gives a picture.
  const viewport = page.viewportSize();
  expect(await website(show).boundingBox()).toEqual({ x: 48, y: 80, width: viewport.width - 96, height: viewport.height - 160 });

  // Without every site allowed, the page can't say where it is: no Back or Forward.
  await expect(stage(show).locator('.slides-companion-spotlight-back')).toBeHidden();

  await page.keyboard.press('Escape');
  await expect(stage(show)).toHaveCount(0);
  // Still presenting, on the same slide, and no tab was opened.
  await expect(page.locator('iframe.punch-present-iframe')).toBeVisible();
  expect(await slideNumber(show)).toBe(4);
  expect(context.pages()).toHaveLength(tabs);
});

test('the page can be browsed, and the ✕ brings the slide back', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  await clickLink(page, show);
  await overPage(page, show);
  const linked = show.frameLocator('iframe.slides-companion-spotlight-website');
  await linked.getByRole('link', { name: 'Second page' }).click();
  await expect(linked.getByRole('heading', { name: 'The second page' })).toBeVisible();
  expect(page.url()).toContain('/edit');

  await press(page, stage(show).getByRole('button', { name: 'Close' }));
  await expect(stage(show)).toHaveCount(0);
  expect(await slideNumber(show)).toBe(4);
  // Back on the slide, keys go to the slideshow again.
  await page.keyboard.press('End');
  await expect.poll(() => slideNumber(show)).toBe(11);
});

test('Open in new tab opens the link in a tab of its own and closes the page over the slide', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  await clickLink(page, show);
  const { height } = page.viewportSize();
  await page.mouse.move(200, height - 40);
  const opened = context.waitForEvent('page');
  await press(page, stage(show).getByRole('button', { name: 'Open in new tab' }));
  expect((await opened).url()).toBe('https://www.google.com/');
  await expect(stage(show)).toHaveCount(0);
});

test('Ctrl/⌘-click on a link is left to Slides', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  await page.keyboard.down('ControlOrMeta');
  await clickLink(page, show);
  await page.keyboard.up('ControlOrMeta');
  await page.waitForTimeout(500);
  await expect(stage(show)).toHaveCount(0);
});

test('set to open links in a new tab, a click opens a new tab as Slides does', async ({ context }) => {
  await servePages(context);
  const page = await context.newPage();
  await page.goto(slide);
  await openSettings(page, 'Links');
  await page.getByRole('radio', { name: /Open it in a new tab/ }).check();
  await page.getByRole('button', { name: 'OK' }).click();
  await page.locator('#punch-start-presentation-left').click();
  const show = page.frameLocator('iframe.punch-present-iframe');
  await landed(show);

  const opened = context.waitForEvent('page');
  await clickLink(page, show);
  expect((await opened).url()).toContain('www.google.com');
  await expect(stage(show)).toHaveCount(0);
});

// The deck's video is played on the slide; a link to one is turned into YouTube's own player.
test('a YouTube link plays in YouTube’s player, from where the link starts it', async ({ context }) => {
  await context.route('https://www.youtube.com/embed/**', (route) => route.fulfill({ contentType: 'text/html', body: '<h1>Player</h1>' }));
  const { page, show } = await startSlideshow(context);
  await linkTo(show, 'https://www.google.com/url?q=https://www.youtube.com/watch?v%3D10QOOvxw0uA%26t%3D1m30s&sa=D');
  await clickLink(page, show);
  await expect(website(show)).toHaveAttribute('src', 'https://www.youtube.com/embed/10QOOvxw0uA?autoplay=1&start=90');
  await page.keyboard.press('Escape');
  await expect(stage(show)).toHaveCount(0);

  // "Open in new tab" opens the video's own page.
  await clickLink(page, show);
  await page.mouse.move(200, page.viewportSize().height - 40);
  const opened = context.waitForEvent('page');
  await press(page, stage(show).getByRole('button', { name: 'Open in new tab' }));
  expect((await opened).url()).toContain('https://www.youtube.com/watch?v=10QOOvxw0uA');
});

test('a page can’t take over the slideshow’s window', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  await context.route('https://www.google.com/', (route) =>
    route.fulfill({ contentType: 'text/html', body: `<h1>Busting</h1><script>top.location.href = 'https://www.google.com/second';</script>` }),
  );
  await clickLink(page, show);
  await expect(show.frameLocator('iframe.slides-companion-spotlight-website').getByRole('heading', { name: 'Busting' })).toBeVisible();
  await page.waitForTimeout(1000);
  expect(page.url()).toContain('/edit');
  await expect(stage(show)).toBeVisible();
});

// Opened from a /present link, Slides sends links through google.com/url.
test('a slideshow opened from a link opens the real address over the slide', async ({ context }) => {
  await servePages(context);
  const page = await context.newPage();
  await page.goto(slide.replace('/edit#slide=', '/present?slide='));
  const linked = page.locator('.punch-viewer-svgpage-svgcontainer a[*|href*="google.com/url"]').first();
  await expect.poll(async () => (await linked.boundingBox())?.y).toBeGreaterThan(0);
  await clickCentre(page, linked);
  await expect(page.locator('iframe.slides-companion-spotlight-website')).toHaveAttribute('src', 'https://www.google.com/');
  await page.keyboard.press('Escape');
  await expect(page.locator('.slides-companion-spotlight')).toHaveCount(0);
});

test('Shorts, live videos and Drive files open in their players', async ({ context }) => {
  await context.route(/^https:\/\/(www\.youtube|drive\.google)\.com\//, (route) => route.fulfill({ contentType: 'text/html', body: '<h1>Player</h1>' }));
  const { page, show } = await startSlideshow(context);
  for (const [href, shown] of [
    ['https://youtube.com/shorts/abc123', 'https://www.youtube.com/embed/abc123?autoplay=1'],
    ['https://www.youtube.com/live/def456?t=30', 'https://www.youtube.com/embed/def456?autoplay=1&start=30'],
    ['https://drive.google.com/file/d/1AbC/view?usp=sharing', 'https://drive.google.com/file/d/1AbC/preview'],
    ['https://drive.google.com/open?id=2DeF', 'https://drive.google.com/file/d/2DeF/preview'],
  ]) {
    await linkTo(show, href);
    await clickLink(page, show);
    await expect(website(show)).toHaveAttribute('src', shown);
    await page.keyboard.press('Escape');
    await expect(stage(show)).toHaveCount(0);
  }
});

// Chrome's PDF viewer isn't let into the page's frame, and a link in it would take the
// whole tab. Google's servers fetch the PDF, so it's a real one, online.
const PDF = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
test('a PDF opens in Google’s viewer, in Slides’ language, where Esc goes back too', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  await linkTo(show, `https://www.google.com/url?q=${encodeURIComponent(PDF)}&sa=D`);
  await clickLink(page, show);
  const viewer = new URL('https://docs.google.com/viewer?embedded=true');
  viewer.searchParams.set('url', PDF);
  viewer.searchParams.set('hl', await show.locator('html').getAttribute('lang'));
  await expect(website(show)).toHaveAttribute('src', viewer.href);
  await expect(stage(show).locator('.slides-companion-spotlight-site')).toHaveText('w3.org');
  const pdf = show.frameLocator('iframe.slides-companion-spotlight-website');
  await expect(pdf.locator('img[src^="blob:"]').first()).toBeVisible({ timeout: 20000 });

  // In the viewer's page number, Esc still goes back to the slide. (A click on the PDF itself leaves
  // the keys with the slideshow.)
  await overPage(page, show);
  await clickCentre(page, pdf.locator('input').first());
  await expect(website(show)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(stage(show)).toHaveCount(0);
  expect(await slideNumber(show)).toBe(4);

  // Open in new tab opens the PDF itself.
  await clickLink(page, show);
  await page.mouse.move(200, page.viewportSize().height - 40);
  const opened = context.waitForEvent('page');
  await press(page, stage(show).getByRole('button', { name: 'Open in new tab' }));
  const tab = await opened;
  expect(tab.url()).toBe(PDF);
  // Chrome's viewer, left open, holds the browser's closing up for half a minute.
  await tab.close();
});

// A PDF at an address that doesn't say so fails the refusal check, as it fails in the
// page's frame; Google's viewer, asked out of sight, finds it's a PDF, and it shows there.
test('a PDF whose address doesn’t end in .pdf (arXiv’s) shows in Google’s viewer too', async ({ context }) => {
  const ARXIV = 'https://arxiv.org/pdf/1706.03762';
  const { page, show } = await startSlideshow(context);
  await linkTo(show, ARXIV);
  await clickLink(page, show);
  const viewer = new URL('https://docs.google.com/viewer?embedded=true');
  viewer.searchParams.set('url', ARXIV);
  viewer.searchParams.set('hl', await show.locator('html').getAttribute('lang'));
  await expect(website(show)).toHaveAttribute('src', viewer.href, { timeout: 15000 });
  const pdf = show.frameLocator('iframe.slides-companion-spotlight-website');
  await expect(pdf.locator('img[src^="blob:"]').first()).toBeVisible({ timeout: 20000 });
  await expect(stage(show).locator('.slides-companion-spotlight-refused, .slides-companion-spotlight-probe')).toHaveCount(0);
  await expect(stage(show).locator('.slides-companion-spotlight-site')).toHaveText('arxiv.org');
});

// GitHub's page for a PDF ends in .pdf too. Google's viewer would show it as code; it shows as any
// page instead, here GitHub's refusal to be shown inside another page.
test('a .pdf address that’s a web page opens as one, not in the PDF viewer', async ({ context }) => {
  const GITHUB = 'https://github.com/mozilla/pdf.js/blob/master/test/pdfs/tracemonkey.pdf';
  const { page, show } = await startSlideshow(context);
  await linkTo(show, GITHUB);
  // Whether the viewer ever shows, with the page's code in it.
  await show.locator('body').evaluate(() => {
    window.sawCode = false;
    const watch = () => {
      const viewer = document.querySelector('iframe.slides-companion-spotlight-website[src^="https://docs.google.com/viewer"]');
      if (viewer && getComputedStyle(viewer).visibility !== 'hidden' && viewer.contentDocument?.querySelector('pre')) window.sawCode = true;
      requestAnimationFrame(watch);
    };
    watch();
  });
  await clickLink(page, show);
  await expect(inRefusal(show).getByRole('heading')).toHaveText('github.com won’t open over your slide', { timeout: 20000 });
  expect(await show.locator('body').evaluate(() => window.sawCode)).toBe(false);
});

// The slideshow is an https page, where Chrome blocks plain http ones.
test('an http link opens at its https address, and in a new tab as it was', async ({ context }) => {
  await context.route('http://www.google.com/', (route) => route.fulfill({ contentType: 'text/html', body: PAGE }));
  const { page, show } = await startSlideshow(context);
  await linkTo(show, 'http://www.google.com/');
  await clickLink(page, show);
  await expect(website(show)).toHaveAttribute('src', 'https://www.google.com/');
  await page.mouse.move(200, page.viewportSize().height - 40);
  const opened = context.waitForEvent('page');
  await press(page, stage(show).getByRole('button', { name: 'Open in new tab' }));
  expect((await opened).url()).toBe('http://www.google.com/');
});

// An object waiting for its animation is on the slide, invisible, where a click means "next".
test('a link that isn’t shown yet leaves the click to the slideshow', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  await show.locator(`[id="${LINKED_PHOTO}"]`).evaluate((photo) => (photo.style.opacity = '0'));
  await clickLink(page, show);
  await page.waitForTimeout(500);
  await expect(stage(show)).toHaveCount(0);
});

// A page can take the keys as it opens (a search box), where the slideshow can't hear Esc.
test('a page can’t take the keys until the pointer goes over it, so Esc still closes it', async ({ context }) => {
  const GRABBING = `<input autofocus><script>setTimeout(() => document.querySelector('input').focus(), 300);</script>`;
  const { page, show } = await startSlideshow(context);
  await context.route('https://www.google.com/', (route) => route.fulfill({ contentType: 'text/html', body: GRABBING }));
  await context.route('https://docs.google.com/document/d/test/edit', (route) => route.fulfill({ contentType: 'text/html', body: GRABBING }));
  const keysInPage = () => website(show).evaluate((frame) => document.activeElement === frame);
  const input = show.frameLocator('iframe.slides-companion-spotlight-website').locator('input');

  await clickLink(page, show);
  await expect(input).toBeAttached();
  await page.waitForTimeout(600);
  expect(await keysInPage()).toBe(false);
  await page.keyboard.press('Escape');
  await expect(stage(show)).toHaveCount(0);

  // Over the page, it's the presenter's to use.
  await clickLink(page, show);
  await overPage(page, show);
  await input.click();
  await page.keyboard.type('jazz');
  await expect(input).toHaveValue('jazz');
  await press(page, stage(show).getByRole('button', { name: 'Close' }));
  await expect(stage(show)).toHaveCount(0);

  // A page on Slides' own site closes with Esc even then.
  await linkTo(show, 'https://docs.google.com/document/d/test/edit');
  await clickLink(page, show);
  await overPage(page, show);
  await input.click();
  expect(await keysInPage()).toBe(true);
  await page.keyboard.press('Escape');
  await expect(stage(show)).toHaveCount(0);
  expect(await slideNumber(show)).toBe(4);
});

// Slide 5 has a photo, flying in on the first click, linked to the next slide.
// Without every site allowed, a site that refuses to be shown inside another page.
const REFUSALS = [
  ['X-Frame-Options', { 'x-frame-options': 'DENY' }],
  ['Content-Security-Policy', { 'content-security-policy': "frame-ancestors 'none'" }],
];
const serveGoogle = async (context, headers = {}) => {
  await context.unroute('https://www.google.com/');
  await context.route('https://www.google.com/', (route) => route.fulfill({ contentType: 'text/html', headers, body: PAGE }));
};
const refusal = (show) => stage(show).locator('iframe.slides-companion-spotlight-refused');
const inRefusal = (show) => show.frameLocator('iframe.slides-companion-spotlight-refused');
// The frame of our message, to act in it as Chrome would.
const refusalFrame = (page) => page.frames().find((frame) => frame.url().includes('/refused.html'));

test('a site that refuses to be shown says so over the slide, instead of Chrome’s empty error page', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  for (const [, headers] of REFUSALS) {
    await serveGoogle(context, headers);
    await clickLink(page, show);
    await expect(refusal(show)).toBeVisible();
    // In place of the page, filling its space.
    await expect(website(show)).toHaveCount(0);
    const viewport = page.viewportSize();
    expect(await refusal(show).boundingBox()).toEqual({ x: 48, y: 80, width: viewport.width - 96, height: viewport.height - 160 });
    const message = inRefusal(show);
    await expect(message.getByRole('heading')).toHaveText('google.com won’t open over your slide');
    await expect(message.getByText('Allow all sites to show it here, or open it in a new tab.')).toBeVisible();
    await expect(message.getByRole('button')).toHaveText(['Open in new tab', 'Allow all sites']);
    // Screen readers hear it too.
    await expect(stage(show).locator('.slides-companion-spotlight-status')).toHaveText('google.com won’t open over your slide');
    // The bar still names the site, with Open in new tab.
    await expect(stage(show).locator('.slides-companion-spotlight-site')).toHaveText('google.com');
    await page.keyboard.press('Escape');
    await expect(stage(show)).toHaveCount(0);
  }

  // A click on the black around the message closes it, as around a picture.
  await clickLink(page, show);
  await expect(refusal(show)).toBeVisible();
  const box = await refusal(show).boundingBox();
  await page.mouse.click(box.x + 20, box.y + 20);
  await expect(stage(show)).toHaveCount(0);
  expect(await slideNumber(show)).toBe(4);
});

test('the message looks like Slides’ dialogs in Google’s dark theme', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  await serveGoogle(context, REFUSALS[0][1]);
  await clickLink(page, show);
  const message = inRefusal(show);
  const title = message.getByRole('heading');
  await expect(title).toHaveCSS('font-size', '24px');
  await expect(title).toHaveCSS('line-height', '32px');
  await expect(title).toHaveCSS('color', 'rgb(227, 227, 227)');
  await expect(message.locator('p')).toHaveCSS('font-size', '14px');
  await expect(message.locator('p')).toHaveCSS('color', 'rgb(196, 199, 197)');
  const [open, allow] = [message.getByRole('button', { name: 'Open in new tab' }), message.getByRole('button', { name: 'Allow all sites' })];
  for (const button of [open, allow]) {
    await expect(button).toHaveCSS('height', '40px');
    await expect(button).toHaveCSS('border-radius', '20px');
    await expect(button).toHaveCSS('font-weight', '500');
  }
  await expect(open).toHaveCSS('color', 'rgb(168, 199, 250)');
  await expect(allow).toHaveCSS('background-color', 'rgb(168, 199, 250)');
  await expect(allow).toHaveCSS('color', 'rgb(6, 46, 111)');
  // The stage shows through: the frame draws nothing behind the message.
  await expect(message.locator('body')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await page.screenshot({ path: test.info().outputPath('refused.png') });
});

test('from the message, Open in new tab opens the site, by pointer or keyboard', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  await serveGoogle(context, REFUSALS[0][1]);
  await clickLink(page, show);
  let opened = context.waitForEvent('page');
  await inRefusal(show).getByRole('button', { name: 'Open in new tab' }).click();
  expect((await opened).url()).toBe('https://www.google.com/');
  await expect(stage(show)).toHaveCount(0);

  // The keyboard: Tab goes into the message, on to its other button and back, and Enter presses.
  await page.bringToFront();
  await clickLink(page, show);
  await expect(refusal(show)).toBeVisible();
  await expect.poll(() => refusalFrame(page)?.evaluate(() => document.readyState)).toBe('complete');
  const focused = () => refusalFrame(page).evaluate(() => document.activeElement?.textContent);
  await page.keyboard.press('Tab');
  await expect.poll(focused).toBe('Open in new tab');
  await page.keyboard.press('Tab');
  await expect.poll(focused).toBe('Allow all sites');
  await page.keyboard.press('Shift+Tab');
  await expect.poll(focused).toBe('Open in new tab');
  opened = context.waitForEvent('page');
  await page.keyboard.press('Enter');
  expect((await opened).url()).toBe('https://www.google.com/');
  await expect(stage(show)).toHaveCount(0);
});

test('Allow all sites asks Chrome from the message, and once allowed the page shows', async ({ context, serviceWorker }) => {
  const { page, show } = await startSlideshow(context);
  await serveGoogle(context, REFUSALS[0][1]);
  await clickLink(page, show);
  await expect(refusal(show)).toBeVisible();
  await expect.poll(() => refusalFrame(page)?.evaluate(() => document.readyState)).toBe('complete');
  // Chrome's question can't be answered in a test: the presenter says yes (noted in the extension's
  // storage, as the message goes once it's answered), and the site lets itself be shown, as every
  // site does once allowed.
  await refusalFrame(page).evaluate(() => {
    chrome.permissions.request = async (asked) => (await chrome.storage.local.set({ asked }), true);
  });
  await serveGoogle(context);
  await inRefusal(show).getByRole('button', { name: 'Allow all sites' }).click();
  await expect(show.frameLocator('iframe.slides-companion-spotlight-website').getByRole('heading', { name: 'Hello from the link' })).toBeVisible();
  expect(await serviceWorker.evaluate(() => chrome.storage.local.get('asked'))).toEqual({ asked: { origins: ['*://*/*'] } });
  await expect(refusal(show)).toHaveCount(0);
  await expect(stage(show).locator('.slides-companion-spotlight-status')).toHaveText('');
});

test('a site that lets itself be shown never shows the message', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  await clickLink(page, show);
  await expect(show.frameLocator('iframe.slides-companion-spotlight-website').getByRole('heading', { name: 'Hello from the link' })).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(refusal(show)).toHaveCount(0);
  // Checked and done: nothing's left loading out of sight.
  await expect(stage(show).locator('.slides-companion-spotlight-probe')).toHaveCount(0);
});

test('a link to another slide of the deck is Slides’ own to follow', async ({ context }) => {
  const page = await context.newPage();
  await page.goto(`${deckUrl}#slide=id.h32d70ce72e2f224_8_0`);
  await page.locator('#punch-start-presentation-left').click();
  const show = page.frameLocator('iframe.punch-present-iframe');
  const toNext = show.locator('.punch-viewer-svgpage-svgcontainer a[*|href="#slide=next"]').first();
  await expect(toNext).toBeAttached();
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await toNext.boundingBox())?.x).toBeGreaterThan(0);
  await page.waitForTimeout(1000);
  await clickCentre(page, toNext);
  await expect.poll(() => slideNumber(show)).toBe(6);
  await expect(stage(show)).toHaveCount(0);
});

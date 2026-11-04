import { test, expect, deckUrl } from './fixtures.js';

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

  // Without every site allowed (card 56), the page can't say where it is: no Back or Forward.
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

  await stage(show).getByRole('button', { name: 'Close' }).click();
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
  await stage(show).getByRole('button', { name: 'Open in new tab' }).click();
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
  await page.locator('.slides-companion-button').click();
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
  await stage(show).getByRole('button', { name: 'Open in new tab' }).click();
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

// The slideshow is an https page, where Chrome blocks plain http ones.
test('an http link opens at its https address, and in a new tab as it was', async ({ context }) => {
  await context.route('http://www.google.com/', (route) => route.fulfill({ contentType: 'text/html', body: PAGE }));
  const { page, show } = await startSlideshow(context);
  await linkTo(show, 'http://www.google.com/');
  await clickLink(page, show);
  await expect(website(show)).toHaveAttribute('src', 'https://www.google.com/');
  await page.mouse.move(200, page.viewportSize().height - 40);
  const opened = context.waitForEvent('page');
  await stage(show).getByRole('button', { name: 'Open in new tab' }).click();
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
  await stage(show).getByRole('button', { name: 'Close' }).click();
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

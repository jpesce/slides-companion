import {
  test,
  expect,
  deckUrl,
  startSlideshow,
  slideshowSettled,
  slideNumber,
  stays,
} from './fixtures.js';

// Presenter view, as it opens on one screen: floating over the slideshow, in Chrome's
// picture-in-picture window. (The test Chromium has no second screen.)

const timer = (window) => window.locator('.punch-viewer-speakernotes-timer-time-container');
const header = (window) => window.locator('.punch-viewer-speakernotes-text-header');
const floating = (window) =>
  window.evaluate(() => matchMedia('(display-mode: picture-in-picture)').matches);

// Slide 3's slideshow, once its ⋮ menu is built, with the pointer moved, so the slideshow
// doesn't hide it under its cover.
async function startShow(context) {
  const started = await startSlideshow(context, { ready: slideshowSettled });
  await started.page.mouse.move(300, 500);
  return { ...started, windows: new Set(context.pages()) };
}
// The windows opened since.
const newWindows = (context, windows) => context.pages().filter((window) => !windows.has(window));

async function fromMenu(context, show) {
  await show.locator('.punch-viewer-navbar-more').click();
  const opened = context.waitForEvent('page');
  await show.locator('.punch-viewer-navbar-menu .goog-menuitem:has(.docs-icon-notes)').click();
  return opened;
}

async function fromEditor(context) {
  const page = await context.newPage();
  await page.goto(deckUrl);
  await page.locator('#punch-start-presentation-right').click();
  const windows = new Set(context.pages());
  const opening = context.waitForEvent('page');
  await page.locator('.punch-qanda-presenter-view-menu-item-content').click();
  return { page, opened: await opening, windows };
}

test('S floats presenter view over the slideshow, all of it working, and S again opens it afresh', async ({
  context,
}) => {
  const { page, show, windows } = await startShow(context);
  const opened = context.waitForEvent('page');
  await page.keyboard.press('s');
  const presenter = await opened;
  await expect(timer(presenter)).toBeVisible();
  expect(await floating(presenter)).toBe(true);
  // Our countdown is there, as in Slides' own window.
  await expect(presenter.locator('.slides-companion-countdown-button')).toBeVisible();
  // No other window opened.
  expect(newWindows(context, windows)).toEqual([presenter]);

  // Its Next moves the slideshow on.
  await presenter.locator('.punch-viewer-speakernotes-page-next').click();
  await expect.poll(() => slideNumber(show)).toBe(4);
  await expect(header(presenter)).toHaveText(/4/);
  // S again opens it afresh, as Slides does its own window, floating again.
  await page.mouse.move(310, 500);
  const reopened = context.waitForEvent('page');
  await page.keyboard.press('s');
  const again = await reopened;
  await expect(timer(again)).toBeVisible();
  expect(await floating(again)).toBe(true);
  expect(presenter.isClosed()).toBe(true);
  expect(newWindows(context, windows)).toEqual([again]);

  // Closed, the slideshow goes on.
  await again.close();
  // (Slide 4 has a video, and the first key can go to the video's step instead.)
  await expect(async () => {
    await page.keyboard.press('ArrowRight');
    expect(await slideNumber(show)).toBe(5);
  }).toPass({ timeout: 5000 });
});

const isFullScreen = (page) => page.evaluate(() => Boolean(document.fullscreenElement));
// Back to full screen with Slides' ⋮ › Enter full screen, should opening the window have left it.
async function fullScreen(page, show) {
  await expect(page.locator('html')).not.toHaveAttribute('data-slides-companion-opening-notes');
  if (await isFullScreen(page)) return;
  await page.mouse.move(300, 500);
  await show.locator('.punch-viewer-navbar-more').click();
  await show
    .locator('.punch-viewer-navbar-menu .goog-menuitem:has(.docs-icon-fullscreen)')
    .filter({ visible: true })
    .click();
  await expect.poll(() => isFullScreen(page)).toBe(true);
}

// On macOS, where full screen is a space of its own, closing the window takes the browser out of
// full screen, which would end the slideshow. Headless Chromium doesn't, so the test does it.
test('closed in full screen, the slideshow goes on; leaving full screen while it floats still ends it', async ({
  context,
}) => {
  const { page, show } = await startShow(context);
  let opened = context.waitForEvent('page');
  await page.keyboard.press('s');
  const presenter = await opened;
  await expect(timer(presenter)).toBeVisible();
  await fullScreen(page, show);
  await presenter.close();
  await page.evaluate(() => document.exitFullscreen());
  await expect.poll(() => isFullScreen(page)).toBe(false);
  // Not even a moment later.
  await stays(() => page.locator('iframe.punch-present-iframe').isVisible(), true);

  // With the window open, leaving full screen (Esc) ends the slideshow, as it does in Slides.
  await fullScreen(page, show);
  opened = context.waitForEvent('page');
  await page.keyboard.press('s');
  await expect(timer(await opened)).toBeVisible();
  await fullScreen(page, show);
  await page.evaluate(() => document.exitFullscreen());
  await expect(page.locator('iframe.punch-present-iframe')).toBeHidden();
});

test('the slideshow’s ⋮ menu floats presenter view', async ({ context }) => {
  const { show } = await startShow(context);
  const presenter = await fromMenu(context, show);
  await expect(timer(presenter)).toBeVisible();
  expect(await floating(presenter)).toBe(true);
  await expect(header(presenter)).toHaveText(/3/);
});

test('Start slideshow ▾ › Presenter view floats it, its countdown with it', async ({
  context,
  serviceWorker,
}) => {
  const { page, opened: presenter } = await fromEditor(context);
  await expect(timer(presenter)).toBeVisible();
  expect(await floating(presenter)).toBe(true);
  await expect(page.locator('iframe.punch-present-iframe')).toBeVisible();
  // The countdown remembers each deck's time, which it knows from the window's name.
  await presenter.locator('.slides-companion-countdown-button').click();
  await presenter
    .locator('.slides-companion-countdown-menu .goog-menuitem')
    .filter({ hasText: 'Count down from 20 minutes' })
    .click();
  await expect(presenter.locator('.slides-companion-countdown-bar')).toBeVisible();
  const deck = deckUrl.match(/\/d\/([^/]+)/)[1];
  await expect
    .poll(() => serviceWorker.evaluate((key) => chrome.storage.local.get(key), `countdown ${deck}`))
    .toHaveProperty([`countdown ${deck}`]);
});

test.describe('with just the notes floating', () => {
  test.use({ settings: { liveEdits: 'off', presenterViewFloats: 'notes' } });

  test('S and the ⋮ menu open floating notes instead', async ({ context }) => {
    const { page, show, windows } = await startShow(context);
    let opened = context.waitForEvent('page');
    await page.keyboard.press('s');
    let notes = await opened;
    await expect(header(notes)).toHaveText(/3/);
    await expect(timer(notes)).toHaveCount(0);
    expect(newWindows(context, windows)).toEqual([notes]);
    await notes.close();

    notes = await fromMenu(context, show);
    await expect(header(notes)).toHaveText(/3/);
    await expect(timer(notes)).toHaveCount(0);
    // Slides' menu closes, as after its own items.
    await expect(show.locator('.punch-viewer-navbar-more')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  test('Start slideshow ▾ › Presenter view starts the slideshow, with the notes', async ({
    context,
  }) => {
    const { page, opened: notes, windows } = await fromEditor(context);
    await expect(header(notes)).toBeVisible();
    await expect(timer(notes)).toHaveCount(0);
    await expect(page.locator('iframe.punch-present-iframe')).toBeVisible();
    expect(newWindows(context, windows)).toEqual([notes]);
  });
});

test.describe('in a window of its own', () => {
  test.use({ settings: { liveEdits: 'off', presenterViewOpens: 'window' } });

  test('S opens Slides’ own window, as without the extension', async ({ context }) => {
    const { page } = await startShow(context);
    const opened = context.waitForEvent('page');
    await page.keyboard.press('s');
    const presenter = await opened;
    await expect(timer(presenter)).toBeVisible();
    expect(await floating(presenter)).toBe(false);
    expect(await presenter.evaluate(() => window.name)).toMatch(/^punch_speaker_notes/);
  });
});

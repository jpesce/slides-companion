import {
  test,
  expect,
  openSettings,
  slideshowSettled,
  slideNumber,
  SLIDES,
  IDS,
  slideUrl,
} from './fixtures.js';

// The extension as it comes, live edits on.
test.use({ settings: {} });

// Slide 3 of the test deck: two photos and a caption ("Top kids playing…"); slide 2 is text.
const SLIDE_2 = SLIDES.text;
const SLIDE_3 = SLIDES.images;

const PLAYER = 'iframe.punch-present-iframe';
// The player on screen: Slides' own, or a copy that took over (data-slides-companion-player).
const SHOWN = `${PLAYER}[data-slides-companion-player="shown"], ${PLAYER}:not([data-slides-companion-player])`;
const shown = (page) => page.frameLocator(SHOWN);
const slidesOwn = (page) => page.locator(`${PLAYER}:not([data-slides-companion-copy])`);
const copies = (page) => page.locator(`${PLAYER}[data-slides-companion-copy]`);

// Slide 3's slideshow, on a deck whose slides a test can change (see openDeck).
async function startEditableSlideshow(context) {
  const page = await openDeck(context);
  await page.locator('#punch-start-presentation-left').click();
  await expect(shown(page).locator(`[id="${IDS.left}"] image`)).toBeVisible();
  // Until it has every slide, an edit reaches the player by itself.
  await expect(slidesOwn(page)).toHaveAttribute('data-slides-companion-loaded');
  return page;
}

const shownSlide = (page) => slideNumber(shown(page));
const words = (page, text) =>
  shown(page).locator('.punch-viewer-svgpage-svgcontainer text', { hasText: text });

// The test browser can't edit the deck, so this stands in for an edit: the editor's copy of a slide
// gets a different first word, and its thumbnail in the filmstrip is redrawn, as when it's edited.
// The word changes inside Slides, under the extension's watch on it (live-edits-main.js), so the
// extension sees what each player gets, as it does a real edit; it's put in before the slideshow
// starts, when Slides puts its data on the window.
async function openDeck(context) {
  const page = await context.newPage();
  await page.goto(slideUrl(SLIDES.images));
  await page.evaluate(() => {
    window.edits = {};
    const watched = Object.getOwnPropertyDescriptor(window, 'SK_svgDataApi');
    const changed = new WeakSet();
    Object.defineProperty(window, 'SK_svgDataApi', {
      configurable: true,
      enumerable: true,
      get: watched.get,
      set(api) {
        const proto = api && Object.getPrototypeOf(api);
        if (proto && !changed.has(proto)) {
          changed.add(proto);
          const requestPage = proto.requestPage3;
          proto.requestPage3 = function (id, prefetch, onImages, onSvg) {
            return requestPage.call(this, id, prefetch, onImages, function (svg, ...rest) {
              let edited = window.edits[id]
                ? svg.replace(/>[^<\s][^<]{2,}</, `>${window.edits[id]}<`)
                : svg;
              // As Slides numbers some ids when it's busy: both numbers differ from one drawing to the next.
              if (window.renumbered)
                edited = edited.replace(
                  /\be(\d+)_(\d+)\b/g,
                  (_, draw, item) => `e${+draw + 5}_${+item + 9}`,
                );
              return onSvg.call(this, edited, ...rest);
            });
          };
        }
        watched.set.call(this, api);
      },
    });
  });
  return page;
}

async function edit(page, slideId, word) {
  await page.evaluate(
    ([slideId, word]) => {
      if (word) window.edits[slideId] = word;
      else delete window.edits[slideId];
      document.querySelector(
        `.punch-filmstrip-thumbnail[data-slide-page-id="${slideId}"]`,
      ).dataset.edited = word ?? '';
    },
    [slideId, word],
  );
}

const replaced = (page) =>
  expect(slidesOwn(page)).toHaveAttribute('data-slides-companion-player', 'replaced', {
    timeout: 15000,
  });

async function choose(context, option) {
  const page = await context.newPage();
  await page.goto(slideUrl(SLIDES.images));
  await openSettings(page, 'Live edits');
  await page.getByRole('radio', { name: option }).check();
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  await page.close();
}

test('an edit to the slide on screen shows within seconds, and the slideshow carries on', async ({
  context,
}) => {
  const page = await startEditableSlideshow(context);
  await edit(page, SLIDE_3, 'Lisbon');
  await expect(words(page, 'Lisbon')).toBeVisible({ timeout: 15000 });
  await replaced(page);
  // The copy is the same size, in the same place, and Slides' own is out of sight behind it, and
  // can't be reached.
  expect(await copies(page).boundingBox()).toEqual(await slidesOwn(page).boundingBox());
  await expect(slidesOwn(page)).toHaveCSS('opacity', '0');
  expect(await slidesOwn(page).evaluate((frame) => frame.inert)).toBe(true);

  // Keys go to the new player, and the editor follows it.
  expect(await shownSlide(page)).toBe(3);
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => shownSlide(page)).toBe(2);
  await expect(page).toHaveURL(new RegExp(`slide=id\\.${SLIDE_2}`));

  // Esc ends the slideshow, and the next one starts on the slide it ended on.
  await page.keyboard.press('Escape');
  await expect(page.locator(PLAYER)).toHaveCount(0);
  await page.locator('#punch-start-presentation-left').click();
  await expect.poll(() => shownSlide(page)).toBe(2);
  await expect(copies(page)).toHaveCount(0);
});

test('an edit to another slide changes nothing on screen, and shows when you get there', async ({
  context,
}) => {
  const page = await startEditableSlideshow(context);
  await edit(page, SLIDE_2, 'Edited');
  await replaced(page);
  // Taken over at once, as the slide on screen looks just the same.
  await expect(copies(page)).toHaveCSS('opacity', '1');
  await expect(copies(page)).toHaveCSS('transition-duration', '0s');
  expect(await shownSlide(page)).toBe(3);
  await page.keyboard.press('ArrowLeft');
  await expect(words(page, 'Edited')).toBeVisible();
});

test('presenter view moves to the new player, without another window', async ({ context }) => {
  const page = await openDeck(context);
  await page.locator('#punch-start-presentation-right').click();
  const opened = context.waitForEvent('page');
  await page.locator('.goog-menuitem').filter({ visible: true }).first().click();
  const presenter = await opened;
  await expect(presenter.locator('.slides-companion-countdown-button')).toBeVisible();
  await expect(slidesOwn(page)).toHaveAttribute('data-slides-companion-loaded');
  const windows = context.pages().length;

  // Slides' timer, in seconds, as presenter view shows it (or our countdown, while it stands in).
  const time = () =>
    presenter
      .locator('.punch-viewer-speakernotes-timer-time')
      .filter({ visible: true })
      .textContent()
      .then((text) => {
        const [hours, minutes, seconds] = text.split(':').map(Number);
        return hours * 3600 + minutes * 60 + seconds;
      });
  await expect.poll(time).toBeGreaterThanOrEqual(3);

  await edit(page, SLIDE_3, 'Lisbon');
  const times = [];
  const watching = setInterval(
    () =>
      time().then(
        (seconds) => times.push(seconds),
        () => {},
      ),
    200,
  );
  await expect(words(page, 'Lisbon')).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(3000);
  clearInterval(watching);
  expect(context.pages().length).toBe(windows);
  // The timer carries on, never going back.
  expect(times.length).toBeGreaterThan(10);
  expect(times.every((seconds, i) => i === 0 || seconds >= times[i - 1])).toBe(true);
  expect(times.at(-1)).toBeGreaterThanOrEqual(times[0] + 3);
  // Edited again: a copy takes over from a copy, which is removed, and presenter view stays open.
  await edit(page, SLIDE_3, 'Porto');
  await expect(words(page, 'Porto')).toBeVisible({ timeout: 15000 });
  await expect(copies(page)).toHaveCount(1, { timeout: 5000 });
  expect(presenter.isClosed()).toBe(false);
  expect(context.pages().length).toBe(windows);
  const before = await time();
  await expect.poll(time).toBeGreaterThanOrEqual(before + 2);
  // Next in presenter view moves the slideshow on screen, and the countdown is still there.
  await presenter.locator('.punch-viewer-speakernotes-page-next').click();
  await expect.poll(() => shownSlide(page)).toBe(4);
  await expect(presenter.locator('.slides-companion-countdown-button')).toBeVisible();
});

// While a new player takes over, presenter view is written afresh: the countdown and its bar stay as
// they were, and nothing below them moves.
test('presenter view’s countdown and its bar stay put while a new player takes over', async ({
  context,
}) => {
  const page = await openDeck(context);
  await page.locator('#punch-start-presentation-right').click();
  const opened = context.waitForEvent('page');
  await page.locator('.goog-menuitem').filter({ visible: true }).first().click();
  const presenter = await opened;
  await presenter.locator('.slides-companion-countdown-button').click();
  await presenter
    .locator('.slides-companion-countdown-menu .goog-menuitem')
    .filter({ hasText: 'Count down from 20 minutes' })
    .click();
  await expect(presenter.locator('.slides-companion-countdown-bar')).toBeVisible();
  await expect(slidesOwn(page)).toHaveAttribute('data-slides-companion-loaded');

  const look = () =>
    presenter
      .evaluate(() => {
        const shown = (element) => element && element.getBoundingClientRect().width > 0;
        const time = [...document.querySelectorAll('.punch-viewer-speakernotes-timer-time')].find(
          shown,
        );
        const bar = document.querySelector('.slides-companion-countdown-bar');
        const below = document.querySelector('.punch-viewer-speakernotes-page-control-panel');
        return {
          time: time?.textContent,
          counting: time?.classList.contains('slides-companion-countdown'),
          bar: shown(bar),
          below: below?.getBoundingClientRect().top,
        };
      })
      .catch(() => null);
  const before = await look();
  const looks = [];
  const watching = setInterval(() => look().then((seen) => seen && looks.push(seen)), 100);
  await edit(page, SLIDE_3, 'Lisbon');
  await expect(words(page, 'Lisbon')).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(2500);
  clearInterval(watching);
  expect(looks.length).toBeGreaterThan(20);
  for (const seen of looks) {
    expect(seen).toMatchObject({ counting: true, bar: true, below: before.below });
    expect(seen.time).toMatch(/^00:(19|20):\d\d$/);
  }
});

test('it waits for a calm moment: an image spotlit keeps the slide as it is', async ({
  context,
}) => {
  const page = await startEditableSlideshow(context);
  const image = shown(page).locator(`[id="${IDS.left}"] image`);
  const box = await image.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(shown(page).locator('.slides-companion-spotlight')).toBeVisible();
  await edit(page, SLIDE_3, 'Lisbon');
  await page.waitForTimeout(6000);
  await expect(slidesOwn(page)).not.toHaveAttribute('data-slides-companion-player');
  await page.keyboard.press('Escape');
  await expect(words(page, 'Lisbon')).toBeVisible({ timeout: 15000 });
});

test('what the pen drew, and the pen itself, carry over', async ({ context }) => {
  const page = await startEditableSlideshow(context);
  await page.keyboard.press('Shift+L');
  await page.mouse.move(300, 300);
  await page.mouse.down();
  await page.mouse.move(400, 360, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => shownSlide(page)).toBe(2);

  await edit(page, SLIDE_2, 'Edited');
  await replaced(page);
  await expect(shown(page).locator('.sketchyViewerContent.disable-pointer-events')).toHaveCount(1);
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => shownSlide(page)).toBe(3);
  await expect(
    shown(page)
      .locator('.punch-slide-markup-surface > g')
      .first()
      .locator(':scope > .slides-companion-kept-ink'),
  ).toHaveCount(1);
});

test('set to show edits once you’ve moved on, the slide on screen stays as it is until then', async ({
  context,
}) => {
  await choose(context, /Once you’ve moved to another slide/);
  const page = await startEditableSlideshow(context);
  await edit(page, SLIDE_3, 'Lisbon');
  await page.waitForTimeout(7000);
  await expect(words(page, 'Lisbon')).toHaveCount(0);
  await page.keyboard.press('ArrowLeft');
  await replaced(page);
  await page.keyboard.press('ArrowRight');
  await expect(words(page, 'Lisbon')).toBeVisible();
});

test('set to wait for the next slideshow, nothing changes', async ({ context }) => {
  await choose(context, /Not until the next slideshow/);
  const page = await startEditableSlideshow(context);
  await edit(page, SLIDE_3, 'Lisbon');
  await page.waitForTimeout(7000);
  await expect(copies(page)).toHaveCount(0);
  await expect(words(page, 'Lisbon')).toHaveCount(0);
});

// On a busy computer, Slides numbers a slide's clip paths differently each time it draws it.
test('a slide drawn again, unedited but numbered differently, loads no new player', async ({
  context,
}) => {
  const page = await startEditableSlideshow(context);
  await page.evaluate(() => (window.renumbered = true));
  // Slides redraws the slide's thumbnail, as it does when it's busy, with nothing edited.
  await edit(page, SLIDE_3);
  await page.waitForTimeout(7000);
  await expect(copies(page)).toHaveCount(0);
  await expect(page.locator(PLAYER)).toHaveCount(1);

  // An edit still shows.
  await edit(page, SLIDE_3, 'Lisbon');
  await expect(words(page, 'Lisbon')).toBeVisible({ timeout: 15000 });
});

test('an edit undone before it shows changes nothing', async ({ context }) => {
  const page = await startEditableSlideshow(context);
  await edit(page, SLIDE_3, 'Lisbon');
  await page.waitForTimeout(400);
  await edit(page, SLIDE_3, null);
  await page.waitForTimeout(7000);
  await expect(slidesOwn(page)).not.toHaveAttribute('data-slides-companion-player');
  await expect(copies(page)).toHaveCount(0);
});

test('auto-play carries on, at the same pace, looping', async ({ context }) => {
  const page = await startEditableSlideshow(context);
  // Slides' ⋮ menu › Auto-play: every 5 seconds, loop, play. Its submenu opens on hover.
  const own = page.frameLocator(PLAYER);
  await slideshowSettled(own);
  async function autoPlay(nth) {
    const more = own.locator('.punch-viewer-navbar-more');
    if (!(await own.locator('.goog-menuitem[aria-haspopup]').filter({ visible: true }).count())) {
      await more.dispatchEvent('mousedown');
      await more.dispatchEvent('mouseup');
    }
    const box = await own
      .locator('.goog-menuitem[aria-haspopup]')
      .filter({ visible: true })
      .first()
      .boundingBox();
    await page.mouse.move(box.x + 20, box.y + box.height / 2);
    const submenu = own
      .locator('[role="menu"]')
      .filter({ has: own.locator('.goog-option') })
      .filter({ visible: true });
    await submenu.locator('[role^="menuitem"]').nth(nth).click();
  }
  await autoPlay(5); // Every 5 seconds.
  await autoPlay(11); // Loop.
  await autoPlay(0); // Play.

  await edit(page, SLIDE_3, 'Lisbon');
  await replaced(page);
  const src = new URL(await copies(page).getAttribute('src'));
  expect([
    src.searchParams.get('start'),
    src.searchParams.get('delayms'),
    src.searchParams.get('loop'),
  ]).toEqual(['true', '5000', 'true']);
  const at = await shownSlide(page);
  await expect.poll(() => shownSlide(page), { timeout: 8000 }).toBe(at + 1);
});

// Presenting through Meet, as far as the slideshow sees it (the test browser can't present through
// Meet). Meet puts SK_remoteCoordinator on the editor's window, and a player hands Meet its
// controls (Next, Previous) through it, then says what's on screen: as it loads, and when the
// editor says Meet has connected. Meet keeps the last player that handed it its controls.
async function presentThroughMeet(page) {
  await page.evaluate(() => {
    const meet = (window.meet = { player: null, controls: null, view: null });
    const playerOf = (object) =>
      [...document.querySelectorAll('iframe.punch-present-iframe')].find(
        (frame) => object instanceof frame.contentWindow.Object,
      ) ?? null;
    const listener = {};
    for (const name of [
      'onApiExported',
      'onCurrentViewChange',
      'onNavigation',
      'onPreviousPreviewChange',
      'onNextPreviewChange',
      'onNextNextPreviewChange',
      'onSlideLoadStateChange',
      'onFinishedLoading',
      'onActionEnabledStateChange',
      'onContentAnimationChange',
    ])
      listener[name] = () => {};
    listener.onApiExported = (content, controls) =>
      Object.assign(meet, { player: playerOf(controls), controls });
    // The slide on screen, counting from 0, and the step it's at: "2-0-…".
    listener.onCurrentViewChange = (view) => (meet.view = view);
    const accessibility = Object.assign(new EventTarget(), { isEnabled: () => false });
    window.SK_remoteCoordinator = new (class {
      getRemoteEventListener = () => listener;
      getNativeScreenReader = () => ({
        speakMessages() {},
        isStopSupported: () => false,
        stop() {},
      });
      getA11yVerbalizationConfig = () => ({ getNativeAccessibilityState: () => accessibility });
      getActiveFeatureStateList = () => '';
      getDynamicContextFunctions = () => ({});
      getContentPreviewsSupported = () => true;
      getAsyncRemoteEventsSupported = () => false;
      setViewerToastService() {}
    })();
  });
}
// Which player Meet has: Slides' own, or the copy on screen.
const meetHas = (page) =>
  page.evaluate(() =>
    !window.meet.player
      ? null
      : 'slidesCompanionCopy' in window.meet.player.dataset
        ? `copy, ${window.meet.player.dataset.slidesCompanionPlayer}`
        : 'Slides’ own',
  );
const meetPresses = (page, button) =>
  page.evaluate((button) => window.meet.controls[button](), button);
const meetShows = (page) => page.evaluate(() => Number(window.meet.view?.split('-')[0]) + 1);

test('presenting through Meet, Meet’s Next and Previous move the slide on screen after an edit', async ({
  context,
}) => {
  const page = await openDeck(context);
  await presentThroughMeet(page);
  await page.locator('#punch-start-presentation-left').click();
  await expect(slidesOwn(page)).toHaveAttribute('data-slides-companion-loaded');
  await expect.poll(() => meetHas(page)).toBe('Slides’ own');

  await edit(page, SLIDE_3, 'Lisbon');
  await expect(words(page, 'Lisbon')).toBeVisible({ timeout: 15000 });
  await replaced(page);
  await expect.poll(() => meetHas(page)).toBe('copy, shown');
  await meetPresses(page, 'goPrev');
  await expect.poll(() => shownSlide(page)).toBe(2);
  await expect.poll(() => meetShows(page)).toBe(2);
  await meetPresses(page, 'goNext');
  await expect.poll(() => shownSlide(page)).toBe(3);
  await expect.poll(() => meetShows(page)).toBe(3);
});

test('presenting through Meet, a new player waiting out of sight leaves Meet with the slide on screen', async ({
  context,
}) => {
  await choose(context, /Once you’ve moved to another slide/);
  const page = await openDeck(context);
  await presentThroughMeet(page);
  await page.locator('#punch-start-presentation-left').click();
  await expect(slidesOwn(page)).toHaveAttribute('data-slides-companion-loaded');

  await edit(page, SLIDE_3, 'Lisbon');
  await expect(copies(page)).toHaveAttribute('data-slides-companion-loaded', '', {
    timeout: 15000,
  });
  await page.waitForTimeout(2000);
  expect(await meetHas(page)).toBe('Slides’ own');
  // Moving on from Meet, the new player takes over on the slide moved to, and Meet has it.
  await meetPresses(page, 'goPrev');
  await expect.poll(() => shownSlide(page)).toBe(2);
  await replaced(page);
  await expect.poll(() => meetHas(page)).toBe('copy, shown');
  await meetPresses(page, 'goNext');
  await expect(words(page, 'Lisbon')).toBeVisible();
  await expect.poll(() => meetShows(page)).toBe(3);
});

test('Meet joining after an edit has showed gets the player on screen', async ({ context }) => {
  const page = await startEditableSlideshow(context);
  await edit(page, SLIDE_2, 'Edited');
  await replaced(page);
  await presentThroughMeet(page);
  // What the editor does as Meet joins: it tells the player it started.
  await slidesOwn(page).evaluate((frame) =>
    frame.contentWindow.SK_editorEventListener.onConnectRemote(),
  );
  await expect.poll(() => meetHas(page)).toBe('copy, shown');
  await meetPresses(page, 'goPrev');
  await expect.poll(() => shownSlide(page)).toBe(2);
});

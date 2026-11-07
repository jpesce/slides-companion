import { test, expect, deckUrl } from './fixtures.js';

// Slide 3 of the test deck has no notes; slide 4 has five paragraphs of lorem ipsum, a blank
// line apart.
const slide3 = `${deckUrl}#slide=id.g35a1872bb6d_1_0`;
const SLIDE_4_STARTS = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam a nulla nunc.';

async function startSlideshow(context) {
  const page = await context.newPage();
  await page.goto(slide3);
  await page.locator('#punch-start-presentation-left').click();
  const show = page.frameLocator('iframe.punch-present-iframe');
  await expect(show.locator('.punch-viewer-svgpage-a11yelement')).toHaveAttribute('aria-label', /3/);
  return { page, show };
}

async function openNotes(context, page) {
  const opened = context.waitForEvent('page');
  await page.keyboard.press('Shift+S');
  return opened;
}

// Shift+S in the notes window. It closes before the keys are let go.
async function closeFromInside(notes) {
  const closed = notes.waitForEvent('close');
  await notes.keyboard.down('Shift');
  await notes.keyboard.down('S');
  await closed;
}

const header = (notes) => notes.locator('.punch-viewer-speakernotes-text-header');
const body = (notes) => notes.locator('.punch-viewer-speakernotes-text-body-zoomable');
const slideNumber = (show) =>
  show.locator('.punch-viewer-svgpage-a11yelement').getAttribute('aria-label').then((label) => Number(label.match(/\d+/)[0]));

test('Shift+S opens the slide’s notes in a floating window that follows the slideshow', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  const notes = await openNotes(context, page);
  // Slides names the slide in the deck's language ("Slide 3 of 10").
  await expect(header(notes)).toHaveText(/^\D*3\D+11$/);
  await expect(body(notes)).toHaveText('');

  // Keys pressed in the notes window still drive the slideshow.
  await notes.keyboard.press('PageDown');
  await expect.poll(() => slideNumber(show)).toBe(4);
  await expect(header(notes)).toHaveText(/^\D*4\D+11$/);
  await expect(body(notes).locator('p').first()).toHaveText(new RegExp(`^${SLIDE_4_STARTS}`));
  // Paragraphs as presenter view writes them: a blank line is a line break.
  await expect(body(notes).locator(':scope > *')).toHaveCount(9);
  await expect(body(notes).locator(':scope > br')).toHaveCount(4);
  // Words are a space apart, and never run together or doubled.
  for (const paragraph of await body(notes).locator('p').allTextContents()) {
    expect(paragraph).not.toMatch(/[a-z][A-Z]|\s\s|[.,][a-zA-Z]/);
  }

  // And on, from the slideshow. (Slide 4 has a video, where Slides' ← does nothing, and its
  // first key can go to the video's step instead.)
  for (let tries = 0; (await slideNumber(show)) !== 5 && tries < 3; tries++) {
    await page.keyboard.press('PageDown');
    await page.waitForTimeout(1500);
  }
  await expect(header(notes)).toHaveText(/^\D*5\D+11$/);
  await expect(body(notes)).not.toHaveText(new RegExp(`^${SLIDE_4_STARTS}`));

  // Shift+S again, in either window, closes it.
  await closeFromInside(notes);
  await expect(show.locator('.punch-viewer-svgpage-a11yelement')).toBeAttached();
});

test('the slideshow’s ⋮ menu opens and closes the floating notes', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  const item = show.locator('.slides-companion-notes-menuitem');
  const openMenu = async () => {
    await page.mouse.move(300, 500);
    await show.locator('.punch-viewer-navbar-more').click();
    await expect(item).toBeVisible();
  };

  await openMenu();
  // Below Slides' own item for presenter view.
  await expect(show.locator('.goog-menuitem:has(.docs-icon-notes) + .goog-menuitem')).toHaveClass(/slides-companion-notes-menuitem/);
  await expect(item.locator('.goog-menuitem-label')).toHaveText('Open floating notes');
  await expect(item.locator('.goog-menuitem-accel')).toHaveText('Shift+S');
  // Dressed like the items around it.
  const look = (element) =>
    element.evaluate((node) => {
      const { height, paddingLeft, font, color } = getComputedStyle(node);
      return { height, paddingLeft, font, color };
    });
  const presenterView = show.locator('.goog-menuitem:has(.docs-icon-notes)');
  expect(await look(item)).toEqual(await look(presenterView));
  expect(await look(item.locator('.goog-menuitem-label'))).toEqual(await look(presenterView.locator('.goog-menuitem-label')));
  await item.hover();
  await expect(item).toHaveClass(/goog-menuitem-highlight/);
  await expect(show.locator('.goog-menuitem-highlight')).toHaveCount(1);

  const opened = context.waitForEvent('page');
  await item.click();
  const notes = await opened;
  await expect(header(notes)).toHaveText(/3/);
  // The menu closes and the slideshow goes on.
  await expect(item).toBeHidden();
  await expect(page.locator('iframe.punch-present-iframe')).toBeVisible();

  await openMenu();
  await expect(item.locator('.goog-menuitem-label')).toHaveText('Close floating notes');
  const closed = notes.waitForEvent('close');
  await item.click();
  await closed;
  await expect(item).toBeHidden();
  await expect(page.locator('iframe.punch-present-iframe')).toBeVisible();
});

test('the floating notes look like presenter view’s and zoom like them', async ({ context }) => {
  const { page } = await startSlideshow(context);
  await page.keyboard.press('PageDown');
  const notes = await openNotes(context, page);
  await expect(header(notes)).toHaveText(/4/);

  // Presenter view, beside the slideshow, on the same slide. (Opening a window takes the browser
  // out of full screen, so not while the notes are still opening.)
  await page.waitForTimeout(1600);
  await page.mouse.move(300, 500);
  const presenting = context.waitForEvent('page');
  await page.keyboard.press('s');
  const presenterView = await presenting;
  await expect(presenterView.locator('.punch-viewer-speakernotes-text-header')).toHaveText(/4/);
  // As wide as presenter view's notes pane.
  const width = await presenterView.locator('.punch-viewer-speakernotes-text-header-container').evaluate((pane) => pane.offsetWidth);
  await notes.setViewportSize({ width, height: 500 });

  const PARTS = [
    '.punch-viewer-speakernotes-text-header',
    '.punch-viewer-speakernotes-text-header-container',
    '.punch-viewer-speakernotes-zoom-container',
    '.punch-viewer-speakernotes-zoom-container .jfk-button-collapse-right',
    '.punch-viewer-speakernotes-zoom-plus',
    '.punch-viewer-speakernotes-text-body',
    '.punch-viewer-speakernotes-text-body-zoomable p',
    '.punch-viewer-speakernotes-text-body-zoomable span',
  ];
  // Each part's style, and its place and height in the notes pane.
  const look = (target) =>
    target.evaluate((parts) => {
      const pane = document.querySelector('.punch-viewer-speakernotes-text-header-container').getBoundingClientRect();
      return parts.map((selector) => {
        const element = document.querySelector(selector);
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return {
          selector,
          ...Object.fromEntries(['font', 'color', 'backgroundColor', 'backgroundImage', 'padding', 'margin', 'border', 'lineHeight', 'borderRadius'].map((key) => [key, style[key]])),
          box: [box.left - pane.left, box.top - pane.top, box.right - pane.right, box.height].map(Math.round),
        };
      });
    }, PARTS);
  expect(await look(notes)).toEqual(await look(presenterView));

  // Zoom: 15% a step, as in presenter view, and remembered for next time.
  const scale = () => body(notes).evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).a);
  await notes.getByRole('button', { name: 'Zoom in' }).click();
  await notes.getByRole('button', { name: 'Zoom in' }).click();
  expect(await scale()).toBeCloseTo(1.15 ** 2);
  const zoomOut = notes.getByRole('button', { name: 'Zoom out' });
  for (let step = 0; step < 10; step++) await zoomOut.click({ force: true });
  expect(await scale()).toBeCloseTo(1.15 ** -6);
  await expect(zoomOut).toHaveClass(/jfk-button-disabled/);
  await notes.getByRole('button', { name: 'Zoom in' }).click();

  await presenterView.close();
  await closeFromInside(notes);
  const reopened = await openNotes(context, page);
  await expect(header(reopened)).toHaveText(/4/);
  expect(await body(reopened).evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).a)).toBeCloseTo(1.15 ** -5);
});

// Opening the window takes the browser out of full screen (a real one does it; the test's needs
// telling), which would end Slides' slideshow.
async function openNotesLeavingFullScreen(context, page) {
  const notes = await openNotes(context, page);
  await page.evaluate(() => document.exitFullscreen());
  await expect.poll(() => isFullScreen(page)).toBe(false);
  return notes;
}
const isFullScreen = (page) => page.evaluate(() => Boolean(document.fullscreenElement));

async function openSlideshowMenu(page, show) {
  await page.mouse.move(300, 500);
  await show.locator('.punch-viewer-navbar-more').click();
  await expect(show.locator('.punch-viewer-navbar-menu .goog-menuitem:has(.docs-icon-notes)')).toBeVisible();
}
// The open menu covers ⋮, which closes it.
async function closeSlideshowMenu(show) {
  const more = show.locator('.punch-viewer-navbar-more');
  for (const type of ['mousedown', 'mouseup']) await more.dispatchEvent(type, { button: 0 });
  await expect(more).toHaveAttribute('aria-expanded', 'false');
}
// Slides keeps whichever it isn't showing hidden.
const enterItem = (show) => show.locator('.punch-viewer-navbar-menu .goog-menuitem:has(.docs-icon-fullscreen)').filter({ visible: true });
const exitItem = (show) => show.locator('.punch-viewer-navbar-menu .goog-menuitem:has(.docs-icon-fullscreen-exit)');

test('opening the floating notes keeps the slideshow going in a window, and their Full screen button takes it back', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  expect(await isFullScreen(page)).toBe(true);
  const button = (notes) => notes.locator('[data-full-screen]');
  // Before anything leaves full screen, there's nothing to go back to.
  const opened = await openNotes(context, page);
  await expect(button(opened)).toBeHidden();
  await closeFromInside(opened);

  const notes = await openNotesLeavingFullScreen(context, page);
  await page.waitForTimeout(500);
  await expect(page.locator('iframe.punch-present-iframe')).toBeVisible();
  expect(notes.isClosed()).toBe(false);
  await expect(button(notes)).toBeVisible();
  await expect(button(notes)).toHaveText('Full screen');

  // Keys still drive the slideshow, and leave it where it is.
  await notes.keyboard.press('PageDown');
  await expect.poll(() => slideNumber(show)).toBe(4);
  await expect(header(notes)).toHaveText(/4/);
  expect(await isFullScreen(page)).toBe(false);

  await button(notes).click();
  await expect.poll(() => isFullScreen(page)).toBe(true);
  await expect(button(notes)).toBeHidden();
  await expect(page.locator('iframe.punch-present-iframe')).toBeVisible();

  // Leaving full screen later still ends the slideshow, as it does in Slides.
  await page.waitForTimeout(1600);
  await page.evaluate(() => document.exitFullscreen());
  await expect(page.locator('iframe.punch-present-iframe')).toBeHidden();
  expect(notes.isClosed()).toBe(false);
});

// The slideshow's ⋮ menu takes the keyboard when ⋮ is reached with Tab and opened with Space or
// Enter (opened with the pointer, the keys stay with the slideshow). The pointer shows the bar ⋮ is
// on, and stays there, off the menu.
async function openSlideshowMenuWithKeys(page, show) {
  await page.mouse.move(300, 500);
  const previous = await show.locator('.punch-viewer-navbar-prev').boundingBox();
  await page.mouse.move(previous.x + previous.width / 2, previous.y + previous.height / 2);
  const more = show.locator('.punch-viewer-navbar-more');
  for (let i = 0; i < 10 && !(await more.evaluate((node) => node === document.activeElement)); i++) await page.keyboard.press('Tab');
  await expect(more).toBeFocused();
  await page.keyboard.press('Space');
  await expect(show.locator('.punch-viewer-navbar-menu .goog-menuitem:has(.docs-icon-notes)')).toBeVisible();
  await expect(more).toBeFocused();
  await expect(more).toHaveAttribute('aria-expanded', 'true');
}

test('the arrow keys reach the floating notes and Enter full screen in the slideshow’s ⋮ menu', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  const more = show.locator('.punch-viewer-navbar-more');
  const item = show.locator('.slides-companion-notes-menuitem');
  const presenterView = show.locator('.punch-viewer-navbar-menu .goog-menuitem:has(.docs-icon-notes)');
  const laser = show.locator('.slides-companion-notes-menuitem + .goog-menuitem');
  const highlighted = show.locator('.punch-viewer-navbar-menu:has(.slides-companion-notes-menuitem) .goog-menuitem-highlight');
  await openSlideshowMenuWithKeys(page, show);
  await page.keyboard.press('Home');
  await expect(presenterView).toHaveClass(/goog-menuitem-highlight/);
  await page.keyboard.press('ArrowDown');
  await expect(item).toHaveClass(/goog-menuitem-highlight/);
  await expect(highlighted).toHaveCount(1);
  await expect(more).toHaveAttribute('aria-activedescendant', await item.getAttribute('id'));
  await page.keyboard.press('ArrowDown');
  await expect(laser).toHaveClass(/goog-menuitem-highlight/);
  await page.keyboard.press('ArrowUp');
  await expect(item).toHaveClass(/goog-menuitem-highlight/);
  // The keys go on driving the menu, not the slideshow.
  expect(await slideNumber(show)).toBe(3);
  const opened = context.waitForEvent('page');
  await page.keyboard.press('Enter');
  const notes = await opened;
  await expect(header(notes)).toHaveText(/3/);
  await expect(item).toBeHidden();
  await expect(page.locator('iframe.punch-present-iframe')).toBeVisible();
  // Focus goes back to the slideshow, as after Slides' own items.
  await expect(more).not.toBeFocused();
  expect(await show.locator('body').evaluate((body) => document.activeElement === body)).toBe(true);

  // Out of full screen, Slides' "Exit full screen" is hidden, and the keys pass it by for the
  // "Enter full screen" in its place.
  await page.evaluate(() => document.exitFullscreen());
  await expect.poll(() => isFullScreen(page)).toBe(false);
  await openSlideshowMenuWithKeys(page, show);
  await expect(exitItem(show)).toBeHidden();
  const stops = show.locator('.punch-viewer-navbar-menu:has(.slides-companion-notes-menuitem) .goog-menuitem:not(.goog-menuitem-disabled)').filter({ visible: true });
  const count = await stops.count();
  const at = await stops.evaluateAll((nodes) => nodes.findIndex((node) => node.querySelector('.docs-icon-fullscreen')));
  // Up from the last item, onto it from the one after.
  await page.keyboard.press('End');
  for (let i = 0; i < count - 1 - at; i++) await page.keyboard.press('ArrowUp');
  await expect(enterItem(show)).toHaveClass(/goog-menuitem-highlight/);
  await expect(highlighted).toHaveCount(1);
  await page.keyboard.press('ArrowUp');
  await expect(stops.nth(at - 1)).toHaveClass(/goog-menuitem-highlight/);
  await page.keyboard.press('ArrowDown');
  await expect(enterItem(show)).toHaveClass(/goog-menuitem-highlight/);
  await page.keyboard.press('ArrowDown');
  await expect(stops.nth(at + 1)).toHaveClass(/goog-menuitem-highlight/);
  await expect(highlighted).toHaveCount(1);
  await page.keyboard.press('ArrowUp');
  await expect(enterItem(show)).toHaveClass(/goog-menuitem-highlight/);
  await page.keyboard.press('Enter');
  await expect.poll(() => isFullScreen(page)).toBe(true);
  await expect(page.locator('iframe.punch-present-iframe')).toBeVisible();
  expect(notes.isClosed()).toBe(false);
});

test('out of full screen, the slideshow’s ⋮ menu and ⌘+Shift+F take it back', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  await openSlideshowMenu(page, show);
  await expect(exitItem(show)).toBeVisible();
  await expect(enterItem(show)).toBeHidden();
  await closeSlideshowMenu(show);

  const notes = await openNotesLeavingFullScreen(context, page);
  await notes.close();
  // Slides' own "Enter full screen", in place of its "Exit full screen".
  await openSlideshowMenu(page, show);
  await expect(exitItem(show)).toBeHidden();
  await expect(enterItem(show)).toBeVisible();
  await expect(enterItem(show).locator('.goog-menuitem-accel')).toHaveText(/Shift\+F/);
  await enterItem(show).hover();
  await expect(enterItem(show)).toHaveClass(/goog-menuitem-highlight/);
  await enterItem(show).click();
  await expect.poll(() => isFullScreen(page)).toBe(true);
  await expect(show.locator('.punch-viewer-navbar-menu .goog-menuitem:has(.docs-icon-notes)')).toBeHidden();
  await openSlideshowMenu(page, show);
  await expect(exitItem(show)).toBeVisible();
  await expect(enterItem(show)).toBeHidden();
  await closeSlideshowMenu(show);

  await page.waitForTimeout(1600);
  await openNotesLeavingFullScreen(context, page);
  await page.keyboard.press('ControlOrMeta+Shift+F');
  await expect.poll(() => isFullScreen(page)).toBe(true);
  await expect(page.locator('iframe.punch-present-iframe')).toBeVisible();
});

// The test browser is signed out, where Slides leaves an empty notes box blank. Signed in, it says
// "Click to add speaker notes": one paragraph, drawn fresh without the opacity it gives real notes,
// and with it once you've written there and deleted it. Slide 4's notes are dressed up as that.
test('the floating notes leave out what Slides writes in an empty notes box', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  await page.keyboard.press('PageDown');
  const notes = await openNotes(context, page);
  await expect(body(notes).locator('p').first()).toHaveText(new RegExp(`^${SLIDE_4_STARTS}`));
  const drawing = page.locator('#speakernotes-workspace g[direction]');
  // Slides draws the next slide's notes in these same groups, so they're set aside, not removed.
  await drawing.evaluate((group) => {
    window.setAside = [...group.querySelectorAll('g[id*="-paragraph-"]')].slice(1).map((paragraph) => [paragraph, paragraph.parentNode, paragraph.nextSibling]);
    for (const [paragraph] of window.setAside) paragraph.remove();
    group.style.removeProperty('opacity');
  });
  await expect(body(notes)).toHaveText('');

  // Written, then deleted.
  const word = page.locator('#speakernotes-workspace g.sketchy-text-content-text text').first();
  await drawing.evaluate((group) => (group.style.opacity = '1'));
  await word.evaluate((text) => (text.textContent = 'Written'));
  await expect(body(notes).locator('p')).toHaveText(/^Written/);
  await word.evaluate((text) => (text.textContent = 'Lorem'));
  await expect(body(notes)).toHaveText('');

  // Real notes still show, on this slide and others.
  await drawing.evaluate(() => {
    for (const [paragraph, parent, next] of window.setAside.reverse()) parent.insertBefore(paragraph, next);
  });
  await expect(body(notes).locator(':scope > *')).toHaveCount(9);
  // Slide 4 has a video, where Slides' ← does nothing, so this goes on a slide and back. Its first
  // key can go to the video's step instead.
  for (let tries = 0; (await slideNumber(show)) !== 5 && tries < 3; tries++) {
    await notes.keyboard.press('PageDown');
    await page.waitForTimeout(1500);
  }
  expect(await slideNumber(show)).toBe(5);
  await expect(body(notes)).not.toHaveText(new RegExp(`^${SLIDE_4_STARTS}`));
  await notes.keyboard.press('PageUp');
  await expect.poll(() => slideNumber(show)).toBe(4);
  await expect(body(notes).locator('p').first()).toHaveText(new RegExp(`^${SLIDE_4_STARTS}`));
});

test('the floating notes stay open after the slideshow, and follow the slide selected while editing', async ({ context }) => {
  const { page } = await startSlideshow(context);
  const notes = await openNotes(context, page);
  await expect(header(notes)).toHaveText(/^\D*3\D+11$/);
  await page.keyboard.press('Escape');
  await expect(page.locator('iframe.punch-present-iframe')).toBeHidden();
  await page.waitForTimeout(500);
  expect(notes.isClosed()).toBe(false);

  // Named in the slideshow's words.
  const slideshowWords = (await header(notes).textContent()).replace(/\d+/g, '#');
  await page.locator('.punch-filmstrip-thumbnail').nth(3).click();
  // The editor counts the deck's slides itself.
  await expect(header(notes)).toHaveText(/^\D*4\D+\d+$/);
  expect((await header(notes).textContent()).replace(/\d+/g, '#')).toBe(slideshowWords);
  await expect(body(notes).locator('p').first()).toHaveText(new RegExp(`^${SLIDE_4_STARTS}`));
  await page.locator('.punch-filmstrip-thumbnail').nth(0).click();
  await expect(header(notes)).toHaveText(/^\D*1\D+\d+$/);
});

// Slides' menus only know their own items; its arrow keys stop on ours too, in their place, and
// Enter chooses it, closing the menu as Slides' own items do.
test('the arrow keys reach Show floating notes in View, and Enter opens them', async ({ context }) => {
  const page = await context.newPage();
  await page.goto(slide3);
  await page.waitForSelector('#speakernotes');
  const item = page.locator('.slides-companion-notes-menuitem');
  const speakerNotes = page.locator('.goog-menuitem:has(+ .slides-companion-notes-menuitem)');
  const filmstrip = page.locator('.slides-companion-notes-menuitem + .goog-menuitem');
  const highlighted = page.locator('.goog-menu:has(.slides-companion-notes-menuitem) .goog-menuitem-highlight');
  const isHighlighted = (element) => element.evaluate((node) => node.classList.contains('goog-menuitem-highlight'));
  await page.locator('#docs-view-menu').click();
  await expect(item).toBeVisible();
  await page.mouse.move(5, 300);
  for (let i = 0; i < 20 && !(await isHighlighted(speakerNotes)); i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(item).toHaveClass(/goog-menuitem-highlight/);
  await expect(highlighted).toHaveCount(1);
  // Named for screen readers, where Slides names its own.
  await expect(page.locator('#docs-menubar')).toHaveAttribute('aria-activedescendant', await item.getAttribute('id'));
  await page.keyboard.press('ArrowDown');
  await expect(filmstrip).toHaveClass(/goog-menuitem-highlight/);
  await expect(page.locator('#docs-menubar')).toHaveAttribute('aria-activedescendant', await filmstrip.getAttribute('id'));
  await page.keyboard.press('ArrowUp');
  await expect(item).toHaveClass(/goog-menuitem-highlight/);
  await page.keyboard.press('ArrowUp');
  await expect(speakerNotes).toHaveClass(/goog-menuitem-highlight/);
  await expect(highlighted).toHaveCount(1);
  // Closed with it highlighted, the menu opens again with nothing highlighted, as Slides does.
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');
  await expect(item).toBeHidden();
  await page.locator('#docs-view-menu').click();
  await expect(item).toBeVisible();
  await expect(highlighted).toHaveCount(0);
  await page.mouse.move(5, 300);
  for (let i = 0; i < 20 && !(await isHighlighted(speakerNotes)); i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');

  const opened = context.waitForEvent('page');
  await page.keyboard.press('Enter');
  const notes = await opened;
  await expect(header(notes)).toHaveText(/3/);
  await expect(item).toBeHidden();
  // Focus goes back to the slide, as after Slides' own items.
  await expect.poll(() => page.evaluate(() => document.activeElement.className)).toMatch(/docs-texteventtarget-iframe/);
});

test('View › Show floating notes opens them before presenting, and they stay on top as it goes full screen', async ({ context }) => {
  const page = await context.newPage();
  await page.goto(slide3);
  await page.waitForSelector('#speakernotes');
  const menuItem = page.locator('.slides-companion-notes-menuitem');
  const openView = async () => {
    await page.locator('#docs-view-menu').click();
    await expect(menuItem).toBeVisible();
  };
  await openView();
  // Below "Show speaker notes", and like it.
  const speakerNotes = page.locator('.goog-menuitem:has(+ .slides-companion-notes-menuitem)');
  await expect(speakerNotes).toHaveText(new RegExp(await page.locator('#speakernotes').getAttribute('aria-label'), 'i'));
  await expect(menuItem).toHaveText('Show floating notes');
  await expect(menuItem).toHaveAttribute('aria-checked', 'false');
  const look = (element) =>
    element.evaluate((node) => {
      const { height, padding, font, color, backgroundImage } = getComputedStyle(node);
      return { height, padding, font, color, backgroundImage };
    });
  for (const part of ['', '.goog-menuitem-label', '.goog-menuitem-checkbox']) {
    const pick = (item) => (part ? item.locator(part) : item);
    expect(await look(pick(menuItem))).toEqual(await look(pick(speakerNotes)));
  }
  await menuItem.hover();
  await expect(menuItem).toHaveClass(/goog-menuitem-highlight/);
  await expect(page.locator('.goog-menuitem-highlight:visible')).toHaveCount(1);

  const opened = context.waitForEvent('page');
  await menuItem.click();
  const notes = await opened;
  await expect(menuItem).toBeHidden();
  await expect(header(notes)).toHaveText(/3/);
  // Dressed by the slideshow's stylesheet, as in presenter view.
  await expect(header(notes)).toHaveCSS('font-weight', '700');
  await expect(notes.locator('.punch-viewer-speakernotes-zoom-plus')).toHaveCSS('background-image', /viewer/);
  // Ticked while open, as Slides ticks what's shown.
  await openView();
  await expect(menuItem).toHaveAttribute('aria-checked', 'true');
  await expect(menuItem.locator('.goog-menuitem-checkbox')).toHaveCSS('background-image', await speakerNotes.locator('.goog-menuitem-checkbox').evaluate(() => getComputedStyle(document.querySelector('.goog-option-selected .goog-menuitem-checkbox')).backgroundImage));
  await page.keyboard.press('Escape');
  await expect(menuItem).toBeHidden();

  await page.locator('#punch-start-presentation-left').click();
  const show = page.frameLocator('iframe.punch-present-iframe');
  await expect(show.locator('.punch-viewer-svgpage-a11yelement')).toHaveAttribute('aria-label', /3/);
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await page.keyboard.press('PageDown');
  await expect(header(notes)).toHaveText(/4/);
  expect(notes.isClosed()).toBe(false);

  // The slideshow's menu knows it's open.
  await page.mouse.move(300, 500);
  await show.locator('.punch-viewer-navbar-more').click();
  await expect(show.locator('.slides-companion-notes-menuitem .goog-menuitem-label')).toHaveText('Close floating notes');
});

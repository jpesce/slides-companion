import { test, expect, deckUrl, openSettings } from './fixtures.js';

// Slide 3 of the test deck: two photos side by side and a caption text box.
const slide = `${deckUrl}#slide=id.g35a1872bb6d_1_0`;
const LEFT = 'g35a1872bb6d_1_2';

async function startSlideshow(context, viewport) {
  const page = await context.newPage();
  if (viewport) await page.setViewportSize(viewport);
  await page.goto(slide);
  await page.locator('#punch-start-presentation-left').click();
  const show = page.frameLocator('iframe.punch-present-iframe');
  await expect(show.locator(`[id="${LEFT}"] image`)).toBeVisible();
  return { page, show };
}

const slideNumber = (show) =>
  show.locator('.punch-viewer-svgpage-a11yelement').getAttribute('aria-label').then((label) => Number(label.match(/\d+/)[0]));

async function drawStroke(page, from, to) {
  await page.mouse.move(...from);
  await page.mouse.down();
  await page.mouse.move(...to, { steps: 8 });
  await page.mouse.up();
}

// Draws with the pen and leaves the slideshow, once the stroke is saved.
async function drawAndLeave(context, draw) {
  const { page, show } = await startSlideshow(context);
  await page.keyboard.press('Shift+L');
  await draw(page);
  const drawn = await strokes(show, `path:not(${KEPT}), circle:not(${KEPT})`);
  await page.waitForTimeout(300);
  await page.close();
  return drawn;
}

const KEPT = '.slides-companion-kept-ink';
// The pen's layer (the laser pointer has one after it), and what's in it.
const penLayer = (show) => show.locator('.punch-slide-markup-surface > g').first();
const ink = (show) => penLayer(show).locator(':scope > *');

// The pen's strokes: their colour, thickness and place, as parts of the slide's width from its top
// left corner, so they compare across window sizes.
const strokes = (show, selector = KEPT) =>
  penLayer(show).evaluate((ink, selector) => {
    const slide = document.querySelector('.sketchyViewerContent').getBoundingClientRect();
    const part = (value) => Math.round(value * 1000) / 1000;
    return [...ink.querySelectorAll(`:scope > :is(${selector})`)].map((stroke) => {
      const { x, y, right, bottom } = stroke.getBoundingClientRect();
      return {
        shape: stroke.nodeName,
        colour: stroke.getAttribute('stroke') ?? stroke.getAttribute('fill'),
        thickness: Math.round(stroke.nodeName === 'circle' ? stroke.getBoundingClientRect().width : stroke.getAttribute('stroke-width') * stroke.getScreenCTM().a),
        box: [x - slide.x, y - slide.y, right - slide.x, bottom - slide.y].map((value) => part(value / slide.width)),
      };
    });
  }, selector);

// Keeping is on unless it's turned off in Settings.
async function turnOffKeeping(context) {
  const page = await context.newPage();
  await page.goto(slide);
  await openSettings(page, 'Pen');
  await page.getByRole('checkbox', { name: /Keep what you draw/ }).uncheck();
  await page.getByRole('button', { name: 'OK' }).click();
  await page.close();
}

const near = (a, b) => a.every((stroke, i) => stroke.box.every((value, j) => Math.abs(value - b[i].box[j]) < 0.004));

test('with keeping turned off in Settings, as in Slides, the pen’s ink goes when the slideshow ends', async ({ context }) => {
  await turnOffKeeping(context);
  await drawAndLeave(context, (page) => drawStroke(page, [400, 300], [600, 420]));
  const { page, show } = await startSlideshow(context);
  await page.waitForTimeout(500);
  await expect(ink(show)).toHaveCount(0);
});

test.describe('kept from the start', () => {
  test('what the pen draws shows again the next time the deck is presented, as it was drawn', async ({ context }) => {
    const drawn = await drawAndLeave(context, (page) => drawStroke(page, [400, 300], [600, 420]));
    expect(drawn).toHaveLength(1);

    const { show } = await startSlideshow(context);
    const kept = await strokes(show);
    expect(kept).toHaveLength(1);
    expect(kept[0].colour).toBe(drawn[0].colour);
    expect(kept[0].thickness).toBe(drawn[0].thickness);
    expect(near(kept, drawn)).toBe(true);
  });

  test('kept ink stays on its slide: changing slides and a new window size keep it in place', async ({ context }) => {
    const drawn = await drawAndLeave(context, (page) => drawStroke(page, [400, 300], [600, 420]));

    // Another window shape: the slide sits between bars, at another size.
    const { page, show } = await startSlideshow(context, { width: 1000, height: 700 });
    expect(near(await strokes(show), drawn)).toBe(true);
    // Slide 4 has a video, where Slides' ← does nothing, so this goes back a slide and returns.
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => slideNumber(show)).toBe(2);
    expect(await strokes(show)).toEqual([]);
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => slideNumber(show)).toBe(3);
    await expect.poll(async () => near(await strokes(show), drawn)).toBe(true);

    await page.setViewportSize({ width: 1280, height: 600 });
    await expect.poll(async () => (await strokes(show)).length === 1 && near(await strokes(show), drawn)).toBe(true);
  });

  test('what’s drawn on top of kept ink is kept too, and a tap of the pen is kept as a dot', async ({ context }) => {
    await drawAndLeave(context, (page) => drawStroke(page, [400, 300], [600, 420]));
    const drawn = await drawAndLeave(context, async (page) => {
      await drawStroke(page, [400, 500], [600, 520]);
      await page.mouse.click(700, 200);
    });

    const { show } = await startSlideshow(context);
    const kept = await strokes(show);
    expect(kept.map((stroke) => stroke.shape)).toEqual(['path', 'path', 'circle']);
    expect(near(kept.slice(1), drawn)).toBe(true);
    expect(kept[2].thickness).toBe(drawn[1].thickness);
  });

  test('ink drawn while zoomed in is kept where it was drawn on the slide', async ({ context }) => {
    const { page, show } = await startSlideshow(context);
    await page.mouse.move(640, 360);
    for (let i = 0; i < 3; i++) await page.mouse.wheel(0, -200);
    await page.waitForTimeout(500);
    await page.keyboard.press('Shift+L');
    await drawStroke(page, [400, 300], [600, 420]);
    await page.keyboard.press('Shift+L');
    // Zoomed out, where the stroke sits on the whole slide.
    for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 300);
    await page.waitForTimeout(500);
    const drawn = await strokes(show, 'path');
    await page.close();

    const again = await startSlideshow(context);
    const kept = await strokes(again.show);
    expect(near(kept, drawn)).toBe(true);
    expect(kept[0].thickness).toBe(drawn[0].thickness);
  });

  // Erase all, which Slides offers with the pen on or off.
  const ERASE_ALL = {
    'Shift + A': (page) => page.keyboard.press('Shift+A'),
    'a click in the eraser’s menu': async (page, show) => {
      await openEraserMenu(page, show);
      await show.locator('.punch-viewer-navbar-eraser-menu [role="menuitem"]').click();
    },
    'the keyboard in the eraser’s menu': async (page, show) => {
      await openEraserMenu(page, show);
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
    },
  };

  async function openEraserMenu(page, show) {
    await page.keyboard.press('Shift+L');
    await page.mouse.move(100, 700);
    await page.mouse.move(150, 690);
    await show.locator('.punch-viewer-navbar-eraser-menu-button').click();
  }

  test('a capital A typed in a search box (Slides’ Keyboard shortcuts) keeps the ink', async ({ context }) => {
    await drawAndLeave(context, (page) => drawStroke(page, [400, 300], [600, 420]));
    const { page, show } = await startSlideshow(context);
    await expect(show.locator(KEPT)).toHaveCount(1);
    const search = show.locator('.appsElementsKeyboardShortcutsDialogSearchInputField');
    // The slideshow takes keys a moment after it shows.
    await expect(async () => {
      if (!(await search.count())) await page.keyboard.press('ControlOrMeta+/');
      await expect(search).toBeVisible({ timeout: 2000 });
    }).toPass();
    await search.click();
    await page.keyboard.press('Shift+A');
    await expect(search).toHaveValue('A');
    await page.waitForTimeout(300);
    await expect(show.locator(KEPT)).toHaveCount(1);
  });

  for (const [way, eraseAll] of Object.entries(ERASE_ALL)) {
    test(`Erase all with ${way} erases kept ink too, for good`, async ({ context }) => {
      await drawAndLeave(context, (page) => drawStroke(page, [400, 300], [600, 420]));
      const { page, show } = await startSlideshow(context);
      await expect(show.locator(KEPT)).toHaveCount(1);
      await page.keyboard.press('Shift+L');
      await drawStroke(page, [400, 500], [600, 520]);
      await page.keyboard.press('Shift+L');
      await eraseAll(page, show);
      await expect(ink(show)).toHaveCount(0);
      await page.waitForTimeout(300);
      await page.close();

      const again = await startSlideshow(context);
      await expect(again.show.locator('.punch-viewer-svgpage-a11yelement')).toHaveCount(1);
      await again.page.waitForTimeout(500);
      await expect(ink(again.show)).toHaveCount(0);
    });
  }
});

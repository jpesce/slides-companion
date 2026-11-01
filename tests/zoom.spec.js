import { test, expect, deckUrl } from './fixtures.js';

// Slide 3 of the test deck: two photos side by side and a caption text box.
const slide = `${deckUrl}#slide=id.g35a1872bb6d_1_0`;
const LEFT = 'g35a1872bb6d_1_2';

async function startSlideshow(context) {
  const page = await context.newPage();
  await page.goto(slide);
  await page.locator('#punch-start-presentation-left').click();
  const show = page.frameLocator('iframe.punch-present-iframe');
  await expect(show.locator(`[id="${LEFT}"] image`)).toBeVisible();
  return { page, show };
}

const slideNumber = (show) =>
  show.locator('.punch-viewer-svgpage-a11yelement').getAttribute('aria-label').then((label) => Number(label.match(/\d+/)[0]));

// The slide's zoom and shift, from the transform on the container that holds it (where it's
// going, not where its short ease has got to).
const zoom = (show) =>
  show.locator('.sketchyViewerContainer').evaluate((element) => {
    const { a, e, f } = new DOMMatrix(element.style.transform);
    return { scale: Math.round(a * 100) / 100, x: Math.round(e), y: Math.round(f) };
  });

async function zoomIn(page, show, x, y) {
  await page.mouse.move(x, y);
  for (let i = 0; i < 3; i++) await page.mouse.wheel(0, -200);
  await expect.poll(() => zoom(show).then(({ scale }) => scale)).toBeGreaterThan(2);
}

test('scrolling zooms in where the pointer is, and back out to the whole slide', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  const { width, height } = page.viewportSize();
  await zoomIn(page, show, width * 0.75, height * 0.25);
  // The point under the pointer stays under it.
  const { scale, x, y } = await zoom(show);
  expect(Math.abs(x - width * 0.75 * (1 - scale))).toBeLessThan(2);
  expect(Math.abs(y - height * 0.25 * (1 - scale))).toBeLessThan(2);

  for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 300);
  await expect.poll(() => zoom(show)).toEqual({ scale: 1, x: 0, y: 0 });
  // Scrolling on, fully zoomed out (as a trackpad does after the fingers lift), keeps the slide.
  for (let i = 0; i < 3; i++) await page.mouse.wheel(0, 300);
  await page.waitForTimeout(500);
  expect(await slideNumber(show)).toBe(3);
});

test('dragging while zoomed looks around without changing slides or spotlighting', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  const box = await show.locator(`[id="${LEFT}"] image`).boundingBox();
  const [cx, cy] = [box.x + box.width / 2, box.y + box.height / 2];
  await zoomIn(page, show, cx, cy);
  const before = await zoom(show);

  await page.mouse.down();
  await page.mouse.move(cx + 60, cy + 40, { steps: 5 });
  await page.mouse.up();
  const after = await zoom(show);
  expect(after.x - before.x).toBe(60);
  expect(after.y - before.y).toBe(40);
  await page.waitForTimeout(500);
  expect(await slideNumber(show)).toBe(3);
  await expect(show.locator('.slides-companion-spotlight')).toHaveCount(0);
});

// Nothing a press does while zoomed in reaches Slides: not a click, nor two quick drags (a double
// click to the browser), nor the pointer events Slides also listens to.
test('while zoomed, clicks and drags never change slides', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  const { width, height } = page.viewportSize();
  const [x, y] = [width * 0.9, height * 0.9]; // The empty bottom right of the slide.
  await zoomIn(page, show, x, y);
  await show.locator('html').evaluate(() => {
    window.reachedSlides = [];
    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click', 'dblclick']) {
      document.addEventListener(type, () => window.reachedSlides.push(type), true);
    }
  });

  await page.mouse.click(x, y);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 50, y - 30, { steps: 4 });
  await page.mouse.up();
  await page.mouse.down({ clickCount: 2 });
  await page.mouse.move(x - 100, y - 60, { steps: 4 });
  await page.mouse.up({ clickCount: 2 });
  await page.waitForTimeout(500);
  expect(await slideNumber(show)).toBe(3);
  expect(await show.locator('html').evaluate(() => window.reachedSlides)).toEqual([]);
});

// Zoomed in, what shows a pointing hand can still be clicked: an image opens in the spotlight.
test('while zoomed, clicking an image spotlights it', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  const box = await show.locator(`[id="${LEFT}"] image`).boundingBox();
  const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
  await zoomIn(page, show, x, y);
  await expect(show.locator(`[id="${LEFT}"] image`)).toHaveCSS('cursor', 'pointer');
  await page.mouse.click(x, y);
  await expect(show.locator('.slides-companion-spotlight')).toBeVisible();
  expect(await slideNumber(show)).toBe(3);
});

// With the spotlight off for clicks, there's no hand over images, and the click does nothing.
test('while zoomed, with clicking to spotlight turned off, clicking an image does nothing', async ({ context }) => {
  const page = await context.newPage();
  await page.goto(slide);
  await page.locator('.slides-companion-button').click();
  await page.getByRole('checkbox', { name: /Spotlight an image when you click it/ }).uncheck();
  await page.getByRole('button', { name: 'OK' }).click();
  await page.close();

  const { page: presenting, show } = await startSlideshow(context);
  const box = await show.locator(`[id="${LEFT}"] image`).boundingBox();
  const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
  await zoomIn(presenting, show, x, y);
  await presenting.mouse.click(x, y);
  await presenting.waitForTimeout(500);
  await expect(show.locator('.slides-companion-spotlight')).toHaveCount(0);
  expect(await slideNumber(show)).toBe(3);
});

// Trackpads can send a move that says no button is held in the middle of a drag, and the window
// can lose focus. Neither may hand the rest of the press (its release and click) to Slides.
test('a press stays the zoom’s until its click, whatever happens in between', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  const { width, height } = page.viewportSize();
  const [x, y] = [width * 0.9, height * 0.9];
  await zoomIn(page, show, x, y);
  const input = await context.newCDPSession(page);

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 40, y - 20, { steps: 3 });
  await input.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x - 50, y: y - 25, button: 'none', buttons: 0 });
  await show.locator('html').evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.mouse.move(x - 60, y - 30, { steps: 2 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  expect(await slideNumber(show)).toBe(3);
});

test('changing slides while zoomed starts the next slide whole', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  const { width, height } = page.viewportSize();
  await zoomIn(page, show, width / 2, height / 2);
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => slideNumber(show)).toBe(4);
  await expect.poll(() => zoom(show)).toEqual({ scale: 1, x: 0, y: 0 });
});

test('with zoom turned off in Settings, scrolling changes slides', async ({ context }) => {
  const page = await context.newPage();
  await page.goto(slide);
  await page.locator('.slides-companion-button').click();
  await page.getByRole('checkbox', { name: /Zoom in when you scroll/ }).uncheck();
  await page.getByRole('button', { name: 'OK' }).click();
  await page.close();

  const { page: presenting, show } = await startSlideshow(context);
  const { width, height } = presenting.viewportSize();
  await presenting.mouse.move(width / 2, height / 2);
  await presenting.mouse.wheel(0, 300);
  await expect.poll(() => slideNumber(show)).toBe(4);
  expect((await zoom(show)).scale).toBe(1);
});

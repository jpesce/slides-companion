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

// The slide's zoom and shift, from its transform.
const zoom = (show) =>
  show.locator('.sketchyViewerContent').evaluate((element) => {
    const { a, e, f } = new DOMMatrix(element.style.transform);
    return { scale: Math.round(a * 100) / 100, x: Math.round(e), y: Math.round(f) };
  });

// Scrolling eases to its zoom; this waits until it's there.
async function settled(show) {
  let last;
  await expect
    .poll(async () => {
      const now = JSON.stringify(await zoom(show));
      const still = now === last;
      last = now;
      return still;
    }, { intervals: [100] })
    .toBe(true);
}

async function zoomIn(page, show, x, y) {
  await page.mouse.move(x, y);
  for (let i = 0; i < 3; i++) await page.mouse.wheel(0, -200);
  await expect.poll(() => zoom(show).then(({ scale }) => scale)).toBeGreaterThan(2);
  await settled(show);
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

// Zoomed all the way out is back to normal at once, even while the zoom is still easing out.
test('a click right after zooming all the way out changes slides', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  const { width, height } = page.viewportSize();
  const [x, y] = [width * 0.9, height * 0.9]; // The empty bottom right of the slide.
  await zoomIn(page, show, x, y);
  await page.mouse.wheel(0, 2000);
  await page.mouse.click(x, y);
  await expect.poll(() => slideNumber(show)).toBe(4);
});

// Every frame of the easing, not just the end: the slide grows from under the pointer.
test('while scrolling eases in, the point under the pointer stays put', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  const [px, py] = [900, 200];
  await page.mouse.move(px, py);
  const frames = show.locator('.sketchyViewerContent').evaluate(
    (element) =>
      new Promise((resolve) => {
        const seen = [];
        const sample = () => {
          if (element.style.transform) seen.push(new DOMMatrix(element.style.transform));
          if (seen.length < 6) requestAnimationFrame(sample);
          else resolve(seen.map(({ a, e, f }) => ({ scale: a, x: e, y: f })));
        };
        requestAnimationFrame(sample);
      }),
  );
  await page.mouse.wheel(0, -300);
  const seen = await frames;
  expect(new Set(seen.map(({ scale }) => scale.toFixed(3))).size).toBeGreaterThan(2);
  for (const { scale, x, y } of seen) {
    expect(Math.abs(x - px * (1 - scale))).toBeLessThan(1);
    expect(Math.abs(y - py * (1 - scale))).toBeLessThan(1);
  }
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
  await openSettings(page, 'Spotlight');
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

// Slides draws the laser pointer at the pointer's place on the screen, on a layer of its own.
test('while zoomed, the laser pointer stays under the pointer', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  await page.keyboard.press('l');
  const { width, height } = page.viewportSize();
  await zoomIn(page, show, width / 2, height / 2);
  await page.mouse.move(width * 0.4, height * 0.3);
  await page.mouse.move(width * 0.4 + 10, height * 0.3 + 5);
  const laser = show.locator('.punch-slide-markup-surface circle[cx]');
  await expect.poll(async () => {
    const box = await laser.boundingBox();
    return Math.hypot(box.x + box.width / 2 - (width * 0.4 + 10), box.y + box.height / 2 - (height * 0.3 + 5));
  }).toBeLessThan(3);
  // And at its usual size.
  expect((await laser.boundingBox()).width).toBeLessThan(15);
});

// The pen's ink sits on the slide: drawn at any zoom, it stays on what it marks as the zoom changes.
const ink = (show) =>
  show.locator('.punch-slide-markup-surface path[stroke-width]').first().evaluate((path) => {
    const { x, y, right, bottom } = path.getBoundingClientRect();
    return { x, y, right, bottom };
  });
const near = (a, b) => Math.max(...['x', 'y', 'right', 'bottom'].map((k) => Math.abs(a[k] - b[k]))) < 3;

async function drawStroke(page, from, to) {
  await page.mouse.move(...from);
  await page.mouse.down();
  await page.mouse.move(...to, { steps: 8 });
  await page.mouse.up();
}

test('ink drawn while zoomed stays on the slide when zooming out', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  const { width, height } = page.viewportSize();
  await zoomIn(page, show, width / 2, height / 2);
  const { scale, x, y } = await zoom(show);
  await page.keyboard.press('Shift+L');
  await drawStroke(page, [400, 300], [600, 420]);
  const drawn = await ink(show);
  // Under the pen while zoomed.
  expect(drawn.right).toBeCloseTo(600, -1);
  expect(drawn.bottom).toBeCloseTo(420, -1);

  for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 300);
  await expect.poll(() => zoom(show).then((z) => z.scale)).toBe(1);
  const whole = { x: (drawn.x - x) / scale, y: (drawn.y - y) / scale, right: (drawn.right - x) / scale, bottom: (drawn.bottom - y) / scale };
  await expect.poll(async () => near(await ink(show), whole)).toBe(true);
});

test('ink drawn on the whole slide zooms with it', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  await page.keyboard.press('Shift+L');
  await drawStroke(page, [400, 300], [600, 420]);
  const drawn = await ink(show);
  const { width, height } = page.viewportSize();
  await zoomIn(page, show, width / 2, height / 2);
  const { scale, x, y } = await zoom(show);
  const zoomed = { x: drawn.x * scale + x, y: drawn.y * scale + y, right: drawn.right * scale + x, bottom: drawn.bottom * scale + y };
  await expect.poll(async () => near(await ink(show), zoomed)).toBe(true);
});

// Ink is like paint on the slide: a line is as thick on it whatever the zoom it was drawn at, and
// zoomed in, the pen's dot under the pointer is as wide as the line it draws.
test('lines drawn at any zoom are equally thick on the slide', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  const lines = () =>
    show
      .locator('.punch-slide-markup-surface path[stroke-width]')
      .evaluateAll((paths) => paths.map((path) => Math.round(path.getAttribute('stroke-width') * path.getScreenCTM().a)));
  const dot = () =>
    show.locator('.punch-slide-markup-surface > circle').first().evaluate((circle) => Math.round(parseFloat(getComputedStyle(circle).r) * 2));
  await page.keyboard.press('Shift+L');
  await drawStroke(page, [300, 200], [400, 260]);
  const [width] = await lines();
  const { width: viewWidth, height } = page.viewportSize();
  await zoomIn(page, show, viewWidth / 2, height / 2);
  const { scale } = await zoom(show);
  await drawStroke(page, [700, 500], [800, 560]);
  const zoomed = Math.round(width * scale);
  expect(await lines()).toEqual([zoomed, zoomed]);
  expect(await dot()).toBe(zoomed);

  for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 300);
  await expect.poll(() => zoom(show).then((z) => z.scale)).toBe(1);
  expect(await lines()).toEqual([width, width]);
  expect(await dot()).toBe(width);
});

test('ink drawn while zoomed is in place after coming back to the slide', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  const { width, height } = page.viewportSize();
  await zoomIn(page, show, width / 2, height / 2);
  const { scale, x, y } = await zoom(show);
  await page.keyboard.press('Shift+L');
  await drawStroke(page, [400, 300], [600, 420]);
  const drawn = await ink(show);
  await page.keyboard.press('Shift+L');
  // Slide 4 has a video, where Slides' ← does nothing, so this goes back a slide and returns.
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => slideNumber(show)).toBe(2);
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => slideNumber(show)).toBe(3);
  const whole = { x: (drawn.x - x) / scale, y: (drawn.y - y) / scale, right: (drawn.right - x) / scale, bottom: (drawn.bottom - y) / scale };
  await expect.poll(async () => near(await ink(show), whole)).toBe(true);
});

test('a dot tapped with the pen while zoomed lands under the pen, and stays on the slide', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  const { width, height } = page.viewportSize();
  await zoomIn(page, show, width / 2, height / 2);
  const { scale, x, y } = await zoom(show);
  await page.keyboard.press('Shift+L');
  await page.mouse.click(400, 300);
  const dot = () =>
    show.locator('.punch-slide-markup-surface > g circle').evaluate((circle) => {
      const { x, y, width, height } = circle.getBoundingClientRect();
      return { x: x + width / 2, y: y + height / 2 };
    });
  const tapped = await dot();
  expect(Math.abs(tapped.x - 400)).toBeLessThan(3);
  expect(Math.abs(tapped.y - 300)).toBeLessThan(3);

  for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 300);
  await expect.poll(() => zoom(show).then((z) => z.scale)).toBe(1);
  const whole = await dot();
  expect(Math.abs(whole.x - (400 - x) / scale)).toBeLessThan(3);
  expect(Math.abs(whole.y - (300 - y) / scale)).toBeLessThan(3);
});

// Where the first stroke's middle is on the slide, as parts of the slide's width and height.
const inkOnSlide = (show) =>
  show.locator('.punch-slide-markup-surface path[stroke-width]').first().evaluate((path) => {
    const slide = document.querySelector('.sketchyViewerContent').getBoundingClientRect();
    const ink = path.getBoundingClientRect();
    return [(ink.x + ink.width / 2 - slide.x) / slide.width, (ink.y + ink.height / 2 - slide.y) / slide.height];
  });
const samePlace = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])) < 0.003;

// A 16:10 screen shows the slide between bars at the top and bottom.
test('on a screen that isn’t the slide’s shape, ink stays on the slide at any zoom', async ({ context }) => {
  const { page, show } = await startSlideshow(context, { width: 1280, height: 800 });
  await page.keyboard.press('Shift+L');
  await drawStroke(page, [400, 300], [600, 420]);
  const drawn = await inkOnSlide(show);
  await zoomIn(page, show, 640, 400);
  expect(samePlace(await inkOnSlide(show), drawn)).toBe(true);

  await page.keyboard.press('Shift+A'); // Erase all.
  await drawStroke(page, [400, 300], [600, 420]);
  const drawnZoomed = await inkOnSlide(show);
  for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 300);
  await expect.poll(() => zoom(show).then((z) => z.scale)).toBe(1);
  expect(samePlace(await inkOnSlide(show), drawnZoomed)).toBe(true);
});

// Moving to a projector, say.
test('a new window size keeps the zoomed-in view and the ink in place', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  await zoomIn(page, show, 900, 200);
  await page.keyboard.press('Shift+L');
  await drawStroke(page, [400, 300], [600, 420]);
  const drawn = await inkOnSlide(show);
  const inView = () =>
    show.locator('.sketchyViewerContent').evaluate((slide) => {
      const { x, y, width, height } = slide.getBoundingClientRect();
      return [(innerWidth / 2 - x) / width, (innerHeight / 2 - y) / height];
    });
  const middle = await inView();

  await page.setViewportSize({ width: 960, height: 600 });
  await expect.poll(async () => samePlace(await inView(), middle)).toBe(true);
  await expect.poll(async () => samePlace(await inkOnSlide(show), drawn)).toBe(true);
  for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 300);
  await expect.poll(() => zoom(show).then((z) => z.scale)).toBe(1);
  expect(samePlace(await inkOnSlide(show), drawn)).toBe(true);
});

test('scrolling or changing slides mid-drag isn’t undone by the rest of the drag', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  const [x, y] = [640, 360];
  await zoomIn(page, show, x, y);
  await page.mouse.down();
  await page.mouse.move(x - 40, y - 20, { steps: 4 });
  await page.mouse.wheel(0, -200);
  await settled(show);
  const { scale } = await zoom(show);
  await page.mouse.move(x - 80, y - 40, { steps: 4 });
  expect((await zoom(show)).scale).toBe(scale);
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => slideNumber(show)).toBe(4);
  await page.mouse.move(x - 120, y - 60, { steps: 4 });
  await page.mouse.up();
  expect(await zoom(show)).toEqual({ scale: 1, x: 0, y: 0 });
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

// Picks what scrolling does during a slideshow, in Settings.
async function chooseSlideshowScroll(context, choice) {
  const page = await context.newPage();
  await page.goto(slide);
  await openSettings(page, 'Zoom & scroll');
  await page.getByRole('group', { name: 'When you scroll during a slideshow' }).getByRole('radio', { name: choice }).check();
  await page.getByRole('button', { name: 'OK' }).click();
  await expect(page.locator('.slides-companion-dialog-root')).toHaveCount(0);
  await page.close();
}

test('set to change slides in Settings, scrolling changes slides', async ({ context }) => {
  await chooseSlideshowScroll(context, /Go to the next or previous slide/);
  const { page: presenting, show } = await startSlideshow(context);
  const { width, height } = presenting.viewportSize();
  await presenting.mouse.move(width / 2, height / 2);
  await presenting.mouse.wheel(0, 300);
  await expect.poll(() => slideNumber(show)).toBe(4);
  expect((await zoom(show)).scale).toBe(1);
});

test('set to do nothing in Settings, scrolling neither zooms nor changes slides', async ({ context }) => {
  await chooseSlideshowScroll(context, /Do nothing/);
  const { page: presenting, show } = await startSlideshow(context);
  const { width, height } = presenting.viewportSize();
  await presenting.mouse.move(width / 2, height / 2);
  for (let i = 0; i < 3; i++) await presenting.mouse.wheel(0, 300);
  await presenting.mouse.wheel(300, 0); // A sideways swipe.
  await presenting.waitForTimeout(500);
  expect(await slideNumber(show)).toBe(3);
  expect((await zoom(show)).scale).toBe(1);
});

// Scrolling never skips a slide, but everything else that changes slides still does.
test('keys and clicks still change slides', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  const { width, height } = page.viewportSize();
  await page.mouse.move(width / 2, height / 2);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(300);
  expect(await slideNumber(show)).toBe(3);
  // Slide 4 has a video, where Slides' ← does nothing, so this goes back a slide and returns.
  await page.keyboard.press('PageUp');
  await expect.poll(() => slideNumber(show)).toBe(2);
  await page.keyboard.press('PageDown');
  await expect.poll(() => slideNumber(show)).toBe(3);
  await page.keyboard.press('ArrowUp');
  await expect.poll(() => slideNumber(show)).toBe(2);
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => slideNumber(show)).toBe(3);
  await page.mouse.click(width * 0.9, height * 0.9); // The empty bottom right of the slide.
  await expect.poll(() => slideNumber(show)).toBe(4);
});

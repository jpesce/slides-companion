import {
  test,
  expect,
  openSettings,
  startSlideshow,
  pictureShows,
  slideNumber,
  stage,
  IDS,
  SLIDES,
  slideUrl,
  presentUrl,
} from './fixtures.js';

// Slide 3 of the test deck: two photos side by side and a caption text box.
const { left: LEFT, right: RIGHT, caption: CAPTION } = IDS;
const startShow = (context) => startSlideshow(context, { ready: pictureShows(RIGHT) });

async function clickCentre(page, locator, options) {
  const box = await locator.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, options);
}

const showing = (show) =>
  show
    .locator('.slides-companion-spotlight-picture svg > g:last-child > g')
    .getAttribute('id')
    .then((id) => id.replace('slides-companion-', ''));

test('clicking an image during a slideshow spotlights it, and Esc goes back to the slide', async ({
  context,
}) => {
  const { page, show } = await startShow(context);
  expect(await slideNumber(show)).toBe(3);

  await clickCentre(page, show.locator(`[id="${LEFT}"] image`));
  await expect(stage(show)).toBeVisible();
  expect(await showing(show)).toBe(LEFT);
  await page.keyboard.press('ArrowRight');
  expect(await showing(show)).toBe(RIGHT);

  await page.keyboard.press('Escape');
  await expect(stage(show)).toHaveCount(0);
  // Still presenting, on the same slide.
  await expect(page.locator('iframe.punch-present-iframe')).toBeVisible();
  expect(await slideNumber(show)).toBe(3);
});

// In real full screen Chrome takes the release of Esc as a press too, so Esc must stay locked until
// the key is up. The tests can't press a real Esc, so this watches the lock requests instead.
test('Esc stays kept until the key that closed the gallery is released', async ({ context }) => {
  const { page, show } = await startShow(context);
  await page.evaluate(() => {
    window.escapeRequests = [];
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'slides-companion-keep-escape')
        window.escapeRequests.push(event.data.keep);
    });
  });
  const requests = () => page.evaluate(() => window.escapeRequests);

  await clickCentre(page, show.locator(`[id="${LEFT}"] image`));
  await expect.poll(requests).toEqual([true]);
  await page.keyboard.down('Escape');
  await expect(stage(show)).toHaveCount(0);
  await page.keyboard.down('Escape'); // A repeat while held.
  await page.waitForTimeout(300);
  expect(await requests()).toEqual([true]);
  expect(await slideNumber(show)).toBe(3);
  await page.keyboard.up('Escape');
  await expect.poll(requests).toEqual([true, false]);
});

test('in the gallery, clicks, keys and the scroll wheel stay out of the slideshow', async ({
  context,
}) => {
  const { page, show } = await startShow(context);
  await clickCentre(page, show.locator(`[id="${RIGHT}"] image`));
  await expect(stage(show)).toBeVisible();
  const picture = await stage(show)
    .locator('.slides-companion-spotlight-picture svg')
    .boundingBox();

  await page.mouse.click(picture.x + picture.width * 0.8, picture.y + picture.height / 2);
  await page.mouse.click(picture.x + picture.width * 0.2, picture.y + picture.height / 2);
  await page.mouse.wheel(0, 400);
  await page.keyboard.press('PageDown');
  await page.keyboard.press('Space');
  await expect(stage(show)).toHaveCount(0);
  await page.waitForTimeout(500);
  expect(await slideNumber(show)).toBe(3);
});

test('clicks away from images still change slides', async ({ context }) => {
  const { page, show } = await startShow(context);
  await clickCentre(page, show.locator(`[id="${CAPTION}"]`));
  await expect.poll(() => slideNumber(show)).toBe(4);
  await expect(stage(show)).toHaveCount(0);
});

// Slides' links and videos keep working with the laser pointer on, so images do too. With the pen
// on, a click draws.
test('with the laser pointer on, clicking an image spotlights it', async ({ context }) => {
  const { page, show } = await startShow(context);
  await page.keyboard.press('l');
  // Like over Slides' links and videos, a hand shows over the image.
  const image = show.locator(`[id="${LEFT}"] image`);
  const box = await image.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect(image).toHaveCSS('cursor', 'pointer');
  await clickCentre(page, image);
  await expect(stage(show)).toBeVisible();
  expect(await showing(show)).toBe(LEFT);
});

test('with the pen on, clicking an image leaves it to the pen', async ({ context }) => {
  const { page, show } = await startShow(context);
  await page.keyboard.press('Shift+L');
  await expect(show.locator('.sketchyViewerContent.disable-pointer-events')).toHaveCount(1);
  await clickCentre(page, show.locator(`[id="${LEFT}"] image`));
  await page.waitForTimeout(500);
  await expect(stage(show)).toHaveCount(0);
  expect(await slideNumber(show)).toBe(3);
});

test('turning the setting off keeps clicks on images going to the next slide', async ({
  context,
}) => {
  const page = await context.newPage();
  await page.goto(slideUrl(SLIDES.images));
  await openSettings(page, 'Spotlight');
  await page.getByRole('checkbox', { name: /Spotlight an image when you click it/ }).uncheck();
  await page.getByRole('button', { name: 'OK' }).click();
  await page.close();

  const { page: presenting, show } = await startShow(context);
  await clickCentre(presenting, show.locator(`[id="${LEFT}"] image`));
  await expect.poll(() => slideNumber(show)).toBe(4);
  await expect(stage(show)).toHaveCount(0);
});

// A slideshow opened from a /present link draws slides without object ids, so the spotlight
// can't tell images apart there; clicks keep changing slides.
test('a slideshow opened from a link keeps its clicks', async ({ context }) => {
  const page = await context.newPage();
  await page.goto(presentUrl(SLIDES.images));
  const image = page.locator('.punch-viewer-svgpage-svgcontainer image').first();
  await expect(image).toBeVisible();
  const label = page.locator('.punch-viewer-svgpage-a11yelement');
  const before = await label.getAttribute('aria-label');
  await clickCentre(page, image);
  await expect(label).not.toHaveAttribute('aria-label', before);
  await expect(page.locator('.slides-companion-spotlight')).toHaveCount(0);
});

// Held down, Space and Enter repeat; once the gallery is closed, the repeats mustn't skip slides.
test('holding the key that closes the gallery doesn’t skip slides', async ({ context }) => {
  const { page, show } = await startShow(context);
  await clickCentre(page, show.locator(`[id="${LEFT}"] image`));
  await expect(stage(show)).toBeVisible();
  await page.keyboard.down(' ');
  await expect(stage(show)).toHaveCount(0);
  for (let i = 0; i < 5; i++) await page.keyboard.down(' '); // Repeats while held.
  await page.keyboard.up(' ');
  await page.waitForTimeout(500);
  expect(await slideNumber(show)).toBe(3);
  // Released, Space goes on to the next slide as usual.
  await page.keyboard.press(' ');
  await expect.poll(() => slideNumber(show)).toBe(4);
});

// A click on the black around the gallery's picture closes it, and the top of the photo is there.
test('double clicking an image opens it, and the second click does nothing more', async ({
  context,
}) => {
  const { page, show } = await startShow(context);
  // On the photo, and in the gallery's safe area above the picture.
  const photo = await show.locator(`[id="${RIGHT}"] image`).boundingBox();
  const point = { x: photo.x + photo.width / 2, y: 50 };
  expect(point.y).toBeGreaterThan(photo.y);
  await page.mouse.dblclick(point.x, point.y);
  await page.waitForTimeout(300);
  await expect(stage(show)).toBeVisible();
  // A fresh click works as usual.
  await page.mouse.click(point.x, point.y);
  await expect(stage(show)).toHaveCount(0);
});

test('the gallery closes when the slide changes under it', async ({ context }) => {
  const { page, show } = await startShow(context);
  await clickCentre(page, show.locator(`[id="${LEFT}"] image`));
  await expect(stage(show)).toBeVisible();
  // As auto-advance or the presenter view would, without a key or click on the gallery.
  await show.locator('.punch-viewer-navbar-next').evaluate((next) => {
    for (const type of ['mouseover', 'mousedown', 'mouseup', 'click'])
      next.dispatchEvent(new MouseEvent(type, { bubbles: true }));
  });
  await expect.poll(() => slideNumber(show)).toBe(4);
  await expect(stage(show)).toHaveCount(0);
});

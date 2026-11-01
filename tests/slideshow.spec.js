import { test, expect, deckUrl } from './fixtures.js';

// Slide 3 of the test deck: two photos side by side and a caption text box.
const slide = `${deckUrl}#slide=id.g35a1872bb6d_1_0`;
const LEFT = 'g35a1872bb6d_1_2';
const RIGHT = 'g35a1872bb6d_1_3';
const CAPTION = 'g35a1872bb6d_1_1';

async function startSlideshow(context) {
  const page = await context.newPage();
  await page.goto(slide);
  await expect(page.locator(`#workspace [id="editor-${RIGHT}"] image`)).toBeVisible();
  await page.locator('#punch-start-presentation-left').click();
  const show = page.frameLocator('iframe.punch-present-iframe');
  await expect(show.locator(`[id="${RIGHT}"] image`)).toBeVisible();
  return { page, show };
}

// The slide the slideshow is on, from its accessible label ("Slide 3 of 9").
const slideNumber = (show) =>
  show.locator('.punch-viewer-svgpage-a11yelement').getAttribute('aria-label').then((label) => Number(label.match(/\d+/)[0]));

async function clickCentre(page, locator, options) {
  const box = await locator.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, options);
}

const stage = (show) => show.locator('.slides-companion-spotlight');
const showing = (show) =>
  show.locator('.slides-companion-spotlight-picture svg > g:last-child > g').getAttribute('id').then((id) => id.replace('slides-companion-', ''));

test('clicking an image during a slideshow spotlights it, and Esc goes back to the slide', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
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
  const { page, show } = await startSlideshow(context);
  await page.evaluate(() => {
    window.escapeRequests = [];
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'slides-companion-keep-escape') window.escapeRequests.push(event.data.keep);
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

test('in the gallery, clicks, keys and the scroll wheel stay out of the slideshow', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  await clickCentre(page, show.locator(`[id="${RIGHT}"] image`));
  await expect(stage(show)).toBeVisible();
  const { width, height } = page.viewportSize();

  await page.mouse.click(width * 0.8, height / 2);
  await page.mouse.click(width * 0.2, height / 2);
  await page.mouse.wheel(0, 400);
  await page.keyboard.press('PageDown');
  await page.keyboard.press('Space');
  await expect(stage(show)).toHaveCount(0);
  await page.waitForTimeout(500);
  expect(await slideNumber(show)).toBe(3);
});

test('clicks away from images still change slides', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  await clickCentre(page, show.locator(`[id="${CAPTION}"]`));
  await expect.poll(() => slideNumber(show)).toBe(4);
  await expect(stage(show)).toHaveCount(0);
});

test('with the laser pointer on, clicking an image changes slide', async ({ context }) => {
  const { page, show } = await startSlideshow(context);
  await page.keyboard.press('l');
  await clickCentre(page, show.locator(`[id="${LEFT}"] image`));
  await expect.poll(() => slideNumber(show)).toBe(4);
  await expect(stage(show)).toHaveCount(0);
});

test('the setting can keep clicks on images going to the next slide', async ({ context }) => {
  const page = await context.newPage();
  await page.goto(slide);
  await page.locator('.slides-companion-button').click();
  await page.getByRole('radio', { name: /Go to the next slide/ }).check();
  await page.getByRole('button', { name: 'OK' }).click();
  await page.close();

  const { page: presenting, show } = await startSlideshow(context);
  await clickCentre(presenting, show.locator(`[id="${LEFT}"] image`));
  await expect.poll(() => slideNumber(show)).toBe(4);
  await expect(stage(show)).toHaveCount(0);
});

// A slideshow opened from a /present link draws slides without object ids, so the spotlight
// can't tell images apart there; clicks keep changing slides.
test('a slideshow opened from a link keeps its clicks', async ({ context }) => {
  const page = await context.newPage();
  await page.goto(slide.replace('/edit#slide=', '/present?slide='));
  const image = page.locator('.punch-viewer-svgpage-svgcontainer image').first();
  await expect(image).toBeVisible();
  const label = page.locator('.punch-viewer-svgpage-a11yelement');
  const before = await label.getAttribute('aria-label');
  await clickCentre(page, image);
  await expect(label).not.toHaveAttribute('aria-label', before);
  await expect(page.locator('.slides-companion-spotlight')).toHaveCount(0);
});

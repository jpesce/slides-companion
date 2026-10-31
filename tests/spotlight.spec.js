import { test, expect, deckUrl } from './fixtures.js';

// Slide 3 of the test deck: two photos side by side and a caption text box.
const slide = `${deckUrl}#slide=id.g35a1872bb6d_1_0`;
const LEFT = 'editor-g35a1872bb6d_1_2';
const RIGHT = 'editor-g35a1872bb6d_1_3';
const CAPTION = 'editor-g35a1872bb6d_1_1';
const object = (id) => `#workspace [id="${id}"]`;

const stage = (page) => page.locator('.slides-companion-spotlight');
const selected = (page) =>
  page.$$eval('#workspace path[stroke="#8ab4f8"]', (outlines) => [
    ...new Set(outlines.map((outline) => outline.closest('[id^="editor-"]').id)),
  ]);
// Which object the spotlight shows, and the position it announces.
const showing = (page) =>
  page.evaluate(() => ({
    id: document.querySelector('.slides-companion-spotlight-picture svg > g:last-child > g')?.id.replace('slides-companion-', ''),
    status: document.querySelector('.slides-companion-spotlight-status')?.textContent,
  }));

async function openSlide(context) {
  const page = await context.newPage();
  await page.goto(slide);
  await expect(page.locator(`${object(RIGHT)} image`)).toBeVisible();
  return page;
}

async function clickCentre(page, selector, { shift = false, ...options } = {}) {
  const box = await page.locator(selector).first().boundingBox();
  if (shift) await page.keyboard.down('Shift');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, options);
  if (shift) await page.keyboard.up('Shift');
}

test('Space spotlights the selected image and Escape closes it', async ({ context }) => {
  const page = await openSlide(context);
  await clickCentre(page, `${object(RIGHT)} image`);
  await expect.poll(() => selected(page)).toEqual([RIGHT]);

  await page.keyboard.press('Space');
  await expect(stage(page)).toBeVisible();
  expect(await showing(page)).toEqual({ id: RIGHT, status: 'Image 2 of 2' });
  // The picture fills the space inside the margin along one side, like a slideshow.
  const viewport = page.viewportSize();
  const picture = await stage(page).locator('.slides-companion-spotlight-picture svg').boundingBox();
  expect(Math.max(picture.width / (viewport.width - 96), picture.height / (viewport.height - 96))).toBeCloseTo(1, 2);

  await page.keyboard.press('Escape');
  await expect(stage(page)).toHaveCount(0);
  // Escape went to the spotlight, not Slides: the photo is still selected.
  expect(await selected(page)).toEqual([RIGHT]);
});

test('arrow keys go through the slide in reading order and stop at the ends', async ({ context }) => {
  const page = await openSlide(context);
  await clickCentre(page, `${object(RIGHT)} image`);
  await page.keyboard.press('Space');

  await page.keyboard.press('ArrowRight');
  expect(await showing(page)).toEqual({ id: RIGHT, status: 'Image 2 of 2' });
  await page.keyboard.press('ArrowLeft');
  expect(await showing(page)).toEqual({ id: LEFT, status: 'Image 1 of 2' });
  await page.keyboard.press('ArrowLeft');
  expect(await showing(page)).toEqual({ id: LEFT, status: 'Image 1 of 2' });
  await page.keyboard.press('End');
  expect((await showing(page)).id).toBe(RIGHT);
  await expect(stage(page).locator('.slides-companion-spotlight-page')).toHaveText('2/2');
});

test('clicking the right or left half moves', async ({ context }) => {
  const page = await openSlide(context);
  await clickCentre(page, `${object(LEFT)} image`);
  await page.keyboard.press('Space');
  const { width, height } = page.viewportSize();

  await page.mouse.click(width * 0.8, height / 2);
  expect((await showing(page)).id).toBe(RIGHT);
  await page.mouse.click(width * 0.8, height / 2);
  expect((await showing(page)).id).toBe(RIGHT);
  await page.mouse.click(width * 0.2, height / 2);
  expect((await showing(page)).id).toBe(LEFT);
});

test('the controls show when the gallery opens, then only when the pointer comes near', async ({ context }) => {
  const page = await openSlide(context);
  await clickCentre(page, `${object(LEFT)} image`);
  await page.keyboard.press('Space');
  const closer = stage(page).locator('.slides-companion-spotlight-closer');
  const navbar = stage(page).locator('.slides-companion-spotlight-navbar');
  const { width, height } = page.viewportSize();

  await expect(closer).toHaveCSS('opacity', '1');
  await expect(navbar).toHaveCSS('opacity', '1');
  await expect(closer).toHaveCSS('opacity', '0', { timeout: 4000 });
  await expect(navbar).toHaveCSS('opacity', '0');

  // Moving over the image, or changing image, shows nothing.
  await page.mouse.move(width / 2, height / 2);
  await page.mouse.move(width / 2 + 20, height / 2 + 20);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(500);
  await expect(closer).toHaveCSS('opacity', '0');
  await expect(navbar).toHaveCSS('opacity', '0');

  await page.mouse.move(width - 150, 150);
  await expect(closer).toHaveCSS('opacity', '1');
  await expect(navbar).toHaveCSS('opacity', '0');
  await page.mouse.move(150, height - 150);
  await expect(navbar).toHaveCSS('opacity', '1');
  await expect(closer).toHaveCSS('opacity', '0');
});

test('the bar steps through the images, and the X closes', async ({ context }) => {
  const page = await openSlide(context);
  await clickCentre(page, `${object(LEFT)} image`);
  await page.keyboard.press('Space');
  const previous = stage(page).getByRole('button', { name: 'Previous image' });
  const next = stage(page).getByRole('button', { name: 'Next image' });
  const position = stage(page).locator('.slides-companion-spotlight-page');

  await expect(position).toHaveText('1/2');
  await expect(previous).toBeDisabled();
  await next.click();
  expect((await showing(page)).id).toBe(RIGHT);
  await expect(position).toHaveText('2/2');
  await expect(next).toBeDisabled();
  await previous.click();
  expect((await showing(page)).id).toBe(LEFT);

  await stage(page).getByRole('button', { name: 'Close' }).click();
  await expect(stage(page)).toHaveCount(0);
});

test('with several images selected, the gallery goes through just those', async ({ context }) => {
  const page = await openSlide(context);
  await clickCentre(page, `${object(RIGHT)} image`);
  await clickCentre(page, `${object(LEFT)} image`, { shift: true });
  await expect.poll(async () => (await selected(page)).length).toBe(2);

  await page.keyboard.press('Space');
  expect(await showing(page)).toEqual({ id: LEFT, status: 'Image 1 of 2' });
  await page.keyboard.press('ArrowRight');
  expect(await showing(page)).toEqual({ id: RIGHT, status: 'Image 2 of 2' });
});

test('the "When images are grouped" setting decides how a group is shown', async ({ context }) => {
  const page = await openSlide(context);
  // The deck has no groups, so build one the way Slides draws it: the group's own editor
  // element holding the objects' elements.
  await page.evaluate(([left, right]) => {
    const first = document.getElementById(left);
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.id = 'editor-testgroup';
    first.before(group);
    group.append(first, document.getElementById(right));
  }, [LEFT, RIGHT]);
  await clickCentre(page, `${object(RIGHT)} image`);
  await expect.poll(() => selected(page)).toEqual([RIGHT]);

  // As one image (the default), the group is a single stop, and the picked image stands in for it.
  await page.keyboard.press('Space');
  expect(await showing(page)).toEqual({ id: RIGHT, status: '' });
  await page.keyboard.press('Escape');

  await page.locator('.slides-companion-button').click();
  await page.getByRole('radio', { name: /Show each image on its own/ }).check();
  await page.getByRole('button', { name: 'OK' }).click();

  // Each image on its own: both photos are stops.
  await clickCentre(page, `${object(RIGHT)} image`);
  await page.keyboard.press('Space');
  expect(await showing(page)).toEqual({ id: RIGHT, status: 'Image 2 of 2' });
});

test('Space does nothing when the selection has no image', async ({ context }) => {
  const page = await openSlide(context);
  await clickCentre(page, object(CAPTION));
  await expect.poll(() => selected(page)).toEqual([CAPTION]);

  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  await expect(stage(page)).toHaveCount(0);
});

test('the right-click menu offers Spotlight image for images only', async ({ context }) => {
  const page = await openSlide(context);
  const item = page.locator('.goog-menu[role="menu"] .goog-menuitem', { hasText: 'Spotlight image' });

  await clickCentre(page, object(CAPTION), { button: 'right' });
  await expect(page.locator('.goog-menu[role="menu"]:visible')).toBeVisible();
  await expect(item).toHaveCount(0);
  await page.keyboard.press('Escape');

  await clickCentre(page, `${object(RIGHT)} image`, { button: 'right' });
  await expect(item).toBeVisible();
  await expect(item).toHaveCount(1);
  await item.click();
  await expect(stage(page)).toBeVisible();
  await expect(page.locator('.goog-menu[role="menu"]:visible')).toHaveCount(0);
});

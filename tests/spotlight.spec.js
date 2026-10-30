import { test, expect, deckUrl } from './fixtures.js';

// Slide 3 of the test deck: two photos and a caption text box.
const slide = `${deckUrl}#slide=id.g35a1872bb6d_1_0`;
const rightPhoto = '#workspace [id="editor-g35a1872bb6d_1_3"]';
const leftPhoto = '#workspace [id="editor-g35a1872bb6d_1_2"]';
const caption = '#workspace [id="editor-g35a1872bb6d_1_1"]';

const stage = (page) => page.locator('.slides-companion-spotlight');
const selected = (page) =>
  page.$$eval('#workspace path[stroke="#8ab4f8"]', (outlines) =>
    outlines.map((outline) => outline.closest('[id^="editor-"]').id),
  );

async function openSlide(context) {
  const page = await context.newPage();
  await page.goto(slide);
  await expect(page.locator(`${rightPhoto} image`)).toBeVisible();
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
  await clickCentre(page, `${rightPhoto} image`);
  await expect.poll(() => selected(page)).toEqual(['editor-g35a1872bb6d_1_3']);

  await page.keyboard.press('Space');
  await expect(stage(page)).toBeVisible();
  await expect(stage(page).locator('image')).toHaveCount(1);
  // The picture fills the viewport along one side, like a slideshow.
  const viewport = page.viewportSize();
  const picture = await stage(page).locator('svg').boundingBox();
  expect(Math.max(picture.width / viewport.width, picture.height / viewport.height)).toBeCloseTo(1, 2);

  await page.keyboard.press('Escape');
  await expect(stage(page)).toHaveCount(0);
  // Escape went to the spotlight, not Slides: the photo is still selected.
  expect(await selected(page)).toEqual(['editor-g35a1872bb6d_1_3']);
});

test('a click closes the spotlight', async ({ context }) => {
  const page = await openSlide(context);
  await clickCentre(page, `${rightPhoto} image`);
  await page.keyboard.press('Space');
  await expect(stage(page)).toBeVisible();
  await page.mouse.click(10, 10);
  await expect(stage(page)).toHaveCount(0);
});

test('a multi-selection is spotlighted together', async ({ context }) => {
  const page = await openSlide(context);
  await clickCentre(page, `${rightPhoto} image`);
  await clickCentre(page, `${leftPhoto} image`, { shift: true });
  await expect.poll(async () => (await selected(page)).length).toBe(2);

  await page.keyboard.press('Space');
  await expect(stage(page).locator('image')).toHaveCount(2);
});

test('Space does nothing when the selection has no image', async ({ context }) => {
  const page = await openSlide(context);
  await clickCentre(page, caption);
  await expect.poll(() => selected(page)).toEqual(['editor-g35a1872bb6d_1_1']);

  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  await expect(stage(page)).toHaveCount(0);
});

test('the right-click menu offers Spotlight image for images only', async ({ context }) => {
  const page = await openSlide(context);
  const item = page.locator('.goog-menu[role="menu"] .goog-menuitem', { hasText: 'Spotlight image' });

  await clickCentre(page, caption, { button: 'right' });
  await expect(page.locator('.goog-menu[role="menu"]:visible')).toBeVisible();
  await expect(item).toHaveCount(0);
  await page.keyboard.press('Escape');

  await clickCentre(page, `${rightPhoto} image`, { button: 'right' });
  await expect(item).toBeVisible();
  await expect(item).toHaveCount(1);
  await item.click();
  await expect(stage(page)).toBeVisible();
  await expect(page.locator('.goog-menu[role="menu"]:visible')).toHaveCount(0);
});

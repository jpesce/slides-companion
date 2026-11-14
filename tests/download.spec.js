import fs from 'node:fs';
import {
  test,
  expect,
  press,
  IDS,
  inEditor,
  stage,
  slideUrl,
  SLIDES,
  flownIn,
} from './fixtures.js';

// Download image: the picture file Slides holds for an image, saved under the deck's name.

// Slide 3 of the test deck: two photos side by side and a caption text box.
const [LEFT, RIGHT, CAPTION] = [IDS.left, IDS.right, IDS.caption].map(inEditor);
// Slide 1: the deck's logo, its only image.
const LOGO = inEditor(IDS.logo);
const object = (id) => `#workspace [id="${id}"]`;
const DECK_NAME = 'Image Spotlight for Google Slides™';

const menu = (page) => page.locator('.goog-menu[role="menu"]').filter({ visible: true });
const menuItem = (page, name) => menu(page).locator('.goog-menuitem', { hasText: name });
const download = (where) => where.locator('.slides-companion-spotlight-download');
const selected = (page) =>
  page
    .locator('#workspace path[stroke="#8ab4f8"]')
    .evaluateAll((outlines) =>
      [...new Set(outlines.map((outline) => outline.closest('[id^="editor-"]').id))].sort(),
    );
// The bar's buttons that show, by the names screen readers hear.
const buttonsIn = (bar) =>
  bar
    .locator('button')
    .evaluateAll((buttons) =>
      buttons.filter((button) => button.checkVisibility()).map((button) => button.ariaLabel),
    );

async function open(context, address = slideUrl(SLIDES.images), id = RIGHT) {
  const page = await context.newPage();
  await page.goto(address);
  await expect(page.locator(`${object(id)} image`)).toBeVisible();
  return page;
}

async function clickCentre(page, selector, options) {
  const box = await page.locator(selector).first().boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, options);
}

// The file Slides holds for the image, as the page has it.
const fileOf = (page, id) =>
  page.locator(`${object(id)} image`).evaluate(async (image) => {
    const file = await (await fetch(image.href.baseVal)).blob();
    return { size: file.size, type: file.type };
  });

// What a click saved: its name and size.
async function saved(page, click) {
  const downloading = page.waitForEvent('download');
  await click();
  const file = await downloading;
  return { name: file.suggestedFilename(), size: fs.statSync(await file.path()).size };
}

test('right-clicking an image offers Download image, which saves its file under the deck’s name', async ({
  context,
}) => {
  const page = await open(context);
  await clickCentre(page, `${object(RIGHT)} image`, { button: 'right' });
  const item = menuItem(page, 'Download image');
  await expect(item).toBeVisible();
  // Right under Spotlight image, with Slides' download icon.
  await expect(
    menuItem(page, 'Spotlight image').locator('xpath=following-sibling::*[1]'),
  ).toHaveText(/Download image/);
  await expect(item.locator('.docs-icon-download')).toBeVisible();

  const file = await fileOf(page, RIGHT);
  expect(file.type).toBe('image/jpeg');
  expect(await saved(page, () => item.click())).toEqual({
    name: `${DECK_NAME}.jpg`,
    size: file.size,
  });
  await expect(menu(page)).toHaveCount(0);
});

test('Download image is offered for one image only', async ({ context }) => {
  const page = await open(context);
  // Both photos: Spotlight image goes through them, but there's no one file to save.
  await clickCentre(page, `${object(LEFT)} image`);
  await page.keyboard.down('Shift');
  await clickCentre(page, `${object(RIGHT)} image`);
  await page.keyboard.up('Shift');
  await expect.poll(() => selected(page)).toEqual([LEFT, RIGHT].sort());
  // Slides opens no menu for a right-click that comes as quickly as a double click's second. Its
  // double-click time runs out inside Slides, with nothing on the page to wait for, so the test lets
  // it pass before right-clicking.
  // eslint-disable-next-line playwright/no-wait-for-timeout -- the wait is the scenario, see above.
  await page.waitForTimeout(600);
  await clickCentre(page, `${object(RIGHT)} image`, { button: 'right' });
  await expect(menuItem(page, 'Spotlight image')).toBeVisible();
  await expect(menuItem(page, 'Download image')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(menu(page)).toHaveCount(0);

  // Text: neither.
  await clickCentre(page, object(CAPTION), { button: 'right' });
  await expect(menu(page)).toBeVisible();
  await expect(menuItem(page, 'Download image')).toHaveCount(0);
});

test('from the keyboard, Shift+F10 and the arrow keys reach Download image, and Enter saves the file', async ({
  context,
}) => {
  const page = await open(context);
  await clickCentre(page, `${object(RIGHT)} image`);
  await expect.poll(() => selected(page)).toEqual([RIGHT]);
  await page.mouse.move(5, 5);
  await page.keyboard.press('Shift+F10');
  const item = menuItem(page, 'Download image');
  await expect(item).toBeVisible();
  // The last item: Up from the first.
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowUp');
  await expect(item).toHaveClass(/goog-menuitem-highlight/);
  const file = await fileOf(page, RIGHT);
  expect(await saved(page, () => page.keyboard.press('Enter'))).toEqual({
    name: `${DECK_NAME}.jpg`,
    size: file.size,
  });
});

test('the Spotlight gallery’s bottom bar saves the image shown', async ({ context }) => {
  const page = await open(context);
  await clickCentre(page, `${object(RIGHT)} image`);
  await expect.poll(() => selected(page)).toEqual([RIGHT]);
  await page.keyboard.press('Space');
  await expect(stage(page)).toBeVisible();
  // After ‹ 2/2 ›, before Close, named for screen readers and in its tooltip.
  const bar = stage(page).locator('.slides-companion-spotlight-bar');
  expect(await buttonsIn(bar)).toEqual(['Previous image', 'Next image', 'Download image', 'Close']);
  await expect(download(stage(page))).toHaveAttribute(
    'data-slides-companion-tip',
    'Download image',
  );
  const right = await fileOf(page, RIGHT);
  expect(await saved(page, () => press(page, download(stage(page))))).toEqual({
    name: `${DECK_NAME}.jpg`,
    size: right.size,
  });

  // The image shown, after moving to another.
  await page.keyboard.press('ArrowLeft');
  const left = await fileOf(page, LEFT);
  expect(left.size).not.toBe(right.size);
  expect((await saved(page, () => press(page, download(stage(page))))).size).toBe(left.size);
  // Saving keeps the gallery open.
  await expect(stage(page)).toBeVisible();
});

test('with one image, the gallery’s bottom bar has just Download image and Close', async ({
  context,
}) => {
  const page = await open(context, slideUrl(SLIDES.first), LOGO);
  await clickCentre(page, `${object(LOGO)} image`);
  await expect.poll(() => selected(page)).toEqual([LOGO]);
  await page.keyboard.press('Space');
  await expect(stage(page)).toBeVisible();
  const bar = stage(page).locator('.slides-companion-spotlight-bar');
  await expect(bar).toBeVisible();
  expect(await buttonsIn(bar)).toEqual(['Download image', 'Close']);
  await expect(bar.locator('.slides-companion-spotlight-page')).toBeHidden();

  const file = await fileOf(page, LOGO);
  expect(await saved(page, () => press(page, download(stage(page))))).toEqual({
    name: `${DECK_NAME}.${file.type.split('/')[1]}`,
    size: file.size,
  });
});

test('during a slideshow, the gallery saves the image too', async ({ context }) => {
  const page = await open(context);
  const file = await fileOf(page, RIGHT);
  await page.locator('#punch-start-presentation-left').click();
  const show = page.frameLocator('iframe.punch-present-iframe');
  const image = show.locator(`[id="${RIGHT.replace('editor-', '')}"] image`).first();
  await flownIn(image);
  const box = await image.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(stage(show)).toBeVisible();
  await page.mouse.move(box.x + box.width / 2, page.viewportSize().height - 20, { steps: 3 });
  expect(await saved(page, () => press(page, download(stage(show))))).toEqual({
    name: `${DECK_NAME}.jpg`,
    size: file.size,
  });
});

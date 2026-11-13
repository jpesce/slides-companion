import {
  test,
  expect,
  openSettings,
  press,
  pointTo,
  IDS,
  inEditor,
  stage,
  slideUrl,
  SLIDES,
} from './fixtures.js';

// Slide 3 of the test deck: two photos side by side and a caption text box.
const [LEFT, RIGHT, CAPTION] = [IDS.left, IDS.right, IDS.caption].map(inEditor);
const object = (id) => `#workspace [id="${id}"]`;

// The bar's buttons that show, by the names screen readers hear.
const buttonsIn = (bar) =>
  bar
    .locator('button')
    .evaluateAll((buttons) =>
      buttons.filter((button) => button.checkVisibility()).map((button) => button.ariaLabel),
    );
const selected = (page) =>
  page.$$eval('#workspace path[stroke="#8ab4f8"]', (outlines) => [
    ...new Set(outlines.map((outline) => outline.closest('[id^="editor-"]').id)),
  ]);
// Which object the spotlight shows, and the position it announces.
const showing = (page) =>
  page.evaluate(() => ({
    id: document
      .querySelector('.slides-companion-spotlight-picture svg > g:last-child > g')
      ?.id.replace('slides-companion-', ''),
    status: document.querySelector('.slides-companion-spotlight-status')?.textContent,
  }));

async function openSlide(context) {
  const page = await context.newPage();
  await page.goto(slideUrl(SLIDES.images));
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
  // The picture fills the space inside the side margins and the safe areas above and below,
  // along one side.
  const viewport = page.viewportSize();
  const picture = await stage(page)
    .locator('.slides-companion-spotlight-picture svg')
    .boundingBox();
  expect(
    Math.max(picture.width / (viewport.width - 96), picture.height / (viewport.height - 160)),
  ).toBeCloseTo(1, 2);

  await page.keyboard.press('Escape');
  await expect(stage(page)).toHaveCount(0);
  // Escape went to the spotlight, not Slides: the photo is still selected.
  expect(await selected(page)).toEqual([RIGHT]);
});

test('the picture sits on whole pixels, so the slide behind it never shows along its edges', async ({
  context,
}) => {
  const page = await openSlide(context);
  // A window size that puts the picture on fractional pixels, and the slide's background red, so
  // any of it showing along the black and white photo's edges stands out.
  await page.setViewportSize({ width: 1001, height: 704 });
  await page.evaluate(() => {
    for (const shape of document.querySelectorAll('#workspace [id$="-bg"] path'))
      shape.style.fill = '#ff0000';
  });
  await clickCentre(page, `${object(RIGHT)} image`);
  await page.keyboard.press('Space');
  const picture = stage(page).locator('.slides-companion-spotlight-picture svg');
  await expect(picture).toBeVisible();
  await expect(stage(page)).toHaveCSS('opacity', '1');

  // How much redder than grey the picture's outermost pixels are, at most.
  const box = await picture.boundingBox();
  const shot = await page.screenshot({
    clip: { x: box.x - 2, y: box.y - 2, width: box.width + 4, height: box.height + 4 },
  });
  const reddest = await page.evaluate(async (png) => {
    const image = new Image();
    image.src = `data:image/png;base64,${png}`;
    await image.decode();
    const canvas = new OffscreenCanvas(image.width, image.height);
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const { data, width, height } = context.getImageData(0, 0, image.width, image.height);
    let most = 0;
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        if (x > 4 && x < width - 5 && y > 4 && y < height - 5) continue;
        const i = (y * width + x) * 4;
        most = Math.max(most, data[i] - Math.max(data[i + 1], data[i + 2]));
      }
    return most;
  }, shot.toString('base64'));
  expect(reddest).toBeLessThan(8);
});

test('arrow keys go through the slide in reading order and stop at the ends', async ({
  context,
}) => {
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

test('a click on the picture does nothing, and a click on the black around it closes', async ({
  context,
}) => {
  const page = await openSlide(context);
  await clickCentre(page, `${object(LEFT)} image`);
  await page.keyboard.press('Space');
  const picture = await stage(page)
    .locator('.slides-companion-spotlight-picture svg')
    .boundingBox();
  const { width } = page.viewportSize();

  // Anywhere on the picture, its sides too, and on the bar between its buttons.
  const middle = picture.y + picture.height / 2;
  for (const x of [picture.x + 5, picture.x + picture.width / 2, picture.x + picture.width - 5])
    await page.mouse.click(x, middle);
  const bar = await stage(page).locator('.slides-companion-spotlight-bar').boundingBox();
  await page.mouse.click(bar.x + 2, bar.y + bar.height / 2);
  await expect(stage(page)).toBeVisible();
  expect((await showing(page)).id).toBe(LEFT);

  // Above it, the gallery closes, and the click stays out of Slides: the photo is still selected.
  await page.mouse.click(width / 2, 30);
  await expect(stage(page)).toHaveCount(0);
  expect(await selected(page)).toEqual([LEFT]);
});

test('the bar shows when the gallery opens, then only when the pointer is above or below the picture', async ({
  context,
}) => {
  const page = await openSlide(context);
  await clickCentre(page, `${object(LEFT)} image`);
  await page.keyboard.press('Space');
  const bar = stage(page).locator('.slides-companion-spotlight-bar');
  const { width, height } = page.viewportSize();

  await expect(bar).toHaveCSS('opacity', '1');
  await expect(bar).toHaveCSS('opacity', '0', { timeout: 4000 });

  // Moving over the image, or changing image, shows nothing.
  await page.mouse.move(width / 2, height / 2);
  await page.mouse.move(width / 2 + 20, height / 2 + 20);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(500);
  await expect(bar).toHaveCSS('opacity', '0');

  // Above or below the picture, it shows.
  await page.mouse.move(width / 3, 40);
  await expect(bar).toHaveCSS('opacity', '1');
  await page.mouse.move(width / 2, height / 2);
  await expect(bar).toHaveCSS('opacity', '0');
  await page.mouse.move(width / 3, height - 40);
  await expect(bar).toHaveCSS('opacity', '1');
});

test('the bar, at the bottom, holds ‹ 2/5 ›, Download image and Close, split like Slides’ toolbar', async ({
  context,
}) => {
  const page = await openSlide(context);
  await clickCentre(page, `${object(LEFT)} image`);
  await page.keyboard.press('Space');
  const bar = stage(page).locator('.slides-companion-spotlight-bar');
  expect(await buttonsIn(bar)).toEqual(['Previous image', 'Next image', 'Download image', 'Close']);
  // Centred, 20px up from the bottom, 40px tall.
  const { width, height } = page.viewportSize();
  const box = await bar.boundingBox();
  expect([box.x + box.width / 2, box.y + box.height, box.height]).toEqual([
    width / 2,
    height - 20,
    40,
  ]);

  // A divider before each section after the first: a 1px line, 20px tall, 4px from the buttons beside
  // it (their 2px margin and its own), in Material's dark outline variant.
  const dividers = await bar.locator('.slides-companion-spotlight-group').evaluateAll((groups) =>
    groups
      .filter((group) => group.checkVisibility())
      .map((group) => {
        const line = getComputedStyle(group, '::before');
        return line.content === 'none'
          ? null
          : [line.width, line.height, line.margin, line.backgroundColor];
      }),
  );
  const divider = ['1px', '20px', '0px 2px', 'rgb(68, 71, 70)'];
  expect(dividers).toEqual([null, divider, divider]);
});

test('the bar’s buttons show Slides’ tooltip: after a moment, above the button, gone on leaving or a press', async ({
  context,
}) => {
  const page = await openSlide(context);
  await clickCentre(page, `${object(LEFT)} image`);
  await page.keyboard.press('Space');
  const tooltip = stage(page).locator('.slides-companion-spotlight-tooltip');
  const next = stage(page).getByRole('button', { name: 'Next image' });
  // The browser's own tooltips are gone.
  await expect(stage(page).locator('[title]')).toHaveCount(0);

  await pointTo(page, stage(page).getByRole('button', { name: 'Close' }));
  await expect(tooltip).toBeHidden();
  await expect(tooltip).toHaveText('Close (Esc)');
  await expect(tooltip).toBeVisible();
  // Slides' look, in the dark theme's colours: 24px tall, light, 12px text, rounded corners; centred
  // 5px above the button, as there's no room below.
  await expect(tooltip).toHaveCSS('background-color', 'rgb(227, 227, 227)');
  await expect(tooltip).toHaveCSS('color', 'rgb(48, 48, 48)');
  await expect(tooltip).toHaveCSS('font-size', '12px');
  await expect(tooltip).toHaveCSS('border-radius', '4px');
  const [tip, button] = await Promise.all([
    tooltip.boundingBox(),
    stage(page).getByRole('button', { name: 'Close' }).boundingBox(),
  ]);
  expect(tip.height).toBe(24);
  // On a whole pixel, as Slides puts its own.
  expect(Math.abs(tip.x + tip.width / 2 - (button.x + button.width / 2))).toBeLessThan(1);
  expect(button.y - (tip.y + tip.height)).toBeCloseTo(5, 0);

  // Straight to another button, it moves at once.
  await pointTo(page, next);
  await expect(tooltip).toHaveText('Next (→)', { timeout: 150 });
  // A press hides it, and it stays hidden while the pointer stays.
  await page.mouse.down();
  await page.mouse.up();
  await expect(tooltip).toBeHidden();
  await page.waitForTimeout(600);
  await expect(tooltip).toBeHidden();
  // Next is now disabled (the last image), and still says what it is.
  await expect(next).toBeDisabled();
  await pointTo(page, stage(page).locator('.slides-companion-spotlight-page'));
  await expect(tooltip).toBeHidden();
  await pointTo(page, next);
  await expect(tooltip).toHaveText('Next (→)');
  await expect(tooltip).toBeVisible();
  // Off the bar, it goes.
  const { width, height } = page.viewportSize();
  await page.mouse.move(width / 2, height / 2);
  await expect(tooltip).toBeHidden();
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
  await press(page, next);
  expect((await showing(page)).id).toBe(RIGHT);
  await expect(position).toHaveText('2/2');
  await expect(next).toBeDisabled();
  await press(page, previous);
  expect((await showing(page)).id).toBe(LEFT);

  await press(page, stage(page).getByRole('button', { name: 'Close' }));
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
  await page.evaluate(
    ([left, right]) => {
      const first = document.getElementById(left);
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.id = 'editor-testgroup';
      first.before(group);
      group.append(first, document.getElementById(right));
    },
    [LEFT, RIGHT],
  );
  await clickCentre(page, `${object(RIGHT)} image`);
  await expect.poll(() => selected(page)).toEqual([RIGHT]);

  // As one image (the default), the group is a single stop, and the picked image stands in for it.
  await page.keyboard.press('Space');
  expect(await showing(page)).toEqual({ id: RIGHT, status: '' });
  await page.keyboard.press('Escape');

  await openSettings(page, 'Spotlight');
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
  const item = page.locator('.goog-menu[role="menu"] .goog-menuitem', {
    hasText: 'Spotlight image',
  });

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

// Slides' menus only know their own items; its arrow keys, Home and End stop on ours too, in their
// place, and Enter chooses it, whether the menu was opened with the pointer or with Shift+F10.
test('the arrow keys reach Spotlight image in the right-click menu, and Enter spotlights the image', async ({
  context,
}) => {
  const page = await openSlide(context);
  const menu = page.locator('.goog-menu[role="menu"]').filter({ visible: true });
  const item = menu.locator('.goog-menuitem', { hasText: 'Spotlight image' });
  const download = menu.locator('.goog-menuitem', { hasText: 'Download image' });
  const stops = menu
    .locator('.goog-menuitem:not(.goog-menuitem-disabled)')
    .filter({ visible: true });
  const highlighted = menu.locator('.goog-menuitem-highlight');
  const named = async (element) =>
    expect(menu).toHaveAttribute('aria-activedescendant', await element.getAttribute('id'));
  await clickCentre(page, `${object(RIGHT)} image`, { button: 'right' });
  await expect(item).toBeVisible();
  // Ours are the last two, here: down from the first item.
  await page.mouse.move(5, 5);
  const count = await stops.count();
  await expect(stops.nth(count - 2)).toHaveText(/Spotlight image/);
  await expect(stops.last()).toHaveText(/Download image/);
  for (let i = 0; i < count; i++) await page.keyboard.press('ArrowDown');
  await expect(highlighted).toHaveCount(1);
  await expect(download).toHaveClass(/goog-menuitem-highlight/);
  await named(download);
  // Round to the first, back, and on through ours to the one of Slides' before them.
  await page.keyboard.press('ArrowDown');
  await expect(stops.first()).toHaveClass(/goog-menuitem-highlight/);
  await named(stops.first());
  await page.keyboard.press('ArrowUp');
  await expect(download).toHaveClass(/goog-menuitem-highlight/);
  await page.keyboard.press('ArrowUp');
  await expect(item).toHaveClass(/goog-menuitem-highlight/);
  await named(item);
  await expect(highlighted).toHaveCount(1);
  await page.keyboard.press('ArrowUp');
  await expect(stops.nth(count - 3)).toHaveClass(/goog-menuitem-highlight/);
  await named(stops.nth(count - 3));
  await expect(highlighted).toHaveCount(1);
  await page.keyboard.press('End');
  await expect(download).toHaveClass(/goog-menuitem-highlight/);
  await page.keyboard.press('Home');
  await expect(stops.first()).toHaveClass(/goog-menuitem-highlight/);
  // The pointer and the keys share one highlight.
  await item.hover();
  await expect(highlighted).toHaveCount(1);
  await page.keyboard.press('ArrowUp');
  await expect(stops.nth(count - 3)).toHaveClass(/goog-menuitem-highlight/);
  await page.keyboard.press('ArrowDown');
  await expect(item).toHaveClass(/goog-menuitem-highlight/);
  await stops.first().hover();
  await expect(highlighted).toHaveCount(1);
  await expect(stops.first()).toHaveClass(/goog-menuitem-highlight/);
  await page.keyboard.press('End');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await expect(stage(page)).toBeVisible();
  await expect(menu).toHaveCount(0);
  expect((await showing(page)).id).toBe(RIGHT);
  await page.keyboard.press('Escape');
  await expect(stage(page)).toHaveCount(0);

  // From the keyboard alone: Shift+F10 opens the menu, and Up goes to the last item.
  await page.mouse.move(5, 5);
  await page.keyboard.press('Shift+F10');
  await expect(item).toBeVisible();
  await expect(item).not.toHaveClass(/goog-menuitem-highlight/);
  // In their place, which Slides fills in after the menu opens.
  await expect(stops.last()).toHaveText(/Download image/);
  await page.keyboard.press('Home');
  await expect(stops.first()).toHaveClass(/goog-menuitem-highlight/);
  await page.keyboard.press('ArrowUp');
  await expect(download).toHaveClass(/goog-menuitem-highlight/);
  await page.keyboard.press('ArrowUp');
  await expect(item).toHaveClass(/goog-menuitem-highlight/);
  await page.keyboard.press('Enter');
  await expect(stage(page)).toBeVisible();
});

test('holding Space keeps the gallery open', async ({ context }) => {
  const page = await openSlide(context);
  await clickCentre(page, `${object(RIGHT)} image`);
  await page.keyboard.down(' ');
  await expect(stage(page)).toBeVisible();
  for (let i = 0; i < 5; i++) await page.keyboard.down(' '); // Repeats while held.
  await page.keyboard.up(' ');
  await page.waitForTimeout(300);
  await expect(stage(page)).toBeVisible();
});

// Slide 4 of the test deck has a video, which Slides draws as its first frame under a play button.
test('videos aren’t spotlighted', async ({ context }) => {
  const page = await openSlide(context);
  await page.locator('.punch-filmstrip-thumbnail').nth(3).click();
  const video = `#workspace [id="${inEditor(IDS.video)}"]`;
  await expect(page.locator(`${video} image`).first()).toBeVisible();

  await clickCentre(page, video);
  await expect.poll(() => selected(page)).toEqual([inEditor(IDS.video)]);
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  await expect(stage(page)).toHaveCount(0);
});

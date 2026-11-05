import { test, expect, deckUrl, openSettings } from './fixtures.js';

// Slide 3 of the test deck, in the editor.
const slide = `${deckUrl}#slide=id.g35a1872bb6d_1_0`;
const SLIDE_3 = 'g35a1872bb6d_1_0';
const current = (page) => page.evaluate(() => location.hash.replace('#slide=id.', ''));
// Whether something cancelled the wheel event the page last got, after waiting for one.
async function lastWheelCancelled(page) {
  await expect.poll(() => page.evaluate(() => Boolean(window.lastWheel))).toBe(true);
  return page.evaluate(() => {
    const cancelled = window.lastWheel.defaultPrevented;
    window.lastWheel = null;
    return cancelled;
  });
}

async function openSlide(context) {
  const page = await context.newPage();
  // Keeps the last wheel event, to see afterwards whether something cancelled it.
  await page.addInitScript(() => window.addEventListener('wheel', (event) => (window.lastWheel = event), true));
  await page.goto(slide);
  await expect(page.locator('#workspace [id="editor-g35a1872bb6d_1_2"] image')).toBeVisible();
  return page;
}

async function chooseEditorScroll(page, choice) {
  await openSettings(page, 'Scrolling');
  await page.getByRole('group', { name: 'While editing' }).getByRole('radio', { name: choice }).check();
  await page.getByRole('button', { name: 'OK' }).click();
  await expect(page.locator('.slides-companion-dialog-root')).toHaveCount(0);
}

test('by default, scrolling over a slide in the editor goes to the next slide, as in Slides', async ({ context }) => {
  const page = await openSlide(context);
  await page.mouse.move(700, 350);
  await page.mouse.wheel(0, 300);
  await expect.poll(() => current(page)).not.toBe(SLIDE_3);
});

test('set to do nothing, scrolling stays on the slide, but still moves around a zoomed-in slide', async ({ context }) => {
  const page = await openSlide(context);
  await chooseEditorScroll(page, /Do nothing/);
  await page.mouse.move(700, 350);
  for (let i = 0; i < 3; i++) await page.mouse.wheel(0, 300);
  await page.waitForTimeout(500);
  expect(await current(page)).toBe(SLIDE_3);
  // As in Slides, the wheel is cancelled where the slide can't scroll, so the browser doesn't take
  // it either (on a Mac, swiping sideways would go back a page).
  expect(await lastWheelCancelled(page)).toBe(true);
  await page.mouse.wheel(300, 0);
  expect(await lastWheelCancelled(page)).toBe(true);

  // Ctrl + scroll (a trackpad pinch) still zooms the editor, and scrolling then moves around the slide.
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -300);
  await page.keyboard.up('Control');
  const area = page.locator('#workspace-container');
  await expect.poll(() => area.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  const top = await area.evaluate((element) => element.scrollTop);
  await page.mouse.wheel(0, 200);
  await expect.poll(() => area.evaluate((element) => element.scrollTop)).toBeGreaterThan(top);
  expect(await lastWheelCancelled(page)).toBe(false);
  // Past the bottom, it still stays on the slide.
  for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 300);
  await page.waitForTimeout(500);
  expect(await current(page)).toBe(SLIDE_3);
});

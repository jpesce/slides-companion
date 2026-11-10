import { test, expect, deckUrl } from './fixtures.js';

const irisPositions = (page) =>
  page.$$eval('.slides-companion-iris', (irises) =>
    irises.map((iris) => [Number(iris.getAttribute('cx')), Number(iris.getAttribute('cy'))]),
  );

test('companion sits first in the side toolbar', async ({ context }) => {
  const page = await context.newPage();
  await page.goto(deckUrl);

  const companion = page.locator('#docs-side-toolbar > .slides-companion-button');
  await expect(companion).toBeVisible();
  await expect(page.locator('#docs-side-toolbar > :first-child')).toHaveClass(
    /slides-companion-button/,
  );
});

test('companion eyes follow the mouse', async ({ context }) => {
  const page = await context.newPage();
  await page.goto(deckUrl);
  const companion = page.locator('.slides-companion-button');
  await expect(companion).toBeVisible();
  const box = await companion.locator('svg').boundingBox();

  const leftEye = 330.355;
  const eyeY = 673.855;

  // Mouse straight below: both irises look down.
  await page.mouse.move(box.x + box.width / 2, box.y + 400);
  await expect
    .poll(() => irisPositions(page))
    .toEqual([
      [expect.any(Number), expect.closeTo(eyeY + 60.8, 0)],
      [expect.any(Number), expect.closeTo(eyeY + 60.8, 0)],
    ]);

  // Mouse far left, level with the eyes: the left iris looks left.
  await page.mouse.move(0, box.y + box.height * (eyeY / 1080));
  await expect.poll(async () => (await irisPositions(page))[0][0]).toBeLessThan(leftEye - 55);
});

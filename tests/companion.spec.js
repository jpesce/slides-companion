import { test, expect, deckUrl } from './fixtures.js';
import { TOOLBAR, pupilRoom } from '../scripts/build-brand.mjs';

const pupilPositions = (page) =>
  page
    .locator('.slides-companion-pupil')
    .evaluateAll((pupils) =>
      pupils.map((pupil) => [Number(pupil.getAttribute('cx')), Number(pupil.getAttribute('cy'))]),
    );

// How far a pupil sits from its eye's centre, as a share of the room it has (1 is the edge of the
// rim of white it keeps), in the eye's own tilted frame.
function reach(eye, [x, y]) {
  const [ax, ay] = pupilRoom(eye, Math.min(eye.rx, eye.ry) * TOOLBAR.pupil, TOOLBAR.margin);
  const t = (eye.tilt * Math.PI) / 180;
  const [dx, dy] = [x - eye.x, y - eye.y];
  return Math.hypot(
    (dx * Math.cos(t) + dy * Math.sin(t)) / ax,
    (-dx * Math.sin(t) + dy * Math.cos(t)) / ay,
  );
}

test('companion sits first in the side toolbar', async ({ context }) => {
  const page = await context.newPage();
  await page.goto(deckUrl);

  const companion = page.locator('#docs-side-toolbar > .slides-companion-button');
  await expect(companion).toBeVisible();
  await expect(page.locator('#docs-side-toolbar > :first-child')).toHaveClass(
    /slides-companion-button/,
  );
});

test('companion eyes follow the mouse, keeping white around the pupils', async ({ context }) => {
  const page = await context.newPage();
  await page.goto(deckUrl);
  const companion = page.locator('.slides-companion-button');
  await expect(companion).toBeVisible();
  const box = await companion.locator('svg').boundingBox();
  const [left, right] = TOOLBAR.eyes;

  // Mouse far below: both pupils look down, as far as their rim of white lets them.
  await page.mouse.move(box.x + box.width / 2, box.y + 400);
  await expect
    .poll(async () => {
      const [l, r] = await pupilPositions(page);
      return l[1] > left.y + 15 && r[1] > right.y + 15;
    })
    .toBe(true);
  for (const [i, position] of (await pupilPositions(page)).entries())
    expect(reach(TOOLBAR.eyes[i], position)).toBeLessThanOrEqual(1.01);

  // Mouse far left, level with the eyes: the left pupil looks left.
  await page.mouse.move(0, box.y + box.height / 2);
  await expect.poll(async () => (await pupilPositions(page))[0][0]).toBeLessThan(left.x - 10);
  for (const [i, position] of (await pupilPositions(page)).entries())
    expect(reach(TOOLBAR.eyes[i], position)).toBeLessThanOrEqual(1.01);
});

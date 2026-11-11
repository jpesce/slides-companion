import fs from 'node:fs';
import { test, expect } from '@playwright/test';

// The toolbar companion's blink and squash, on a page of its own with Slides' side toolbar stood
// in for, and a fake clock, so each moment can be checked exactly.
const read = (file) => fs.readFileSync(new URL(`../extension/${file}`, import.meta.url), 'utf8');

async function companion(page, { random = 0.99 } = {}) {
  await page.clock.install({ time: 0 });
  await page.setContent(
    `<style>${read('companion.css')}</style><div id="docs-side-toolbar" style="margin:40px"></div>`,
  );
  await page.clock.pauseAt(1000);
  await page.evaluate((random) => {
    Math.random = () => random;
    globalThis.slidesCompanion = { text: () => 'Settings', openSettings() {} };
  }, random);
  for (const file of ['companion-drawing.js', 'companion.js'])
    await page.addScriptTag({ content: read(file) });
  return page.locator('.slides-companion-button');
}

// How tall he is, from the body's transform: 1 as drawn, less squashed, more stretched.
const height = (page) =>
  page
    .locator('.slides-companion-body')
    .evaluate((body) => Number(/scale\([\d.]+ ([\d.]+)\)/.exec(body.getAttribute('transform'))[1]));

// How open each eye's lids are, at their widest: the largest gap between the upper and lower
// edges of the opening they leave, in the picture's units.
const openings = (page) =>
  page.locator('clipPath path').evaluateAll((paths) =>
    paths.map((path) => {
      const ys = path
        .getAttribute('d')
        .match(/-?[\d.]+ -?[\d.]+/g)
        .map((pair) => Number(pair.split(' ')[1]));
      const half = ys.length / 2;
      return Math.max(...ys.slice(0, half).map((y, i) => ys[ys.length - 1 - i] - y));
    }),
  );

test(
  'the companion squashes when pressed, and springs back past his shape when let go',
  { tag: '@offline' },
  async ({ page }) => {
    const button = await companion(page);
    const box = await button.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.clock.runFor(150);
    expect(await height(page)).toBeLessThan(0.9);
    // His eyes squeeze into arcs: the lids' opening is much narrower than when open.
    for (const opening of await openings(page)) expect(opening).toBeLessThan(80);

    await page.mouse.up();
    let tallest = 0;
    for (let ms = 0; ms < 400; ms += 16) {
      await page.clock.runFor(16);
      tallest = Math.max(tallest, await height(page));
    }
    expect(tallest).toBeGreaterThan(1.02);
    await page.clock.runFor(1500);
    expect(await height(page)).toBeCloseTo(1, 3);
  },
);

test('the companion blinks every few seconds', { tag: '@offline' }, async ({ page }) => {
  // The first blink comes at the soonest it can, 2.6 seconds in.
  await companion(page, { random: 0 });
  const open = await openings(page);
  await page.clock.runFor(2600 + 90);
  for (const opening of await openings(page)) expect(opening).toBeLessThan(1);
  await page.clock.runFor(1000);
  expect(await openings(page)).toEqual(open);
});

test(
  'with reduced motion, the companion neither blinks nor squashes',
  { tag: '@offline' },
  async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const button = await companion(page, { random: 0 });
    const open = await openings(page);
    const box = await button.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    for (let ms = 0; ms < 10_000; ms += 50) {
      await page.clock.runFor(50);
      expect(await height(page)).toBe(1);
      expect(await openings(page)).toEqual(open);
    }
    await page.mouse.up();
  },
);

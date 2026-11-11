import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { svgs, companionScript, PNGS } from '../scripts/build-brand.mjs';

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url));

// Every picture of the companion comes from one drawing, scripts/build-brand.mjs.
test(
  "brand/'s SVGs and the toolbar companion are made by npm run brand",
  { tag: '@offline' },
  () => {
    for (const [name, svg] of Object.entries(svgs()))
      expect(read(`brand/${name}`).toString(), name).toBe(svg);
    expect(read('extension/companion-drawing.js').toString()).toBe(companionScript());
  },
);

// A PNG's width and height are in its IHDR chunk, right after the 8-byte signature.
const size = (png) => [png.readUInt32BE(16), png.readUInt32BE(20)];

test(
  'every icon the manifest names is a PNG of its size, made by npm run brand',
  { tag: '@offline' },
  () => {
    const manifest = JSON.parse(read('extension/manifest.json'));
    const made = new Set(PNGS.map(([file]) => file));
    for (const [px, file] of Object.entries(manifest.icons)) {
      expect(made, file).toContain(`extension/${file}`);
      expect(size(read(`extension/${file}`)), file).toEqual([Number(px), Number(px)]);
    }
    for (const [file, , px] of PNGS) expect(size(read(file)), file).toEqual([px, px]);
  },
);

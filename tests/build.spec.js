import { test as base, expect, chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build } from '../scripts/build.mjs';
import { deckUrl } from './fixtures.js';

// Card 80: the release build is the extension without its dev auto-reload, and it still works.
// (`npm run test:build` runs every test on it.)
const test = base.extend({
  built: [
    async ({}, use) => {
      const buildDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slides-companion-build-'));
      await use(build({ buildDir }));
      fs.rmSync(buildDir, { recursive: true, force: true });
    },
    { scope: 'worker' },
  ],
});

test('the release build leaves out the dev auto-reload and the permission only it uses', async ({ built }) => {
  const source = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../extension/manifest.json'), 'utf8'));
  expect(built.manifest.permissions).toEqual(source.permissions.filter((permission) => permission !== 'alarms'));
  expect(built.manifest.version).toBe(source.version);

  const zipped = execFileSync('unzip', ['-Z1', built.zip], { encoding: 'utf8' }).trim().split('\n');
  expect(path.basename(built.zip)).toBe(`slides-companion-v${source.version}.zip`);
  expect(zipped).toContain('manifest.json');
  expect(zipped).toContain('background.js');
  // Our license and the icons' notices go with it.
  expect(zipped).toContain('LICENSE');
  expect(zipped).toContain('THIRD-PARTY-NOTICES.txt');
  expect(zipped.filter((file) => /dev-|_metadata|\.DS_Store/.test(file))).toEqual([]);
  // Every file the manifest names is in the zip.
  const named = [
    built.manifest.background.service_worker,
    ...built.manifest.content_scripts.flatMap((script) => [...(script.js ?? []), ...(script.css ?? [])]),
    ...built.manifest.web_accessible_resources.flatMap((entry) => entry.resources),
    ...Object.values(built.manifest.icons ?? {}),
  ];
  expect(named.filter((file) => !zipped.includes(file))).toEqual([]);
  expect(fs.readFileSync(path.join(built.outDir, 'background.js'), 'utf8')).not.toContain('importScripts');
});

test('the release build loads in Chrome and works in Slides', async ({ built }) => {
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    args: [`--disable-extensions-except=${built.outDir}`, `--load-extension=${built.outDir}`],
  });
  try {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    // Its background script ran to the end: it answers, and Chrome gave it what it asks for.
    expect(await worker.evaluate(() => chrome.runtime.getManifest().permissions)).toEqual(built.manifest.permissions);
    const page = await context.newPage();
    await page.goto(deckUrl);
    await expect(page.locator('.slides-companion-button')).toBeVisible();
  } finally {
    await context.close();
  }
});

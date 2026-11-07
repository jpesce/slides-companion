import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  // Each test launches its own Chromium with the extension, so tests don't share anything and can run
  // side by side, those in one file too. Most of a test's time is Chromium starting and Slides
  // loading, so four at a time takes about a quarter as long. More would load the machine enough to
  // upset the tests that time things (the tooltip's delay, the controls hiding after rest).
  fullyParallel: true,
  workers: 4,
  use: {
    trace: 'retain-on-failure',
  },
});

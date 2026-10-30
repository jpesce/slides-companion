import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  // Each test launches its own Chromium with the extension; keep them sequential.
  workers: 1,
  use: {
    trace: 'retain-on-failure',
  },
});

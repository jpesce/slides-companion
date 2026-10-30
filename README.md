# Slides Companion

Free, client-side-only Chrome extension with presenter tools for Google Slides. A rewrite of [Image Spotlight for Google Slides](https://github.com/jpesce/image-spotlight-for-google-slides). Research: problems and competitors; competitor source code in [benchmark/](benchmark/README.md).

```
extension/   the extension itself (load this folder in Chrome)
tests/       Playwright tests, run in a separate Chromium
scripts/     dev helpers
benchmark/   competitors' code, for reference only
```

## Setup

```bash
npm install
npx playwright install chromium
```

## Automated tests (separate Chromium)

```bash
npm test
```

Each run launches Playwright's Chromium with `extension/` loaded and checks it against a public deck. Set `TEST_DECK_URL` to use another deck shared as "anyone with the link". Use `npm run test:headed` to watch, or `npm run chromium` to open that browser and click around.

Regular Chrome stopped accepting `--load-extension` in version 137, which is why tests use Chromium.

## Your Chrome (signed in)

1. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, pick the `extension/` folder.
2. Run `npm run dev` and leave it running.

While `npm run dev` runs, saving any file in `extension/` reloads the extension and every open Slides tab within about a second. Only unpacked builds do this; store installs never auto-reload.

Auto-reload doesn't work in the test Chromium: an extension loaded from the command line is unloaded by `chrome.runtime.reload()`. Tests don't need it, since each run starts fresh.

# Slides Companion

Free, client-side-only Chrome extension with presenter tools for Google Slides. A rewrite of [Image Spotlight for Google Slides](https://github.com/jpesce/image-spotlight-for-google-slides). Research: problems and competitors; competitor source code in [benchmark/](benchmark/README.md).

## Features

- **Companion:** our logo sits first in Slides' side toolbar, and its eyes follow the mouse. Click it for Settings.
- **Spotlight:** select an image and press <kbd>Space</kbd> (or right-click it and choose **Spotlight image**) to see it full screen on a black stage. <kbd>←</kbd> <kbd>→</kbd> or a click on the left or right third go through the slide's other images; with several images selected, just those. <kbd>Esc</kbd>, <kbd>Space</kbd> or the X closes it. The X and a ‹ 2/5 › bar sit above and below the picture, out of sight until the pointer moves there; over the picture, the pointer turns into an arrow showing which way a click goes. During a slideshow, click an image to spotlight it; clicks anywhere else still change slides. Works for anyone who can view the deck.
- **Settings:** whether clicking an image in a full screen slideshow spotlights it (on by default), and whether a group of images shows as one picture or each image on its own.

## Layout

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

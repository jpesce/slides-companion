<p align="center">
  <img width="100" src="https://github.com/user-attachments/assets/6fe34184-6b7b-4d24-8382-f31046a871b8" alt="Slides Companion"/>
  <h1 align="center"><b>Slides Companion</b></h1>
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/image-spotlight-for-googl/habmkngfcidcchgmdpampgcbmnllkbhd" target="_blank"><img width="160" src="https://github.com/user-attachments/assets/b980234b-a7fa-4f31-82cb-61b7c5dcc85f" alt="Available in the Chrome Web Store"/></a>
</p>

Free presenter tools for Google Slides™, in an extension for Chrome and browsers built on Chrome. It works on top of Slides' own slideshow, so your videos, animations and clicker keep working, and it looks like part of Slides. Formerly Image Spotlight for Google Slides. Get it from the [Chrome Web Store](https://chromewebstore.google.com/detail/image-spotlight-for-googl/habmkngfcidcchgmdpampgcbmnllkbhd).

https://github.com/user-attachments/assets/d34dfa35-ae3a-41f7-a0b9-a08e66d2e289

## Features

- 🔍 **Spotlight:** select an image and press <kbd>Space</kbd>, or right-click it, to see it full screen, then go through the slide's other images with the arrow keys. During a slideshow, just click an image. Grouped images show as one picture or each on its own, as you choose.
- 🔗 **Links:** during a slideshow, links open over your slide, and <kbd>Esc</kbd> brings you back right where you left it. Back and Forward work as in a tab, PDFs open in Google's viewer, and YouTube and Drive videos play from where the link starts them. A site that won't show inside another page says so, with a way to allow it or open it in a new tab. Prefer a new tab every time? That's a setting.
- 🔎 **Zoom & scroll:** zoom into a slide with your trackpad, mouse wheel or <kbd>+</kbd> and <kbd>-</kbd> to show a detail up close, and drag to look around. Or make scrolling do nothing, so brushing the trackpad never skips a slide.
- 🖊️ **Pen:** what you draw with Slides' pen stays on the slide for the next time you present, until you choose Erase all.
- ⏱️ **Timer:** in presenter view, click the timer to count down from how long you have, and add a minute on the go. A bar fills as you go and the timer turns orange 1, 2 or 5 minutes before the end. Each deck remembers its time.
- 📝 **Floating notes:** your speaker notes in a small picture-in-picture window that floats over the full-screen slideshow, so one screen is enough. Meeting apps leave it out when you share only the slideshow's tab or window. Zoom into the notes, or move the window to another screen. Open it from View › Show floating notes, the slideshow's ⋮ menu or <kbd>Shift</kbd>+<kbd>S</kbd>.
- ✏️ **Live edits:** edits to the deck, by you or anyone else, reach a slideshow that's already running, handy for a deck on an office TV. The slide on screen changes right away, once you've moved on, or not until the next slideshow, as you choose.
- 🖼️ **Download image:** right-click an image to save it as it was added to the deck.
- ⌨️ **Keyboard:** our shortcuts are listed in Slides' own Keyboard shortcuts dialog (<kbd>Ctrl</kbd>+<kbd>/</kbd>, or <kbd>⌘</kbd>+<kbd>/</kbd> on a Mac), and our menu items work with the arrow keys and access keys like Slides' own.
- 🌍 **Languages:** speaks Slides' language, in 33 languages, right to left in Arabic and Hebrew.
- 🕊️ 100% free and open source. No account, no servers: everything happens in your browser.

Each feature has its own page in Settings, with what it does and its choices: click the extension's button at the top of Slides' side toolbar, whose eyes follow your mouse.

Looking for something it doesn't do, like a phone remote or audience polls? [How Slides Companion compares](BENCHMARK.md) sets it side by side with Google Slides' own tools and other projects.

## Getting started

1. Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/image-spotlight-for-googl/habmkngfcidcchgmdpampgcbmnllkbhd).
2. Open any Google Slides presentation.
3. Click an image and press <kbd>Space</kbd> to spotlight it, or start a slideshow and present as usual.

### Manual installation

> [!NOTE]
> This method is recommended only for developers and advanced users.<br/>
> For the best experience, install the extension from the [Chrome Web Store](https://chromewebstore.google.com/detail/image-spotlight-for-googl/habmkngfcidcchgmdpampgcbmnllkbhd).

Download a [release](https://github.com/jpesce/slides-companion/releases), unzip it, and [load it as an unpacked extension](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked).

## Contributing

Found a bug, or missing something? [Open an issue](https://github.com/jpesce/slides-companion/issues). To change the code, start with [Development](#development) below and the project's principles in [CLAUDE.md](CLAUDE.md), then open a [pull request](https://github.com/jpesce/slides-companion/pulls).

## Development

```
extension/   the extension itself (load this folder in Chrome)
tests/       Playwright tests, run in a separate Chromium
scripts/     build, release and dev helpers
kanban/      the work board, one card per deliverable
```

### Setup

```bash
npm install
npx playwright install chromium
```

### Your Chrome (signed in)

1. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, pick the `extension/` folder.
2. Run `npm run dev` and leave it running.

While `npm run dev` runs, saving any file in `extension/` reloads the extension and every open Slides tab within about a second. A change to `extension/_locales/` also rewrites `extension/messages.js` (`npm run messages`). The release build leaves the auto-reload out.

### Tests

```bash
npm test
```

Each run launches Playwright's Chromium with `extension/` loaded and checks it against a public deck. Set `TEST_DECK_URL` to use another deck shared as "anyone with the link". Use `npm run test:headed` to watch, or `npm run chromium` to open that browser and click around. `npm run test:build` runs every test on the release build instead.

Regular Chrome stopped accepting `--load-extension` in version 137, which is why tests use Chromium. Auto-reload doesn't work there, and tests don't need it, since each run starts fresh.

`npm test` runs `npm run lint` first: ESLint, and Prettier's check of the formatting. `npm run format` fixes what can be fixed by itself.

### Releasing

`npm run build` (or `make build`) writes the release build to `build/slides-companion/` and zips it as `build/slides-companion-v<version>.zip`, without the dev auto-reload and the `alarms` permission only it uses.

1. `make bump` raises the version in `extension/manifest.json` and starts its section in [CHANGELOG.md](CHANGELOG.md).
2. Write what changed there, from the user's side, and replace "Unreleased" with the date.
3. Commit and push to `main`.
4. `make test-build` runs every test on the release build, in about 45 minutes, and marks the commit as tested if they pass.
5. `make all` checks that this commit passed, builds, then asks before it tags the version with its changelog section, pushes the tag, and creates the GitHub release with the zip attached.
6. Upload the zip at the [Chrome Web Store dashboard](https://chrome.google.com/webstore/devconsole), with the listing text from [STORE.md](STORE.md) if it changed.

`make help` lists every step, to run them one at a time.

## License

[![GPLv3 License](https://img.shields.io/badge/License-GPLv3-blue.svg)](./LICENSE)

Licensed under the GNU General Public License v3.0: see [LICENSE](./LICENSE).

Google Slides is a trademark of Google LLC. This extension is not made or endorsed by Google.

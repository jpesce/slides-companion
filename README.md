<p align="center">
  <img width="100" src="brand/icon-512.png" alt="Slides Companion"/>
  <h1 align="center"><b>Slides Companion for Google Slides™</b></h1>
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/image-spotlight-for-googl/habmkngfcidcchgmdpampgcbmnllkbhd" target="_blank"><img width="160" src="https://github.com/user-attachments/assets/b980234b-a7fa-4f31-82cb-61b7c5dcc85f" alt="Available in the Chrome Web Store"/></a>
</p>

Free presenter tools for Google Slides™, in an extension for Chrome and browsers built on Chrome. It works on top of Slides' own slideshow, so your videos, animations and clicker keep working, and it looks like part of Slides. Formerly Image Spotlight for Google Slides. Get it from the [Chrome Web Store](https://chromewebstore.google.com/detail/image-spotlight-for-googl/habmkngfcidcchgmdpampgcbmnllkbhd).

https://github.com/user-attachments/assets/ec264cc1-df3a-48b8-a82a-06445b620273

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

Download a [release](https://github.com/jpesce/slides-companion-for-google-slides/releases), unzip it, and [load it as an unpacked extension](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked).

## Contributing

Found a bug, or missing something? [Open an issue](https://github.com/jpesce/slides-companion-for-google-slides/issues). To change the code, [CONTRIBUTING.md](CONTRIBUTING.md) has the project's principles, setup, tests and how a release goes out. In short:

```bash
npm install
npx playwright install chromium
npm test
```

## License

[![GPLv3 License](https://img.shields.io/badge/License-GPLv3-blue.svg)](./LICENSE)

Free and open source under the GNU General Public License v3.0: yours to use, learn from, share and improve. See [LICENSE](./LICENSE).

Google Slides is a trademark of Google LLC. This extension is not made or endorsed by Google.

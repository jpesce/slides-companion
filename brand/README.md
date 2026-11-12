# The companion

Slides Companion's mascot: a small, furry black bun with two hand-drawn eyes, looking up. The eyes are a little different in size and tilt, which is most of his charm. He lives at the top of Slides' side toolbar, where his eyes follow your mouse, and on the extension's icon, where he peeks up from the bottom of a Slides-yellow tile.

## The files

| File | What it is | Where it goes |
|---|---|---|
| `icon.svg`, `icon-512.png` | The icon: the companion peeking up from a yellow tile | The README, and anywhere the extension needs a picture of itself |
| `icon-store.svg` | The same tile in transparent padding, with a soft white glow so it shows on dark backgrounds, as the Chrome Web Store asks | The 48px and 128px icons in `extension/icons/`, and the store's icon |
| `companion.svg`, `companion-1024.png` | The whole companion, no tile, on a transparent background | Places where he stands on his own, on a light background |
| `toolbar-companion.svg` | The companion as drawn for Slides' toolbar, at 25px: bigger eyes and pupils so they read at that size | `extension/companion-drawing.js`, which the toolbar button shows |
| `companion-toolbar.gif` | The companion at work in Slides' toolbar, his eyes following the pointer, recorded in the real editor by `node scripts/demo/toolbar.mjs` (not `npm run brand`) | The README's Settings section |

`extension/icons/` holds the icon at 16, 32, 48 and 128px. The two small ones fill their square, like the other icons in Chrome's extensions menu; the two big ones are padded.

## Colours

- Fur and pupils: `#1F1F1F`
- Eyes: `#FFFFFF`
- The tile: Slides yellow, `#FFCF03`, sampled from Slides' 2026 icon

## Changing him

Every picture here is made by one script, from one drawing in code:

```bash
npm run brand
```

It writes the SVGs and PNGs here, the icons in `extension/icons/` and the toolbar companion in `extension/companion-drawing.js`. To change how he looks, change `scripts/build-brand.mjs` and run it again, rather than editing a picture by hand: that's how the icon, the toolbar and everything else stay the same character. `npm run test:offline` checks the files are up to date.

## Using him

- **On a dark background, use the icon.** His black fur disappears on dark (GitHub's dark mode, for one), and the yellow tile keeps him visible.
- **In Chrome and the store, he's on the tile;** in Slides' toolbar, he's on his own, like Slides' own buttons.
- **He's one character.** Never a crowd of them, and no star-shaped sweets: he's inspired by Studio Ghibli's soot sprites, and those are theirs. The big pupils that follow your mouse, and the peek, are what make him ours.

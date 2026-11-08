# A new icon for Slides Companion

**Problem:** the extension still wears Image Spotlight's binoculars. That was right for a tool that magnifies images, but Slides Companion does much more (links, zoom, pen, timer, notes, live edits). The icon is the first thing people see in the Chrome Web Store, in Chrome's extensions menu and in Slides' side toolbar.

**Evidence of demand:** the user decided on a new icon while card 80 (release build) was being finished, before the first Slides Companion release.

**Approach:** to be designed with the user. Where the current mark shows up today:
- `extension/icons/icon48.png` and `icon128.png` (Chrome and the store). The store wants 128×128 with the artwork in the middle 96×96 and see-through padding around it, and it must read on light and dark backgrounds.
- The companion button in Slides' side toolbar (`extension/companion.js`, `LOGO_SVG`, whose eyes follow the mouse). Keep the eyes if the new mark has them, or change what the button does when it doesn't.
- The README logo (an image uploaded to GitHub) and the store's promo tiles.

Keep the source file (SVG) in the repo, and make the PNGs from it with a script, as `npm run illustrations` does for Settings.

**Done when:**
- [ ] The user has picked a design.
- [ ] Icons, the companion button and the README logo use it, made from one source file in the repo.
- [ ] It reads clearly at 16px (Chrome's toolbar), on light and dark backgrounds.

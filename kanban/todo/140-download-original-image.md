# Download an image from a slide, as it was added

**Problem:** Slides has no way to save an image from a deck. Right-click offers Copy, Crop, Replace and the rest, but no Download, so a presenter who wants a photo back (to reuse, send, or edit) ends up taking a screenshot, at screen size and with any crop baked in, or copying it into another app.

**Evidence of demand:** "Google Slides & Docs - Download Image" does only this, and has 40,000 users at 4.6 stars (Chrome Web Store, Nov 2026; package in `benchmark/7-download-image/`). The user asked for it in Nov 2026.

**Approach:** add Download image to the image's right-click menu, next to our Spotlight image and made the same way (card 95's keyboard reach included). The benchmark fetches the URL the editor shows (`<image href>` in the slide's SVG), which is a copy sized for the screen, not the file that was added. Google's image addresses usually take a size at the end (`=s0`, `=w0`, `=d`) that asks for the original; to check whether Slides' do, and what a cropped, recoloured or masked image gives. Name the file after the image's alt text or the deck, with the right extension. No permission should be needed beyond what the extension has: `chrome.downloads` would add an install warning, a link with `download` may not work across Google's image host, so try the lightest first.

**Done when:**
- [ ] Right-clicking an image offers Download image, in Slides' language, looking like the menu's own items; the arrow keys and Enter reach it.
- [ ] It saves the image at the size it was added, not the size on screen; what happens with a cropped image is decided and noted here.
- [ ] The file has a sensible name and extension.
- [ ] No new install warning.
- [ ] Covered by Playwright tests.

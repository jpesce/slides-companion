# Download an image from a slide, as it was added

**Problem:** Slides has no way to save an image from a deck. Right-click offers Copy, Crop, Replace and the rest, but no Download, so a presenter who wants a photo back (to reuse, send, or edit) ends up taking a screenshot, at screen size and with any crop baked in, or copying it into another app.

**Evidence of demand:** "Google Slides & Docs - Download Image" does only this, and has 40,000 users at 4.6 stars (Chrome Web Store, Nov 2026; package in `benchmark/7-download-image/`). The user asked for it in Nov 2026.

**Approach:** a Download image button in the Spotlight gallery's bottom bar, after ‹ 2/5 › (alone in the bar when the gallery has one image), and Download image in the image's right-click menu, under Spotlight image (the user's choice of places, Nov 2026). Both save the picture file Slides holds for the image, under the deck's name with the file's own extension.

**Done when:**
- [ ] Right-clicking an image offers Download image, in Slides' language, looking like the menu's own items; the arrow keys and Enter reach it.
- [ ] The Spotlight gallery's bottom bar has a Download image button for the image shown, in the editor and during a slideshow, made like the bar's other buttons.
- [ ] It saves the image at the size it was added, not the size on screen; what happens with a cropped image is decided and noted here.
- [ ] The file has a sensible name and extension.
- [ ] No new install warning.
- [ ] Covered by Playwright tests.

## Notes

- What "the original" can be: Slides draws each image from a copy it fetched from `docs.google.com/slides-images-rt/<token>=s2048`, kept in the page as a `blob:` address on the `<image>`. Asking for the original size (`=s0`) or a bigger one gives the same file, and Slides' own PowerPoint export has the same 2048px images: Slides keeps images no bigger than 2048px on their long side. So the file in the page is the best there is, and saving it needs no request and no new permission (no `downloads` permission, no install warning).
- That file is the image as it was added: Slides crops with a clip path over it, so the download is the whole picture, uncropped. To decide with the user whether cropped should be an option.
- The editor has no alt text in the page, so the file is named after the deck (the browser numbers repeats).
- Only one image at a time: several images selected, or a group shown as one, offer no download (one file per choice, and no browser prompt about many downloads).
- The benchmark extension (benchmark/7-download-image) copies Slides' Copy or Crop item to make its own and fetches the `<image>`'s address: the same file. No license, so nothing copied.

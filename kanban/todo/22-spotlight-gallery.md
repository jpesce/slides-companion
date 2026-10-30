# Spotlight gallery

**Problem:** after spotlighting one image, looking at the next means closing, selecting it and pressing Space again. A slide of photos or charts should be browsable like a gallery.

**Approach:** the spotlight becomes a gallery, following macOS Quick Look:
- One object selected: Space opens it; ← → go through every image on the slide.
- Several selected: Space opens the first; ← → go through only the selection. (Replaces today's behaviour of combining a multi-selection into one picture.)
- A group counts as one stop, shown as one picture, by default; the "Grouped images" setting (card 21) can show each image on its own instead.
- Order is reading order: top to bottom, then left to right.
- ← → / Page Up/Down / Home / End navigate. A click on the right half goes to the next image, on the left half to the previous one. Nothing happens past the last image or before the first. Esc closes.
- Controls appear only while the mouse moves and fade out after about 2 seconds idle, like Slides' slideshow bar. They are a close button (X) in the top-right corner, and position dots centred at the bottom. Neither ever covers the image: the image is fitted inside a thin margin that holds them.
- Position dots, after Porto Rocha's case-study gallery: the current dot is solid, the others dim (about 20% opacity). Up to 7 images show one dot each; beyond that, a sliding window where dots shrink toward the edges to say "more this way". No dots for a single image. Chosen over "2 of 5" because it says the same with less to read, and needs no translation.

**Done when:**
- [ ] ← → move through the slide's images in reading order, or through the selection when several are selected.
- [ ] A click on the right half goes forward, on the left half back; nothing happens past either end.
- [ ] The X and dots show on mouse movement, hide when idle, and never overlap the image.
- [ ] Groups follow the "Grouped images" setting.
- [ ] A slide with one image behaves as today.
- [ ] Covered by Playwright tests.

**Later:** going through every image in the deck, not just the slide (needs moving Slides between slides behind the gallery).

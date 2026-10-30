# Spotlight gallery

**Problem:** after spotlighting one image, looking at the next means closing, selecting it and pressing Space again. A slide of photos or charts should be browsable like a gallery.

**Approach:** the spotlight becomes a gallery, following macOS Quick Look:
- One object selected: Space opens it; ← → go through every image on the slide.
- Several selected: Space opens the first; ← → go through only the selection. (Replaces today's behaviour of combining a multi-selection into one picture.)
- A group counts as one stop, shown as one picture.
- Order is reading order: top to bottom, then left to right.
- Controls mirror Slides' slideshow: a click goes to the next image and closing past the last one; ← → / Page Up/Down / Home / End navigate; Esc closes; a control bar like the slideshow's (‹ 2 of 5 ›) appears when the mouse moves.

**Done when:**
- [ ] ← → move through the slide's images in reading order, or through the selection when several are selected.
- [ ] A click advances, and closes after the last image.
- [ ] The control bar matches the slideshow's, side by side.
- [ ] A slide with one image behaves as today.
- [ ] Covered by Playwright tests.

**Later:** going through every image in the deck, not just the slide (needs moving Slides between slides behind the gallery).

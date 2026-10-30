# Spotlight gallery

**Problem:** after spotlighting one image, looking at the next means closing, selecting it and pressing Space again. A slide of photos or charts should be browsable like a gallery.

**Approach:** the spotlight becomes a gallery, following macOS Quick Look:
- One object selected: Space opens it; ← → go through every image on the slide.
- Several selected: Space opens the first; ← → go through only the selection. (Replaces today's behaviour of combining a multi-selection into one picture.)
- A group counts as one stop, shown as one picture, by default; the "Grouped images" setting (card 21) can show each image on its own instead.
- Order is reading order: top to bottom, then left to right.
- ← → / Page Up/Down / Home / End navigate, and a click goes to the next image. Nothing happens past the last image or before the first. Esc closes.
- Open question: how mouse users see where they are and close it without covering or shrinking the image (options under discussion: a slideshow-style bar that shows only while the mouse moves, invisible left/right click zones, or a strip outside the image).

**Done when:**
- [ ] ← → move through the slide's images in reading order, or through the selection when several are selected.
- [ ] A click advances; nothing happens past either end.
- [ ] Groups follow the "Grouped images" setting.
- [ ] Mouse users can see their position and close it (design to be decided).
- [ ] A slide with one image behaves as today.
- [ ] Covered by Playwright tests.

**Later:** going through every image in the deck, not just the slide (needs moving Slides between slides behind the gallery).

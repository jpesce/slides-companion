# No thin line along a picture's edge in Spotlight

**Problem:** in Spotlight, some pictures show a thin light line down one edge, like a scratch on the screen. On a dark background it catches the eye, and it isn't in the picture.

**Evidence of demand:** found while recording the demo video (card 270). The Blue Marble photo (Wikimedia's `The_Earth_seen_from_Apollo_17.jpg`, 3000 × 3002 pixels) showed a one-pixel white line along its right edge, in the editor and in the slideshow; the square Earthrise and Mars photos didn't. Spotlight drew it as an `<svg>` of 739.5 × 740 px at x 430.25, with the slide's own white shape (a `path` far larger than the picture) behind the `<image>` of 739.49 px: the white shows through the antialiased edge. The demo deck now uses a square photo, so to see it again, put a picture that's a few pixels off square on a white slide.

**Why:** Spotlight's copy of the picture keeps what Slides draws behind it, and lays it out on fractional pixels.

**Approach:** in `extension/spotlight.js`, leave out of the copy whatever Slides draws behind the picture, or clip the copy to the picture's own box, and snap the box to whole pixels. Compare with Slides' own image viewer if it has one for the same picture.

**Done when:**
- [ ] A picture a few pixels off square on a white slide shows no line in Spotlight, in the editor and in a slideshow.
- [ ] Pictures with transparency still show what's behind them as before, if they did.
- [ ] A test covers it; `npm test` passes.
- [ ] CHANGELOG.md says it, from the presenter's side.

# Spotlight images during a slideshow

**Problem:** "I can't show a photo or chart big while presenting." The spotlight only works in the editor; Present & Edit mode in the old extension was a workaround for exactly this.

**Demand:** the clearest open space. Hardware proves the need (Logitech Spotlight sells exactly this), but Slides-specific tools have 20 to 1,000 users each.

**Approach (decided with the user):** during a slideshow, clicking an image opens the same full-screen gallery as in the editor (← → through the slide's images, Esc back to the slide). Clicks anywhere else still change slides. Because this changes what a click does, a setting lets people keep clicks going to the next slide. Zoom moved to its own card (26).

**What we know (measured in the slideshow):**
- The slideshow is `iframe.punch-present-iframe` at `/present` (src `/localpresent`). The slide SVG has the editor's structure without the `editor-` prefix: `g#<pageId>`, `g#<pageId>-bg`, `g#<objectId>`.
- Slides changes slide on `click` (stopping it at window capture keeps the slide) and on `wheel`.
- The laser pointer adds `cursor-none` to `.sketchyViewerContainer`; the pen adds it too, plus `disable-pointer-events` on `.sketchyViewerContent`. Idle hides the cursor with an inline `cursor: none` on `body`.
- The slideshow is full screen on a `div.punch-full-screen-element` in the editor page. Leaving full screen ends the slideshow, and Slides doesn't lock any keys, so a real Esc would leave full screen (and end the slideshow) before we could close the gallery. While the gallery is open, the top page asks for `navigator.keyboard.lock(['Escape'])`.

**Done when:**
- [x] During a slideshow, clicking an image shows it full screen; clicks elsewhere still change slides.
- [x] ← → go through the slide's images; Esc, Space, Enter or the X go back to the same slide, with the slideshow still running (tested).
- [ ] In real full screen, Esc closes the gallery and the slideshow stays full screen. Needs a hand check in Chrome or Dia: Playwright's key presses and its windowed full screen skip the browser's own Esc handling.
- [x] Clicks and the scroll wheel in the gallery don't change slides.
- [x] The laser pointer and the pen keep their clicks.
- [x] A setting keeps clicks on images going to the next slide.
- [x] Works in the slideshow inside the editor.
- [x] Covered by Playwright tests.

**Out of scope for now:** a slideshow opened from a `/present` link draws slides without object ids or a `-bg` group, so the spotlight can't tell images apart there and leaves its clicks alone.

**Not yet verified:** slides with embedded video or linked images (the test deck has neither), and presenter view.

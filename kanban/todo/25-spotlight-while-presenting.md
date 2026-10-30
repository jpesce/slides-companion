# Spotlight and zoom during a slideshow

**Problem:** "I can't point at what matters." No spotlight and no zoom into a chart or photo during a slideshow; the built-in laser pointer is the only tool.

**Demand:** the clearest open space. Hardware proves the need (Logitech Spotlight sells exactly this), but Slides-specific tools have 20 to 1,000 users each.

**Approach:** an overlay on top of native Present mode: a dimming mask around a chosen image or region, and a magnified region under the cursor. The editor spotlight (`extension/spotlight.js`) renders a selection by cloning the slide's SVG; reuse that.

**What we know:** the slideshow runs in `iframe.punch-present-iframe` and gets its own keys, so the editor's Space shortcut doesn't fire there (Space means "next slide"). Clicks advance slides too, so the trigger needs its own design: mirror how the laser pointer is turned on (its key, `L`, and the slideshow's options menu).

**Done when:**
- [ ] While presenting, the presenter can spotlight an image (the rest dims) and release it.
- [ ] A zoom mode magnifies the area under the cursor.
- [ ] Turning both on and off mirrors the laser pointer's controls.
- [ ] Transitions, animations and embedded video still work.
- [ ] Covered by a Playwright test.

**References:** `benchmark/2-spotlight-zoom-ink/` (google-slides-zoom is Apache-2.0).

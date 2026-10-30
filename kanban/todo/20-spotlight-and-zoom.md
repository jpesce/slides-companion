# Spotlight and zoom while presenting

**Problem:** "I can't point at what matters." No spotlight and no zoom into a chart or photo during a slideshow.

**Demand:** the clearest open space. Hardware proves the need (Logitech Spotlight sells exactly this), but Slides-specific tools have 20 to 1,000 users each. This is what Image Spotlight did; this card is its rewrite.

**Approach:** an overlay on top of native Present mode: a dimming mask around a chosen image or region, and a magnified region. Video and animations must keep working.

**Done when:**
- [ ] While presenting, clicking an image spotlights it (the rest dims) and clicking again releases it.
- [ ] A zoom mode magnifies the area under the cursor.
- [ ] Transitions, animations and embedded video still work.
- [ ] Covered by a Playwright test.

**References:** `benchmark/2-spotlight-zoom-ink/` (our own Image Spotlight repo is GPL-3.0 and ours to reuse; google-slides-zoom is Apache-2.0).

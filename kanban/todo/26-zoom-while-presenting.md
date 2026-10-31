# Zoom during a slideshow

**Problem:** "I can't point at a detail in a chart." No zoom into part of a slide during a slideshow; the built-in laser pointer is the only tool.

**Demand:** split from the spotlight-while-presenting card. Logitech Spotlight sells a magnifier; Slides-specific zoom tools have 20 to 1,000 users each.

**Approach:** a zoom mode on top of native Present mode that magnifies the area under the cursor. Turning it on and off mirrors the laser pointer: a key and an item in the slideshow's ⋮ menu ("Turn on the laser pointer · L" sits there; ours would follow it, with the same icon style).

**Done when:**
- [ ] A zoom mode magnifies the area under the cursor.
- [ ] Turning it on and off mirrors the laser pointer's controls (key and ⋮ menu item).
- [ ] Transitions, animations and embedded video still work.
- [ ] Covered by a Playwright test.

**References:** `benchmark/2-spotlight-zoom-ink/` (google-slides-zoom is Apache-2.0).

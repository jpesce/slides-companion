# Zoom during a slideshow

**Problem:** "I can't point at a detail in a chart." No zoom into part of a slide during a slideshow; the built-in laser pointer is the only tool.

**Demand:** split from the spotlight-while-presenting card. Logitech Spotlight sells a magnifier; Slides-specific zoom tools have 20 to 1,000 users each.

**Approach:** scroll to zoom into the slide where the pointer is, drag to look around. Fully zoomed out, everything works as usual. The live slide is scaled, so video, animations and the laser pointer keep working. Scrolling never changes slides (people complain about doing that by accident). The "Zoom in when you scroll" setting gives the wheel back to Slides.

Decisions:
- First tried a Z key and ⋮ menu toggle that magnified around the pointer and panned with the mouse. Dropped: the slide moved whenever you pointed at something (with the laser pointer, say). Panning is now a deliberate drag only.
- Clicking while zoomed in: only what shows a pointing hand can be clicked (links, videos, images to spotlight); a click anywhere else does nothing. Rule chosen for simplicity: changing slides by accident while zoomed is the worst outcome, and a drag and a click differ by a few pixels on a trackpad. No setting: most people would expect this. Move on with → or a clicker, or scroll out.
- While zoomed in, presses on the slide belong to the zoom: a drag looks around, a plain click does nothing, and no part of either (pointer, mouse, click, double click) reaches Slides. Links, videos, Slides' controls and the pen keep their clicks, and a plain click on an image goes on to the spotlight (the spotlight decides, so it matches its pointing hand). First version let plain clicks through to change slides; drags sometimes changed slides in real use (not reproducible with synthetic input), so presses are now swallowed whole. Root cause found after: the zoom forgot a press mid-drag when a move reported no button held (trackpads can send these) or the window blurred, and the release and click then reached Slides. Ownership now lasts from press to click; covered by a test that fakes such a move. If it ever recurs, `diag-chromium.mjs` (session scratchpad) logs which events reached Slides before each slide change.
- Changing slides starts the next one whole. With the pen on, dragging draws; scrolling still zooms.

Open questions:
- No keyboard way to zoom (a clicker can't scroll). Worth a key?
- Pen strokes while zoomed are untested.

**Done when:**
- [x] Scrolling zooms into the slide at the pointer, and dragging moves around it.
- [x] Fully zoomed out, the slideshow behaves exactly as without the extension (except the wheel no longer changes slides, unless the setting says so).
- [ ] Transitions, animations and embedded video still work while zoomed (checked by hand).
- [x] Covered by a Playwright test.

**References:** `benchmark/2-spotlight-zoom-ink/` (google-slides-zoom is Apache-2.0).

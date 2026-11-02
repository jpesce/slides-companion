# Zoom on touchscreens

**Problem:** "I present from a touchscreen laptop and can't zoom." Zoom during a slideshow answers the scroll wheel, a trackpad pinch and mouse drags. On a touchscreen, pinching zooms the whole browser page instead of the slide, and dragging a finger doesn't look around. And after zooming in with the trackpad, a tap on the slide does nothing, like a click, so it can't take them to the next slide.

**Demand:** follow-up from card 26 (zoom while presenting). Chromebooks and Windows touch laptops are common in schools, where Slides is used most.

**Approach:** pinch with two fingers to zoom around the fingers, and drag one finger to look around while zoomed, using the same 1× to 5× range and slide-change reset as the scroll wheel. Keep Slides' own swipes for changing slides when fully zoomed out. Check what Slides itself does with touch during a slideshow before choosing gestures, and test with Playwright's touch emulation.

**Done when:**
- [ ] Pinching zooms the slide (not the page), and dragging a finger looks around while zoomed.
- [ ] Fully zoomed out, taps and swipes work as they do without the extension.
- [ ] Covered by a Playwright test.

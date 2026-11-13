# Esc closes a link's page after the pointer has been over it

**Problem:** during a slideshow, a link's page opens over the slide and Esc brings the slide back, but only while the pointer stays off the page. Once the pointer has moved over the page (to read it, or to scroll it with the wheel), Esc does nothing, and the presenter has to find the close button.

**Evidence of demand:** found while capturing the demo video's Links scene (card 480, "A demo video that moves like Google's"), on the demo deck's "Earthrise, 1968" slide with en.wikipedia.org/wiki/Earthrise, in Playwright's Chromium: with the page open and the pointer resting on the slide, `document.hasFocus()` in the slideshow's frame is true and Esc closes the page. After `page.mouse.move` over the page, the slideshow's frame has lost focus (`hasFocus()` false) and the editor's own document has it (`document.activeElement` is the editor's `<body>`), and Esc leaves the page open. Wheel scrolling doesn't change that. Not yet checked in Chrome itself, signed in. `tests/links.spec.js` presses Esc without moving the pointer, which is why it passes.

**Approach:** first find what moves the focus to the editor's document (Slides' own handlers when the pointer leaves the slideshow's frame for ours, or ours), then either keep the focus in the slideshow's frame while the stage is open, or listen for Esc in the editor's document too (content.js runs there) and close the stage from there.

**Done when:**
- [ ] With a link's page open, Esc brings the slide back after the pointer has moved over the page and scrolled it.
- [ ] Checked in Chrome as well as in the test Chromium.
- [ ] A test moves the pointer over the page before pressing Esc; `npm test` passes.
- [ ] CHANGELOG.md says it, from the presenter's side.

# Keep slideshow tools out of presenter view

**Problem:** signed in, Slides' presenter view is a `/present` page, so the slideshow scripts (zoom.js, ink.js, spotlight.js) run in it as well as in the slideshow. Presenter view shows small copies of the current and next slides; scrolling over them could zoom them, clicking an image could spotlight it, and ink.js could save presenter view's copy of the pen's marks.

**Demand:** found while building card 30 (countdown timer), checked by hand in Dia. Nothing has gone wrong yet, but no one has tried these in presenter view.

**Approach:** sign in, open presenter view, and try scrolling, clicking images and drawing. If any of it misbehaves, have those scripts skip a window named `punch_speaker_notes_…` (see countdown.js).

**Done when:**
- [ ] Scrolling, clicking and drawing in presenter view do what Slides does on its own.
- [ ] Covered by a Playwright test, if the signed-out test browser can show the problem.

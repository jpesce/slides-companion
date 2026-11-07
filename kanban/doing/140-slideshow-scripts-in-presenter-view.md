# Keep slideshow tools out of presenter view

**Problem:** signed in, Slides' presenter view is a `/present` page, so the slideshow scripts (zoom.js, ink.js, spotlight.js) run in it as well as in the slideshow. Presenter view shows small copies of the current and next slides; scrolling over them could zoom them, clicking an image could spotlight it, and ink.js could save presenter view's copy of the pen's marks.

**Demand:** found while building card 30 (countdown timer), checked by hand in Dia. Nothing has gone wrong yet, but no one has tried these in presenter view.

**Approach:** sign in, open presenter view, and try scrolling, clicking images and drawing. If any of it misbehaves, have those scripts skip a window named `punch_speaker_notes_…` (see countdown.js).

**Found (6 Nov, signed in, in Dia):** the premise was wrong. Presenter view is never a page loaded from `/present`. Slides opens a blank window and writes it itself. Signed in, the written page takes on the slideshow's address (`location.pathname` ends in `/present`); signed out it stays `about:blank`. Extensions only add their scripts to a page as it loads, and a blank page only gets the entries marked `match_about_blank`. So presenter view gets the countdown's entry (settings.js, countdown.js) and never the slideshow's.
- Measured: a cancelable wheel dispatched over presenter view's notes, its page and its slide previews (frames that also take on `/present`) isn't cancelled. The same wheel over the slideshow is, because zoom.js runs there. zoom, ink, spotlight and notes are one manifest entry, so none of them is there.
- Reloading presenter view leaves it blank, so a real `/present` page never loads in that window.

**Decisions:**
- Nothing misbehaves, so there's no guard to add.
- Removed what assumed otherwise:
  - zoom.js's `IN_PRESENTER_VIEW` check on + and −.
  - countdown.js and countdown.css in the slideshow entry. Card 30 added them for signed-in presenter view, but they only ever ran in slideshow frames, where they did nothing.
- No Playwright test. The signed-out test browser can't show the problem: presenter view there is `about:blank`, so even adding `match_about_blank` to the slideshow entry kept the scripts out (tried), and a test that can't fail would mislead.

**Done when:**
- [x] Scrolling, clicking and drawing in presenter view do what Slides does on its own.
- [x] Covered by a Playwright test, if the signed-out test browser can show the problem. (It can't; see above.)

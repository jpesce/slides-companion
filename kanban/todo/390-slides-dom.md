# What we know about Slides' page lives in one place

**Problem:** our knowledge of how Slides builds its page is copied across files. When Slides changes, every copy has to be found, and a missed one quietly breaks a feature for presenters:
- The "are we in a slideshow" check (`/\/(local)?present$/`) is in 6 files: `spotlight.js`, `zoom.js`, `notes.js`, `ink.js`, `shortcuts.js` and `live-edits.js`.
- The "pen is on" selector (`.sketchyViewerContent.disable-pointer-events`) is in 4: `ink.js`, `zoom.js`, `spotlight.js`, `live-edits.js`.
- `inkLayer` is written twice, the same, in `ink.js` and `zoom.js`.
- The slide's name is read from `.punch-viewer-svgpage-a11yelement` in 5 places. `spotlight.js`, `notes.js` and `zoom.js` each run their own document-wide `MutationObserver` to notice a slide change.
- The presenter view timer's selector and its `h:mm:ss` parsing are in both `countdown.js` and `live-edits-main.js`.

**Evidence of demand:** the code review of 9 November 2026, asked for by the maintainer.

**Approach:** a `slides-dom.js`, loaded first in each content-script group that needs it, holding:
- the selectors;
- `inSlideshow`, `penOn()`, `inkLayer()` and `slideName()`;
- one observer that sends a `slide-changed` event the features listen for.

`live-edits-main.js` runs in the page's own world, so it can't see that file's globals. The timer parsing there stays, with a comment pointing at its twin, unless the main-world group can load the shared file too. Nothing a presenter sees changes; `npm test` is the check.

**Done when:**
- [ ] Each selector and check above is written once, and each feature uses the shared one.
- [ ] One observer reports slide changes to every feature that needs them.
- [ ] `npm test` passes.

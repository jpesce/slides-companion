# We notice when something breaks quietly

**Problem:** two features can stop working without anyone knowing:
- **Links over the slide.** `background.js` swallows errors (`.catch(() => {})`) when it registers the page script for "Allow all sites" and when it sets the frame header rule. If either fails, links stop opening over the slide and nothing is logged.
- **Live edits.** It leans on Slides' private parts: the editor's `SK_svgDataApi.requestPage3`, `Function.caller` in `live-edits-main.js`, an overridden `Date.now` in `live-edits-frame.js`, and typing a slide number and Enter into a hidden copy of the slideshow (`live-edits.js`). If Slides renames or changes one, live edits stops or misbehaves. The first sign could be an office TV showing an old slide.

**Evidence of demand:** the code review of 9 November 2026, asked for by the maintainer. Slides changes its code without notice, and live edits is meant for decks left running unattended.

**Approach:**
- In `background.js`, log a warning where errors are swallowed today. Keep quiet only where failing is expected (a tab that closed, an extension reload). Most of the 12 empty `catch {}` elsewhere are of that kind; leave those.
- Live edits checks itself. If its hooks aren't found, or don't fire within a short time once the slideshow starts, it turns itself off for that slideshow and logs why, so the slideshow behaves as without the extension.
- A test that fails with a clear message when a hook isn't where live edits expects it, as an early warning, apart from the behaviour tests.

**Open question:** should the presenter be told when live edits turns itself off, for example in Settings? Decide with the maintainer. A message during a slideshow would get in the way.

**Done when:**
- [ ] `background.js` logs failures it can't expect, instead of swallowing them.
- [ ] Live edits turns itself off, and says why in the console, when Slides' parts aren't there. A test covers it.
- [ ] A test names the missing hook when Slides changes.
- [ ] The open question is decided; `npm test` passes.

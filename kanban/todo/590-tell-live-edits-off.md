# The presenter knows when live edits turned itself off

**Problem:** when Slides changes one of the private parts live edits leans on, live edits turns itself off for that slideshow and says why in the console. The slideshow goes on as without the extension, so nothing breaks, but a presenter who counts on live edits (a deck left running on an office TV) doesn't know their edits will no longer show until they see an old slide.

**Evidence of demand:** the open question left by the work on noticing quiet breakage (November 2026). Nobody has asked yet; it matters only once Slides changes something.

**Approach:** to decide with the maintainer. A message during a slideshow would get in the way. Options:
- A line in Settings, on Live edits' page, saying it didn't work in the last slideshow and that an update of the extension should fix it.
- The toolbar button's menu shows it, the next time it's opened in the editor.
- Nothing more than the console: Slides changes rarely, and the tests' early warning (`data-slides-companion-live-edits`) tells us first, so a fix can ship before presenters notice.

**Done when:**
- [ ] The maintainer has chosen one.
- [ ] If it's shown, it looks like Slides built it, in light and dark, and a test covers it.

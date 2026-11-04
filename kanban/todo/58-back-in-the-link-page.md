# Back and Forward in a page opened over the slide

**Problem:** after following links inside a page opened over the slide (card 55), there's no way back to the page the slide linked to, short of closing and clicking the link again.

**Demand:** follows card 55: the user wants the page "browsable".

**Approach:** the frame's history is out of reach from the slideshow (it's another site), and the browser's own Back would take the whole tab back, possibly out of Slides. With card 56's content script in the frame, the frame reports each page it shows; Back and Forward in the bottom bar go to the previous or next one. Without card 56's permission, the buttons don't show.

**Done when:**
- [ ] Back and Forward in the bottom bar go through the pages visited in the frame, and are disabled at the ends.
- [ ] They never take the tab itself anywhere.
- [ ] Covered by a Playwright test.

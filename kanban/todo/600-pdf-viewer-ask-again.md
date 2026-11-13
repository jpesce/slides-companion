# A PDF shows even when Google's viewer misses once

**Problem:** during a slideshow, a link to a PDF whose address doesn't end in .pdf (arXiv's, a journal's) is checked by asking Google's viewer out of sight what it got. Now and then the viewer answers nothing (`204 No Content`), and the extension then says the page won't open over the slide. The presenter sees the message, and the PDF would show on a second click.

**Evidence of demand:** in the full test runs of 13 November 2026 (card 580, "The tests that reach real sites don't fail a full run"), Google's viewer answered 204 for arXiv's PDF in about one run in two, once for both arXiv tests in the same run. The tests now retry once, which hides it from the tests but not from presenters.

**Approach:** to decide with the maintainer first: whether a 204 from the viewer is worth asking again for, once, before the message (the presenter waits up to another 5 seconds, `VIEWER_WAIT_MS` in spotlight.js), or whether the message, with Open in new tab, is enough. If it's asked again, find whether the viewer's 204 comes back quickly (then a second ask costs little) or only after the wait.

**Done when:**
- [ ] The maintainer has chosen.
- [ ] If asked again: a PDF the viewer misses once still shows, a test plays the 204 once (`context.route`) and checks it, and the PDF viewer tests no longer need their retry.

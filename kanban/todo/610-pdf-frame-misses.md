# A PDF in Google's viewer shows even when the viewer answers nothing

**Problem:** a link to a PDF opens in Google's viewer over the slide. Now and then the viewer answers the frame that shows it with nothing (`204 No Content`). A frame can't tell: no `load` comes, the frame stays out of sight for `VIEWER_WAIT_MS` (5 seconds, `pageFrame` in spotlight.js), then shows empty. The presenter sees a blank page instead of the PDF, until they close it and click again.

**Evidence of demand:** in the full test runs of 13 November 2026, the PDF viewer tests that show a .pdf address straight away (`all-sites.spec.js` "a PDF opens in Google's viewer…") failed on their first try about one run in three, passing on the retry. Card 600 ("A PDF shows even when Google's viewer misses once") fixed the other path, where the viewer is asked whether an address is a PDF: that's asked with `fetch`, which sees the 204, and asks again.

**Approach:** ideas, none tried:
- Ask the viewer with `fetch` first (`viewerSays`), and set the frame's address only once it has answered: about 300 ms later, and the frame's own load can still miss on its own.
- When no `load` comes within the wait, set the frame's address again, once: the presenter waits 5 seconds, then the PDF shows. Check first that a slow PDF doesn't take longer than the wait to load, or it would be loaded twice.
- Find whether the 204 comes from something in the request (a header, the order of requests) that the extension could avoid.

**Done when:**
- [ ] A PDF whose viewer misses once still shows, and a test plays the 204 once.
- [ ] The PDF viewer tests no longer need their retry.
- [ ] `npm test` passes.

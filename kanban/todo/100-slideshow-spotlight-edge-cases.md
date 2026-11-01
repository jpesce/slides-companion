# Check the slideshow spotlight on video, links and presenter view

**Problem:** clicking an image during a slideshow opens the spotlight (card 25), but nobody has tried it on slides with an embedded video or a linked image, or in presenter view. A presenter who hits a broken case finds out in front of an audience.

**Demand:** follow-up to card 25. These are common slide setups, and the automated tests can't reach them: the test deck has no video or links, and the tests can't drive a second presenter window or press a real Esc in full screen.

**Approach:** run checks 2 to 5 of the hand-check doc in Dia. Turn each failure into a fix here, or into its own card if it's big.

**Done when:**
- [ ] The "Press and hold Esc to exit full screen" notice doesn't show each time a photo opens, or we've decided how to handle it.
- [ ] On a slide with a video, clicking the video plays it, and Esc behaves as it does without the extension.
- [ ] Clicking a linked image follows the link, and the gallery stays closed.
- [ ] In presenter view, the gallery opens in the audience window and the presenter window stays on the same slide.
- [ ] Anything that can be tested automatically is covered by Playwright tests.

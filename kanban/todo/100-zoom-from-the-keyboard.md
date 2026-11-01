# Zoom from the keyboard or a clicker

**Problem:** "I present with a clicker and can't zoom." Zoom during a slideshow only answers the scroll wheel and trackpad pinch, so a presenter away from the laptop, or holding a clicker, can't use it. Scrolling over an embedded video doesn't zoom either: the wheel goes to the video's own frame, which the extension can't hear.

**Demand:** follow-up from card 26 (zoom while presenting). Logitech Spotlight's magnifier is button-driven, and presenters standing away from the laptop are the people zoom is for.

**Approach:** keys that zoom in and out around the pointer (or the slide's centre when the pointer is hidden), with the same 1x to 5x range and slide-change reset as the scroll wheel. Pick keys Slides doesn't use in a slideshow (check its keyboard shortcuts list), and look at what common clickers can send.

**Done when:**
- [ ] Keys zoom in and out during a slideshow, and zooming all the way out leaves everything as usual.
- [ ] It works with the pointer over an embedded video.
- [ ] The keys are named in Settings' Zoom section, in plain words.
- [ ] Covered by a Playwright test.

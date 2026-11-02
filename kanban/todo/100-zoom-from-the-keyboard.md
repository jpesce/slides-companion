# Zoom from the keyboard

**Problem:** "I can't zoom without a mouse." Zoom during a slideshow only answers the scroll wheel and trackpad pinch, so a presenter using only the keyboard can't zoom. Scrolling over an embedded video doesn't zoom either: the wheel goes to the video's own frame, which the extension can't hear.

**Demand:** follow-up from card 26 (zoom while presenting). Logitech Spotlight's magnifier is button-driven, and presenters standing away from the laptop are the people zoom is for.

**Approach:** + and − zoom in and out around the pointer (or the slide's centre when the pointer is hidden), with the same 1x to 5x range and slide-change reset as the scroll wheel. Check Slides' slideshow shortcuts list (⌘/) first to be sure + and − are free there. Leave ⌘/Ctrl with + and − to the browser's own page zoom.

**Decisions:**
- + and −, suggested by the user. On many keyboards + needs Shift, so = (the same key) should zoom in too, and so should the number pad's + and −.
- Clickers are out for now: nobody here has one to test with. Most send Page Up/Down, which already change slides. If clicker zoom comes up again, it gets its own card.

**Done when:**
- [ ] + and − zoom in and out during a slideshow, and zooming all the way out leaves everything as usual.
- [ ] It works with the pointer over an embedded video.
- [ ] The keys are named in Settings, in plain words.
- [ ] Covered by a Playwright test.

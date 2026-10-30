# Stop accidental slide skipping

**Problem:** "The deck misbehaves in front of people." A brush of the trackpad or mouse wheel skips slides mid-talk.

**Demand:** Stop Slide Scrolling has 10k users at 4.7 stars and hasn't been updated since 2022: a small, loved fix.

**Approach:** block stray wheel and trackpad scroll events in the slideshow, leaving keyboard, clicker and clicks alone. Probably on by default with a way to turn it off.

**Done when:**
- [ ] Scrolling or swiping on the trackpad during a slideshow doesn't change slides.
- [ ] Arrow keys, Page Up/Down, clickers and clicks still do.
- [ ] Covered by a Playwright test.

**Out of scope:** YouTube errors in slides; those come from embed rules and network filters.

**References:** `benchmark/4-slide-skip/` (Stop Slide Scrolling is MIT).

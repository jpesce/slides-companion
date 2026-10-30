# Ink that stays

**Problem:** Slides' pen marks vanish when the slideshow ends.

**Demand:** Annotate has 200k users at 2.9 stars and saves ink to its own site. Nothing Slides-aware keeps ink per slide.

**Approach:** a drawing layer over the slideshow, saved per slide in browser storage and shown again next time that slide is presented.

**Done when:**
- [ ] The presenter can draw and erase on a slide during the slideshow.
- [ ] Ink reappears on the same slide after leaving and restarting the slideshow.
- [ ] Covered by a Playwright test.

**Known limit:** ink lives on the presenter's computer; writing it into the deck would need the Slides API.

**References:** `benchmark/2-spotlight-zoom-ink/` (stickyscribble is Apache-2.0).

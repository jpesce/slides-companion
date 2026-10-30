# Live website inside a slide

**Problem:** there's no way to show a live, clickable website inside a slide; presenters switch tabs mid-talk.

**Demand:** not measured. No Chrome extension does it; only a Firefox add-on (1 user).

**Approach:** during the slideshow, lay a real web frame over a placeholder box on the slide. Chrome's request rules (declarativeNetRequest) can remove the headers that block framing.

**Done when:**
- [ ] A placeholder on a slide (format to be decided, e.g. a shape whose alt text is a URL) becomes a live, clickable page during the slideshow.
- [ ] Sites that refuse framing still load.
- [ ] Covered by a Playwright test.

**Known limit:** only the presenter's browser shows the site; anyone else opening the deck sees the placeholder.

**References:** `benchmark/6-live-website/` (sliFrame is MIT).

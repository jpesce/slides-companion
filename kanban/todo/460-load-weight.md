# Slides opens no slower with the extension

**Problem:** every page and frame the extension runs in loads more than it needs.
- `messages.js` is 264 KB and holds all 33 languages. It's parsed in the editor and in every frame of the slideshow, since two of the manifest's groups run in all frames.
- `illustrations.js` is 62 KB and loads on every editor page, but it's only used once Settings opens.

Nobody has measured what that costs a presenter opening a deck or starting a slideshow.

**Evidence of demand:** the code review of 9 November 2026, asked for by the maintainer. Unmeasured so far, which is the first thing to fix.

**Approach:**
- Measure first: a Performance trace of opening the test deck and starting a slideshow, with and without the extension, looking at script time in the editor and in the slideshow's frames.
- If it's worth it, keep each language's strings as raw JSON text and parse only the chosen one, and load the illustrations when Settings opens.
- If the gain is a few milliseconds, record the numbers here and drop the card.

**Done when:**
- [ ] The card records the measured cost, before and after.
- [ ] If changed: only the chosen language is parsed, and the illustrations load when Settings opens; `npm test` passes.
- [ ] If not worth it: the numbers are recorded and the card is deleted.

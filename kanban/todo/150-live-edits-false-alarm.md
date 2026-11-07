# Live edits reloads the player when nothing was edited

**Problem:** on a busy computer, live edits sometimes starts loading a fresh copy of the slideshow's player although nobody touched the deck. The presenter doesn't see it (an unchanged slide looks the same when the copy takes over), but it loads the whole player again in the background mid-talk, on the machine that's already struggling, and anything playing on the slide (a video) may start over when it swaps.

**Evidence of demand:** found while running the tests four at a time (Nov 2026): 9 of the links and all-sites tests, all on the slide with links, found two players (`iframe.punch-present-iframe`, the second `data-slides-companion-player="loading"`). Seen once before, rarely, running one at a time. The tests now start with live edits off (the `settings` option in `tests/fixtures.js`) except its own and Settings', so they don't trip over it, which hides it from them.

**Approach:** find what the check sees as an edit. Likely: Slides finishes drawing the filmstrip's thumbnails after the slideshow starts, the observer takes that as a hint (`live-edits.js`, `filmstrip`), and the slide asked for again comes back with something that differs between draws but isn't an edit (an image's address, a video thumbnail's token), which the fingerprint (`live-edits-main.js`, `fingerprint`) counts. Or the deck order taken as the player starts is from a filmstrip still filling in (`deckOrder`). Reproduce under load (four workers, links.spec.js with live edits on), log `changed` and `moved`, then make the fingerprint or the order ignore what isn't an edit.

**Done when:**
- [ ] The cause is known and written here.
- [ ] Opening a deck and presenting straight away on a busy machine loads no copy until something is edited.
- [ ] A test covers it (presenting the links slide with live edits on finds one player).
- [ ] Live edits' own tests still pass.

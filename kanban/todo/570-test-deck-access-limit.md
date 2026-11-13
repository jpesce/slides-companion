# The test deck stays usable through a full run

**Problem:** about a quarter of the way into each full `npm test`, a handful of tests that run side by side fail because the test deck never shows its Present button. Each passes when run again alone, so each run ends in a rerun before anyone can trust it, and a real failure in those tests would hide among them.

**Evidence of demand:** in five full runs on 12 November 2026 (cards 230, 290, 300 and 390), the same block (`ink.spec.js` 186 and 206, `language.spec.js` 9 and 81, around the 49th to 56th test) failed in four. The trace's last screen shows why: Slides' banner "Algumas ferramentas podem estar indisponíveis devido ao grande número de acessos a este arquivo" (some tools may be unavailable because of the large number of accesses to this file), over the deck shown without its editor. A full run opens the shared test deck about 200 times in 18 minutes, signed out, from one address.

**Approach:**
- Confirm the limit: how many opens in how long trip it, and how long it lasts (open the deck in a loop and watch for the banner).
- Then, cheapest first: open the deck fewer times (tests in one file sharing a page where they don't need a fresh one), spread the opens over two or three copies of the test deck (`TEST_DECK_URL` already lets one be swapped in), or slow the run down only as much as needed.
- Have the fixture recognise the banner and fail with a message that says so, instead of a timeout on the Present button.

**Done when:**
- [ ] The limit is measured and written here.
- [ ] Three full runs in a row show no test failing on the banner.
- [ ] A test that meets the banner fails saying so.

**From card 430 (13 November 2026):** two full runs in a row after card 430 (15.0 and 15.1 minutes) had 15 and 8 failures, all passing when run again one at a time. Of these, 4 and 8 (the ink and slideshow tests in run 2, three Spotlight and download tests in run 1, whose last screen shows the banner) never got the deck's Present button. Card 430's last check, two full runs in a row passing, moved here: it's the same as this card's three.

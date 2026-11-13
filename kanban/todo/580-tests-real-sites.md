# The tests that reach real sites don't fail a full run

**Problem:** some tests open real sites over the slide: Google's PDF viewer, arXiv's PDF, google.com refusing to be shown, Wikipedia. In full runs, with four tests at a time, they fail now and then, and pass when run again alone. A full run can't be trusted until they're rerun.

**Evidence of demand:** in the full runs of 12 and 13 November 2026 (cards 230, 290, 390, 400, 420, 430), `all-sites.spec.js` 104 and 167, `links.spec.js` 274, 306, 331, 447, 517 and 543, and `language-pt-br.spec.js` 110 failed in most runs, each passing alone. The message over a site that refuses to be shown comes after a check that loads Slides' "not found" page and then the site, with no timer of its own, so on a busy machine it's slow rather than wrong. Google's viewer has a 5-second wait of its own (`VIEWER_WAIT_MS` in spotlight.js).

**Approach:**
- For each, find whether the test waits less than the extension may take on a busy machine, or the site itself is slow.
- Play the sites in the test where it doesn't change what's tested (`context.route`, as the links tests already do for google.com), and keep real sites only where the real one is the point (Google's viewer, a real site's headers), with waits as long as the extension's own.
- Or tag the real-site tests and run them two at a time.

**Done when:**
- [ ] Three full runs in a row have no real-site test failing.
- [ ] Each real-site test that's left says in a comment why it needs the real site.

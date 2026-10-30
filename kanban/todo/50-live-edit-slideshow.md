# Edits reach a running slideshow

**Problem:** "I can't fix a slide mid-show." Fixing a typo or updating a live number means leaving the slideshow. Published decks on office TVs lag 30 to 60 minutes.

**Demand:** small but intense. Live Present Slides has 2k users at 2.2 stars: people use a broken fix because they want it badly.

**Approach:** detect that the deck changed, then reload the real slideshow on the same slide. For TVs, reload a published deck on a timer.

**Done when:**
- [ ] An edit made in another tab or by a co-author shows in the running slideshow within a few seconds, on the same slide.
- [ ] Transitions, presenter view and clickers keep working (unlike Live Present Slides).
- [ ] Covered by a Playwright test.

**Known limit:** the reload is visible; a seamless update would need Google to change its player.

**References:** `benchmark/5-live-edit/`.

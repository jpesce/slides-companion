# Published decks on TVs pick up edits

**Problem:** offices show a deck on a TV through its published link (File › Share › Publish to web), and edits take 30 to 60 minutes to appear, or need someone to reload the page.

**Demand:** split from card 50. IRT-Signage (`benchmark/5-live-edit/`) reloads a published deck on a timer; the complaint about the lag comes up alongside Live Present Slides'.

**Approach:** a published page has no editor behind it, so card 50's live copy isn't there. Find out how fresh Google serves a published deck (how long its cache is), then reload it when it's new, at a slide change so the reload isn't seen, keeping auto-play and loop. A TV running the slideshow from the editor already gets card 50's live updates; say so in the extension's description.

**Done when:**
- [ ] An edit shows on a published deck as soon as Google serves it, without anyone touching the TV.
- [ ] The reload happens between slides and keeps auto-play and loop.
- [ ] Covered by a Playwright test.

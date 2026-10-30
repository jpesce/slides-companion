# Private notes on one screen

**Problem:** "I can't see my notes without my audience seeing them." On one laptop with Zoom or Meet, notes either leak to the audience or disappear. Google's own help says presenter view and full screen can't run on one monitor.

**Demand:** the most common pain, with no winner. Remote for Slides (100k users) moves notes to a phone; the one-screen tools (NotesPrompter, HumDocs) have under 100 users.

**Approach:** a floating, always-on-top notes window using Document Picture-in-Picture, filled with the current slide's speaker notes. Meeting apps don't capture it when you share only the slideshow tab or window. Sit on top of native Present mode; never replace Slides' player.

**Done when:**
- [ ] While presenting, one action opens a notes window that stays on top of the full-screen slideshow.
- [ ] The notes follow the current slide.
- [ ] Sharing only the slideshow tab or window in Meet or Zoom doesn't show the notes (checked by hand).
- [ ] Covered by a Playwright test.

**Known limit:** sharing the whole screen, or mirroring to a projector, still shows the notes.

**References:** `benchmark/1-private-notes/` (daattali's auto-resize notes is MIT).

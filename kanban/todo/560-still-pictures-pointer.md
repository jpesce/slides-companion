# Settings' still pictures show the pointer in the right place

**Problem:** with motion reduced (the computer's setting), each page of Settings holds its picture still on the moment that shows the feature best. On the Spotlight and Links pages, the pointer then sits squashed in the picture's top-left corner instead of where it should be, and looks like a smudge.

**Evidence of demand:** found on 12 November 2026 while checking the Companion page's picture: Playwright's Chromium with `reducedMotion: 'reduce'`, Settings opened from the companion, each page's picture screenshotted. Zoom, Timer and Companion showed the pointer in place; Spotlight and Links didn't. The same corner pointer showed on the Companion page when a script paused the picture and set its time right after the page appeared.

**Approach:**
- The pointer moves by `animateMotion` (`cursor()` in `scripts/build-illustrations.mjs`). It looks like a paused SVG timeline set with `setCurrentTime()` (`playIllustration()` in `extension/settings-dialog.js`) doesn't always apply the motion when the picture has just been shown, so the pointer stays at its origin, 0 0. Confirm that first.
- Fixes to try: set the time after a frame (`requestAnimationFrame`), or unpause for a frame and pause again, or give the pointer's group the still moment's position as its `transform`, so it's right even before the motion applies.

**Done when:**
- [ ] With motion reduced, every page's picture shows its pointer where the still moment puts it.
- [ ] A test checks each still picture's pointer position, not just that the picture holds still.
- [ ] `npm test` passes.

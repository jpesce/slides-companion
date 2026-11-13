# No grey flash when a live edit reaches the slideshow

**Problem:** in the demo's recording (9 November), right after an edit faded into the running slideshow, the whole slide dimmed grey for about 130 ms and faded back to white. If presenters see it too, every live edit blinks the slide in front of the audience.

**Evidence of demand:** seen while checking the demo video's motion against the recording (`build/demo/raw/live-slideshow/`, frames 00021–00029, 4.77–4.90 s). Not yet seen in a live deck: the recording ran on a computer at a load of 150, so it may be the screencast, not the extension.

**Approach:**
- Make an edit while presenting, in Chrome on a quiet computer, and record the screen at 60 fps; look at the frames after the new slide fades in.
- If the flash is there, find what turns grey: the old player as `putAway()` hides it after `reveal()`'s fade (live-edits.js), the copy's own background, or Slides' player taking focus.

**How to check it (13 November 2026), stopped because the maintainer was in a call:** the maintainer asked for it to be checked in their own browser (Dia, built on Chrome) through Claude in Chrome. What works:
- `screencapture -v -V <seconds> -x file.mov` records the screen at 60 fps from a shell (Screen Recording is allowed), and ffmpeg is installed to read it frame by frame.
- The edit can be the tests' stand-in (`openDeck` and `edit` in `tests/live-edits.spec.js`), run in the editor's page before the slideshow starts: it goes through the same swap as a real edit. Signed in as the deck's owner, a real edit from a second tab would do too, but Claude in Chrome couldn't open a second tab in Dia, and the Google Slides connector's account can't edit the test deck.
- Dia runs the extension from `extension/`; write `extension/dev-stamp.txt` (or run `npm run dev`) so it has the current code. The editor's `<html>` then says `data-slides-companion-live-edits="working"` once a slideshow starts.
- Bring Dia to the front (`osascript -e 'tell application "Dia" to activate'`) before starting the slideshow, record, trigger the edit 2 seconds in, then look at the slide's brightness frame by frame (ffmpeg `signalstats`).
Do it when the screen is free: it takes over the screen for about a minute.

**Done when:**
- [ ] We know whether presenters see the flash.
- [ ] If they do, an edit reaches the slideshow with no flash, and a test checks it.

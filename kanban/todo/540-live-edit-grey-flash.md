# No grey flash when a live edit reaches the slideshow

**Problem:** in the demo's recording (9 November), right after an edit faded into the running slideshow, the whole slide dimmed grey for about 130 ms and faded back to white. If presenters see it too, every live edit blinks the slide in front of the audience.

**Evidence of demand:** seen while checking the demo video's motion against the recording (`build/demo/raw/live-slideshow/`, frames 00021–00029, 4.77–4.90 s). Not yet seen in a live deck: the recording ran on a computer at a load of 150, so it may be the screencast, not the extension.

**Approach:**
- Make an edit while presenting, in Chrome on a quiet computer, and record the screen at 60 fps; look at the frames after the new slide fades in.
- If the flash is there, find what turns grey: the old player as `putAway()` hides it after `reveal()`'s fade (live-edits.js), the copy's own background, or Slides' player taking focus.

**Done when:**
- [ ] We know whether presenters see the flash.
- [ ] If they do, an edit reaches the slideshow with no flash, and a test checks it.

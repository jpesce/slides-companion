# Presenter view in a floating window

**Problem:** with one screen, you can't have presenter view and a full-screen slideshow at the same time: Google's own help says so. Floating notes solves half of it: the notes float over the slideshow, but the timer, the next slide and the slide list stay in presenter view, behind the full-screen slideshow.

**Evidence of demand:** the user raised it while reviewing the demo video (card 270): "why don't we just show the whole presenter view window in PiP instead of our own notes thing?" One-screen presenting is the pain card 10 (floating notes) was made for.

**What we know:**
- Presenter view is a blank window Slides opens by name (`punch_speaker_notes_…`) and writes itself from the slideshow's scripts (see `extension/countdown.js`). So Slides could, in principle, write it into a picture-in-picture window we hand it, instead of a popup.
- Against: Slides asks for its window with `window.open`, which answers at once, while a picture-in-picture window only arrives later (`documentPictureInPicture.requestWindow` returns a promise) and needs a click. Only the top page (the editor) can open one, and only one at a time. Slides may move, resize or write the window in ways a picture-in-picture window refuses. Live edits (card 50) rewrite presenter view when they swap players.
- It would be Slides' own presenter view, so it looks native for free, countdown included. But it's big: on a laptop it would cover much of the slideshow it floats over, where notes alone stay small.

**Approach:** a spike first. When the presenter opens presenter view during a slideshow, open a picture-in-picture window from the editor and give it to Slides in place of its popup. Check whether the timer, the slide changes, the notes and our countdown all work, and what happens when the window closes. If it can't work, record why here and drop the card.

**The setting, if it works:** where presenter view opens, not what it shows. "Floating over your slideshow" (picture-in-picture) or "In its own window" (as Slides does it).
- Not "just your notes or all of presenter view": presenter view decides what it shows, as it does in its own window.
- Not both at once: Slides writes presenter view into one window, so a second copy would be ours, a mirror that has to copy every change and every click. Two timers and two sets of notes on screen would also make it unclear which one to look at.
- Maybe the default is automatic: floating on one screen, its own window when a second screen is plugged in, where the window can sit on the laptop and the slideshow on the projector. Chrome says whether there's a second screen without asking permission (`screen.isExtended`). Decide in the spike whether "Automatic" earns a place as a third choice, or is just how the default behaves.

**Open question:** if presenter view floats, does floating notes stay? It's smaller, but it's a second way to do the same thing. Decide with the user after the spike.

**Spike (13 November 2026): works, with limits.** In Playwright's Chromium, signed out, on the test deck, with Start slideshow ▾ › Presenter view:
- How Slides opens it: from the editor's own scripts, `window.open('about:blank', 'punch_speaker_notes_…', 'width=730,height=580,…')`, after the click, when the click's user activation is already spent. It then writes the whole window from the editor (`document.open`, `write`, `close`, `createElement`, listeners on the window and document) and calls `focus()`. Nothing in the window runs on its own, which is why a window handed to it works.
- The trick: on `pointerdown` on the menu item (activation still there; by `click` Slides has already opened its window), the editor asks for `documentPictureInPicture.requestWindow`; when Slides calls `window.open` for presenter view, it gets that window instead. The window was ready 18 ms before Slides asked with a click that had no pause, and 140 ms before with a 120 ms one: Slides opens it once its menu has closed.
- In the window: Slides' presenter view as in its own, with the timer ticking, the current and next slides, the notes tab, Slide 2 of 11. Its Next moves the slideshow, its Pause stops the timer, an arrow key in the slideshow moves it. Closed, the slideshow goes on, and the arrow keys still work.
- Limits:
  - **One floating window at a time:** Chrome allows one picture-in-picture window per tab, so floating presenter view and floating notes can't both be open. That makes the open question above a real choice, not just tidiness.
  - **Opened during a full-screen slideshow,** the browser leaves full screen, as with floating notes. `notes.js` already handles it (`keepSlideshowThroughOpening`, and its Full screen button), and opened before the slideshow goes full screen, the window stays on top.
- Not checked yet:
  - presenter view opened from inside the slideshow (the player's ⋮ menu, or a key), where `window.open` is the player frame's, and the window would have to come from the editor (`top.documentPictureInPicture`) on the frame's activation; a key may open it before the window is ready, and then Slides' own window should open as today;
  - live edits, which finds presenter view's window again by its name (`live-edits-frame.js`, `live-edits-main.js`): a picture-in-picture window isn't found by name, so a copy taking over would have to be handed it;
  - how it looks and how big Chrome lets it be, on a real screen, and over full screen. Headless Chromium reports 1280×720 for it.
- The spike's script isn't kept: it's short to write again from the above.

**Waiting for the maintainer:** the open question above, now sharper (one floating window at a time), and whether "Automatic" (floating on one screen, its own window with a second screen, from `screen.isExtended`) is the default or a third choice.

**Done when:**
- [x] The spike's result is recorded on this card: works, works with limits, or can't.
- [ ] If it works: presenter view floats over the full-screen slideshow on one screen, Settings offers floating or its own window, a test covers it, and CHANGELOG.md says it.
- [ ] Floating notes is kept or removed, as decided with the user.

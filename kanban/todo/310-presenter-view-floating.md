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

**Decided with the maintainer (13 November 2026):**
- Floating notes stay. Since only one window can float, the presenter picks what floats over the slideshow: just the notes, or all of presenter view, in Settings.
- With presenter view floating, the presenter also picks when: always floating, automatic (floating on one screen, its own window as Slides does when a second screen is plugged in, from `screen.isExtended`), or never (its own window, as today). Default: automatic, as proposed (not yet confirmed by the maintainer). Write the choices from the presenter's side ("Floating over your slideshow", "In its own window"), with when each helps.

**Decided with the maintainer (13 November 2026, later):**
- Two settings, from the presenter's side: what presenter view shows (just your notes, or all of presenter view), and where it opens (floating over your slideshow, in its own window as Slides does, or automatic). Automatic is the default: floating on one screen, its own window with a second screen.
- Presenter view opens the same ways it does in Slides (its menu, the slideshow's ⋮, its key); only where it appears changes.
- Its size: Slides' own window is small (it asks for 730×580; the maintainer's screenshot in Dia shows it over the slideshow's top left), so a floating window that size covers about as much.
- The words go into every language once the feature is settled.
- "Just your notes" means floating notes opens in place of presenter view, the same ways (the maintainer's choice). Read here as: what floats applies when presenter view floats; in a window of its own, it's Slides' presenter view, all of it, as without the extension.

**Research (13 November 2026), in Playwright's Chromium on the test deck:**
- **From inside the slideshow, with S:** works (2 of 2). The slideshow holds the key back, asks the editor for the window (`top.documentPictureInPicture.requestWindow`, allowed by the key's activation in the slideshow's frame), and once it's there (5 ms later), plays S again. Slides then calls `window.open` for presenter view and gets the floating window: timer ticking, slide and notes, all as in its own window.
- **From the slideshow's ⋮ menu:** works when held back the same way (4 of 4). Asked for on the press without holding the click, the new window can take the focus before the release: Slides' menu closes and presenter view never opens (1 of 2). Held: the press, release and click on "Open speaker notes" are kept from Slides, the window is asked for, and the click is played again on the same item. Playing S instead doesn't work while Slides' menu is open. The editor's Start slideshow ▾ › Presenter view should be held the same way (the earlier spike only asked on the press).
- **Our countdown:** Chrome runs our scripts in the floating window too (`match_about_blank`), but `countdown.js` recognises presenter view by its window's name, and a floating window has none. It can tell it's in one with `matchMedia('(display-mode: picture-in-picture)')` instead, and wait for Slides to write presenter view in it, as it already does in Slides' own window.
- **Live edits (from the code, not run yet):** a copy taking over finds presenter view by name (`window.open('', name)` in `live-edits-frame.js`), and `live-edits-main.js` takes an empty name as "closed". Both already hold the window itself, so a copy can be handed that window, whatever its name, and "open" can mean the window isn't closed. Its `close` guard (`keepOpen`) works on any window.
- Not looked at yet: automatic (`screen.isExtended`), floating notes and floating presenter view asking for the one window a tab may have, and leaving full screen as the window opens (as floating notes does).

**Built (13 November 2026):**
- Settings has a Presenter view page, before Timer, with its illustration (presenter view floats in over a slideshow, its Next moves both on). "Presenter view opens": floating unless there's a second screen (default), floating, or in a window of its own. "When it floats, it shows": all of presenter view (default), or just your notes.
- `presenter-view.js` holds back S, the slideshow's ⋮ › Open speaker notes, and Start slideshow ▾ › Presenter view, asks the editor for the window (`requestWindow` at 730×580, Slides' own size), then plays the key or click again; `presenter-view-main.js` hands the window to Slides' `window.open`. The menu click is held whole and the window asked for on `click`: asked for on the press, the release went missing (Playwright's instant click) or the menu closed.
- S again opens it afresh, floating, as Slides does its own window (it closes it and opens another).
- With just your notes: S and ⋮ open floating notes and close Slides' menu; Start slideshow ▾ › Presenter view opens floating notes and starts the slideshow (Slides' Slideshow button).
- The countdown works in the floating window: `presenter-view.js` names the window after the deck, since it has no opener, and `countdown.js` knows it by that name.
- Live edits holds presenter view's window itself rather than its name: a copy taking over is handed the open window.
- Tests: `tests/presenter-view.spec.js`. Countdown's and live edits' tests now run with presenter view floating (the default in the test Chromium, which has no second screen).

**Checked in the maintainer's Dia (13 November 2026), with real clicks and keys:**
- Start slideshow ▾ › Presenter view, and S in a full-screen slideshow, open Slides' presenter view in the floating window, all of it working: the timer running, the slide and the next one, the speaker notes, and our countdown button beside Reset. The window is named for the deck, so the countdown finds its time. Moving the slideshow on moves presenter view with it.
- Dia places it bottom left, at 665×726 rather than the 730×580 asked: the size is only a hint, and Chrome keeps the size the presenter last gave a picture-in-picture window.
- Opened during a full-screen slideshow, the browser leaves full screen and the slideshow goes on in the window, as with floating notes. ⌘+Shift+F brought full screen back, with presenter view floating on top of it.

**Checked in the test Chromium, headed on macOS (real full screen):**
- Closing presenter view in full screen leaves the slideshow going, still full screen.
- From the editor's Start slideshow ▾ › Presenter view, the slideshow starts out of full screen in all three ways: Slides' own window, floating presenter view, and just your notes. So just your notes does as Slides does.
- Floating notes opened during full screen stays in full screen in Chromium, while presenter view leaves it (Slides focuses its window). Dia leaves full screen for both.

**Still to check by hand, in the maintainer's own browser:**
- Once in Dia, closing presenter view during full screen ended the slideshow. Chromium doesn't do it, and it couldn't be tried again in Dia: the debugging tool was emulating its own viewport by then (the page was 2560 wide in a narrower window, and the tab painted blank), and full screen wouldn't come back, even from ⋮ › Enter full screen. To try: start a slideshow, press S, go back to full screen, then Close the floating window.
- Automatic with a second screen connected: presenter view opens in Slides' own window. (Only one screen here.)

**Left as Slides does:** Enter on presenter view's menu item from the keyboard, and a slideshow in a tab of its own (`/present`), open Slides' own window.

**Done when:**
- [x] The spike's result is recorded on this card: works, works with limits, or can't.
- [ ] If it works: presenter view floats over the full-screen slideshow on one screen, Settings offers floating or its own window, a test covers it, and CHANGELOG.md says it. Built, tested and in CHANGELOG.md, and checked in a real browser; what's left is the two checks by hand above.
- [x] Floating notes is kept or removed, as decided with the user: kept, with a choice of what floats.

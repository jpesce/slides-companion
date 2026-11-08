# Present and edit at the same time

**Problem:** in a workshop, a planning meeting or a class, the presenter often wants to change a slide in front of everyone: fix a typo someone spots, type in the group's answers, move a box. Today that means leaving the slideshow, editing, and starting it again, which breaks the flow and lands everyone on the editor's busy screen. Live edits (already shipped) brings edits into a running slideshow, but only when they're made somewhere else: another tab, another computer, a co-editor. With one screen, the presenter still has to leave the slideshow to edit.

**Evidence of demand:**
- The user built "Present & Edit mode" for Image Spotlight in February 2026, never released: branch `feat/present-and-edit-mode` on the old repo (commit `a39226c`, `editableSlideshow.js`). Its side-toolbar button with eyes that follow the mouse is where our companion button came from.
- Other extensions do this, with thousands of users (see BENCHMARK.md, "Live edits and signage"): Full Screen for Google Slides™ (10,000 users, the editor full screen "for showing an editable deck on calls"), Live Present Slides (2,000), GSlide Presenter (129, switches a tab between the editor and the slideshow).

**What the old branch did:** <kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd> or the side-toolbar button turned the editor into a slideshow look-alike, and back again, leaving everything as it was:
- It went full screen and collapsed the menus, the filmstrip and the speaker notes, by clicking Slides' own buttons.
- It hid the side panel, the title bar buttons and the scrollbar, and turned everything around the slide black.
- It showed the toolbar and the notes only when the pointer goes over them (after 2 seconds), in dark colours.

The code is ours (GPL-3.0), so it can be reused.

**Open question, for the user, before building:** this conflicts with "Never replace Slides' player". The old mode is the editor, not the slideshow, so animations, transitions, the clicker and presenter view don't work while it's on. Two ways to go:
1. **The old mode, as its own thing:** the editor dressed as a slideshow. Say plainly in its Settings page that it isn't the slideshow, and when to use which. It fits workshops where the deck is a whiteboard.
2. **A quick round-trip from the real slideshow:** one key leaves the slideshow for the editor on the same slide, and the same key goes back to the slideshow on that slide. Live edits already carries the changes. This keeps Slides' player, but the editor's busy screen shows while you edit.

Maybe both (option 2 by default, option 1 as a setting).

**Approach (whichever way is chosen):**
- Read the old branch's `editableSlideshow.js` and `styles.css` for what to hide and how to put it back.
- Its selectors are from February 2026: check each in a live deck.
- Before keeping ⌘/Ctrl+Shift+F, check it isn't one of Slides' own shortcuts: in Docs it turns on compact mode. List ours in Slides' Keyboard shortcuts dialog (shortcuts.js).
- Give it a page in Settings, with an illustration.
- Look native: anything shown on hover should mirror the slideshow's own bottom bar.

**Done when:**
- [ ] The user has picked option 1, 2 or both, and the choice is written here.
- [ ] Turning it on and off leaves the editor exactly as it was (menus, filmstrip, notes, full screen).
- [ ] Edits made during it are saved like any other edit, and co-editors see them.
- [ ] Its shortcut doesn't take one of Slides' own, and shows in Slides' Keyboard shortcuts dialog.
- [ ] It has its own Settings page, in all 33 languages, and its UI passes the native-look comparison.
- [ ] Tests cover entering, editing, and leaving, and a CHANGELOG line describes it from the user's side.
- [ ] BENCHMARK.md's "Live edits and signage" row for Slides Companion says what it now does.

# Present and edit at the same time

**Problem:** in a workshop, a planning meeting or a class, the presenter often wants to change a slide in front of everyone: fix a typo someone spots, type in the group's answers, move a box. Today that means leaving the slideshow, editing, and starting it again, which breaks the flow and lands everyone on the editor's busy screen. Live edits (already shipped) brings edits into a running slideshow, but only when they're made somewhere else: another tab, another computer, a co-editor. With one screen, the presenter still has to leave the slideshow to edit.

**Evidence of demand:**
- The user built "Present & Edit mode" for Image Spotlight in February 2026, never released: branch `feat/present-and-edit-mode` on the old repo (commit `a39226c`, `editableSlideshow.js`). Its side-toolbar button with eyes that follow the mouse is where our companion button came from.
- Other extensions do this, with thousands of users (see BENCHMARK.md, "Live edits and signage"): Full Screen for Google Slides™ (10,000 users, the editor full screen "for showing an editable deck on calls"), Live Present Slides (2,000), GSlide Presenter (129, switches a tab between the editor and the slideshow).

**What the old branch did (not the way we're going, see Decision):** <kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd> or the side-toolbar button turned the editor into a slideshow look-alike, and back again, leaving everything as it was:
- It went full screen and collapsed the menus, the filmstrip and the speaker notes, by clicking Slides' own buttons.
- It hid the side panel, the title bar buttons and the scrollbar, and turned everything around the slide black.
- It showed the toolbar and the notes only when the pointer goes over them (after 2 seconds), in dark colours.

The code is ours (GPL-3.0), so it can be reused.

**Decision (user and Claude, 8 Nov 2026): a quick round-trip from the real slideshow.** One key leaves the slideshow for the editor on the same slide, and the same key goes back to the slideshow on that slide; Live edits already carries the changes. Why not the old mode (the editor dressed as a slideshow):
- It breaks "Never replace Slides' player": animations, transitions, the clicker and presenter view don't work while it's on.
- It's fragile: it hides a dozen parts of the editor and clicks Slides' buttons, which any Slides update can break.
- Full Screen for Google Slides™ and Live Present Slides already do it; a round-trip that lands on the right slide is ours alone.

The audience sees the editor for the few seconds you edit, which is fine for a quick fix. Bring the old mode back as a setting only if users ask for a whiteboard-style mode; its code is on the old branch.

**Approach:**
- First, check what Slides already does: <kbd>Esc</kbd> leaves the slideshow, and <kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Enter</kbd> presents from the current slide. Write down what's missing (likely: staying full screen, the slide or animation step you were on, presenter view and its timer, the floating notes), and build only that.
- Pick the key with the user, and check it isn't one of Slides' own (⌘/Ctrl+Shift+F, the old mode's, turns on compact mode in Docs). List it in Slides' Keyboard shortcuts dialog (shortcuts.js).
- Offer it where Slides offers its own slideshow actions too, like the slideshow's bottom bar or ⋮ menu, looking native.
- Give it a page in Settings, with an illustration.

**Done when:**
- [ ] What Slides already does for the round-trip is written here, and ours adds only what's missing.
- [ ] One key goes from the slideshow to the editor on the same slide, and back to the slideshow on that slide.
- [ ] Leaving and coming back keeps what the presenter had: full screen, presenter view and its timer, the floating notes.
- [ ] Edits made during it are saved like any other edit, and co-editors see them.
- [ ] Its shortcut doesn't take one of Slides' own, and shows in Slides' Keyboard shortcuts dialog.
- [ ] It has its own Settings page, in all 33 languages, and its UI passes the native-look comparison.
- [ ] Tests cover entering, editing, and leaving, and a CHANGELOG line describes it from the user's side.
- [ ] BENCHMARK.md's "Live edits and signage" row for Slides Companion says what it now does.

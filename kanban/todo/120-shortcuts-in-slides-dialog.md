# List our shortcuts in Slides' Keyboard shortcuts dialog

**Problem:** Settings no longer lists keys (← and → in Spotlight, + and − to zoom, Esc to come back from a page): a feature's page says what it does and how to start it, and keys show where they're used, as tooltips and beside menu items. But some of ours have no button to show them on (+ and − to zoom, Shift+S for the floating notes outside the ⋮ menu), so nothing tells a presenter they exist.

**Evidence of demand:** the user's review of Settings' text (Nov 2026), which took the keys out of the pages; Slides lists every shortcut it has in Help › Keyboard shortcuts (⌘+/), which is where presenters look.

**Approach:** add a section of ours to Slides' Keyboard shortcuts dialog, made like its own sections (headings, rows, key caps) and in Slides' language, listing each of our keys: Space to spotlight an image, ← and → between its images, + and − to zoom during a slideshow, Shift+S for the floating notes, Esc to close a page opened over the slide. It should also be found by the dialog's own search.

**Done when:**
- [ ] Our keys show in Slides' Keyboard shortcuts dialog, in a section like Slides' own, in Slides' language.
- [ ] Its search finds them.
- [ ] Covered by a Playwright test, and compared side by side with Slides' own sections.

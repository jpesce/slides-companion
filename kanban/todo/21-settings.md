# Settings

**Problem:** some behaviours suit one person and annoy another (see CLAUDE.md: anything that could go either way becomes a setting). Users need one obvious place to change them.

**Approach:** clicking the companion opens a Settings dialog that mirrors Slides' own Tools › Preferences dialog (layout, checkboxes or radio buttons, buttons, wording style). Settings are saved with `chrome.storage.sync`, so they follow the user to other computers at no cost. Measure the Preferences dialog in a live deck and match it.

**First setting** (needed by card 22, the gallery):

> **Grouped images**
> ( ) **Show a group as one picture**: best when you grouped things that belong together, like a photo and its caption.
> ( ) **Show each image on its own**: best when you grouped photos just to keep a layout tidy.

Default: one picture, which is how Slides treats a group.

**Done when:**
- [ ] Clicking the companion opens Settings; it looks the same as Tools › Preferences side by side.
- [ ] Choices are saved and apply right away, without reloading.
- [ ] The companion's tooltip and accessible name say it opens Settings.
- [ ] Covered by a Playwright test.

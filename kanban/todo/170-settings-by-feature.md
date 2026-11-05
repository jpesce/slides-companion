# Settings by feature, in a list down the side

**Problem:** Settings is one long dialog with six sections (Spotlight, Links, Scrolling, Pen, Timer, Edits during a slideshow), and every new feature makes it longer. Nothing in it says what each feature does, so a presenter who opens it can't tell which features they have or what they're for.

**Demand:** the user asked for it. More features are on the board (zoom from the keyboard, scripts in presenter view), and each would add another section.

**Approach:** the layout of Google Meet's Settings dialog, which the user picked from a screenshot. Slides has no dialog that splits settings across many sections (its Tools › Preferences dialog has two tabs, and six wouldn't fit), so Meet's is the nearest Google component.
- "Settings" at the top left, a close ✕ at the top right.
- Down the left, one row per feature with its icon. The chosen row is a light blue pill rounded on the right, with blue text and icon.
- A thin divider, then the chosen feature's settings on the right, scrolling on their own if they're long.
- At the top of each feature's page, one or two plain lines on what the feature does and how to use it (for example, "Click an image during a slideshow to show it full screen").
- Each feature's settings keep today's wording. Their section heading goes, since the row names the feature.
- Measure Meet's dialog in a live call (sizes, spacing, type, colours, the pill, hover and focus states, the opening animation) and match it, in light and dark.
- OK and Cancel stay at the bottom right, as today, unlike Meet. Settings keep taking effect only on OK, and the "Show every site" checkbox keeps relying on Cancel to give Chrome's access back (all-sites.js).
- Checkboxes and radio buttons stay. Since changes wait for OK, they're the right controls: Google uses switches for changes that take effect the moment they're flipped, as in Meet.
- Settings opens only from the companion button, as today, on the first feature in the list.

**Open questions:**
- Icons for each feature: Slides' or Material Symbols, matching what each feature already uses in the interface (the Pen menu, the Timer).

**Done when:**
- [ ] Settings shows the list of features down the side, each with its icon, and the chosen feature's settings beside it.
- [ ] Each feature's page starts with a short, plain explanation of the feature.
- [ ] Every setting from today's dialog is there and still saves.
- [ ] Keyboard: Tab reaches the list and the settings; arrow keys move through the list; Esc closes.
- [ ] Screen readers hear the list as a list of choices and know which one is shown.
- [ ] It matches Meet's dialog side by side, in light and dark.
- [ ] The Settings tests cover moving between features and saving on each.

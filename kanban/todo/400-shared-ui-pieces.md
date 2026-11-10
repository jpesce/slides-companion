# One tooltip and one set of colours

**Problem:** there are three tooltip implementations: in `companion.js`, `countdown.js` (which hangs a `say` function on a DOM element) and `spotlight.js`. They can differ from each other, and from Slides' own tooltip, in delay, position and how they fade, and fixing one leaves the others behind. Other copies:
- `EXIT_MS = 75` and `icon()` are in both `spotlight.js` and `settings-dialog.js`.
- `spotlight.js` builds its hidden check frame the same way in two places.
- Colours are hard-coded and repeated across `settings-dialog.css`, `all-sites.css` and `refused.css` (`#444746`, `#c4c7c5` and others), so getting one of Slides' colours right means editing several files.

**Evidence of demand:** the code review of 9 November 2026, asked for by the maintainer.

**Approach:**
- One tooltip helper, matching Slides' own tooltip as CLAUDE.md asks: measure the real one in a live deck (delay, offset, fade, font) and match it exactly.
- Shared constants for the timings and `icon()`.
- CSS custom properties for Slides' palette, defined once and used by every stylesheet.
- Do it after card 390, so the helpers have a shared home.

**Done when:**
- [ ] Every tooltip comes from one helper, and matches Slides' tooltip side by side in every theme Slides offers.
- [ ] `EXIT_MS`, `icon()` and the check frame are each written once.
- [ ] The stylesheets take Slides' colours from shared custom properties.
- [ ] `npm test` passes.

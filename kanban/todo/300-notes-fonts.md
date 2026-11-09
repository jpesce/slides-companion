# Floating notes keep the notes' font

**Problem:** when speaker notes are in any font other than a plain system one (Google Sans, Roboto, Lato…), floating notes show them in a serif font like Times, which looks broken next to Slides' own presenter view.

**Evidence of demand:** found while recording the demo video (card 270): the demo deck's notes were in Google Sans and came out in Times in the floating notes window, while presenter view showed them right. Arial, Slides' default for notes, comes through fine, which is why the tests didn't catch it. The demo deck now uses Arial.

**Why:** `runStyle` in `extension/notes.js` copies each word's `font-family` from the editor's notes, where Slides names its web fonts with a `docs-` prefix (`"docs-Google Sans"`). The floating window doesn't know that name; it has the slideshow's stylesheet, which loads the deck's fonts under their own names ("Google Sans" faces were registered there, unloaded).

**Approach:** map `docs-Name` to `"Name"` (keeping the original as a fallback, then sans-serif), and check the fonts load in the window. Test with a notes font that isn't a system font.

**Done when:**
- [ ] Notes in Google Sans, Roboto and a decorative Google font show in that font in floating notes, as in presenter view.
- [ ] Arial notes are unchanged.
- [ ] A test covers it; `npm test` passes.
- [ ] CHANGELOG.md says it, from the presenter's side.

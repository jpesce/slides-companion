# Tests share their helpers and the test deck's map

**Problem:** the test files copy their helpers instead of sharing them. When the test deck changes, about a dozen files break at once:
- `startSlideshow` is defined in 7 files, and `zoom.spec.js` and `ink.spec.js` have identical copies.
- `slideNumber` and `stage` are copied the same way.
- The images slide's id (`g35a1872bb6d_1_0`) is written out in 11 files.
- The `LEFT`/`RIGHT` element ids appear sometimes with an `editor-` prefix and sometimes without.
- `language.spec.js` and `languages.spec.js` sit side by side with names that don't say how they differ.

**Evidence of demand:** the tooling review of 9 November 2026, asked for by the maintainer.

**Approach:**
- A map of the test deck in `tests/fixtures.js`: slides by what they're for (`SLIDES.images`) and element ids (`IDS.left`).
- `startSlideshow(context, { slide, ready })`, `slideNumber` and `stage` move there too, and every spec imports them.
- Rename the language specs for what they test (for example `language-pt-br.spec.js` and `language-every-locale.spec.js`), or merge them.

**Done when:**
- [ ] No test file defines its own `startSlideshow`, `slideNumber` or `stage`.
- [ ] The test deck's slide and element ids appear only in the deck map.
- [ ] The language specs' names say what each covers.
- [ ] `npm test` passes.

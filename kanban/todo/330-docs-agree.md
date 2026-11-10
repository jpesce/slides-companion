# Each feature is described the same, and right, everywhere

**Problem:** the features are described in four places: README.md, CHANGELOG.md's v1.0.0 section, STORE.md and BENCHMARK.md. Each was written on its own, and they've drifted, so a presenter reading the store listing or the README gets the wrong idea. Floating notes is the clearest case:
- README.md and BENCHMARK.md say the notes window can be made full screen. Its Full screen button puts the *slideshow* back in full screen (its tooltip: "Put the slideshow back in full screen").
- No doc says what makes it worth installing: it's a picture-in-picture window that floats over the full-screen slideshow, and meeting apps leave it out when you share only the slideshow's tab (`extension/notes.js`, first comment). STORE.md undersells it as "a window of their own".
- BENCHMARK.md lists HumDocs "(picture-in-picture)" as the alternative to ours, as if ours weren't one too.
- README.md and CHANGELOG.md leave out the slideshow's ⋮ menu, one of the three ways to open it.

Smaller ones:
- PRIVACY.md §5 says "There is no third-party service", yet §4 lists Google Fonts and Google's PDF viewer.
- CHANGELOG.md's intro credits `make release` with writing the tag message; `make tag` does.
- README.md says "100% free and open source" twice, and has stock lines: "Contributions are welcome! Feel free to…", "Yours to use, learn, share, and improve".
- README.md doesn't say it works only in Chrome and other Chromium browsers (only BENCHMARK.md does).
- STORE.md's opening is one sentence of about 70 words.

**Evidence of demand:** the docs review of 9 November 2026, asked for by the maintainer. The floating notes claim was checked against `notes.js` and `_locales/en/messages.json` (`notesFullScreenTip`).

**Approach:** the README's feature list is the reference. Check each feature's claims against the code and its Settings page, then bring the other three in line: same facts, at each place's length. Write floating notes once, along the lines of "your notes in a small window that floats over the full-screen slideshow, and stays out of view when you share only the slideshow's tab", and reuse it.

**Open question:** keep or drop the emoji on every README bullet, and the playful lines ("whose eyes follow your mouse", "speaks Slides' language")? Decide with the maintainer.

**Done when:**
- [ ] Floating notes is described right everywhere: it floats over the full-screen slideshow, stays out of a shared slideshow tab, and opens from View, the ⋮ menu or Shift+S. Nothing says the notes window itself goes full screen.
- [ ] README.md, CHANGELOG.md, STORE.md and BENCHMARK.md agree on every feature.
- [ ] PRIVACY.md §5 agrees with §4.
- [ ] CHANGELOG.md's intro names `make tag`.
- [ ] README.md says once, plainly, that it's free and open source, and says which browsers it works in.
- [ ] The open question is decided and applied.

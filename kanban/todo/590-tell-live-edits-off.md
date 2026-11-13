# The presenter knows when live edits turned itself off

**Problem:** when Slides changes one of the private parts live edits leans on, live edits turns itself off for that slideshow and says why in the console. The slideshow goes on as without the extension, so nothing breaks, but a presenter who counts on live edits (a deck left running on an office TV) doesn't know their edits will no longer show until they see an old slide.

**Evidence of demand:** the open question left by the work on noticing quiet breakage (November 2026). Nobody has asked yet; it matters only once Slides changes something.

**Approach:** to decide with the maintainer. A message during a slideshow would get in the way. Options:
- A line in Settings, on Live edits' page, saying it didn't work in the last slideshow and that an update of the extension should fix it.
- The toolbar button's menu shows it, the next time it's opened in the editor.
- Nothing more than the console: Slides changes rarely, and the tests' early warning (`data-slides-companion-live-edits`) tells us first, so a fix can ship before presenters notice.

**Decided with the maintainer (13 November 2026): a toast in the editor, and a local log the presenter can send us.**
- **The toast:** after a slideshow in which live edits turned itself off, the editor shows a toast like Slides' own snackbar (bottom left, dark, one line and an action, as when Slides says "Slide deleted · Undo"): live edits stopped working during that slideshow, and an update of the extension should bring it back. Never during the slideshow. Measure Slides' snackbar in a live deck and match it.
- **The log:** the extension is client-side only, so nothing is sent. What broke (which part of Slides was missing, from `missing` in live-edits-main.js), when, the extension's version, the browser and Slides' language go into `chrome.storage.local`, a few entries at most.
- **The least work for both sides:** the toast's action, "Report", opens our bug form on GitHub with it filled in, through the issue form's URL fields (`/issues/new?template=bug.yml&title=…&what=…&browser=…&version=…&language=…`, ids from `.github/ISSUE_TEMPLATE/bug.yml`). The presenter only reads it and clicks Submit; nothing leaves the computer unless they do. Keep the URL short (GitHub caps it around 8 KB).
- PRIVACY.md says what's kept locally and that it's sent only if the presenter submits the report.

**Done when:**
- [x] The maintainer has chosen one.
- [ ] After a slideshow where live edits turned off, the editor shows the toast once, looking like Slides' snackbar in light and dark. (Built, not compared yet: see below.)
- [x] Report opens the bug form filled in with what broke, the version, the browser and the language, and nothing is sent otherwise.
- [x] PRIVACY.md describes the local log; a test covers the toast and the report's address, and CHANGELOG.md says it.

**Built (13 November 2026):**
- The toast is Slides' own: a `docs-ui-toast` with its content, control bar and close bar, drawn by Slides' stylesheet (found in the editor's stylesheets: `#303030` from `--gm3-sys-color-inverse-surface`, bottom left at 24px, 16px 24px padding, the action in `--ws-sys-color-extended-yellow-tonal`). Only the close icon is ours (`live-edits.css`). So it takes Slides' colours in any theme, and the test checks Slides still draws it.
- It stays until the presenter closes it or clicks Report: it's rare, and it's the only way to report.
- The log is `liveEditsLog` in `chrome.storage.local`, the last five times. The report names Slides' language as Slides gives it (`<html lang>`), with its English name.

**Still open:** the side-by-side with a real Slides toast. None shows in the view-only test deck (tried copy, delete, undo, save and the screen reader shortcut), so the markup follows Slides' stylesheet, not a toast seen on screen. To check, in a deck you can edit: make Slides show a toast (deleting a slide or an image may offer "Undo"), and compare it with ours in the test's screenshot (`toast.png`, saved by "live edits turns itself off and says why"): its markup, size, spacing and the action's colour.

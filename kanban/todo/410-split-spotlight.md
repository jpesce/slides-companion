# Links over the slide get their own file

**Problem:** `extension/spotlight.js` is about 1,200 lines and holds three features: the image gallery, the right-click menu, and links opening over the slide. The links part covers the check for sites that refuse to show inside another page, Google's PDF viewer, the YouTube and Drive players, and the messages to `page.js`. Changing links means reading through Spotlight's code, and a review of either feature has to hold both in mind.

**Evidence of demand:** the code review of 9 November 2026, asked for by the maintainer.

**Approach:** move the links part, about 400 lines, into `links.js`. That's the name the README and `tests/links.spec.js` already use for the feature. Load it after `spotlight.js` in the same manifest groups. Whatever the two share goes into the shared module from card 390, so do that card first. Nothing a presenter sees changes.

**Done when:**
- [ ] Links over the slide live in `links.js`, and `spotlight.js` holds only Spotlight and its menu.
- [ ] Neither file reaches into the other's internals; what they share is in the shared module.
- [ ] `npm test` passes.

**Set aside (13 November 2026), for a decision on the cut:** the links part isn't a block that can be moved. A page is an item in Spotlight's gallery like a picture: `show()` asks `isPage(item)` to pick `pageFrame()` or `render()`, the bar has a site group (Back, Forward, the site, Open in new tab) next to the picture's steps, and the keys (`onKeydown`, `onPageKeydown`, `keepEscape`), the pointer (`wakePage`, `keepKeysFromSleepingPage`) and closing (`closeStage` telling the background a page closed) each have a page branch. The page code also reads and changes the gallery's state (`gallery.items[gallery.index]`, `gallery.stage`). So `links.js` needs Spotlight to offer a stage that takes items of another kind: for example `slidesCompanion.stage.open(items, start, label)`, with each kind giving its frame, its bar group, its keys and what to do on close, and `links.js` handling pages through that. Two ways to go:
- Spotlight's stage becomes a small shared module (`stage.js`) that both features use, and `spotlight.js` keeps the pictures and the right-click menu.
- Or `links.js` gets its own stage, sharing only the look (CSS) and the bar's pieces; simpler to read, but two stages to keep alike.

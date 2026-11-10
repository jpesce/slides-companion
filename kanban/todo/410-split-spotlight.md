# Links over the slide get their own file

**Problem:** `extension/spotlight.js` is about 1,200 lines and holds three features: the image gallery, the right-click menu, and links opening over the slide. The links part covers the check for sites that refuse to show inside another page, Google's PDF viewer, the YouTube and Drive players, and the messages to `page.js`. Changing links means reading through Spotlight's code, and a review of either feature has to hold both in mind.

**Evidence of demand:** the code review of 9 November 2026, asked for by the maintainer.

**Approach:** move the links part, about 400 lines, into `links.js`. That's the name the README and `tests/links.spec.js` already use for the feature. Load it after `spotlight.js` in the same manifest groups. Whatever the two share goes into the shared module from card 390, so do that card first. Nothing a presenter sees changes.

**Done when:**
- [ ] Links over the slide live in `links.js`, and `spotlight.js` holds only Spotlight and its menu.
- [ ] Neither file reaches into the other's internals; what they share is in the shared module.
- [ ] `npm test` passes.

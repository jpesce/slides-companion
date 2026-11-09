# Text links open over the slide too

**Problem:** during a slideshow, a link on a picture or a shape opens over the slide, but a link on words opens a new tab, as if the extension weren't there. Linked words are probably the most common kind of link in a deck, so most presenters who try Links won't see it work.

**Evidence of demand:** found while recording the demo video (card 270). On the demo deck's Links slide, clicking the underlined "Earthrise" opened en.wikipedia.org in a new tab, while clicking the card around it opened the page over the slide. The tests only try a linked photo (test deck, slide 4), which is why this went unnoticed.

**Why:** Slides draws a text link's clickable area as an invisible `<a opacity="0">` holding a see-through rectangle, over the words. `clickedPage` in `extension/spotlight.js` skips a link that isn't showing yet (an entrance animation), checking with `isShowing(link)`, and `checkVisibility({ opacityProperty: true })` is false for that `<a>` by its own opacity, so every text link is skipped.

**Approach:** check whether the link's parent is showing, not the link itself: `isShowing(link.parentElement)`. It still waits for an animation, since `checkVisibility` looks at every ancestor's opacity, but ignores the `<a>`'s own. Add a test with linked words: the test deck needs a slide with a text link (its owner has to add it), or the test can use the demo deck's Links slide (`s3_links`, "Earthrise").

**Done when:**
- [ ] Clicking linked words during a slideshow opens the page over the slide, and Esc comes back.
- [ ] Linked words that fly in still go to the next step until they're showing, as linked pictures do.
- [ ] A test covers a text link; `npm test` passes.
- [ ] CHANGELOG.md says it, from the presenter's side.

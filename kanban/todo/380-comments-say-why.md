# Comments give their reason, not a card number

**Problem:** 38 comments in `extension/`, `scripts/` and `tests/` point to kanban cards, like "(card 56)", "Card 80: the release build…" or "Card 200 records where the style comes from". Finished cards are deleted, so for anyone reading the code the reason is gone, short of digging through git history.

Some comments are also hard to follow because they avoid technical names. For example, from `spotlight.js`: "Above the site, every page is then Slides', as above the page's own frame, so the site decides alike." The plain-words rule is for what presenters read. Code comments are for engineers, and should name the APIs: Keyboard Lock, declarativeNetRequest, `frame-ancestors`.

**Evidence of demand:** the code and tooling reviews of 9 November 2026, asked for by the maintainer. `grep -rniE "\bcards? [0-9]+" extension scripts tests` finds 38.

**Approach:** for each one, find the card in git history (`git log --diff-filter=D -- kanban/`), then write its reason into the comment in a sentence, or drop the reference if the comment already says why. Rewrite the hard-to-follow comments with the APIs' names. Add both rules to CONTRIBUTING.md (card 350): comments don't cite cards, and they use technical names.

**Done when:**
- [ ] The grep above finds nothing in `extension/`, `scripts/` or `tests/`.
- [ ] The comments the reviews flagged as hard to follow name what they're about.
- [ ] CONTRIBUTING.md states both rules.

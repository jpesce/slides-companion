# The repo's links lead somewhere

**Problem:** the README, PRIVACY.md, STORE.md and BENCHMARK.md link to `github.com/jpesce/slides-companion`, which doesn't exist: the repo is still `jpesce/image-spotlight-for-google-slides`. Releases, issues, pull requests and the privacy policy all lead to a 404. The privacy policy link is the one in STORE.md that the store's reviewers open, so the listing can't be submitted as it is. The repo's description on GitHub still reads "Zoom in on images in Google Slides by selecting and pressing space. Fast, easy magnification for presentations.", and main is 77 commits ahead of GitHub.

**Evidence of demand:** found in the repo review of 9 November 2026, which the maintainer asked for ("is our repo world-level?"). `gh repo view jpesce/slides-companion` answers that there's no such repository.

**Approach:** the maintainer renames the repo on GitHub to `slides-companion` (Settings › Repository name); it's their account, so they do it, or say so. GitHub redirects the old addresses, so links to the old name, like the old README's images and existing installs' links, keep working. Then:
- Update the description and topics from the presenter's side, with the same words as the README's first line.
- Point the local remote at the new name (`git remote set-url origin …`) and push main.
- Check every link signed out, in a private window. The README's demo video (card 270) needs this check too: a signed-out request for its link failed before a pushed README used it.

**Done when:**
- [ ] `github.com/jpesce/slides-companion` is the repo, and its description says what it does for presenters.
- [ ] Every GitHub link in README.md, PRIVACY.md, STORE.md and BENCHMARK.md opens, signed out.
- [ ] The README's demo video plays, signed out.
- [ ] The local remote uses the new name, and main is pushed.

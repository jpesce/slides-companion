# The companion in the store and on GitHub

**Problem:** the extension's icon now shows the companion, but the store listing's promo tile and GitHub's link preview (the picture shown when the repo is shared) don't exist yet, so a shared link or a store search shows a generic picture or nothing.

**Evidence of demand:** card 240 listed the store's promo tiles among the places the mark shows up, and noted the README and the promo image as places the whole companion would suit.

**Approach:** draw them from `scripts/build-brand.mjs`, so they stay the same character: the store's small promo tile (440×280) and GitHub's social preview (1280×640), likely the companion on Slides yellow with the name. Check the store's current image rules first (developer.chrome.com/docs/webstore/images). Both are uploaded by hand (the store dashboard; the repo's Settings › General › Social preview), so say where in STORE.md and brand/README.md.


**The 3D companion is a candidate:** spiky fur, rendered in Blender, on Slides yellow and as a cut-out with a transparent background (lit neutral, or lit by the yellow). The maintainer hasn't decided where it shows. Today its script and renders are only on the maintainer's computer (`build/brand/3d/`, gitignored): if it's used, move the script to `brand/3d/` and commit the stills it uses, so it can be made again.

**Done when:**
- [ ] Both pictures are made by `npm run brand`, into `brand/`.
- [ ] The maintainer has said yes to them.
- [ ] STORE.md and brand/README.md say where each is uploaded.

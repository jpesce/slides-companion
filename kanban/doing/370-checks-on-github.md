# GitHub checks every push

**Problem:** nothing runs when code is pushed or a pull request opens. A broken build, an out-of-date `messages.js` or a lint error is only found when the maintainer runs things on their own computer. The full tests can't run on GitHub: they need the live test deck and take about 45 minutes. A contributor's pull request gets no check at all.

**Evidence of demand:** the tooling review of 9 November 2026, asked for by the maintainer.

**Approach:**
- Split out the tests that don't need Google Slides as their own Playwright project, or tag them `@offline`, behind `npm run test:offline`. That covers `messages.spec.js`, the build checks in `build.spec.js`, and `release.mjs`'s tests (card 340). They take seconds.
- A GitHub Actions workflow on push and pull request runs `npm ci`, `npm run lint` (card 360), `npm run build` (which already refuses a stale `messages.js`) and `npm run test:offline`.
- Pin the Node version from `.nvmrc` (card 350).

**Done when:**
- [ ] `npm run test:offline` runs the tests that need no deck, in under a minute.
- [ ] The workflow runs on every push and pull request, and fails on a lint error, a broken build or a failing offline test.
- [ ] CONTRIBUTING.md says what GitHub checks, and that the full tests still run locally.

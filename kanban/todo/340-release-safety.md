# A release is tested, and asked for, before it goes out

**Problem:** `make all` builds the package, tags it, pushes the tag and publishes the GitHub release, without running the tests on the built package (`make test-build`) and without asking before the push. A broken build can go public, and a pushed tag is awkward to take back. Smaller gaps in the same steps:
- `bump` in `scripts/release.mjs` replaces `"version": "x"` in the manifest and reports success even when that text wasn't found, so the version may not change.
- `notes()`, `bumped()` and `section()` in `release.mjs` decide what a release says and what version it gets, and no test covers them.
- The third line of `.githubreleasepreamble` has no `>`, so the store sentence runs into the line before it inside the note.

**Evidence of demand:** the tooling review of 9 November 2026, asked for by the maintainer. `makefile`: `all: ensure-main ensure-clean ensure-pushed ensure-notes build tag push-tag release`.

**Approach:**
- A full test run takes about 45 minutes, so `make all` shouldn't start one. Instead, `npm run test:build` writes a marker for the version it passed on (`build/.tested-<version>`), and `make all` refuses to go on without the current version's marker.
- Before `push-tag`, ask "Push v1.0.0 and publish the release? [y/N]", the way `bump` already asks.
- In `bump`, stop with an error if the manifest didn't change.
- Add offline tests for `notes()`, `bumped()` and `section()`. They can run in the offline set (card 370).
- Add the missing `>` line to the preamble.

**Done when:**
- [ ] `make all` stops if the built package hasn't passed the tests at this version.
- [ ] `make all` asks before pushing the tag.
- [ ] `bump` fails loudly when it can't change the version.
- [ ] Tests cover `notes()`, `bumped()` and `section()`; `npm test` passes.
- [ ] The release note's preamble shows as one note, with its two sentences apart.

# Lint and format the code

**Problem:** the repo has no linter, formatter or `.editorconfig`. The style is mostly consistent (2 spaces, single quotes, semicolons), but lines run up to 405 characters (`settings-dialog.js`, `countdown.js`), `companion.js` is formatted differently from the rest, and there are stray double blank lines. Small mistakes, like an unused variable or a typo in a `chrome.*` call, are only caught by a test run that takes about 45 minutes.

**Evidence of demand:** the code and tooling reviews of 9 November 2026, asked for by the maintainer.

**Approach:**
- ESLint with a flat config: the recommended rules, browser and extension globals for `extension/`, Node for `scripts/`, and `eslint-plugin-playwright` for `tests/`. That plugin also flags `waitForTimeout`, which keeps card 430's work from coming back.
- Prettier, plus an `.editorconfig` with the same basics.
- `npm run lint` runs both checks, and `npm test` runs lint first.
- Reformat in a commit of its own, with no other changes, and list it in `.git-blame-ignore-revs` so `git blame` skips it.
- Do this before the refactoring cards (390 to 420), so they don't fight the formatter.
- Later, maybe: `// @ts-check` with JSDoc for `chrome.*` typos.

**Open question:** the line length. Prettier will rewrap long template strings and comments. 120 keeps most of today's lines whole; decide with the maintainer.

**Done when:**
- [ ] `npm run lint` passes on the whole repo, and `npm test` runs it first.
- [ ] The reformatting is its own commit, listed in `.git-blame-ignore-revs`.
- [ ] CONTRIBUTING.md (card 350) mentions `npm run lint`.

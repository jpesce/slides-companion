# A contributor's guide written for people

**Problem:** the README sends contributors to CLAUDE.md "for the project's principles". Half of that file is instructions for an AI agent ("To see the board, list the filenames. Open only the card you're working on."), and it points to things only on the maintainer's computer (`benchmark/`, "Dia/Chrome"). Things a contributor needs and can't find anywhere:
- Which Node version. The scripts need 20.11 or later (`import.meta.dirname`, recursive `readdirSync`), and there's no `engines` field or `.nvmrc`.
- That the tests run against a live, public Google Slides deck (`tests/fixtures.js`), need the network, take about 45 minutes, and that only the deck's owner can change it.
- How to add a language: `_locales/<code>/messages.json`, then `npm run messages`.
- That `npm run demo` needs ffmpeg, and what `npm run illustrations` is for.
- Which file runs where: the manifest has five groups of content scripts, some in the page's own world.
- How to report a security problem privately. This matters here: "Allow all sites" lifts sites' framing protections (card 440).

Smaller things: CLAUDE.md says cards are named `NN-slug.md`, but they have three digits. `.DS_Store` isn't in `.gitignore` (one sits in `kanban/` on the maintainer's computer). Commit subjects run up to 592 characters, which `git log --oneline` can't show.

**Evidence of demand:** the docs and tooling reviews of 9 November 2026, asked for by the maintainer.

**Approach:**
- Write CONTRIBUTING.md with:
  - the principles: client-side only, never replace Slides' player, look native, settings written from the user's side;
  - setup and commands;
  - the tests and their deck;
  - languages;
  - a map of `extension/`;
  - the kanban board;
  - commit style: a short subject naming the card, with detail in the body.
- CLAUDE.md keeps only what's for the agent, and points to CONTRIBUTING.md for the rest. The maintainer approves the new CLAUDE.md, since it steers every session.
- SECURITY.md: report through GitHub's private vulnerability reporting (turn it on in the repo's settings).
- Short issue templates (bug, idea) and a pull request template in `.github/`.
- Add `"engines": { "node": ">=20.11" }` and `.nvmrc`, and add `.DS_Store` to `.gitignore`.
- The README links CONTRIBUTING.md instead of CLAUDE.md.

**Done when:**
- [ ] CONTRIBUTING.md covers everything listed above, and someone new could get from a fresh clone to a passing test with it alone.
- [ ] CLAUDE.md is agent-only, points to CONTRIBUTING.md, and the maintainer has approved it.
- [ ] SECURITY.md, the issue templates and the pull request template exist; private vulnerability reporting is on.
- [ ] `package.json` has `engines`, `.nvmrc` exists, and `.DS_Store` is ignored.
- [ ] The README points contributors to CONTRIBUTING.md.

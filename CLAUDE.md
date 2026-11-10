# Slides Companion

A free Chrome extension (Manifest V3) that improves presenting in Google Slides. The project's principles, commands, tests, code style and the board's rules are in CONTRIBUTING.md, and they bind you as they bind anyone:

@CONTRIBUTING.md

What follows is only for you.

- Competitor code for reference is in `benchmark/` (index in `benchmark/README.md`), on this computer only: it's gitignored, since most of it is unlicensed. When a related project turns up, add it to BENCHMARK.md.
- `npm run dev` reloads the extension in the maintainer's own browser (Dia or Chrome), not in the test Chromium.
- Measure UI in a live deck with computed styles, and compare it side by side before calling it done, as CONTRIBUTING.md asks: don't judge a look from code alone.

On the board:

1. To see the board, list the filenames. Open only the card you're working on.
2. Unless told otherwise, start with the lowest-numbered card in `todo/`. Move it with `git mv` to `doing/` when you start.
3. When an idea or follow-up comes up in conversation, add a card to `todo/` rather than leaving it in chat. Give it a number after the existing cards unless the user sets a priority.

# Slides Companion

A free Chrome extension (Manifest V3) that improves presenting in Google Slides.

- **Client-side only.** No servers, no accounts, no costs. Anything that needs a backend (audience polls, phone remote) is out of scope.
- **Never replace Slides' player.** Sit on top of native Present mode so video, animations and clickers keep working.
- **Look 100% native.** Everything we add or change in the interface must look like Google Slides built it. Don't invent design: for every UI decision, find the Slides component that already does something similar (a toolbar button, menu, dialog, side panel, tooltip, toggle) and match it exactly: placement, size, spacing, typography, colours, icons, hover/focus/active states, animations and wording. Measure the real element in a live deck (computed styles) rather than guessing, and before calling UI done, compare it side by side with the component it mirrors, in every theme Slides offers.
- **When a behaviour could reasonably go either way, make it a setting.** Ship the default most people would expect, and offer the other choice in the extension's Settings. Write every setting from the user's side: what they'll notice, and when they'd want each option, in plain, warm words with no technical terms. A user should understand it at a glance without knowing how the extension works.
- It's a rewrite of our Image Spotlight for Google Slides. Competitor code for reference is in `benchmark/` (index in `benchmark/README.md`), on this computer only: it's gitignored, since most of it is unlicensed. `BENCHMARK.md` is the public comparison, with a link to every related project: add to it when one turns up. Only copy code whose license allows it, and credit it in `THIRD-PARTY-NOTICES.txt`.

## Commands

- `npm test`: Playwright tests in Chromium against the shared test deck (`tests/fixtures.js`).
- `npm run dev`: watches `extension/` and auto-reloads the unpacked extension and open Slides tabs (in Dia/Chrome, not the test Chromium).
- `npm run chromium`: opens a Chromium window with the extension loaded.
- `npm run build`: the release build, in `build/`, without the dev auto-reload. `npm run test:build` runs the tests on it.
- `make help`: the release steps (bump, tag, GitHub release). Each version's notes are its section of `CHANGELOG.md`; add a line there, from the user's side, for every change users will notice.

## Kanban

The board is `kanban/`: one markdown file per deliverable.

- `kanban/todo/`: ready or upcoming work, named `NNN-slug.md`. Lower number means higher priority; numbers step by 10 so a card can be slotted between two others.
- `kanban/doing/`: what's in progress. Keep it to one card.
- There is no done folder. Finished cards are deleted; git history is the record (`git log --diff-filter=D --stat -- kanban/`).

Rules:

1. To see the board, list the filenames. Open only the card you're working on.
2. Unless told otherwise, start with the lowest-numbered card in `todo/`. Move it with `git mv` to `doing/` when you start.
3. Keep the card current while working: tick its "Done when" checklist, and record decisions, open questions or a changed approach.
4. A card is finished when every "Done when" item is met, `npm test` passes, and any UI it adds passes the native-look comparison above. Delete the card in the same commit as the work, and name the card in the commit message.
5. If a card is too big for one commit, split it into new cards.
6. When an idea or follow-up comes up in conversation, add a card to `todo/` rather than leaving it in chat. Give it a number after the existing cards unless the user sets a priority.
7. Every card states the user's problem, the evidence of demand, the approach and a "Done when" checklist. See the existing cards for the format.

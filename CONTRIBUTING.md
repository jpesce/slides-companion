# Contributing to Slides Companion

Thanks for helping. Found a bug, or missing something while presenting? [Open an issue](https://github.com/jpesce/slides-companion-for-google-slides/issues): the forms there ask for what helps most. For a bigger change, open an issue first, so we can agree on the approach before you spend time on code.

## What the extension stands for

- **Client-side only.** No servers, no accounts, no costs. Anything that needs a backend (audience polls, a phone remote) is out of scope.
- **Never replace Slides' player.** It sits on top of Slides' own Present mode, so videos, animations and clickers keep working.
- **Look 100% native.** Everything we add or change must look like Google Slides built it. Don't invent design: for every UI decision, find the Slides component that already does something similar (a toolbar button, menu, dialog, side panel, tooltip, toggle) and match it exactly: placement, size, spacing, typography, colours, icons, hover, focus and active states, animations and wording. Measure the real element in a live deck (computed styles) rather than guessing. Before calling UI done, compare it side by side with the component it mirrors, in every theme Slides offers.
- **When a behaviour could reasonably go either way, make it a setting.** Ship the default most people would expect, and offer the other choice in the extension's Settings. Write every setting from the presenter's side: what they'll notice, and when they'd want each option, in plain, warm words with no technical terms.
- **Credit what we use.** It's a rewrite of Image Spotlight for Google Slides. [BENCHMARK.md](BENCHMARK.md) compares it with every related project we know of: add to it when one turns up. Only copy code whose license allows it, and credit it in [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt).

## Setup

You need Node 20.11 or later (`.nvmrc` asks for the current LTS) and Chrome, or a browser built on it.

```bash
npm install
npx playwright install chromium
```

To try your changes in your own browser, signed in:

1. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and pick the `extension/` folder.
2. Run `npm run dev` and leave it running.

While `npm run dev` runs, saving any file in `extension/` reloads the extension and every open Slides tab within about a second. A change to `extension/_locales/` also rewrites `extension/messages.js`.

## Where things are

```
extension/   the extension itself (load this folder in Chrome)
tests/       Playwright tests, run in a separate Chromium
scripts/     build, release, dev and demo helpers
brand/       the companion, our mascot: the icon and every picture of him
kanban/      the work board, one card per deliverable
```

In `extension/`, `manifest.json` loads each script where it's needed:

| Where | Scripts |
|---|---|
| The editor, in the page's own world, from the start | `live-edits-main.js` |
| The editor | `settings.js`, `messages.js`, `i18n.js`, `content.js`, `slides-dom.js` (what we know about Slides' page) and `menus.js` (shared by every feature), then `illustrations.js`, `settings-dialog.js`, `companion-drawing.js` and `companion.js` (the toolbar button), `spotlight.js`, `scroll.js`, `live-edits.js`, `notes.js`, `shortcuts.js` |
| The slideshow, in every frame, in the page's own world | `live-edits-frame.js` |
| The slideshow, in every frame | the shared scripts, then `zoom.js`, `ink.js`, `spotlight.js`, `notes.js`, `shortcuts.js` |
| Presenter view (a blank page Slides opens) | `settings.js`, `messages.js`, `i18n.js`, `countdown.js` |
| The service worker | `background.js` (and `dev-reload.js`, which the release build leaves out) |
| Every site, once the presenter allows all sites | `page.js`, registered by `background.js` |
| Frames of our own | `all-sites.html` (in Settings) and `refused.html` (over the slide) |

Scripts share what they need through `globalThis.slidesCompanion`. What the extension reads from Slides' page (its selectors, the slide shown, the pen) is in `slides-dom.js`: when Slides changes, start there. Each file's first comment says what it does.

## Tests

```bash
npm test
```

Each run lints first, then launches Playwright's Chromium with `extension/` loaded and checks it against a [public test deck](https://docs.google.com/presentation/d/1XouicC310558IOk_VJ7uu55kxBO7TY-19suR998ONOo/edit). The tests only view it, so a copy works too: make one, share it as "Anyone with the link can view", and set `TEST_DECK_URL` to its address. Only the deck's owner can change the shared one, so if a test needs a new slide, say so in your pull request.

A full run takes about 45 minutes, four tests at a time. The tests need the network, and on a very busy computer some of them time out: run the failed ones again with `npx playwright test --last-failed --workers=1` before looking for a bug.

- `npm run test:offline`: only the tests that need no Google Slides, in a few seconds. GitHub runs these, with the lint and the release build, on every push and pull request.
- `npm run test:headed`: watch the tests run.
- `npm run chromium`: open that Chromium with the extension, to click around.
- `npm run test:build`: every test on the release build.

Regular Chrome stopped accepting `--load-extension` in version 137, which is why the tests use Chromium. Auto-reload doesn't work there, and the tests don't need it, since each run starts fresh.

## Code style

`npm run lint` runs ESLint, and Prettier's check of the formatting (100 characters a line). `npm run format` fixes what it can by itself. To skip the formatting commit in `git blame`, run `git config blame.ignoreRevsFile .git-blame-ignore-revs` once.

Comments say why, not what. They give their reason in full, never a card number: finished cards are deleted, and the reason with them. Comments are for engineers, so they name the APIs and headers they're about. The plain-words rule is for what presenters read.

## Languages

The extension speaks Slides' language, not the browser's: `i18n.js` reads it from Slides' page. Our words are in `extension/_locales/<code>/messages.json`, one folder per language. To add a language:

1. Copy `_locales/en/` to the new language's code, as Chrome names it, and translate each `message`. Keep each `$NAME$` placeholder.
2. Run `npm run messages` (`npm run dev` does it for you), which writes `extension/messages.js`.
3. If Slides names the language differently from Chrome (Hebrew is `iw` in Slides), add it to `ALSO` in `extension/i18n.js` and to `SLIDES_CODE` in `tests/languages.spec.js`.

The tests check that every language has every message, with the same placeholders, that the store name and summary fit Chrome's limits, and that the words fit in Slides set to that language.

## Pictures and the demo video

- `npm run brand` draws the companion, our mascot, into `brand/`, Chrome's icons in `extension/icons/` and the toolbar button's picture in `extension/companion-drawing.js`. [brand/README.md](brand/README.md) says which file goes where.
- `npm run illustrations` draws the picture at the top of each feature's page in Settings, into `extension/illustrations.js`.
- The demo video is animated in After Effects from pictures our scripts capture on its own deck (set `DEMO_DECK_URL` for another), so it can catch up when the extension changes:
  1. `npm run demo` captures what the edit animates, into `build/demo/stills/`: each slide as vector art, each state of the interface as a screenshot at 4×, and the companion peeking and blinking for the first and last screens. To capture one feature again, run `node scripts/demo/stills.mjs ui live` (or `spotlight`, `links`, `timer`, `notes`).
  2. In the After Effects project, `build/demo/ae/slides-companion-demo.aep`, reload the changed stills and render the comp "Slides Companion demo" to `build/demo/ae/slides-companion-demo-video.mp4`. `build/` isn't in git, so the maintainer keeps the project.
  3. `npm run demo:finish` makes the sound, puts it on the render, and writes the store's video and the README's lighter copy into `build/demo/`. It needs [ffmpeg](https://ffmpeg.org). [STORE.md](STORE.md) says where each goes.

  `npm run demo:record` records the features in action, to check that the video moves as the extension does. It needs a quiet computer: a busy one stretches the timing.

## The board

The work is planned in `kanban/`, one markdown file per deliverable:

- `kanban/todo/`: ready or upcoming work, named `NNN-slug.md`. A lower number means a higher priority; numbers step by 10, so a card can be slotted between two others.
- `kanban/doing/`: what's in progress, one card at a time.
- There's no done folder. Finished cards are deleted, and git history keeps them (`git log --diff-filter=D --stat -- kanban/`).

Every card states the presenter's problem, the evidence that people need it, the approach, and a "Done when" checklist. While you work, tick the checklist and write down decisions, open questions or a change of approach on the card. A card is finished when every "Done when" item is met, `npm test` passes, and any UI it adds passes the side-by-side comparison above. If a card is too big for one commit, split it into new cards.

## Commits and pull requests

- One commit per card, deleting the card in the same commit. Start the subject with the card's number ("Card 330: …"), keep it short, and put the detail in the body.
- For every change presenters will notice, add a line to [CHANGELOG.md](CHANGELOG.md), from their side.
- For UI, include screenshots of yours next to the Slides component it mirrors, in light and dark.

## Releasing

`npm run build` (or `make build`) writes the release build to `build/slides-companion/` and zips it as `build/slides-companion-v<version>.zip`, without the dev auto-reload and the `alarms` permission only it uses.

1. `make bump` raises the version in `extension/manifest.json` and starts its section in CHANGELOG.md.
2. Write what changed there, from the presenter's side, and replace "Unreleased" with the date.
3. Commit and push to `main`.
4. `make test-build` runs every test on the release build, in about 45 minutes, and marks the commit as tested if they pass.
5. `make all` checks that this commit passed, builds, then asks before it tags the version with its changelog section, pushes the tag, and creates the GitHub release with the zip attached.
6. Upload the zip at the [Chrome Web Store dashboard](https://chrome.google.com/webstore/devconsole), with the listing text from [STORE.md](STORE.md) if it changed.

`make help` lists every step, to run them one at a time.

## Security

Found a way the extension could harm a presenter or a site? Please don't open an issue: see [SECURITY.md](SECURITY.md).

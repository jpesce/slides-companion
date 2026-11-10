# Tests wait for what they need, not for a set time

**Problem:** the tests call `waitForTimeout` 54 times. Some waits check that something *doesn't* happen, and are slow: `live-edits.spec.js` waits 7 seconds, four times. Others guess how long something takes, like `notes.spec.js` waiting 1600 ms for full screen to settle, or the waits in `links.spec.js`. On a busy computer a guess comes up short and the test fails though nothing is wrong. That's the likely cause of card 230's failing test, and part of why a full run took about 45 minutes. The suite sets no retries, so failures aren't hidden, which is right.

**Evidence of demand:** the tooling review of 9 November 2026, asked for by the maintainer. Card 230's test fails in full runs and passes alone.

**Approach:**
- Replace each guess with a wait on the state itself: `document.fullscreenElement`, an element appearing, an attribute, or an event.
- For "nothing happens" checks, have the extension mark when it has looked and decided, for example a `data-` attribute on its own element, so the test can wait for that mark and then check, instead of sleeping.
- Do it with card 230 or right after it.
- Once card 360 is in, `eslint-plugin-playwright` flags any new `waitForTimeout`.
- Time a full run before and after.

**Done when:**
- [ ] No `waitForTimeout` guesses how long something takes.
- [ ] Each wait that's left checks that nothing happens, and says so in a comment.
- [ ] Two full `npm test` runs in a row pass, and the card records the run time before and after.

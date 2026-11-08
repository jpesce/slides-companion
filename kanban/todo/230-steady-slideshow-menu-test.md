# Keep the slideshow ⋮ menu test steady on a busy machine

**Problem:** `tests/notes.spec.js` "the arrow keys reach the floating notes and Enter full screen in the slideshow's ⋮ menu" fails during full runs: the arrow key never highlights our "Open floating notes" item. A failing test that isn't a bug makes real failures easy to wave off.

**Evidence:** it failed in all three full runs while card 80 was being finished (four, two and three workers, on extension/ and on the release build), and passed every time it ran alone (5 out of 5). It may be the slideshow's bar hiding while the machine is slow: once ⋮ loses focus, the keys go to the slideshow (menus.js `hasKeyboard`).

**Approach:** read its trace from a failing full run to find what the menu and focus were doing when the key went in. If it's the bar hiding, keep the pointer over the bar in the test, as a presenter's would be. If our code drops a key Slides would take, fix the code instead.

**Done when:**
- [ ] The cause is known and written here.
- [ ] The test passes in three full runs in a row.

# Private countdown timer

**Problem:** "I don't know I'm running over." Presenter view only counts elapsed time; there's no countdown and no warning before time is up.

**Demand:** Slides Timer has 100k users at 3.5 stars. Most timers draw on the slide where the audience sees them; a private countdown with warnings barely exists.

**Approach:** a countdown the presenter sees and the audience doesn't (in presenter view or the floating notes window from card 10), with a warning before time runs out. Settings in browser storage.

**Done when:**
- [ ] The presenter can set a duration and start, pause and reset the countdown.
- [ ] It warns (colour change) at a set time before the end and shows overrun.
- [ ] The audience never sees it.
- [ ] The last duration is remembered per deck.
- [ ] Covered by a Playwright test.

**References:** `benchmark/3-timer/` (takoratta's slide-timer is MIT).

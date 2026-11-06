# A bar of the time left, under the countdown

**Problem:** the countdown in presenter view (card 30) says how much time is left in digits. Mid-sentence, a presenter has to read and work out "00:07:40 of 20 minutes" to know how far through they are. A bar that empties as the time goes shows it at a glance.

**Demand:**
- Slides Timer (`benchmark/3-timer/store/slides-timer`, 100k users) offers its timers as "progress bars" (`|bar`, filling or emptying), though on the slide, where the audience sees it.
- hurry (`benchmark/3-timer/github/laffra__hurry`) is built around one: a bar of the time used, beside the time left.
- Not asked for by a user here yet.

**Approach:**
- A thin bar along the bottom edge of presenter view's timer panel, only while counting down. It empties from the countdown's full time to zero, in the countdown's colours: as usual, orange near the end, red once time is up (then it stays empty).
- Mirror Google's own linear progress indicator (as in Drive's uploads), measured in a live page: height, track and fill colours, rounded ends. Compare it with Slides' presenter view in light and in high-contrast mode.
- Pause, Reset and "add a minute" already go through Slides' own timer, so the bar follows them by reading the same time the countdown shows.
- Decorative for screen readers: the time already says it.

**Open question:** should the bar be a setting (on by default) on the Timer page? Some presenters might find something moving in the corner distracting.

**Done when:**
- [ ] While counting down, a bar under the time shows the share of time left, and follows Pause, Reset and adding a minute.
- [ ] It turns orange and red with the countdown.
- [ ] It isn't there when counting up.
- [ ] It passes the native-look comparison with Google's linear progress indicator.
- [ ] Covered by a Playwright test.

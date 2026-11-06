# A bar of the time left, under the countdown

**Problem:** the countdown in presenter view (card 30) says how much time is left in digits. Mid-sentence, a presenter has to read and work out "00:07:40 of 20 minutes" to know how far through they are. A bar that empties as the time goes shows it at a glance.

**Demand:**
- Slides Timer (`benchmark/3-timer/store/slides-timer`, 100k users) offers its timers as "progress bars" (`|bar`, filling or emptying), though on the slide, where the audience sees it.
- hurry (`benchmark/3-timer/github/laffra__hurry`) is built around one: a bar of the time used, beside the time left.
- Not asked for by a user here yet.

**Approach:**
- A thin bar under the time in presenter view's timer panel, only while counting down, in the countdown's colours: as usual, orange near the end, red once time is up.
- Mirror the Google component closest to it, measured in a live page (see Decisions).
- Pause, Reset and "add a minute" already go through Slides' own timer, so the bar follows them by reading the same time the countdown shows.
- Decorative for screen readers: the time already says it.

**Decisions:**
- Slides has a component for exactly this: its recording studio shows its time limit with a bar (`.ttr-studio-time-indicator-bar-v2`, whose styles are loaded in presenter view). The bar takes its look: 8px tall with 8px corners, a #dde3ea track (surface-container-highest) and a #747775 fill (outline), checked equal in computed styles side by side in presenter view. Google's GM3 linear progress (4px, blue) is the editor's, for loading, not for time.
- It fills up as the time goes, as Slides' studio bar does, rather than emptying as the card first said: past the end, a full red bar says "over", where an empty one would show no red at all. Orange near the end is the countdown's own (#e37400), red past it Slides' error red.
- Where: across the timer panel under the time, from the time's left edge to the slide picker's right (18px in at both sides, so it follows the divider when it's dragged). The panel grows by 16px while it shows, and the slide picker and slides below move down with it (Slides places them at a fixed 56px). The row of the time and its buttons stays exactly where Slides puts it (13px from the top: at first Slides re-centred it in the taller panel, which left 21px above it and 3px between it and the bar, the user spotted), 8px above the bar, which has the row's 13px below it.
- It stays while a new time is typed, and goes when counting up.
- A setting, on by default, on the Timer page ("Show a bar under the time that fills up as it goes"), as something moving in the corner could distract some presenters.
- The Timer illustration in Settings shows the bar too, filling and turning orange with the time.

**Edge cases (checked after the first build):**
- Fixed: while a new player takes over presenter view after an edit (card 50), Slides writes presenter view afresh. The countdown came back empty for that moment (no time at all, a bug since cards 30 and 50, whose test only counted up), the bar went, and the slide picker jumped up and back. What presenter view shows is now kept, and painted again as it was while the takeover lasts.
- Fixed: in a high-contrast mode (Windows), background colours are taken away, so the fill turned white and the bar vanished, leaving a gap. Its track is outlined in the mode's text colour and the fill keeps its own colours.
- Turning the bar off or on in Settings shows at once in an open presenter view, and a deck reopened mid-countdown shows its bar straight away.
- Pause holds the bar, Reset empties it, Add 1 minute makes the talk longer so less of it has gone, and changing the time mid-talk keeps the time spent, so the bar can jump (full, if the new time has already gone by).
- Dragging the divider: the bar follows, 18px in at both sides.
- Right-to-left languages: the fill starts at the right, as a block does there (not tested; the test browser shows Slides in Portuguese).

**Done when:**
- [x] While counting down, a bar under the time shows the share of time left, and follows Pause, Reset and adding a minute.
- [x] It turns orange and red with the countdown.
- [x] It isn't there when counting up.
- [x] It passes the native-look comparison with Slides' own time bar (presenter view has one theme).
- [x] Covered by a Playwright test.

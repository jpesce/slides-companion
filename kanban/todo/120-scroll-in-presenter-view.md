# Scrolling in presenter view

**Problem:** "I can't scroll my speaker notes." Presenter view opens a separate window with the speaker notes and the next slide. If our slideshow scripts run in that window, they cancel every scroll there (zoom.js does so for the "Zoom into the slide" and "Do nothing" settings), so long notes would be stuck.

**Demand:** follow-up from card 40 (stop slide skipping). Not seen yet: the signed-out test browser can't open presenter view, so it's unchecked. Presenters with long notes are the ones who use presenter view.

**Approach:** in a signed-in browser, open presenter view and check its URL and whether our scripts run in it. If they do, let scrolling over the notes (and anything else that scrolls there) through, and decide whether scrolling over the slide preview there should zoom the slideshow, do nothing, or change slides like the main window.

**Done when:**
- [ ] Speaker notes in presenter view scroll with a mouse wheel and trackpad, whatever the "During a slideshow" setting.
- [ ] Scrolling over the slide in presenter view does what the setting says, or the card records why it doesn't need to.
- [ ] Covered by a Playwright test, if presenter view can be opened there; otherwise the manual check is recorded here.

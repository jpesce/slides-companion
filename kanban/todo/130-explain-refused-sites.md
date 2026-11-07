# Say why a site can't be shown, and what to do

**Problem:** without every site allowed (card 56), a link to a site that refuses to be shown inside another page (google.com, many news and bank sites) opens over the slide as Chrome's error page: a grey box with a sad-page icon and no words, in front of the audience. Only the bar below, with the site's name and Open in new tab, offers a way out, and nothing says why it's empty.

**Evidence of demand:** the user's review of Settings (Nov 2026), asking what the presenter sees in this case; screenshot taken then. It's the moment the "Allow all sites" line in Settings (card 110) is about, but at the time it happens.

**Approach:** notice the refusal, and show in its place a message made like the rest of the stage (dark, Slides' slideshow type): "google.com doesn't allow being shown here", with Open in new tab, and Allow all sites while it isn't. Allowing has to be asked from the extension's own page (as in Settings), so the message would be a frame of ours. Noticing the refusal is the open question: the page's frame can't be read across sites, and the extension can't read the site's headers without the permission it's missing. To try: what Chrome reports to the slideshow for the frame (Resource Timing, the frame's `load` and what's in it), and `webNavigation`'s errors (which adds an install warning).

**Done when:**
- [ ] A refused site shows our message instead of Chrome's empty error page, in Slides' language.
- [ ] Open in new tab and Allow all sites work from it, by pointer and keyboard, and once allowed the page shows.
- [ ] Sites that allow being shown, and every site once allowed, never show it.
- [ ] Covered by Playwright tests.

# Keep other sites' protection inside a page opened over the slide

**Problem:** with every site allowed, a page opened over the slide loses the headers sites use to refuse being shown inside another page (X-Frame-Options and the whole Content-Security-Policy). Today that happens for every frame in the presenting tab (background.js `frameHeadersRule`), so frames *inside* the opened page lose them too. A hostile site, one a deck links to or one the presenter browses to, could show a sensitive page that normally refuses that (a Google account page, a bank) inside its own, with the presenter signed in, and trick a click on it. Removing the whole CSP also turns off the other protections those pages set.

**Evidence:** the security audit before the repo went public (8 Nov 2026), rated Medium. Only presenters who allowed every site are exposed, and only while a page is open over the slide (the rule goes when it closes).

**The user's requirement:** following links inside the opened page must keep working as now, to any site, through redirects.

**Approach (to prototype first):**
- Rule A: headers set aside only for frames whose loading Slides' own page started (`initiatorDomains: ['docs.google.com']`), on any site, redirects included. That's the opened page itself, not frames inside it, which their site starts.
- Rule B: for the site on screen, headers set aside for its own pages started from itself (`initiatorDomains` and `requestDomains` both that site), so links, forms and redirects within the site keep working. Updated from `page-address`.
- A link inside the opened page to another site: page.js sees it start (the Navigation API's `navigate` event), stops it, and asks Slides' page to load that address in the frame, so it's started from Slides' page and rule A applies. Back and Forward do the same.
- To check while prototyping: that Chrome gives the frame's loading Slides' page as its initiator when the parent sets `src`; that the `navigate` event can be read and stopped from a content script; what happens to a form posted to another site.

**Also from the audit (Low):**
- Drop the tab's rule too when the tab leaves Slides (`tabs.onUpdated`), in case the slideshow crashes before saying the page closed.
- Know the opened page's frame for sure: a random name per frame that page.js repeats, checked by spotlight.js, rather than a name any frame could give itself.

**Done when:**
- [ ] A page inside the opened page that refuses to be shown inside another page still refuses (a test with such a frame).
- [ ] Links, redirects, forms, Back and Forward in the opened page work as now (the links tests pass, plus one for a link to another site that refuses).
- [ ] The rule never outlives the slideshow, even when it crashes.
- [ ] PRIVACY.md and STORE.md say exactly what's set aside, and where.

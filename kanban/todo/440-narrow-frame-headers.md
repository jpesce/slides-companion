# "Allow all sites" lifts only the opened site's protections

**Problem:** with "Allow all sites" on, while a page is open over the slide, `frameHeadersRule` in `extension/background.js` removes the whole `content-security-policy` and `x-frame-options` headers from *every* frame in that tab that isn't Slides'. Only the opened site needs them lifted, and only for framing. Removing the whole content security policy also turns off the site's own protection against injected scripts, on any site that loads in a frame in that tab while the page is open. It's opt-in, scoped to the tab and cleared on close, but wider than it needs to be.

**Evidence of demand:** the code review of 9 November 2026, asked for by the maintainer. A security-minded reviewer of the store listing or the code would ask about it.

**What we know:** declarativeNetRequest can only set, append or remove a whole header; it can't take `frame-ancestors` out of a policy and keep the rest. It can narrow which requests a rule applies to (`requestDomains`).

**Approach:** a spike first.
- Limit the rule to the opened site's domain, updating it when a new link opens.
- Find out what happens when the link redirects to another domain (a link shortener, a sign-in page). Maybe the rule follows the redirect, or the check frame learns the final address first.
- If narrowing breaks real sites, record which and why here.
- Check what PRIVACY.md and STORE.md say about the permission, and keep them true.

**Done when:**
- [ ] With a page open over the slide, only that site's frames lose their framing headers.
- [ ] A link that redirects to another site still opens over the slide, and a test covers it.
- [ ] PRIVACY.md and STORE.md describe what's lifted, accurately.
- [ ] `npm test` passes.

**Findings so far (13 November 2026), set aside for a decision:**
- A rule has to be in place before the response arrives, and the extension learns where the page went only afterwards (`page-address` from page.js, once it has loaded). So a rule narrowed to the opened site's domain (`requestDomains`) can't follow a redirect to another site (a link shortener, a sign-in page) or a link clicked inside the page to another site: those would show Chrome's "refused to connect" page, which is what "Allow all sites" exists to prevent. Following them would mean learning the final address first, from a check frame that loads the page before it's shown, which costs a second load of every page and doesn't help with links clicked inside it.
- declarativeNetRequest can't tell the frame we open from frames the page itself opens inside it: both are `sub_frame` requests from the same tab, and once the presenter has clicked inside the page, both have the page's site as their initiator.
- What could be narrowed with no loss: keep removing `x-frame-options` everywhere (it only says who may frame the page), and remove `content-security-policy` only for the opened site's domain, updating it as `page-address` reports a new one. A site that refuses framing through `frame-ancestors` alone would then show "refused to connect" after a redirect or a link to it, until it's opened again. That trade (a few sites in rare paths, against keeping every other site's script protection) is the decision to make here.

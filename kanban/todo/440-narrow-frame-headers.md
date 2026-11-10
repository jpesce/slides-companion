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

# Show a PDF whose address doesn't say it's one

**Problem:** card 160 shows a linked PDF over the slide in Google's viewer when its address ends in `.pdf`. A PDF at an address that doesn't (arXiv's `arxiv.org/pdf/1706.03762`, a site's `/download?id=…`) still opens as Chrome's "This page has been blocked by Chromium" with every site allowed, and without, as "arxiv.org won't open over your slide" with Allow all sites, which doesn't help.

**Evidence of demand:** found while doing card 160 (Nov 2026). arXiv links are common in academic and research talks; download links in reports and handouts.

**Approach:** to try: known addresses (arXiv's `/pdf/`); with every site allowed, the background asks the site for the address's type (a HEAD request) while the page waits hidden, as the refusal check does (card 130), and a PDF goes to Google's viewer. Without every site allowed the type can't be asked; at least the message shouldn't offer Allow all sites when it wouldn't help.

**Done when:**
- [ ] An arXiv PDF link shows over the slide.
- [ ] With every site allowed, a PDF at any address shows over the slide.
- [ ] Covered by Playwright tests.

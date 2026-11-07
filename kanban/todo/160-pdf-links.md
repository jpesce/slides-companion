# Show a linked PDF over the slide

**Problem:** a link to a PDF, clicked during a slideshow, opens over the slide as Chrome's "This page has been blocked by Chromium" page, with every site allowed or not. The page's frame is sandboxed (so a site can't take over the slideshow's window), and Chrome won't show its PDF viewer in a sandboxed frame. Without every site allowed, the refusal check (card 130) sees it fail too, and its message offers Allow all sites, which wouldn't help.

**Evidence of demand:** found while checking card 130 against real sites (Nov 2026): `https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf`. Handouts, papers and reports are often linked as PDFs.

**Approach:** to try: leave the sandbox off for PDFs (known by the address ending in `.pdf`, or by the response's type, which page.js can't see before it loads), or open PDFs in a frame of ours that shows them with Chrome's viewer (an extension page can embed it). Check what the slideshow keeps (Esc, the bar) in each. Until then, the refusal message shouldn't offer Allow all sites for a PDF.

**Done when:**
- [ ] A linked PDF shows over the slide, with the bar and Esc working as for any page.
- [ ] Covered by a Playwright test.

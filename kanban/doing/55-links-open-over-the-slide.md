# Links open over the slide

**Problem:** clicking a link during a slideshow opens it in a new tab. The presenter leaves the slideshow, and coming back means finding the tab again and often going full screen again, in front of the audience.

**Demand:** the user asked for it while reviewing card 60, as the more common need than a website kept on a slide: showing a page you mention, then coming back. Presenters link to sites, docs and videos all the time, and Slides only offers a new tab.

**Approach:** during the slideshow, a plain click on a link opens the page on the spotlight's black stage, in a live frame filling the space the gallery gives a picture. The close button and Esc bring the slide back, as in the gallery. A bar at the bottom names the site and offers "Open in new tab", for sites that refuse to be shown inside another page. Slides sends links through google.com/url, so the real address is taken from it. YouTube watch links become YouTube's embed page, which may be shown. The frame is sandboxed so a page can't take over the slideshow's window. Ctrl/⌘-click and middle click still open a new tab, and a setting keeps Slides' own new tab for every click.

Out of scope here: getting past sites that refuse to be shown (card 56), Back and Forward (card 58).

**Done when:**
- [x] Clicking a link during a slideshow opens the page over the slide; Esc or the close button brings the slide back, still on the same slide and step.
- [x] "Open in new tab" in the bottom bar opens the link in a new tab.
- [x] Links Slides wraps in google.com/url open at their real address; YouTube watch links play.
- [x] Ctrl/⌘-click and middle click open a new tab as before; with the pen on, clicks draw.
- [x] A Settings choice opens links in a new tab instead, as Slides does.
- [x] The stage and bars match the gallery's, in the slideshow from the editor and from a /present link. (Checked in Dia, windowed: Dia doesn't give full screen to an automated click.)
- [x] Covered by Playwright tests.
- [ ] Edge cases reviewed, and any found fixed or split into cards.

**Decisions:**
- Built on the gallery's stage in spotlight.js rather than a new file: the same black stage, fade, ✕, bars that show on approach, Esc kept in full screen, closing when the slide changes, and live edits waiting while it's open all come for free.
- The page fills the gallery's picture area (48px margins, 80px safe areas), white behind it as in a tab. The bottom bar names the site and has "Open in new tab", styled like the gallery's ‹ 2/5 › bar.
- In a slideshow started from the editor, links are the real address; from a /present link, Slides wraps them in google.com/url, which is unwrapped.
- Clicking an SVG link focuses it, where Slides' keys don't work; the link gives up focus, and focus goes back where it was when the stage closes.
- A closing stage lets clicks through, so a click during its fade reaches the slide.
- Found on the way: content scripts aren't strict, so a top-level block's `function open`/`close` became `window.open`/`window.close` in our isolated world. spotlight.js and settings-dialog.js now name them openGallery/closeStage and openDialog/closeDialog.
- Test deck: it now has 11 slides, slide 4's photo flies in, and slide 4's video keeps ← from going back. Zoom, ink and notes tests that went 3 → 4 → 3 now go 3 → 2 → 3, or on to slide 5 and back, and the notes tests expect 11 slides.
- Esc after clicking into the page goes to the site; the ✕ closes it. Card 56 makes Esc work there.

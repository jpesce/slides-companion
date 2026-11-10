# Security

Slides Companion runs inside Google Slides, and, if a presenter allows all sites, in the pages it opens over the slide. So a bug here could expose a presenter's deck or let a site do what it shouldn't. If you find one, thank you for telling us.

## Reporting a problem

Please report it privately: on GitHub, open the repository's **Security** tab and click **Report a vulnerability**. Don't open a public issue: it would show the problem to everyone while presenters are still exposed.

Say what someone could do, and how to reproduce it, in the latest version from the Chrome Web Store.

## What's most sensitive

- **"Allow all sites".** While a page is open over the slide, the extension removes that tab's framing headers (`X-Frame-Options` and `Content-Security-Policy`) so the page can show inside the slideshow, and runs `page.js` in it. [PRIVACY.md](PRIVACY.md) describes exactly what it lifts and when.
- **Messages between frames.** `background.js` passes messages between the slideshow and the pages opened over it, and checks where each one comes from.
- **Live edits.** It reads the editor's copy of the deck to update a running slideshow.

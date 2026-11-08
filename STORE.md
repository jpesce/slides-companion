# Chrome Web Store listing

The text for the [Chrome Web Store dashboard](https://chrome.google.com/webstore/devconsole), kept here so it changes with the extension. Paste each part into its field when it changes.

## Name and summary

Come from `extension/_locales/*/messages.json`, in every language: `storeName` ("Slides Companion: Timer, Zoom & Speaker Notes for Google Slides™" in English) and `extensionDescription`. The store finds extensions mostly by the words in their name, so the name carries the most-searched words of our niche after our own, and Google Slides' name in each language, after "for" and marked ™, as Google's branding rules ask. A test keeps each within Chrome's limits (75 and 132 characters).

## Description

Free presenter tools for Google Slides™. Slides Companion works on top of Slides' own slideshow, so your videos, animations and clicker keep working, and it looks like part of Slides.

SPOTLIGHT
Select an image and press Space to see it full screen, then go through the slide's other images. During a slideshow, just click an image. Right-click an image to download it as it was added to the deck.

LINKS
During a slideshow, links open over your slide, PDFs included. Press Esc to come back right where you left it.

ZOOM & SCROLL
Zoom into a slide with your trackpad, mouse wheel or the + and - keys to show a detail up close. Brushing the trackpad never skips a slide.

PEN
What you draw with Slides' pen stays on the slide for the next time you present.

TIMER
In presenter view, count down from how long you have, with a bar that fills as you go and a warning before the end.

FLOATING NOTES
Your speaker notes in a window of their own while you present.

LIVE EDITS
Edits to the deck, by you or anyone else, reach a slideshow that's already running. Showing a deck on an office TV? Start the slideshow from the editor on the TV, and edits show there within seconds. (A "Publish to the web" link takes Google 30 to 60 minutes to update.)

Each feature has its own page in Settings: click the extension's button in Slides' side toolbar. In 33 languages, following Slides' own.

100% free and open source. No account, no servers: everything happens in your browser.
Formerly Image Spotlight for Google Slides.

Google Slides is a trademark of Google LLC. This extension is not made or endorsed by Google.

## Privacy practices

**Single purpose:** tools for presenting with Google Slides.

**Permission justifications:**

- `storage`: saves the presenter's settings, drawings, timer time for each deck, and the floating notes window's size and zoom.
- `scripting`: when the presenter allows every site, runs a small script in pages opened over the slide during a slideshow, so Esc returns to the slideshow and the bar shows the page's site.
- `declarativeNetRequestWithHostAccess`: when the presenter allows every site, lets a page open over the slide in the presenting tab, by removing the X-Frame-Options and Content-Security-Policy response headers of frames in that tab (never Google Slides' own), only while the page is open.
- Host permission `https://docs.google.com/presentation/*`: adds the tools to Google Slides.
- Optional host permission for every site: asked only when the presenter clicks "Allow all sites" in Settings, so any site can open over the slide.

**Remote code:** none. Every script is in the package.

**Data usage:** collects no user data.

**Privacy policy:** https://github.com/jpesce/slides-companion/blob/main/PRIVACY.md

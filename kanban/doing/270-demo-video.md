# A demo video for the release

**Problem:** people decide in seconds whether an extension is worth installing, and Slides Companion's features (links over the slide, zoom, the presenter-only timer, live edits) are hard to picture from words. The README and the store listing need a short video that shows them working in a real deck.

**Evidence of demand:** the user asked for it for the 1.0.0 release. Image Spotlight's README and store listing had one (67 s, 1080p, with music), and the new README has none.

**What the old video looked like:** a screen recording of a yellow, branded deck, framed on a purple background, with smooth zooms into the action and key presses shown as captions ("Space", "Esc"). Text slides with highlighted words said what each scene showed, and it opened and closed on the logo.

**Approach:**
- **Deck:** a new Google Slides deck, "Slides Companion demo", designed in Google Sans (it's on Google Fonts, so Slides has it). It has one title slide, one slide for each feature with something worth showing (a photo, a chart, a link, notes), and a closing slide: "100% free and open source". Pictures are public domain (Wikimedia Commons, NASA), credited in the speaker notes.
- **Scenes, about 60 to 90 s:**
  - Spotlight in the editor (Space, then the arrow keys), and a click on an image during the slideshow.
  - A link opening over the slide, then Esc.
  - Zooming into a detail.
  - A pen drawing still there in the next slideshow.
  - Presenter view's countdown.
  - Floating notes.
  - Live edits: an edit made in a second window showing up in the running slideshow.
  - Download image.
- **Recording:** a script drives Playwright's Chromium with the extension loaded. It captures each window (slideshow, presenter view, floating notes) frame by frame at 1080p with Chrome's own screencast, so no desktop, notifications or screen-recording permission get involved. Being a script, it can be re-recorded after the new icon (card 240) or any change.
- **Editing:** ffmpeg adds the background, the zooms and the key captions, like the old one.
- Keep the scripts in `scripts/demo/`. The video goes to the README (uploaded to GitHub like the old one) and the store listing (as a YouTube link, which the store asks for).

**Open questions, for the user:**
- Access: editing the deck needs a signed-in Google account in the test browser. The user can sign in once there, or the deck can be shared "anyone with the link can edit" while recording.
- The logo: wait for card 240, or record now without it and add it later.
- Music: none, or a track the user picks.

**Done when:**
- [ ] The deck is designed in Google Sans, and the user likes it.
- [ ] The video shows every feature listed above, at 1080p, in about 60 to 90 s.
- [ ] It's re-recordable with one command.
- [ ] The user has approved it, and it's in the README; STORE.md says where it goes in the store listing.

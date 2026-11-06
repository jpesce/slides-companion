# Release build for the Chrome Web Store

**Problem:** the dev auto-reload code (`background.js`) and the `storage` and `alarms` permissions it needs ship in the store package. They're inert there, but extra permissions show up in the install prompt and review.

**Approach:** an `npm run build` that copies `extension/` to `dist/`, drops the dev-reload code and any permissions only it uses, and zips the result for upload.

**For the store listing:** a deck shown on a TV picks up edits live when the TV runs the slideshow from the editor (card 50), not from a Publish to web link, where Google takes 30 to 60 minutes to serve them. Say so, for offices that show a deck on a screen (from card 150, dropped).

**Done when:**
- [ ] `npm run build` produces a zip that loads in Chrome and passes the tests.
- [ ] The built manifest asks only for what the shipped features use.

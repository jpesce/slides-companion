# Every site opens over the slide

**Problem:** with card 55, a link opens over the slide only if the site allows being shown inside another page. Google, GitHub, YouTube pages and most social and news sites refuse, so the presenter gets Chrome's "refused to connect" page and has to use "Open in new tab". Also, once the presenter clicks into the page, Esc goes to the site, so only the close button brings the slide back.

**Demand:** follows card 55. The user chose to ask for the access this needs once, from Settings, rather than at install: installing shows no new warning, and anyone who wants every site turns it on.

**Approach:** an optional permission for all sites (`optional_host_permissions`), asked for from a Settings checkbox, worded from the user's side ("Also show sites that don't allow it"). Chrome only asks from the extension's own pages, so that checkbox lives in a small extension page framed into the Settings dialog, styled to match. Once granted:
- while a page is open over the slide, a session rule (declarativeNetRequest, `declarativeNetRequestWithHostAccess`) removes `X-Frame-Options` and `Content-Security-Policy` from frames in that tab only, and is dropped when the page closes;
- a content script registered at runtime (`chrome.scripting.registerContentScripts`) runs in our frame only (its name, and `location.ancestorOrigins` being docs.google.com). It sends Esc to the stage and reports the current address, so "Open in new tab" opens the page you're on.
Unregister the script when the permission is removed.

**Done when:**
- [ ] Turning the option on asks Chrome once; turning it off gives the access back.
- [ ] With it on, sites that refuse to be shown (google.com, github.com) open over the slide.
- [ ] Esc closes the page even after clicking into it.
- [ ] "Open in new tab" opens the page you've browsed to.
- [ ] Other pages and frames are unaffected while no page is open over the slide.
- [ ] The Settings option matches the dialog's other checkboxes.
- [ ] Covered by Playwright tests.

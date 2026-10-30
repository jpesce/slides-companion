# Show our UI text in Slides' language

**Problem:** our labels ("Spotlight image", "Slides Companion") are English only, so in a Slides set to another language they stand out as foreign, which breaks the native look.

**Approach:** Chrome's `_locales/` messages via `chrome.i18n`, picking the language Slides uses (`document.documentElement.lang`) rather than the browser's, with English as the fallback. Start with the languages Image Spotlight's users have.

**Done when:**
- [ ] Every user-facing string comes from `_locales/`.
- [ ] A deck opened with Slides in another language (e.g. `?hl=pt-BR`) shows our labels in that language.
- [ ] Covered by a Playwright test.

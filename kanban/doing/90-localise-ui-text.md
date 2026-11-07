# Show our UI text in Slides' language

**Problem:** our labels ("Spotlight image", "Slides Companion") are English only, so in a Slides set to another language they stand out as foreign, which breaks the native look.

**Approach:** Chrome's `_locales/` messages via `chrome.i18n`, picking the language Slides uses (`document.documentElement.lang`) rather than the browser's, with English as the fallback. Start with the languages Image Spotlight's users have.

**Done when:**
- [x] Every user-facing string comes from `_locales/`.
- [x] A deck opened with Slides in another language (e.g. `?hl=pt-BR`) shows our labels in that language.
- [x] Covered by a Playwright test.

## Findings (measured in the test browser, signed out)

- Each page of Slides names its language in `<html lang>`: the editor, and the slideshow's frame. `?hl=ja` gives "ja", `?hl=en-GB` "en-GB". Signed out, Slides here is in Portuguese (pt-BR) whatever the browser's language (en-US) or `Accept-Language`, so it isn't the browser's language that decides.
- `?hl=` on the editor changes only the editor: the slideshow's frame (`/localpresent`) and presenter view stay in the account's (here, the location's) language. Real presenters don't use `hl`, so for them every window agrees.
- Presenter view is a blank page with no `lang`. It's written in the slideshow's language ("Pausar", "Redefinir" with the editor at `?hl=en`), and its opener is the editor, whose slideshow frame has that language.
- `chrome.i18n.getMessage` can't choose a language: it follows the browser's. And a content script can't fetch the extension's own `_locales` files ("Failed to fetch") unless they are web-accessible.
- Slides names keys in the presenter's language too ("⌘barra" for ⌘+/), so "Space" in our menu item is translated.
- The Settings illustrations draw only digits (the timer), so they need no translation.

## Decisions

- `_locales/<locale>/messages.json` (Chrome's own format, with placeholders and a description for translators) is where the words live. It also gives the manifest's name and description, and the Web Store listing, in each language.
- `scripts/build-messages.mjs` (`npm run messages`, and `npm run dev` on every change to `_locales`) writes them into `extension/messages.js`, which content scripts load like `illustrations.js`: synchronous, so every label is there as soon as our UI is built, with no permission or message round trip. A test fails if `messages.js` is out of date, or a language misses a message or a placeholder.
- `i18n.js` picks our language closest to the page's: the same (pt-BR), the language alone (pt), another of its kind (pt-PT for pt-BR's absence), else English. Presenter view takes the slideshow's, through its opener. The Settings dialog's framed checkbox (`all-sites.html`) is told the dialog's language in its address.
- Durations ("Count down from 1 hour, 30 minutes") are written by Intl in the same language as the words around them, so a fallback to English never mixes languages. They're put together from `Intl.NumberFormat` units and `Intl.ListFormat`, which says them word for word as `Intl.DurationFormat` does, as that needs Chrome 129.
- Our labels borrow Slides' own wording in each language: "Mostrar anotações flutuantes" beside "Mostrar anotações do apresentador", "Mais zoom"/"Menos zoom" as in presenter view, "Contador" as Slides calls its timer, "guia" for tab.
- Tests load a copy of the extension that knows only English, so they read the same words whatever language Slides speaks where they run (as before this card, they don't depend on Slides' own words). The language test picks Slides' language with `test.use({ slidesLanguage: 'pt-BR' })`: the test browser's requests for the editor and the slideshow get `hl=pt-BR`, since `hl` on the deck's address alone leaves the slideshow in the location's language. That can't be how every test runs in English: once Playwright rewrites any request, the floating notes window (a Picture-in-Picture window it doesn't drive) loads nothing, not even its stylesheet.
- This card ships English and Portuguese (Brazil). More languages are card 100, once we know which Image Spotlight's users speak.

## Edge cases

- Slides' codes Chrome names otherwise: Google's old codes (`iw` Hebrew, `in` Indonesian, `ji` Yiddish, `tl` Filipino, `nb` Norwegian), and Chinese for Hong Kong, Macau or in traditional script, which is Chrome's `zh_TW`. A language we only have another kind of takes it (pt-PT gets pt-BR), rather than English.
- Presenter view remembers the slideshow's language once it has it, so its menus stay in it if its opener goes away.
- A message missing from a language falls back to English for that message alone; a key nobody wrote throws, and a test checks every key asked for exists and every message is asked for.
- Translations go into HTML escaped (`slidesCompanion.html`), so a translator's quote or "&" can't break a label.
- Named placeholders start with a letter, so a translator's "$1$2" stays two numbered places.
- The floating notes learn how Slides names a slide and what an empty notes box says, now kept for each language: after switching Slides' language, the old wording no longer shows until it's learnt again.
- Settings' list wraps a feature's summary, as Android's Settings do, rather than cutting it short: "Contagem regressiva na visualização de apresentador" lost its end. The Portuguese for the timer and live edits were shortened to fit one line, like the English.

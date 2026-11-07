# Speak the languages our presenters use

**Problem:** card 90 shows our labels in Slides' language, but only English and Portuguese (Brazil) have words. A presenter whose Slides is in Spanish, Japanese or German still sees our items in English among Slides' own.

**Evidence of demand:** Image Spotlight's users come from many countries (its Web Store listing's stats show which), and Slides itself is offered in about 80 languages. Competitors already ship several (`benchmark/3-timer/store/slidepace/_locales` has de, es, fr, it, ja, pt_BR).

**Approach:** read Image Spotlight's users by language in the Web Store's developer dashboard and translate `_locales/en/messages.json` into the top languages, using each message's description, and Slides' own wording in that language wherever ours sits beside Slides' (menus, presenter view, the slideshow's ⋮). Run `npm run messages` after each. Ask a speaker of each language to read the Settings pages.

Watch for:
- Right-to-left languages (Arabic, Hebrew): Slides sets `dir="rtl"`; our layouts, and the arrows in "Previous (←)", would need mirroring.
- The timer's field understands times in words only in English ("20 min", "1h 20"); digits work in every language, and its tip says so.
- Long words (German) in Settings' list and the timer's menu.

**Done when:**
- [ ] The languages to ship are chosen from Image Spotlight's stats.
- [ ] Each has every message, checked against Slides' wording in that language.
- [ ] The language test opens a deck in each shipped language.

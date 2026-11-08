# Give our menu items access keys, as Slides' own have

**Problem:** every item in Slides' editor menus has an access key: a letter that chooses it while the menu is open. In English and other Latin-script languages it is a letter of the label, marked by Slides (`.goog-menuitem-mnemonic-hint`, and named in the label's `aria-label`, "Show speaker notes n"). In Arabic, Greek, Hebrew, Hindi, Japanese, Korean, Russian, Thai, Ukrainian and both Chinese, Slides shows it after the label, "スピーカー ノートを表示(N)". Our items (View › Show floating notes; an image's Spotlight image and Download image) have none, so in those 11 languages they are the only items without "(X)", and in every language their letter does nothing.

**Evidence of demand:** found while translating (card 100): in the View menu in Japanese, ours is the one item without "(N)"-style letters. Keyboard users rely on access keys across Google's editors.

**Approach:** mirror Slides' markup: in Latin-script languages, the hint span around a letter of our label that no Slides item in the same menu uses (the letter may differ by language, so it belongs with each message, or is chosen at runtime from the label's letters); in the others, "(X)" in `.goog-menuitem-mnemonic-separator` with an English letter, as Slides does. Detect which form Slides uses from its own items in the open menu rather than from a list of languages. menus.js handles the key: while one of our menus has the keyboard, the letter chooses our item, as Enter does. Check what Slides does when two items share a letter, and that the slideshow's ⋮ menu has no access keys (its items show none).

**Done when:**
- [ ] Our editor menu items show their access key as Slides' do, in Latin and non-Latin languages.
- [ ] Pressing the letter while the menu is open chooses our item; Slides' own letters still choose theirs.
- [ ] Screen readers hear the letter as for Slides' items (`aria-label`).
- [ ] Compared side by side with Slides' items in English, Japanese and Arabic.

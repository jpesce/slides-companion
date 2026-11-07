# Ask for every site only when it's missing

**Problem:** the Links page of Settings always shows a checkbox, "Show every site over the slide, even those that don't allow it", with a hint about Chrome asking. Most presenters don't know what it means or why they'd want it. It sits there even once every site is allowed, and its Cancel and OK undo or keep a permission, which isn't how permissions usually work.

**Evidence of demand:** the user's review of Settings' text (Nov 2026): show it only while the permission is missing, and make it easier.

**Approach:** in its place, a notice that shows only while Chrome hasn't given the extension every site, made as Material 3's inset banner (the one Slides ships for Workspace's notices in dialogs): an info icon, "Some sites won’t open over your slide until you allow them.", and an **Allow all sites** button. The button asks Chrome right away, as any permission is asked, and the notice goes once it's given. It comes back if access is taken away in Chrome. Taking it away is done where Chrome manages extensions' access, so Cancel and OK no longer act on it.

**Done when:**
- [x] The notice shows only while every site isn't allowed, and goes as soon as it is (or comes back if it's taken away).
- [x] "Allow all sites" asks Chrome, by pointer or by keyboard (Tab reaches it like the dialog's other controls; Enter and Space choose it).
- [x] It looks like Slides' own notices in its dialogs (Slides has one theme), its text read like the dialog's.
- [x] In Slides' language.
- [x] Covered by Playwright tests.

## Notes

- First made as a sentence with an inline link ("**Allow all sites** to open every link…"); the user asked for it to stand out more, like a callout, so it became a banner whose button carries the action and whose text doesn't repeat it (`allSitesLine`, `allSitesAllow`).
- The frame starts with no height and takes the line's once the line knows whether it's needed; with no line, it's not a Tab stop and the choices sit right under the intro, as on the other pages.
- Enter and Space on the button choose it, as on any button; only Esc and Tab are sent to the dialog. Allowing no longer waits for OK, and Cancel no longer gives access back.
- The notice's look: first copied from Slides' own banner (`appsDocsUiWizBannerInset` over Material 3's `javascriptMaterialdesignGm3WizBannerBanner`), measured on a live one (a DLP label notice) in a signed-in deck in Dia, Nov 2026: 16px corners, 4px padding, a 20px icon, the text button at the far end, or under the text on the right when narrow. In the dialog that left the button far from the words and a lot of empty space, so it became Workspace's notice card as Slides ships it (`appsElementsWorkspaceRecommendationBanner`, Small, with an icon): 16px 24px padding with the text at 64px, a 24px icon at 24px, the action row under the text (12px above it, 4px below), the text button's label lined up with the text, in the banner's default colours (#f0f4f9, #444746 text and icon, #0b57d0 button). The user chose that pale blue-grey over the live banner's Primary blue (#d3e3fd).
- Chosen with the keyboard, the button goes with the notice; the keys then go on to the choices that take its place, not back to the feature list.
- The notice coming back when access is taken away (`chrome.permissions.onRemoved`) has no test: a test copy with every site has it as a required permission, which Chrome won't take back, and the usual copy can only get it through Chrome's question, which a test can't answer.
- The notice is laid out with logical sides (inline start and end), ready for right-to-left languages (card 100).

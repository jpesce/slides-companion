# Reach injected menu items with the keyboard

**Problem:** Slides' menus are Closure components; items we add (like "Spotlight image" in the right-click menu, "Show floating notes" in View, and the floating notes and "Enter full screen" items in the slideshow's ⋮ menu) work with the mouse, but arrow keys skip them because the menu doesn't know they exist. Keyboard and screen reader users can still use the shortcuts (Space, Shift+S, ⌘+Shift+F), but not the menus.

**Approach:** while one of our items is in an open menu, follow the menu's keyboard highlight and step onto our item when the highlight moves past its position; Enter activates it.

**How Slides' menus take the keyboard (measured 6 Nov):**
- Focus stays on the menu (right-click menu), the menu bar (View) or the ⋮ button. That element, and the menu, point `aria-activedescendant` at the highlighted item, which is what screen readers read.
- Down and Up wrap round; with nothing highlighted, Down goes to the first item and Up to the last. Home and End go to the first and last. Disabled and hidden items are skipped.
- Enter chooses. Space doesn't, and typing a letter doesn't jump to an item.
- Afterwards focus goes back to the slide (editor) or to the slideshow.
- The keyboard opens these menus with Shift+F10 (right-click menu) and Ctrl+Option+V (View). In a slideshow, it opens ⋮ by tabbing to it while its bar shows, then Space or Enter. With focus on ⋮, the arrows drive the menu, also after opening it with the pointer. Once ⋮ loses focus (its bar hides), they change slides.

**Decisions:**
- New `menus.js`, shared by all four items. Its `menuItem(item, choose)` replaces the hover code that was copied in spotlight.js and notes.js.
- A key that would land on our item, or leave it, is ours: we move the highlight and set `aria-activedescendant` as Slides does. Keys that don't touch our items stay Slides'.
- Moving from our item to one of Slides' is done with Slides' own arrow keys (synthetic, from nothing highlighted), not with a synthetic mouseover. A mouseover on a submenu item ("More ►") pops the submenu open, and the arrows then go into it.
- Out of full screen, Slides still counts its "Exit full screen" (which we hide) as there. `hideMenuItem` marks it so the keys pass it by for our "Enter full screen".
- Enter closes each menu the way its mouse path does, and returns focus as Slides' own items do. In View this needs Escape's keyup too; in ⋮, ⋮ is blurred.
- Found and fixed along the way: in the right-click menu opened with Shift+F10, Slides fills the menu after we add "Spotlight image", so ours ended up first, above Copy. It's now placed again as the menu changes. Signed in, it was already in place before "Crop image".
- Checked signed in, in Dia (menus.js injected into the test deck's tab): the full right-click menu. Down from "Format options" lands on "Spotlight image", then "Crop image", then "Replace image ►" without opening its submenu, and back up the same way. Enter spotlights.

**Done when:**
- [x] Arrow keys move onto and off "Spotlight image" in the order it appears.
- [x] Enter on it opens the spotlight.
- [x] The same for the floating notes items in View and ⋮, and "Enter full screen" in ⋮.
- [x] Covered by a Playwright test.

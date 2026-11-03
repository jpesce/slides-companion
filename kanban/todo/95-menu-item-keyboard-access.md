# Reach injected menu items with the keyboard

**Problem:** Slides' menus are Closure components; items we add (like "Spotlight image" in the right-click menu, "Show floating notes" in View, and the floating notes and "Enter full screen" items in the slideshow's ⋮ menu) work with the mouse, but arrow keys skip them because the menu doesn't know they exist. Keyboard and screen reader users can still use the shortcuts (Space, Shift+S, ⌘+Shift+F), but not the menus.

**Approach:** while one of our items is in an open menu, follow the menu's keyboard highlight and step onto our item when the highlight moves past its position; Enter activates it.

**Done when:**
- [ ] Arrow keys move onto and off "Spotlight image" in the order it appears.
- [ ] Enter on it opens the spotlight.
- [ ] The same for the floating notes items in View and ⋮, and "Enter full screen" in ⋮.
- [ ] Covered by a Playwright test.

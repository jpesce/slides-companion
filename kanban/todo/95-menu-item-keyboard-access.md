# Reach injected menu items with the keyboard

**Problem:** Slides' menus are Closure components; items we add (like "Spotlight image" in the right-click menu) work with the mouse, but arrow keys skip them because the menu doesn't know they exist. Keyboard and screen reader users can still use the Space shortcut, but not the menu.

**Approach:** while one of our items is in an open menu, follow the menu's keyboard highlight and step onto our item when the highlight moves past its position; Enter activates it.

**Done when:**
- [ ] Arrow keys move onto and off "Spotlight image" in the order it appears.
- [ ] Enter on it opens the spotlight.
- [ ] Covered by a Playwright test.

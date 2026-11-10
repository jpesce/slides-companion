// Our items in Slides' menus (the right-click menu, View, and the slideshow's ⋮). Slides' menus only
// know the items Slides made, so the pointer's highlight and the arrow keys pass ours by. Ours
// follow both by hand: the pointer highlights them, the arrow keys (and Home and End) stop on them
// in their place, and Enter chooses them, as with Slides' own items.
{
  const MARK = 'slides-companion-menuitem';
  const HIGHLIGHT = 'goog-menuitem-highlight';
  // Slides' items that we hide, which Slides still counts as there.
  const HIDDEN = 'data-slides-companion-hidden';
  const KEYS = { ArrowDown: 40, ArrowUp: 38 };
  // Enter on each of our items.
  const choices = new WeakMap();
  // Our items' access keys (see accessKey).
  const letters = new WeakMap();
  let count = 0;

  const isOurs = (item) => choices.has(item);
  const menuOf = (item) => item.closest('[role="menu"]');
  const shows = (element) => element.checkVisibility({ visibilityProperty: true });
  const items = (menu) =>
    [...menu.querySelectorAll('.goog-menuitem')].filter(
      (item) => menuOf(item) === menu && !item.classList.contains('goog-menuitem-disabled'),
    );
  // Where the arrow keys stop: the items that show.
  const stops = (menu) => items(menu).filter(shows);
  // Where Slides would stop them: its own items, the ones we hide included.
  const slidesStops = (menu) =>
    items(menu).filter((item) => !isOurs(item) && (shows(item) || item.hasAttribute(HIDDEN)));

  // The menu has the keyboard while it has focus, or the button or menu bar that opened it does.
  // (During a slideshow, once ⋮ loses focus, as when its bar hides, the keys drive the slideshow.)
  function hasKeyboard(menu) {
    const focused = document.activeElement;
    return (
      focused === menu ||
      focused?.getAttribute('aria-expanded') === 'true' ||
      focused?.getAttribute('role') === 'menubar'
    );
  }

  // Slides highlights its items as the pointer comes onto them, and unhighlights them as it leaves.
  const hover = (item, type, from) =>
    item.dispatchEvent(new MouseEvent(type, { bubbles: true, relatedTarget: from }));

  // The menu, and the button or menu bar that opened it, name the highlighted item for screen
  // readers, as for Slides' own.
  function highlight(item) {
    if (item.classList.contains(HIGHLIGHT)) return;
    const menu = menuOf(item);
    let naming = [];
    for (const highlighted of menu.querySelectorAll(`.${HIGHLIGHT}`)) {
      naming.push(...document.querySelectorAll(`[aria-activedescendant="${highlighted.id}"]`));
      hover(highlighted, 'mouseout', item);
      highlighted.classList.remove(HIGHLIGHT);
    }
    if (!naming.length)
      naming = [menu, document.activeElement].filter(
        (element) => element && element !== document.body,
      );
    item.classList.add(HIGHLIGHT);
    for (const element of naming) element.setAttribute('aria-activedescendant', item.id);
    // Only one item shows highlighted: one of Slides' taking it (the pointer coming onto it), or the
    // menu closing, ends ours.
    const watch = new MutationObserver(() => {
      const taken = [...menu.querySelectorAll(`.${HIGHLIGHT}`)].some((other) => other !== item);
      if (item.classList.contains(HIGHLIGHT) && !taken && shows(menu)) return;
      watch.disconnect();
      unhighlight(item);
    });
    watch.observe(menu, { subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
  }

  function unhighlight(item) {
    item.classList.remove(HIGHLIGHT);
    for (const element of document.querySelectorAll(`[aria-activedescendant="${item.id}"]`))
      element.removeAttribute('aria-activedescendant');
  }

  // Slides' own arrow keys take its highlight to one of its items, from none highlighted: Down
  // starts at the first, Up at the last.
  function slidesHighlight(menu, target) {
    const list = slidesStops(menu);
    const at = list.indexOf(target);
    const [key, times] =
      at + 1 <= list.length - at ? ['ArrowDown', at + 1] : ['ArrowUp', list.length - at];
    for (let i = 0; i < times; i++) {
      document.activeElement.dispatchEvent(
        new KeyboardEvent('keydown', {
          key,
          code: key,
          keyCode: KEYS[key],
          which: KEYS[key],
          bubbles: true,
          cancelable: true,
        }),
      );
    }
  }

  // Where a key takes the highlight in a list, as Slides does: round from the end to the start, and
  // from none highlighted, Down to the first and Up to the last.
  function next(list, from, key) {
    const at = list.indexOf(from);
    if (key === 'Home') return list[0];
    if (key === 'End') return list.at(-1);
    if (key === 'ArrowDown') return list[(at + 1) % list.length];
    return list[at <= 0 ? list.length - 1 : at - 1];
  }

  // A Slides item's access key, as it marks it in the label.
  const slidesLetter = (item) =>
    item.querySelector('.goog-menuitem-mnemonic-hint')?.textContent.toLowerCase();

  // The item of ours whose access key this is, in the open menu, if Slides has no item with it.
  // Slides goes by the key pressed, not the character it types (keyCode), so the letter works
  // with Shift and in any keyboard layout, Cyrillic or Greek too.
  function chosenByLetter(menu, event) {
    const letter = String.fromCharCode(event.keyCode).toLowerCase();
    const mine = items(menu).find((item) => letters.get(item) === letter && shows(item));
    const slides = [...menu.querySelectorAll('.goog-menuitem')].some(
      (item) => !isOurs(item) && slidesLetter(item) === letter,
    );
    return mine && !slides ? mine : null;
  }

  function onKeydown(event) {
    if (!event.isTrusted || event.metaKey || event.ctrlKey || event.altKey || event.isComposing)
      return;
    const isLetter = event.keyCode >= 65 && event.keyCode <= 90;
    if (
      !isLetter &&
      (event.shiftKey || !['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter'].includes(event.key))
    )
      return;
    const menu = [...document.querySelectorAll(`.${MARK}`)].find(shows)?.closest('[role="menu"]');
    if (!menu || !shows(menu) || !hasKeyboard(menu)) return;
    // An access key chooses its item, as Enter does, with the menu opened by keyboard or pointer.
    const lettered = isLetter && chosenByLetter(menu, event);
    if (lettered) {
      event.preventDefault();
      event.stopImmediatePropagation();
      unhighlight(lettered);
      choices.get(lettered)();
      return;
    }
    if (event.shiftKey || !['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter'].includes(event.key))
      return;
    const current = menu.querySelector(`.${HIGHLIGHT}`);
    if (event.key === 'Enter') {
      if (!current || !isOurs(current)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      unhighlight(current);
      choices.get(current)();
      return;
    }
    const list = stops(menu);
    const target = next(list, current, event.key);
    const fromSlides = current && !isOurs(current) ? current : null;
    // Slides goes there itself.
    if (!isOurs(target) && next(slidesStops(menu), fromSlides, event.key) === target) {
      if (current && isOurs(current)) unhighlight(current);
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    if (isOurs(target)) return highlight(target);
    if (current && isOurs(current)) unhighlight(current);
    if (fromSlides) {
      hover(fromSlides, 'mouseout', target);
      fromSlides.classList.remove(HIGHLIGHT);
    }
    slidesHighlight(menu, target);
  }

  // Makes one of our items work like Slides' own: `choose` is what Enter on it does. (Each item
  // handles its own click, since Slides closes its menus differently.)
  globalThis.slidesCompanion.menuItem = (item, choose) => {
    item.id ||= `slides-companion-menuitem-${++count}`;
    item.classList.add(MARK);
    choices.set(item, choose);
    item.addEventListener('mouseenter', () => highlight(item));
    item.addEventListener('mouseleave', () => unhighlight(item));
    item.addEventListener('mousedown', (event) => event.stopPropagation());
    return item;
  };

  // Gives one of our items an access key, a letter that chooses it while its menu is open, written
  // as Slides writes its own (in its menu bar's menus; its right-click and slideshow menus have
  // none): the letter's first appearance in the label, whatever its case, marked; or, when the label
  // hasn't it (Japanese, Arabic…), the letter in capitals after it, "(O)". Slides shows either only
  // when the menu was opened from the keyboard. Screen readers hear the label, then the letter.
  // Once per item, on its words alone.
  globalThis.slidesCompanion.accessKey = (item, key) => {
    const letter = key.toLowerCase();
    const label = item.querySelector('.goog-menuitem-label');
    const words = label.textContent;
    const span = (className, ...children) => {
      const element = document.createElement('span');
      element.className = className;
      element.style.userSelect = 'none';
      element.append(...children);
      return element;
    };
    const characters = [...words];
    const at = characters.findIndex((character) => character.toLowerCase() === letter);
    const parts =
      at < 0
        ? [
            words,
            span(
              'goog-menuitem-mnemonic-separator',
              '(',
              span('goog-menuitem-mnemonic-hint', letter.toUpperCase()),
              ')',
            ),
          ]
        : [
            characters.slice(0, at).join(''),
            span('goog-menuitem-mnemonic-hint', characters[at]),
            characters.slice(at + 1).join(''),
          ];
    label.replaceChildren(...parts.filter((part) => part !== ''));
    label.setAttribute('aria-label', `${words} ${letter}`);
    letters.set(item, letter);
  };

  window.addEventListener('keydown', onKeydown, true);

  // Hides one of Slides' items, or shows it again. The arrow keys pass it by.
  globalThis.slidesCompanion.hideMenuItem = (item, hidden) => {
    item.style.display = hidden ? 'none' : '';
    item.toggleAttribute(HIDDEN, hidden);
  };
}

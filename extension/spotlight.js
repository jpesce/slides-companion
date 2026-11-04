// Spotlight: select an image and press Space to see it full screen on a black stage, like Slides'
// own slideshow, then go through the slide's other images like a gallery. With several images
// selected, the gallery goes through just those. Also offered as "Spotlight image" in the
// right-click menu, and during a slideshow by clicking an image. Also during a slideshow, a link
// clicked opens its page on the same stage, so the presenter never leaves the slideshow. Rewritten
// from Image Spotlight for Google Slides.
{
  const SVG_NS = 'http://www.w3.org/2000/svg';
  // The slideshow runs in its own page: an iframe in the editor, or a window of its own.
  const IN_SLIDESHOW = /\/(local)?present$/.test(location.pathname);
  // Slide and object groups: `g#editor-<id>` in the editor, `g#<id>` in the slideshow.
  const OBJECT = IN_SLIDESHOW ? 'g[id]' : '[id^="editor-"]';
  // Slides outlines each selected object with a path in this colour, inside the object's group.
  const SELECTION_OUTLINE = 'path[stroke="#8ab4f8"]';
  const MENU_ITEM_CLASS = 'slides-companion-spotlight-menuitem';
  // Matches the duration of the exit fade in spotlight.css.
  const EXIT_MS = 75;
  // The pointer hides after resting this long; the controls also show this long when the gallery opens.
  const IDLE_MS = 2000;
  const icon = (path) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
  const CLOSE_ICON = icon('M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z');
  const PREVIOUS_ICON = icon('M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z');
  const NEXT_ICON = icon('M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z');
  const NEW_TAB_ICON = icon('M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3z');

  let gallery = null;
  // The last key pressed while the gallery was open, while it's held down.
  let heldKey = null;

  // ----- Slide structure -----

  // Slides draws each slide and each object on it as a group (see OBJECT); text paragraphs and the
  // slide background get `-paragraph-N` and `-bg` suffixes.
  function isObject(element) {
    return element.matches(OBJECT) && !/-bg$|-paragraph-\d+$/.test(element.id);
  }

  function parentObject(element) {
    for (let node = element.parentElement?.closest(OBJECT); node; node = node.parentElement?.closest(OBJECT)) {
      if (isObject(node)) return node;
    }
    return null;
  }

  // The slide: the editor group that holds the objects and its own `-bg` background group.
  function slideOf(object) {
    for (let group = parentObject(object); group; group = parentObject(group)) {
      if (background(group)) return group;
    }
    return null;
  }

  // A direct child in the editor; wrapped in an extra group in the slideshow.
  function background(slide) {
    return slide.querySelector(`[id="${CSS.escape(slide.id)}-bg"]`);
  }

  // Objects directly inside a slide or a group.
  function childObjects(container) {
    return [...container.querySelectorAll(OBJECT)].filter(
      (element) => isObject(element) && parentObject(element) === container,
    );
  }

  // A video shows its first frame with a play button over it: neither is an image to spotlight.
  const VIDEO_MARK = 'image[*|href*="/presentations/images/play-overlay"]';
  const hasImage = (object) =>
    [...object.querySelectorAll('image')].some((image) => !parentObject(image)?.querySelector(VIDEO_MARK));
  // In a slideshow, objects waiting for their animation are on the slide but not shown yet.
  const isShowing = (object) => object.checkVisibility({ opacityProperty: true, visibilityProperty: true });

  // ----- Selection -----

  function selectedObjects() {
    const outlines = document.querySelectorAll(`#workspace ${SELECTION_OUTLINE}`);
    return [...new Set([...outlines].map((outline) => outline.closest('[id^="editor-"]')).filter(Boolean))];
  }

  // Space only spotlights when no text is being edited (the font menu shows whenever text is in
  // play: a text box being edited or selected, speaker notes) and the selection includes an image.
  function spotlightableSelection() {
    if (isShown(document.querySelector('#docs-font-family'))) return null;
    const selection = selectedObjects().filter(hasImage);
    return selection.length ? selection : null;
  }

  function isShown(element) {
    return Boolean(element?.getClientRects().length);
  }

  // ----- Gallery contents -----

  // Several images selected: just those. One: every image on its slide, starting from it.
  function galleryItems(selection) {
    if (selection.length > 1) return { items: inReadingOrder(selection), start: 0 };

    const [chosen] = selection;
    const slide = slideOf(chosen);
    const stops = slide ? stopsIn(slide) : [];
    // A whole group whose images are shown on their own: start from its first image.
    const inside = stops.filter((stop) => stop !== chosen && chosen.contains(stop));
    if (inside.length) {
      const items = inReadingOrder(stops);
      return { items, start: items.indexOf(inReadingOrder(inside)[0]) };
    }
    // An image picked from inside a group stands in for that group.
    const holder = stops.findIndex((stop) => stop === chosen || stop.contains(chosen));
    if (holder === -1) stops.push(chosen);
    else stops[holder] = chosen;
    const items = inReadingOrder(stops);
    return { items, start: items.indexOf(chosen) };
  }

  // A group is one stop, unless the "When images are grouped" setting says to show each image.
  function stopsIn(container) {
    const apart = globalThis.slidesCompanion.settings.get('groupedImages') === 'apart';
    return childObjects(container)
      .filter((object) => hasImage(object) && isShowing(object))
      .flatMap((object) => (apart && childObjects(object).some(hasImage) ? stopsIn(object) : [object]));
  }

  // Top to bottom, then left to right; objects that overlap vertically share a row.
  function inReadingOrder(objects) {
    const placed = objects
      .map((object) => ({ object, bounds: visibleBounds(object) }))
      .filter(({ bounds }) => bounds)
      .sort((a, b) => a.bounds.y - b.bounds.y);
    const rows = [];
    for (const item of placed) {
      const row = rows.at(-1);
      if (row && item.bounds.y < row.top + row.height / 2) {
        row.items.push(item);
        row.height = Math.min(row.height, item.bounds.height);
      } else {
        rows.push({ top: item.bounds.y, height: item.bounds.height, items: [item] });
      }
    }
    return rows.flatMap((row) => row.items.sort((a, b) => a.bounds.x - b.bounds.x)).map(({ object }) => object);
  }

  // ----- Geometry -----

  // What the object shows, in slide units: clip paths (Slides crops images with them) count
  // instead of what they clip, and invisible hit areas and the selection outline don't count.
  function visibleBounds(object) {
    const slide = slideOf(object);
    if (!slide) return null;
    const toSlide = slide.getCTM()?.inverse();
    if (!toSlide) return null;
    const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };

    const add = (element, local) => {
      const ctm = element.getCTM();
      if (!ctm || !(local.width || local.height)) return;
      const matrix = toSlide.multiply(ctm);
      for (const [x, y] of [[local.x, local.y], [local.x + local.width, local.y], [local.x, local.y + local.height], [local.x + local.width, local.y + local.height]]) {
        const point = new DOMPoint(x, y).matrixTransform(matrix);
        box.minX = Math.min(box.minX, point.x);
        box.minY = Math.min(box.minY, point.y);
        box.maxX = Math.max(box.maxX, point.x);
        box.maxY = Math.max(box.maxY, point.y);
      }
    };

    for (const element of object.querySelectorAll('*')) {
      if (element.closest('clipPath') || element.matches(SELECTION_OUTLINE)) continue;
      const clippedBy = element.parentElement.closest('[clip-path]');
      if (clippedBy && object.contains(clippedBy)) continue;

      const clipId = element.getAttribute('clip-path')?.match(/url\(#([^)]+)\)/)?.[1];
      if (clipId) {
        const clipPath = document.getElementById(clipId);
        for (const shape of clipPath?.children ?? []) add(element, shape.getBBox());
      } else if (element.matches('image, path, rect, circle, ellipse, line, polyline, polygon, text') && isPainted(element)) {
        add(element, element.getBBox());
      }
    }

    const width = box.maxX - box.minX;
    const height = box.maxY - box.minY;
    return width > 0 && height > 0 ? { x: box.minX, y: box.minY, width, height } : null;
  }

  function isPainted(element) {
    if (element.matches('image')) return true;
    const style = getComputedStyle(element);
    return style.visibility !== 'hidden' && (style.fill !== 'none' || style.stroke !== 'none');
  }

  // ----- Rendering -----

  // A fresh SVG with the slide background and the object, cropped to what the object shows.
  function render(object) {
    const slide = slideOf(object);
    const bounds = visibleBounds(object);
    if (!slide || !bounds) return null;
    const toSlide = slide.getCTM().inverse();

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`);
    svg.style.setProperty('--slides-companion-ratio', bounds.width / bounds.height);
    svg.append(background(slide).cloneNode(true));

    // Keep any transform from groups the object sits in.
    const placed = document.createElementNS(SVG_NS, 'g');
    const { a, b, c, d, e, f } = toSlide.multiply(object.parentElement.getCTM());
    placed.setAttribute('transform', `matrix(${a} ${b} ${c} ${d} ${e} ${f})`);
    const copy = object.cloneNode(true);
    copy.querySelectorAll(SELECTION_OUTLINE).forEach((outline) => outline.remove());
    placed.append(copy);
    svg.append(placed);

    giveUniqueIds(svg);
    return svg;
  }

  // Copies share ids with the originals (clip paths, gradients); rename them and their references.
  function giveUniqueIds(root) {
    const renamed = new Map();
    root.querySelectorAll('[id]').forEach((element) => {
      const id = `slides-companion-${element.id}`;
      renamed.set(element.id, id);
      element.id = id;
    });
    root.querySelectorAll('*').forEach((element) => {
      for (const attribute of element.attributes) {
        const value = attribute.value
          .replace(/url\(#([^)]+)\)/g, (match, id) => (renamed.has(id) ? `url(#${renamed.get(id)})` : match))
          .replace(/^#(.+)$/, (match, id) => (renamed.has(id) ? `#${renamed.get(id)}` : match));
        if (value !== attribute.value) attribute.value = value;
      }
    });
  }

  // ----- Stage -----

  function openGallery(selection) {
    if (gallery) return;
    const { items, start } = galleryItems(selection);
    if (start !== -1) openStage(items, start, 'Spotlight');
  }

  // Items are objects on the slide, or a page a link goes to: { address, shown }.
  const isPage = (item) => !(item instanceof Element);
  const siteName = (page) => page.address.hostname.replace(/^www\./, '');

  function openStage(items, start, label) {
    const stage = document.createElement('div');
    stage.className = 'slides-companion-spotlight';
    stage.setAttribute('role', 'dialog');
    stage.setAttribute('aria-modal', 'true');
    stage.setAttribute('aria-label', label);
    stage.innerHTML = `
      <div class="slides-companion-spotlight-picture"></div>
      <div class="slides-companion-spotlight-bar slides-companion-spotlight-closer">
        <button type="button" class="slides-companion-spotlight-close" aria-label="Close" title="Close (Esc)">${CLOSE_ICON}</button>
      </div>
      <div class="slides-companion-spotlight-bar slides-companion-spotlight-navbar">
        <button type="button" class="slides-companion-spotlight-previous" aria-label="Previous image" title="Previous (←)">${PREVIOUS_ICON}</button>
        <div class="slides-companion-spotlight-page" aria-hidden="true"></div>
        <button type="button" class="slides-companion-spotlight-next" aria-label="Next image" title="Next (→)">${NEXT_ICON}</button>
      </div>
      <div class="slides-companion-spotlight-bar slides-companion-spotlight-sitebar" hidden>
        <div class="slides-companion-spotlight-site"></div>
        <button type="button" class="slides-companion-spotlight-new-tab" aria-label="Open in new tab" title="Open in new tab">${NEW_TAB_ICON}</button>
      </div>
      <div class="slides-companion-spotlight-cursor" aria-hidden="true">${NEXT_ICON}</div>
      <div class="slides-companion-spotlight-status" aria-live="polite"></div>`;

    // pressed: whether a press has started on the stage. The second click of a double click that
    // opened it began before it (its press counts on from the first), so it does nothing.
    // returnFocusTo: where keys went before, for them to go there again once it closes.
    const returnFocusTo = document.activeElement;
    gallery = { stage, items, index: -1, idleTimer: 0, flashTimer: 0, pointer: null, pressed: false, returnFocusTo };

    // Keep the pointer to ourselves so Slides doesn't react to it behind the stage.
    for (const type of ['mousedown', 'mouseup', 'click', 'contextmenu']) {
      stage.addEventListener(type, (event) => {
        event.stopPropagation();
        if (type === 'contextmenu') event.preventDefault();
      });
    }
    stage.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();
        event.stopPropagation();
      },
      { passive: false },
    );
    stage.addEventListener('mousedown', (event) => {
      if (event.detail === 1) gallery.pressed = true;
    });
    stage.addEventListener('click', onClick);
    stage.addEventListener('mousemove', onMouseMove);
    // Leaving the stage, or going over a page, where the stage no longer hears the pointer.
    const pointerGone = () => {
      gallery.pointer = null;
      stage.classList.remove('slides-companion-spotlight-can-move');
      updateBars();
    };
    stage.addEventListener('mouseleave', pointerGone);
    stage.addEventListener('mouseout', (event) => event.relatedTarget?.matches?.('iframe') && pointerGone());

    document.body.append(stage);
    if (!show(start)) {
      stage.remove();
      gallery = null;
      return;
    }
    stage.getBoundingClientRect(); // Start the fade from transparent.
    stage.classList.add('slides-companion-spotlight-open');
    if (IN_SLIDESHOW) keepEscape(true);
    // Show the controls briefly so it's clear how to move and leave; after that, only on approach.
    gallery.flashTimer = setTimeout(() => {
      if (!gallery) return;
      gallery.flashTimer = 0;
      updateBars();
    }, IDLE_MS);
    updateBars();
  }

  function show(index) {
    if (!gallery || index < 0 || index >= gallery.items.length || index === gallery.index) return false;
    const item = gallery.items[index];
    const picture = isPage(item) ? pageFrame(item) : render(item);
    if (!picture) return false;
    gallery.index = index;
    gallery.stage.querySelector('.slides-companion-spotlight-picture').replaceChildren(picture);
    updateNavbar();
    const count = gallery.items.length;
    gallery.stage.querySelector('.slides-companion-spotlight-status').textContent =
      count > 1 ? `Image ${index + 1} of ${count}` : '';
    return true;
  }

  // The page, live. Sandboxed without top navigation, so it can't take the slideshow's window.
  function pageFrame({ address, shown }) {
    const frame = document.createElement('iframe');
    frame.className = 'slides-companion-spotlight-website';
    frame.title = address.hostname;
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads allow-presentation');
    frame.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    frame.src = shown;
    return frame;
  }

  const step = (delta) => gallery && show(gallery.index + delta);

  function closeStage() {
    if (!gallery) return;
    const { stage, idleTimer, flashTimer, returnFocusTo } = gallery;
    gallery = null;
    clearTimeout(idleTimer);
    clearTimeout(flashTimer);
    if (IN_SLIDESHOW) keepEscape(false);
    // A click on a button or into a page took the keys onto the stage.
    if (stage.contains(document.activeElement)) returnFocusTo?.focus({ preventScroll: true });
    stage.classList.remove('slides-companion-spotlight-open');
    setTimeout(() => stage.remove(), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : EXIT_MS);
  }

  // ----- Controls -----

  // The ‹ 2/5 › bar: the position out of the total, between previous and next. Hidden for one image.
  // For a page, a bar naming its site, with a way to open it in a new tab instead.
  function updateNavbar() {
    const { items, index, stage } = gallery;
    const count = items.length;
    const page = isPage(items[index]) ? items[index] : null;
    stage.querySelector('.slides-companion-spotlight-sitebar').hidden = !page;
    stage.querySelector('.slides-companion-spotlight-site').textContent = page ? siteName(page) : '';
    stage.querySelector('.slides-companion-spotlight-navbar').hidden = count < 2;
    stage.querySelector('.slides-companion-spotlight-page').textContent = `${index + 1}/${count}`;
    stage.querySelector('.slides-companion-spotlight-previous').disabled = index === 0;
    stage.querySelector('.slides-companion-spotlight-next').disabled = index === count - 1;
  }

  // The controls live in the safe areas above and below the picture, and show only while the
  // pointer is in one of them, so moving the mouse over the picture shows nothing.
  function updateBars() {
    const { stage, pointer, flashTimer } = gallery;
    const area = stage.querySelector('.slides-companion-spotlight-picture').getBoundingClientRect();
    const shown = Boolean(flashTimer) || Boolean(pointer && (pointer.y < area.top || pointer.y > area.bottom));
    for (const bar of stage.querySelectorAll('.slides-companion-spotlight-bar')) {
      bar.classList.toggle('slides-companion-spotlight-bar-shown', shown);
    }
  }

  // The pointer shows while it moves and hides when it rests, like in the slideshow.
  function revealPointer() {
    gallery.stage.classList.add('slides-companion-spotlight-pointer');
    clearTimeout(gallery.idleTimer);
    gallery.idleTimer = setTimeout(() => gallery?.stage.classList.remove('slides-companion-spotlight-pointer'), IDLE_MS);
  }

  // A click on the left third goes back, on the right third forward. The middle third and the safe
  // areas above and below the picture do nothing, and keep the regular pointer.
  function clickDirection(event) {
    const area = gallery.stage.querySelector('.slides-companion-spotlight-picture').getBoundingClientRect();
    if (event.clientY < area.top || event.clientY > area.bottom) return 0;
    if (event.clientX < innerWidth / 3) return -1;
    if (event.clientX > (innerWidth * 2) / 3) return 1;
    return 0;
  }

  // Where a click can move, the pointer becomes an arrow pointing the way it goes.
  function onMouseMove(event) {
    gallery.pointer = { x: event.clientX, y: event.clientY };
    updateBars();
    revealPointer();
    const direction = clickDirection(event);
    const target = gallery.index + direction;
    const canMove = direction !== 0 && target >= 0 && target < gallery.items.length;
    gallery.stage.classList.toggle('slides-companion-spotlight-can-move', canMove);
    gallery.stage.classList.toggle('slides-companion-spotlight-back', direction < 0);
    gallery.stage.querySelector('.slides-companion-spotlight-cursor').style.translate = `${event.clientX}px ${event.clientY}px`;
  }

  function onClick(event) {
    if (!gallery.pressed) return onMouseMove(event);
    const bar = event.target.closest('.slides-companion-spotlight-bar');
    if (bar) {
      if (event.target.closest('.slides-companion-spotlight-close')) closeStage();
      else if (event.target.closest('.slides-companion-spotlight-new-tab')) openInNewTab();
      else if (event.target.closest('.slides-companion-spotlight-previous')) step(-1);
      else if (event.target.closest('.slides-companion-spotlight-next')) step(1);
      return;
    }
    const direction = clickDirection(event);
    if (direction) step(direction);
    onMouseMove(event);
  }

  // The slide comes back first, so it's there on coming back to this tab.
  function openInNewTab() {
    const { address } = gallery.items[gallery.index];
    closeStage();
    window.open(address.href, '_blank', 'noopener');
  }

  // ----- Keyboard -----

  const NAVIGATION = {
    ArrowRight: () => step(1),
    ArrowDown: () => step(1),
    PageDown: () => step(1),
    ArrowLeft: () => step(-1),
    ArrowUp: () => step(-1),
    PageUp: () => step(-1),
    Home: () => show(0),
    End: () => show(gallery.items.length - 1),
    Escape: closeStage,
    ' ': closeStage,
    Enter: closeStage,
  };
  const CLOSING_KEYS = ['Escape', ' ', 'Enter'];

  function onKeydown(event) {
    if (gallery) {
      // Slides must not act on keys while the stage covers it (Delete would delete the selection).
      event.stopImmediatePropagation();
      if (!event.metaKey && !event.ctrlKey) event.preventDefault();
      // The Space that opened the gallery, held down, doesn't close it again.
      if (event.repeat && CLOSING_KEYS.includes(event.key)) return;
      heldKey = event.key;
      if (!event.metaKey && !event.ctrlKey && !event.altKey) NAVIGATION[event.key]?.();
      return;
    }
    // The key that closed the gallery, still held down: its repeats mustn't reach Slides (Space and
    // Enter would skip slides, Esc would end the slideshow).
    if (heldKey === event.key) {
      if (event.repeat) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      onKeyUp(); // A new press: its release went unheard.
    }
    if (IN_SLIDESHOW) return;
    if (event.key !== ' ' || event.repeat || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    if (isInteractiveTarget(event.target)) return;
    const selection = spotlightableSelection();
    if (!selection) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openGallery(selection);
  }

  // Controls outside the slide canvas, where Space types or presses: the comment box, find and
  // replace, buttons (including our companion and Settings).
  function isInteractiveTarget(target) {
    if (!(target instanceof Element) || target.ownerDocument !== document) return false;
    return Boolean(
      target.closest('input, textarea, select, button, a[href], [role="button"], [role="dialog"], [contenteditable=""], [contenteditable="true"]'),
    );
  }

  // Keys reach Slides through a hidden iframe while editing, and the page itself otherwise.
  const listened = new WeakSet();
  function listen(target) {
    if (!target || listened.has(target)) return;
    listened.add(target);
    target.addEventListener('keydown', onKeydown, true);
    target.addEventListener('keyup', onKeyUp, true);
  }

  // Registered at document_start in the slideshow, so it hears keys before Slides does.
  listen(window);
  function listenToTextTarget() {
    const iframe = document.querySelector('iframe.docs-texteventtarget-iframe');
    if (!iframe?.contentWindow) return false;
    listen(iframe.contentWindow);
    return true;
  }
  if (!IN_SLIDESHOW && !listenToTextTarget()) {
    const observer = new MutationObserver(() => {
      if (listenToTextTarget()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ----- Right-click menu -----

  function createMenuItem(selection) {
    const item = document.createElement('div');
    item.className = `goog-menuitem apps-menuitem ${MENU_ITEM_CLASS}`;
    item.setAttribute('role', 'menuitem');
    item.innerHTML = `
      <div class="goog-menuitem-content">
        <div class="docs-icon goog-inline-block goog-menuitem-icon" aria-hidden="true">
          <div class="docs-icon-img-container docs-icon-img docs-icon-editors-ia-fullscreen"></div>
        </div>
        <span class="goog-menuitem-label">Spotlight image</span>
        <span class="goog-menuitem-accel" aria-label="Space">Space</span>
      </div>`;

    // Slides' menu doesn't know this item, so mirror its hover highlight by hand.
    item.addEventListener('mouseenter', () => {
      for (const highlighted of item.parentElement.querySelectorAll('.goog-menuitem-highlight')) {
        if (highlighted === item) continue;
        highlighted.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: item }));
        highlighted.classList.remove('goog-menuitem-highlight');
      }
      item.classList.add('goog-menuitem-highlight');
    });
    item.addEventListener('mouseleave', () => item.classList.remove('goog-menuitem-highlight'));
    item.addEventListener('mousedown', (event) => event.stopPropagation());
    item.addEventListener('click', (event) => {
      event.stopPropagation();
      const menu = item.parentElement;
      // Escape closes the menu through Slides itself, which also returns focus to the slide.
      menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
      openGallery(selection);
    });
    return item;
  }

  function addToContextMenu(framesLeft = 10) {
    const menu = [...document.querySelectorAll('.goog-menu[role="menu"]')].find(isShown);
    if (!menu) {
      if (framesLeft > 0) requestAnimationFrame(() => addToContextMenu(framesLeft - 1));
      return;
    }
    // Slides reuses the menu element, so drop what we added last time.
    menu.querySelectorAll(`.${MENU_ITEM_CLASS}`).forEach((added) => added.remove());
    const selection = spotlightableSelection();
    if (!selection) return;

    const item = createMenuItem(selection);
    // Lead the image group ("Crop image", "Replace image"…), or close the menu when it has none.
    const crop = menu.querySelector('.docs-icon-editors-ia-crop')?.closest('.goog-menuitem');
    if (crop) {
      crop.before(item);
    } else {
      const separator = [...menu.querySelectorAll('.goog-menuseparator')].find(isShown);
      if (separator) {
        const copy = separator.cloneNode(true);
        copy.removeAttribute('id');
        copy.classList.add(MENU_ITEM_CLASS);
        menu.append(copy);
      }
      menu.append(item);
    }
  }

  if (!IN_SLIDESHOW) document.addEventListener('contextmenu', () => requestAnimationFrame(() => addToContextMenu()), true);

  // ----- Slideshow -----

  // A plain click on the slide, with the stage closed. With the pen on, clicks draw. (The laser
  // pointer keeps clicks, like links and videos do.)
  function plainClickOnSlide(event, selector) {
    if (gallery || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return null;
    if (document.querySelector('.sketchyViewerContent.disable-pointer-events')) return null;
    return event.target instanceof Element ? event.target.closest(`.punch-viewer-svgpage-svgcontainer ${selector}`) : null;
  }

  // During a slideshow a click goes to the next slide; on an image, it spotlights the image
  // instead, unless the "When you click an image during a slideshow" setting says otherwise.
  function clickedImage(event) {
    if (!globalThis.slidesCompanion.settings.get('spotlightOnClick')) return null;
    const image = plainClickOnSlide(event, 'image');
    if (!image || image.closest('a')) return null;
    const object = parentObject(image);
    return object && slideOf(object) && isShowing(object) ? object : null;
  }

  // A link opens a new tab; it opens its page on the stage instead, unless the "When you click a
  // link during a slideshow" setting says otherwise. Ctrl/⌘-click and middle click still open a tab.
  function clickedPage(event) {
    if (globalThis.slidesCompanion.settings.get('slideshowLinks') !== 'here') return null;
    const link = plainClickOnSlide(event, 'a');
    const address = link && linkAddress(link);
    return address && { address, shown: shownAddress(address) };
  }

  // Slides sends links through Google's redirect (google.com/url?q=<address>). Links to a slide of
  // the deck are Slides' own to follow.
  function linkAddress(link) {
    const href = link.href?.baseVal ?? link.getAttribute('href') ?? '';
    if (href.startsWith('#')) return null;
    try {
      let address = new URL(href, location.href);
      if (address.hostname === 'www.google.com' && address.pathname === '/url') address = new URL(address.searchParams.get('q'));
      if (!['http:', 'https:'].includes(address.protocol)) return null;
      if (address.origin === location.origin && address.pathname === location.pathname) return null;
      return address;
    } catch {
      return null;
    }
  }

  // YouTube refuses to show its watch page inside another page, but its embedded player may be:
  // the video plays from where the link starts it (?t=90, 1m30s).
  function shownAddress(address) {
    const host = address.hostname.replace(/^(www|m)\./, '');
    const id =
      host === 'youtu.be' ? address.pathname.slice(1) : host === 'youtube.com' && address.pathname === '/watch' ? address.searchParams.get('v') : null;
    if (!id) return address.href;
    const player = new URL(`https://www.youtube.com/embed/${encodeURIComponent(id)}`);
    player.searchParams.set('autoplay', '1');
    const [, hours = 0, minutes = 0, seconds = 0] = (address.searchParams.get('t') ?? '').match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/) ?? [];
    const start = hours * 3600 + minutes * 60 + Number(seconds);
    if (start) player.searchParams.set('start', start);
    return player.href;
  }

  function openPage(page) {
    openStage([page], 0, siteName(page));
  }

  if (IN_SLIDESHOW) {
    // Listening on the window at document_start puts us ahead of Slides' own click handling.
    window.addEventListener(
      'click',
      (event) => {
        const page = clickedPage(event);
        const object = !page && clickedImage(event);
        if (!page && !object) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (page) {
          // The click focused the link, where keys don't reach the slideshow once it's back.
          event.target.closest('a').blur();
          openPage(page);
        } else {
          openGallery([object]);
        }
      },
      true,
    );
    // While zoomed in, the zoom keeps clicks from Slides, except the ones the spotlight takes.
    globalThis.slidesCompanion.spotlightTakesClick = (event) => Boolean(clickedImage(event));
    // The slide can change under the gallery (it advances by itself, or from Next in the presenter
    // view): the gallery was about the slide that's gone. Slides labels the slide ("Slide 3 of 9").
    let slideName = null;
    new MutationObserver(() => {
      const name = document.querySelector('.punch-viewer-svgpage-a11yelement')?.getAttribute('aria-label');
      if (!name || name === slideName) return;
      slideName = name;
      closeStage();
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-label'] });
    // A pointing hand over images says they can be clicked.
    window.addEventListener(
      'mousemove',
      (event) => document.documentElement.classList.toggle('slides-companion-over-image', Boolean(clickedImage(event))),
      { capture: true, passive: true },
    );
  }

  // In full screen, Esc is the browser's: it leaves full screen, which ends Slides' slideshow,
  // before the page hears the key. While the gallery is open, the page asks to keep Esc (only the
  // top page may), so Esc closes the gallery and the slideshow goes on.
  const ESCAPE_MESSAGE = 'slides-companion-keep-escape';
  function keepEscape(keep) {
    // Chrome takes the key's release as an Esc press too, so Esc goes back to it only once released.
    if (!keep && heldKey === 'Escape') return;
    window.top.postMessage({ type: ESCAPE_MESSAGE, keep }, location.origin);
  }
  function onKeyUp(event) {
    if (!heldKey || (event?.type === 'keyup' && event.key !== heldKey)) return;
    const released = heldKey;
    heldKey = null;
    if (IN_SLIDESHOW && released === 'Escape' && !gallery) keepEscape(false);
  }
  // The release may happen elsewhere, unheard.
  window.addEventListener('blur', onKeyUp);
  if (window === window.top) {
    window.addEventListener('message', (event) => {
      if (event.origin !== location.origin || event.data?.type !== ESCAPE_MESSAGE || !navigator.keyboard) return;
      if (event.data.keep) navigator.keyboard.lock(['Escape']).catch(() => {});
      else navigator.keyboard.unlock();
    });
    // Leaving full screen another way (the green button, a gesture) ends the slideshow with the
    // gallery open, and Esc goes back to the browser for the next one.
    document.addEventListener('fullscreenchange', () => document.fullscreenElement || navigator.keyboard?.unlock());
  }
}

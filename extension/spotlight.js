// Spotlight: select an image and press Space to see it full screen on a black stage, like Slides'
// own slideshow, then go through the slide's other images like a gallery. With several images
// selected, the gallery goes through just those. Also offered as "Spotlight image" in the
// right-click menu. Rewritten from Image Spotlight for Google Slides.
{
  const SVG_NS = 'http://www.w3.org/2000/svg';
  // Slides outlines each selected object with a path in this colour, inside the object's group.
  const SELECTION_OUTLINE = 'path[stroke="#8ab4f8"]';
  const MENU_ITEM_CLASS = 'slides-companion-spotlight-menuitem';
  // Matches the duration of the exit fade in spotlight.css.
  const EXIT_MS = 75;
  // Like the slideshow's controls, ours hide after the mouse rests this long.
  const CONTROLS_IDLE_MS = 2000;
  // Up to this many images get a full-size dot each; beyond it, dots shrink toward the ends.
  const ALL_DOTS_UP_TO = 7;
  const DOT_WINDOW = 5;
  const CLOSE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';

  let gallery = null;

  // ----- Slide structure -----

  // Slides draws each slide and each object on it as a `g#editor-<id>`; text paragraphs and the
  // slide background get `-paragraph-N` and `-bg` suffixes.
  function isObject(element) {
    return /^editor-/.test(element.id) && !/-bg$|-paragraph-\d+$/.test(element.id);
  }

  function parentObject(element) {
    for (let node = element.parentElement?.closest('[id^="editor-"]'); node; node = node.parentElement?.closest('[id^="editor-"]')) {
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

  function background(slide) {
    return slide.querySelector(`:scope > [id="${CSS.escape(slide.id)}-bg"]`);
  }

  // Objects directly inside a slide or a group.
  function childObjects(container) {
    return [...container.querySelectorAll('[id^="editor-"]')].filter(
      (element) => isObject(element) && parentObject(element) === container,
    );
  }

  const hasImage = (object) => Boolean(object.querySelector('image'));

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
      .filter(hasImage)
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

  function open(selection) {
    if (gallery) return;
    const { items, start } = galleryItems(selection);
    if (start === -1) return;

    const stage = document.createElement('div');
    stage.className = 'slides-companion-spotlight';
    stage.setAttribute('role', 'dialog');
    stage.setAttribute('aria-modal', 'true');
    stage.setAttribute('aria-label', 'Spotlight');
    stage.innerHTML = `
      <div class="slides-companion-spotlight-picture"></div>
      <button type="button" class="slides-companion-spotlight-close" aria-label="Close">${CLOSE_ICON}</button>
      <div class="slides-companion-spotlight-dots" aria-hidden="true"></div>
      <div class="slides-companion-spotlight-status" aria-live="polite"></div>`;

    gallery = { stage, items, index: -1, idleTimer: 0 };

    // Keep the pointer to ourselves so Slides doesn't react to it behind the stage.
    for (const type of ['mousedown', 'mouseup', 'click', 'contextmenu']) {
      stage.addEventListener(type, (event) => {
        event.stopPropagation();
        if (type === 'contextmenu') event.preventDefault();
      });
    }
    stage.addEventListener('wheel', (event) => event.preventDefault(), { passive: false });
    stage.addEventListener('click', onClick);
    stage.addEventListener('mousemove', onMouseMove);

    document.body.append(stage);
    if (!show(start)) {
      stage.remove();
      gallery = null;
      return;
    }
    stage.getBoundingClientRect(); // Start the fade from transparent.
    stage.classList.add('slides-companion-spotlight-open');
    // Show the controls briefly so it's clear there is more to see.
    revealControls();
  }

  function show(index) {
    if (!gallery || index < 0 || index >= gallery.items.length || index === gallery.index) return false;
    const picture = render(gallery.items[index]);
    if (!picture) return false;
    gallery.index = index;
    gallery.stage.querySelector('.slides-companion-spotlight-picture').replaceChildren(picture);
    updateDots();
    const count = gallery.items.length;
    gallery.stage.querySelector('.slides-companion-spotlight-status').textContent =
      count > 1 ? `Image ${index + 1} of ${count}` : '';
    return true;
  }

  const step = (delta) => gallery && show(gallery.index + delta);

  function close() {
    if (!gallery) return;
    const { stage, idleTimer } = gallery;
    gallery = null;
    clearTimeout(idleTimer);
    stage.classList.remove('slides-companion-spotlight-open');
    setTimeout(() => stage.remove(), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : EXIT_MS);
  }

  // ----- Controls -----

  // Dots after Porto Rocha's case-study gallery: one per image, the current one solid. With more
  // than ALL_DOTS_UP_TO images, a window of DOT_WINDOW dots slides along and the dots beyond it
  // shrink, saying "more this way".
  function updateDots() {
    const { items, index, stage } = gallery;
    const dots = stage.querySelector('.slides-companion-spotlight-dots');
    const count = items.length;
    if (count < 2) {
      dots.replaceChildren();
      return;
    }
    const windowSize = count <= ALL_DOTS_UP_TO ? count : DOT_WINDOW;
    const first = Math.min(Math.max(index - Math.floor(windowSize / 2), 0), count - windowSize);
    const last = first + windowSize - 1;
    const sizes = ['', 'slides-companion-spotlight-dot-small', 'slides-companion-spotlight-dot-smaller'];

    dots.replaceChildren(
      ...items.flatMap((item, i) => {
        const distance = i < first ? first - i : i > last ? i - last : 0;
        if (distance >= sizes.length) return [];
        const dot = document.createElement('span');
        dot.className = `slides-companion-spotlight-dot ${sizes[distance]}`.trim();
        if (i === index) dot.classList.add('slides-companion-spotlight-dot-current');
        return [dot];
      }),
    );
  }

  function revealControls() {
    if (!gallery) return;
    gallery.stage.classList.add('slides-companion-spotlight-controls');
    clearTimeout(gallery.idleTimer);
    gallery.idleTimer = setTimeout(() => gallery?.stage.classList.remove('slides-companion-spotlight-controls'), CONTROLS_IDLE_MS);
  }

  // The left half goes back, the right half forward; the pointer only shows where that's possible.
  function onMouseMove(event) {
    revealControls();
    const forward = event.clientX >= innerWidth / 2;
    const canMove = forward ? gallery.index < gallery.items.length - 1 : gallery.index > 0;
    gallery.stage.classList.toggle('slides-companion-spotlight-can-move', canMove && !event.target.closest('button'));
  }

  function onClick(event) {
    if (event.target.closest('.slides-companion-spotlight-close')) {
      close();
      return;
    }
    step(event.clientX >= innerWidth / 2 ? 1 : -1);
    onMouseMove(event);
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
    Escape: close,
    ' ': close,
    Enter: close,
  };

  function onKeydown(event) {
    if (gallery) {
      // Slides must not act on keys while the stage covers it (Delete would delete the selection).
      event.stopImmediatePropagation();
      if (!event.metaKey && !event.ctrlKey) event.preventDefault();
      if (!event.metaKey && !event.ctrlKey && !event.altKey) NAVIGATION[event.key]?.();
      return;
    }
    if (event.key !== ' ' || event.repeat || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    if (isInteractiveTarget(event.target)) return;
    const selection = spotlightableSelection();
    if (!selection) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    open(selection);
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
  }

  listen(window);
  function listenToTextTarget() {
    const iframe = document.querySelector('iframe.docs-texteventtarget-iframe');
    if (!iframe?.contentWindow) return false;
    listen(iframe.contentWindow);
    return true;
  }
  if (!listenToTextTarget()) {
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
      open(selection);
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

  document.addEventListener('contextmenu', () => requestAnimationFrame(() => addToContextMenu()), true);
}

// Spotlight: select an image (or several objects that include one) and press Space to see it
// full screen on a black stage, like Slides' own slideshow. Esc, Space, Enter or a click closes it.
// Also offered as "Spotlight image" in the right-click menu.
// Rewritten from Image Spotlight for Google Slides.
{
  const SVG_NS = 'http://www.w3.org/2000/svg';
  // Slides outlines each selected object with a path in this colour, inside the object's group.
  const SELECTION_OUTLINE = 'path[stroke="#8ab4f8"]';
  const MENU_ITEM_CLASS = 'slides-companion-spotlight-menuitem';
  // Matches the duration of the exit fade in spotlight.css.
  const EXIT_MS = 75;

  let stage = null;

  // ----- Selection -----

  // The selected objects (Slides' `editor-<id>` groups) and their outlines, in slide order.
  function selectedObjects() {
    const outlines = document.querySelectorAll(`#workspace ${SELECTION_OUTLINE}`);
    return [...outlines]
      .map((outline) => ({ outline, object: outline.closest('[id^="editor-"]') }))
      .filter(({ object }) => object);
  }

  // Space only spotlights when no text is being edited (the font menu shows whenever text is in
  // play: a text box being edited or selected, speaker notes) and the selection includes an image.
  function spotlightableSelection() {
    if (isShown(document.querySelector('#docs-font-family'))) return null;
    const selection = selectedObjects();
    return selection.some(({ object }) => object.querySelector('image')) ? selection : null;
  }

  function isShown(element) {
    return Boolean(element?.getClientRects().length);
  }

  // The slide: the editor group that holds the objects and its own `-bg` background group.
  function slideOf(object) {
    for (let group = object.parentElement?.closest('[id^="editor-"]'); group; group = group.parentElement?.closest('[id^="editor-"]')) {
      if (group.querySelector(`:scope > [id="${CSS.escape(group.id)}-bg"]`)) return group;
    }
    return null;
  }

  // ----- Rendering -----

  // A fresh SVG with the slide background and the selected objects, cropped to their outlines.
  function renderSelection(selection) {
    const slide = slideOf(selection[0].object);
    if (!slide) return null;
    const toSlide = slide.getCTM().inverse();

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const { outline } of selection) {
      const box = outline.getBBox();
      const matrix = toSlide.multiply(outline.getCTM());
      for (const [x, y] of [[box.x, box.y], [box.x + box.width, box.y], [box.x, box.y + box.height], [box.x + box.width, box.y + box.height]]) {
        const point = new DOMPoint(x, y).matrixTransform(matrix);
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      }
    }
    const width = maxX - minX;
    const height = maxY - minY;
    if (!(width > 0 && height > 0)) return null;

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`);
    svg.style.aspectRatio = `${width} / ${height}`;
    svg.style.setProperty('--slides-companion-ratio', width / height);

    const background = slide.querySelector(`:scope > [id="${CSS.escape(slide.id)}-bg"]`);
    if (background) svg.append(background.cloneNode(true));

    const objects = [...new Set(selection.map(({ object }) => object))].sort((a, b) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    );
    for (const object of objects) {
      // Keep any transform from groups the object sits in.
      const placed = document.createElementNS(SVG_NS, 'g');
      const { a, b, c, d, e, f } = toSlide.multiply(object.parentElement.getCTM());
      placed.setAttribute('transform', `matrix(${a} ${b} ${c} ${d} ${e} ${f})`);
      const copy = object.cloneNode(true);
      copy.querySelectorAll(SELECTION_OUTLINE).forEach((outline) => outline.remove());
      placed.append(copy);
      svg.append(placed);
    }

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
    if (stage) return;
    const picture = renderSelection(selection);
    if (!picture) return;

    stage = document.createElement('div');
    stage.className = 'slides-companion-spotlight';
    stage.setAttribute('role', 'dialog');
    stage.setAttribute('aria-modal', 'true');
    stage.setAttribute('aria-label', 'Spotlight');
    stage.append(picture);
    // Keep the pointer to ourselves so Slides doesn't react to it behind the stage.
    for (const type of ['mousedown', 'mouseup', 'click', 'contextmenu']) {
      stage.addEventListener(type, (event) => {
        event.stopPropagation();
        if (type === 'contextmenu') event.preventDefault();
      });
    }
    stage.addEventListener('wheel', (event) => event.preventDefault(), { passive: false });
    stage.addEventListener('click', close);
    document.body.append(stage);
    stage.getBoundingClientRect(); // Start the fade from transparent.
    stage.classList.add('slides-companion-spotlight-open');
  }

  function close() {
    if (!stage) return;
    const closing = stage;
    stage = null;
    closing.classList.remove('slides-companion-spotlight-open');
    setTimeout(() => closing.remove(), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : EXIT_MS);
  }

  // ----- Keyboard -----

  function onKeydown(event) {
    if (stage) {
      // Slides must not act on keys while the stage covers it (Delete would delete the selection).
      event.stopImmediatePropagation();
      if (!event.metaKey && !event.ctrlKey) event.preventDefault();
      if (event.key === 'Escape' || event.key === ' ' || event.key === 'Enter') close();
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

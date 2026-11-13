// Spotlight: select an image and press Space to see it full screen on the stage (stage.js), like
// Slides' own slideshow, then go through the slide's other images like a gallery. With several
// images selected, the gallery goes through just those. Also offered as "Spotlight image" in the
// right-click menu, and during a slideshow by clicking an image. Rewritten from Image Spotlight for
// Google Slides.
{
  const { text, html } = globalThis.slidesCompanion;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  // The slideshow runs in its own page: an iframe in the editor, or a window of its own.
  const { inSlideshow: IN_SLIDESHOW } = globalThis.slidesCompanion.slides;
  const stage = globalThis.slidesCompanion.stage;
  // Slide and object groups: `g#editor-<id>` in the editor, `g#<id>` in the slideshow.
  const OBJECT = IN_SLIDESHOW ? 'g[id]' : '[id^="editor-"]';
  // Slides outlines each selected object with a path in this colour, inside the object's group.
  const SELECTION_OUTLINE = 'path[stroke="#8ab4f8"]';
  const MENU_ITEM_CLASS = 'slides-companion-spotlight-menuitem';
  // Material Symbols' outlined download, as light as the chevrons beside it.
  const DOWNLOAD_ICON =
    '<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/></svg>';

  // ----- Slide structure -----

  // Slides draws each slide and each object on it as a group (see OBJECT); text paragraphs and the
  // slide background get `-paragraph-N` and `-bg` suffixes.
  function isObject(element) {
    return element.matches(OBJECT) && !/-bg$|-paragraph-\d+$/.test(element.id);
  }

  function parentObject(element) {
    for (
      let node = element.parentElement?.closest(OBJECT);
      node;
      node = node.parentElement?.closest(OBJECT)
    ) {
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
  const picturesIn = (object) =>
    [...object.querySelectorAll('image')].filter(
      (image) => !parentObject(image)?.querySelector(VIDEO_MARK),
    );
  const hasImage = (object) => picturesIn(object).length > 0;
  // In a slideshow, objects waiting for their animation are on the slide but not shown yet.
  const isShowing = (object) =>
    object.checkVisibility({ opacityProperty: true, visibilityProperty: true });

  // ----- Selection -----

  function selectedObjects() {
    const outlines = document.querySelectorAll(`#workspace ${SELECTION_OUTLINE}`);
    return [
      ...new Set(
        [...outlines].map((outline) => outline.closest('[id^="editor-"]')).filter(Boolean),
      ),
    ];
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
      .flatMap((object) =>
        apart && childObjects(object).some(hasImage) ? stopsIn(object) : [object],
      );
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
    return rows
      .flatMap((row) => row.items.sort((a, b) => a.bounds.x - b.bounds.x))
      .map(({ object }) => object);
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
      for (const [x, y] of [
        [local.x, local.y],
        [local.x + local.width, local.y],
        [local.x, local.y + local.height],
        [local.x + local.width, local.y + local.height],
      ]) {
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
      } else if (
        element.matches('image, path, rect, circle, ellipse, line, polyline, polygon, text') &&
        isPainted(element)
      ) {
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

  // The picture, as large as fits the stage, on a box of whole screen pixels. On fractional pixels,
  // the pixels along its edges are part picture and part the slide's background copied behind it
  // (for pictures with transparency): a thin light line on the black stage. The drawing stretches
  // to the box, by less than a pixel.
  function fitPicture(area) {
    const svg = area.querySelector(':scope > svg');
    if (!svg) return;
    const ratio = Number(svg.dataset.ratio);
    const box = area.getBoundingClientRect();
    const pixel = 1 / devicePixelRatio;
    const down = (length) => Math.floor(length / pixel) * pixel;
    const near = (length) => Math.round(length / pixel) * pixel;
    const width = down(Math.min(box.width, box.height * ratio));
    const height = down(Math.min(box.height, box.width / ratio));
    svg.style.width = `${width}px`;
    svg.style.height = `${height}px`;
    svg.style.left = `${near(box.left + (box.width - width) / 2) - box.left}px`;
    svg.style.top = `${near(box.top + (box.height - height) / 2) - box.top}px`;
  }

  // A fresh SVG with the slide background and the object, cropped to what the object shows.
  function render(object) {
    const slide = slideOf(object);
    const bounds = visibleBounds(object);
    if (!slide || !bounds) return null;
    const toSlide = slide.getCTM().inverse();

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`);
    svg.dataset.ratio = bounds.width / bounds.height;
    // fitPicture() gives it a box on whole pixels, which its drawing fills exactly.
    svg.setAttribute('preserveAspectRatio', 'none');
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
          .replace(/url\(#([^)]+)\)/g, (match, id) =>
            renamed.has(id) ? `url(#${renamed.get(id)})` : match,
          )
          .replace(/^#(.+)$/, (match, id) => (renamed.has(id) ? `#${renamed.get(id)}` : match));
        if (value !== attribute.value) attribute.value = value;
      }
    });
  }

  // ----- Gallery -----

  // The stage's items here are objects on the slide; links.js's are pages.
  const isPicture = (item) => item instanceof Element;

  function openGallery(selection) {
    if (stage.isOpen()) return;
    const { items, start } = galleryItems(selection);
    if (start !== -1) stage.open(items, start, text('spotlightName'));
  }

  // Download image, for one picture.
  const bar = () => `
        <div class="slides-companion-spotlight-group slides-companion-spotlight-saver">
          <button type="button" class="slides-companion-spotlight-download" aria-label="${html('downloadImage')}" data-slides-companion-tip="${html('downloadImage')}">${DOWNLOAD_ICON}</button>
        </div>`;

  stage.register({
    matches: isPicture,
    render,
    bar,
    update: (element, item) => {
      element.querySelector('.slides-companion-spotlight-saver').hidden = !imageFile(item);
    },
    click: (target) => {
      if (!target.closest('.slides-companion-spotlight-download')) return false;
      downloadImage(stage.item());
      return true;
    },
    fit: fitPicture,
    keydown: onKeydown,
  });

  // ----- Keyboard -----

  // In the editor, Space spotlights the selected image, as it starts a video.
  function onKeydown(event) {
    if (IN_SLIDESHOW) return;
    if (
      event.key !== ' ' ||
      event.repeat ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey
    )
      return;
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
      target.closest(
        'input, textarea, select, button, a[href], [role="button"], [role="dialog"], [contenteditable=""], [contenteditable="true"]',
      ),
    );
  }

  // The right-click menu opens where keys go (stage.js), and on keys of its own.
  if (!IN_SLIDESHOW) {
    stage.onKeyTargets((target) => {
      const added = () => requestAnimationFrame(() => addToContextMenu());
      target.addEventListener('contextmenu', added, true);
      // Slides opens it on these keys itself, without the browser's contextmenu event.
      target.addEventListener(
        'keydown',
        (event) =>
          (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)) && added(),
        true,
      );
    });
  }

  // ----- Download -----

  // The picture file Slides holds for an image: as it was added (a crop is drawn over it), at up to
  // 2048px, the most Slides keeps. Only for one picture: a group of them is no one file.
  function imageFile(item) {
    if (!isPicture(item)) return null;
    const pictures = picturesIn(item);
    return pictures.length === 1 ? pictures[0].href.baseVal || null : null;
  }

  // Pictures' types as Slides keeps them, and their files' extensions.
  const EXTENSIONS = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/bmp': 'bmp',
    'image/svg+xml': 'svg',
    'image/tiff': 'tif',
  };

  // Saved under the deck's name, with the file's own extension. Slides already has the file in the
  // page, so it's saved from there.
  async function downloadImage(item) {
    const address = imageFile(item);
    if (!address) return;
    let file;
    try {
      file = await (await fetch(address)).blob();
    } catch {
      return;
    }
    const link = document.createElement('a');
    link.href = URL.createObjectURL(file);
    link.download = `${deckName()}.${EXTENSIONS[file.type] ?? 'png'}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 60_000);
  }

  // The page's title (the editor's, or the slideshow's: the same) less " - Google Slides", in
  // Slides' language.
  function deckName() {
    return document.title.replace(/ [-–] [^-–]*$/, '').trim() || 'image';
  }

  // ----- Right-click menu -----

  // One of our items, made like Slides' own: its icon from Slides' set, its label, and its key.
  function createMenuItem({ icon, label, key, choose }) {
    const item = document.createElement('div');
    item.className = `goog-menuitem apps-menuitem ${MENU_ITEM_CLASS}`;
    item.setAttribute('role', 'menuitem');
    item.innerHTML = `
      <div class="goog-menuitem-content">
        <div class="docs-icon goog-inline-block goog-menuitem-icon" aria-hidden="true">
          <div class="docs-icon-img-container docs-icon-img ${icon}"></div>
        </div>
        <span class="goog-menuitem-label">${label}</span>
        ${key ? `<span class="goog-menuitem-accel" aria-label="${key}">${key}</span>` : ''}
      </div>`;

    const chosen = () => {
      const menu = item.parentElement;
      // Escape closes the menu through Slides itself, which also returns focus to the slide.
      menu.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          code: 'Escape',
          keyCode: 27,
          which: 27,
          bubbles: true,
        }),
      );
      choose();
    };
    item.addEventListener('click', (event) => {
      event.stopPropagation();
      chosen();
    });
    return globalThis.slidesCompanion.menuItem(item, chosen);
  }

  // Spotlight image, and Download image for one picture.
  function menuItems(selection) {
    const items = [
      createMenuItem({
        icon: 'docs-icon-editors-ia-fullscreen',
        label: html('spotlightMenuItem'),
        key: html('spaceKey'),
        choose: () => openGallery(selection),
      }),
    ];
    const objects = selectedObjects();
    if (objects.length === 1 && imageFile(objects[0])) {
      items.push(
        createMenuItem({
          icon: 'docs-icon-download',
          label: html('downloadImage'),
          choose: () => downloadImage(objects[0]),
        }),
      );
    }
    return items;
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

    const items = menuItems(selection);
    const last = items.at(-1);
    let separator = null;
    // Lead the image group ("Crop image", "Replace image"…), or close the menu when it has none.
    function place() {
      const crop = menu.querySelector('.docs-icon-editors-ia-crop')?.closest('.goog-menuitem');
      if (crop) {
        separator?.remove();
        separator = null;
        if (crop.previousElementSibling !== last) crop.before(...items);
        return;
      }
      const slidesSeparator = [
        ...menu.querySelectorAll(`.goog-menuseparator:not(.${MENU_ITEM_CLASS})`),
      ].find(isShown);
      if (!separator && slidesSeparator) {
        separator = slidesSeparator.cloneNode(true);
        separator.removeAttribute('id');
        separator.classList.add(MENU_ITEM_CLASS);
      }
      if (menu.lastElementChild === last) return;
      if (separator) menu.append(separator);
      menu.append(...items);
    }
    place();
    // Opened with Shift+F10, Slides fills the menu after this, below what's there.
    new MutationObserver((_, watching) =>
      last.isConnected ? place() : watching.disconnect(),
    ).observe(menu, { childList: true });
  }

  // ----- Slideshow -----

  // During a slideshow a click goes to the next slide; on an image, it spotlights the image
  // instead, unless the "When you click an image during a slideshow" setting says otherwise. An
  // image in a link is the link's (links.js).
  function clickedImage(event) {
    if (!globalThis.slidesCompanion.settings.get('spotlightOnClick')) return null;
    const image = stage.plainClickOnSlide(event, 'image');
    if (!image || image.closest('a')) return null;
    const object = parentObject(image);
    return object && slideOf(object) && isShowing(object) ? object : null;
  }

  if (IN_SLIDESHOW) {
    // Listening on the window at document_start puts us ahead of Slides' own click handling.
    window.addEventListener(
      'click',
      (event) => {
        const object = clickedImage(event);
        if (!object) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        openGallery([object]);
      },
      true,
    );
    // While zoomed in, the zoom keeps clicks from Slides, except the ones the spotlight takes.
    globalThis.slidesCompanion.spotlightTakesClick = (event) => Boolean(clickedImage(event));
    // A pointing hand over images says they can be clicked.
    window.addEventListener(
      'mousemove',
      (event) =>
        document.documentElement.classList.toggle(
          'slides-companion-over-image',
          Boolean(clickedImage(event)),
        ),
      { capture: true, passive: true },
    );
  }
}

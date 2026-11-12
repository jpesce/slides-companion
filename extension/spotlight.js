// Spotlight: select an image and press Space to see it full screen on a black stage, like Slides'
// own slideshow, then go through the slide's other images like a gallery. With several images
// selected, the gallery goes through just those. Also offered as "Spotlight image" in the
// right-click menu, and during a slideshow by clicking an image. Also during a slideshow, a link
// clicked opens its page on the same stage, so the presenter never leaves the slideshow. Rewritten
// from Image Spotlight for Google Slides.
{
  const { text, html, rightToLeft, arrows } = globalThis.slidesCompanion;
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
  const CLOSE_ICON = icon(
    'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  );
  const PREVIOUS_ICON = icon('M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z');
  const NEXT_ICON = icon('M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z');
  const BACK_ICON = icon('M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20z');
  const FORWARD_ICON = icon('m12 4-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z');
  // Material Symbols' outlined download, as light as the chevrons beside it.
  const DOWNLOAD_ICON =
    '<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/></svg>';
  const NEW_TAB_ICON = icon(
    'M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3z',
  );

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
          .replace(/url\(#([^)]+)\)/g, (match, id) =>
            renamed.has(id) ? `url(#${renamed.get(id)})` : match,
          )
          .replace(/^#(.+)$/, (match, id) => (renamed.has(id) ? `#${renamed.get(id)}` : match));
        if (value !== attribute.value) attribute.value = value;
      }
    });
  }

  // ----- Stage -----

  function openGallery(selection) {
    if (gallery) return;
    const { items, start } = galleryItems(selection);
    if (start !== -1) openStage(items, start, text('spotlightName'));
  }

  // Items are objects on the slide, or a page a link goes to: { address, shown }. With every site
  // allowed, page.js says where the page goes: `visited` lists the addresses, from the one
  // first shown, `at` is where it is among them (Back and Forward move it), `goes` counts Back and
  // Forward, and `frameId` is how to reach it.
  const isPage = (item) => !(item instanceof Element);
  // The first is the link's own page: its address (a YouTube video's page, not its player).
  const browsedTo = (page) => (page.at > 0 ? new URL(page.visited[page.at]) : page.address);
  const siteName = (page) => browsedTo(page).hostname.replace(/^www\./, '');

  function openStage(items, start, label) {
    const stage = document.createElement('div');
    stage.className = 'slides-companion-spotlight';
    stage.setAttribute('role', 'dialog');
    stage.setAttribute('aria-modal', 'true');
    stage.setAttribute('aria-label', label);
    // Mirrored right to left, as Slides' own slideshow bar is.
    stage.dir = rightToLeft() ? 'rtl' : 'ltr';
    const { forward, back } = arrows();
    stage.innerHTML = `
      <div class="slides-companion-spotlight-picture"></div>
      <div class="slides-companion-spotlight-bar">
        <div class="slides-companion-spotlight-group slides-companion-spotlight-steps">
          <button type="button" class="slides-companion-spotlight-previous" aria-label="${html('spotlightPrevious')}" aria-description="${html('spotlightPreviousTip', back)}" data-slides-companion-tip="${html('spotlightPreviousTip', back)}">${PREVIOUS_ICON}</button>
          <div class="slides-companion-spotlight-page" aria-hidden="true"></div>
          <button type="button" class="slides-companion-spotlight-next" aria-label="${html('spotlightNext')}" aria-description="${html('spotlightNextTip', forward)}" data-slides-companion-tip="${html('spotlightNextTip', forward)}">${NEXT_ICON}</button>
        </div>
        <div class="slides-companion-spotlight-group slides-companion-spotlight-sitebar" hidden>
          <button type="button" class="slides-companion-spotlight-back" aria-label="${html('spotlightBack')}" data-slides-companion-tip="${html('spotlightBack')}" hidden>${BACK_ICON}</button>
          <button type="button" class="slides-companion-spotlight-forward" aria-label="${html('spotlightForward')}" data-slides-companion-tip="${html('spotlightForward')}" hidden>${FORWARD_ICON}</button>
          <div class="slides-companion-spotlight-site" dir="auto"></div>
          <button type="button" class="slides-companion-spotlight-new-tab" aria-label="${html('openInNewTab')}" data-slides-companion-tip="${html('openInNewTab')}">${NEW_TAB_ICON}</button>
        </div>
        <div class="slides-companion-spotlight-group slides-companion-spotlight-saver">
          <button type="button" class="slides-companion-spotlight-download" aria-label="${html('downloadImage')}" data-slides-companion-tip="${html('downloadImage')}">${DOWNLOAD_ICON}</button>
        </div>
        <div class="slides-companion-spotlight-group">
          <button type="button" class="slides-companion-spotlight-close" aria-label="${html('spotlightClose')}" aria-description="${html('spotlightCloseTip')}" data-slides-companion-tip="${html('spotlightCloseTip')}">${CLOSE_ICON}</button>
        </div>
      </div>
      <div class="slides-companion-spotlight-status" aria-live="polite"></div>
      <div class="slides-companion-spotlight-tooltip" aria-hidden="true" hidden></div>`;

    // pressed: whether a press has started on the stage. The second click of a double click that
    // opened it began before it (its press counts on from the first), so it does nothing.
    // returnFocusTo: where keys went before, for them to go there again once it closes.
    const returnFocusTo = document.activeElement;
    // tip: the control the pointer is on, and whether its tooltip shows (see Tooltips).
    const tip = {
      element: stage.querySelector('.slides-companion-spotlight-tooltip'),
      over: null,
      shown: false,
      timer: 0,
    };
    gallery = {
      stage,
      items,
      index: -1,
      idleTimer: 0,
      flashTimer: 0,
      pointer: null,
      pressed: false,
      returnFocusTo,
      tip,
    };

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
      hideTip();
    });
    stage.addEventListener('mouseover', (event) =>
      pointAt(event.target.closest('[data-slides-companion-tip]')),
    );
    stage.addEventListener('click', onClick);
    stage.addEventListener('mousemove', onMouseMove);
    // Leaving the stage, or going over a page, where the stage no longer hears the pointer.
    // The stage stays a moment as it fades out, after the gallery has gone.
    const pointerGone = () => {
      if (!gallery) return;
      gallery.pointer = null;
      pointAt(null);
      updateBars();
    };
    stage.addEventListener('mouseleave', pointerGone);
    stage.addEventListener(
      'mouseout',
      (event) => event.relatedTarget?.matches?.('iframe') && pointerGone(),
    );

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
    if (!gallery || index < 0 || index >= gallery.items.length || index === gallery.index)
      return false;
    const item = gallery.items[index];
    const picture = isPage(item) ? pageFrame(item) : render(item);
    if (!picture) return false;
    gallery.index = index;
    gallery.stage.querySelector('.slides-companion-spotlight-picture').replaceChildren(picture);
    if (isPage(item)) checkPage(item);
    updateNavbar();
    const count = gallery.items.length;
    gallery.stage.querySelector('.slides-companion-spotlight-status').textContent =
      count > 1 ? text('spotlightPosition', index + 1, count) : '';
    return true;
  }

  // The page, live. Sandboxed without top navigation, so it can't take the slideshow's window.
  function pageFrame(item) {
    const { address, shown } = item;
    const frame = document.createElement('iframe');
    frame.className = 'slides-companion-spotlight-website';
    // How page.js knows it's in this frame.
    frame.name = 'slides-companion-page';
    frame.title = address.hostname;
    frame.setAttribute(
      'sandbox',
      'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads allow-presentation',
    );
    frame.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    frame.src = shown;
    // Pages can take the keys as they open (a search box), and the slideshow can't hear keys there,
    // so Esc wouldn't close it. The page sleeps until the pointer comes over it, and the keys come
    // back if it takes them before.
    frame.inert = true;
    // A page on Slides' own site (a Doc, another deck) is in reach: Esc there closes it too, once
    // the presenter has gone into it. Other sites can't be listened to; page.js does it there, with
    // every site allowed.
    // Google's viewer shows nothing until it has loaded, and it then says what it got: a web page's
    // code doesn't flash meanwhile.
    const reveal = inPdfViewer(item) ? hideWhileChecking(frame, VIEWER_WAIT_MS) : null;
    frame.addEventListener('load', () => {
      try {
        frame.contentWindow.addEventListener('keydown', onPageKeydown, true);
      } catch {}
      if (!inPdfViewer(item)) return;
      const got = viewerGot(frame);
      if (got) item.pdf = got === 'pdf';
      if (got === 'page') showAt(item, shownAddress(item.address));
      else reveal();
    });
    return frame;
  }

  const step = (delta) => gallery && show(gallery.index + delta);

  function closeStage() {
    if (!gallery) return;
    const closing = gallery;
    const { stage, idleTimer, flashTimer, returnFocusTo } = closing;
    gallery = null;
    clearTimeout(idleTimer);
    clearTimeout(flashTimer);
    clearTimeout(closing.tip.timer);
    if (IN_SLIDESHOW) keepEscape(false);
    if (isPage(closing.items[0])) askBackground({ type: 'page-closed' });
    // A click on a button or into a page took the keys onto the stage.
    if (stage.contains(document.activeElement)) returnFocusTo?.focus({ preventScroll: true });
    stage.classList.remove('slides-companion-spotlight-open');
    setTimeout(
      () => stage.remove(),
      matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : EXIT_MS,
    );
  }

  // ----- Controls -----

  // One bar, in sections split by dividers like Slides' toolbar: ‹ 2/5 › (the position out of the
  // total, between previous and next, with more than one image), or for a page, its site with a way
  // to open it in a new tab; then Download image for an image; then Close.
  function updateNavbar() {
    const { items, index, stage } = gallery;
    const count = items.length;
    const page = isPage(items[index]) ? items[index] : null;
    stage.querySelector('.slides-companion-spotlight-sitebar').hidden = !page;
    stage.querySelector('.slides-companion-spotlight-site').textContent = page
      ? siteName(page)
      : '';
    // Only once page.js says where the page is.
    const back = stage.querySelector('.slides-companion-spotlight-back');
    const forward = stage.querySelector('.slides-companion-spotlight-forward');
    back.hidden = forward.hidden = page?.frameId === undefined;
    back.disabled = !(page?.at > 0);
    forward.disabled = !(page?.at < page?.visited.length - 1);
    const previous = stage.querySelector('.slides-companion-spotlight-previous');
    const position = stage.querySelector('.slides-companion-spotlight-page');
    const next = stage.querySelector('.slides-companion-spotlight-next');
    stage.querySelector('.slides-companion-spotlight-steps').hidden = count < 2;
    stage.querySelector('.slides-companion-spotlight-saver').hidden = !imageFile(items[index]);
    position.textContent = `${index + 1}/${count}`;
    previous.disabled = index === 0;
    next.disabled = index === count - 1;
  }

  // The bar lives in the safe area below the picture, and shows only while the pointer is above or
  // below the picture, so moving the mouse over the picture shows nothing.
  function updateBars() {
    const { stage, pointer, flashTimer } = gallery;
    const area = stage.querySelector('.slides-companion-spotlight-picture').getBoundingClientRect();
    const shown =
      Boolean(flashTimer) || Boolean(pointer && (pointer.y < area.top || pointer.y > area.bottom));
    stage
      .querySelector('.slides-companion-spotlight-bar')
      .classList.toggle('slides-companion-spotlight-bar-shown', shown);
  }

  // The pointer shows while it moves and hides when it rests, like in the slideshow.
  function revealPointer() {
    gallery.stage.classList.add('slides-companion-spotlight-pointer');
    clearTimeout(gallery.idleTimer);
    gallery.idleTimer = setTimeout(
      () => gallery?.stage.classList.remove('slides-companion-spotlight-pointer'),
      IDLE_MS,
    );
  }

  function onMouseMove(event) {
    if (!gallery) return;
    gallery.pointer = { x: event.clientX, y: event.clientY };
    wakePage(event);
    updateBars();
    revealPointer();
  }

  function onClick(event) {
    if (!gallery.pressed) return onMouseMove(event);
    const bar = event.target.closest('.slides-companion-spotlight-bar');
    if (bar) {
      if (event.target.closest('.slides-companion-spotlight-close')) closeStage();
      else if (event.target.closest('.slides-companion-spotlight-new-tab')) openInNewTab();
      else if (event.target.closest('.slides-companion-spotlight-download'))
        downloadImage(gallery.items[gallery.index]);
      else if (event.target.closest('.slides-companion-spotlight-back')) goInPage(-1);
      else if (event.target.closest('.slides-companion-spotlight-forward')) goInPage(1);
      else if (event.target.closest('.slides-companion-spotlight-previous')) step(-1);
      else if (event.target.closest('.slides-companion-spotlight-next')) step(1);
      return;
    }
    // Like Drive's preview: a click on the picture does nothing, and a click on the black around it
    // closes.
    if (!event.target.closest('.slides-companion-spotlight-picture > *')) return closeStage();
    onMouseMove(event);
  }

  // ----- Tooltips -----

  // Like Slides' own in the editor (its jfk-tooltip, measured there): once the pointer has been on a
  // control for a moment, its name, centred below it, or above where there's no room. Going straight
  // to another control moves it at once; it goes a moment after the pointer leaves, and at once on a
  // press, not to come back until the pointer has left the control.
  const TIP_SHOW_MS = 350;
  const TIP_HIDE_MS = 170;
  const TIP_GAP = 5;

  function pointAt(control) {
    const { tip } = gallery;
    if (control === tip.over) return;
    tip.over = control;
    clearTimeout(tip.timer);
    if (!control) tip.timer = setTimeout(hideTip, TIP_HIDE_MS);
    else if (tip.shown) showTip(control);
    else tip.timer = setTimeout(() => showTip(control), TIP_SHOW_MS);
  }

  function showTip(control) {
    const { tip } = gallery;
    tip.element.textContent = control.dataset.slidesCompanionTip;
    tip.element.hidden = false;
    tip.shown = true;
    const anchor = control.getBoundingClientRect();
    const { width, height } = tip.element.getBoundingClientRect();
    const below = anchor.bottom + TIP_GAP;
    tip.element.style.top = `${below + height <= innerHeight ? below : anchor.top - TIP_GAP - height}px`;
    tip.element.style.left = `${Math.min(Math.max(anchor.left + anchor.width / 2 - width / 2, 0), innerWidth - width)}px`;
  }

  function hideTip() {
    const { tip } = gallery;
    clearTimeout(tip.timer);
    tip.element.hidden = true;
    tip.shown = false;
  }

  // Its release, if it happens with the page gone, comes to this window (see onKeyUp).
  function onPageKeydown(event) {
    if (event.key !== 'Escape' || !gallery) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    heldKey = event.key;
    closeStage();
  }

  // The window loses the keys to a page inside it.
  function keepKeysFromSleepingPage() {
    const frame = gallery?.stage.querySelector('.slides-companion-spotlight-website[inert]');
    if (frame && document.activeElement === frame) frame.blur();
  }
  window.addEventListener('blur', () => setTimeout(keepKeysFromSleepingPage));

  // Chrome also says the pointer moved when the page appears under it, so it has to really move.
  function wakePage(event) {
    const frame = gallery.stage.querySelector('.slides-companion-spotlight-website[inert]');
    if (!frame) return;
    gallery.restingAt ??= { x: event.clientX, y: event.clientY };
    const area = frame.getBoundingClientRect();
    const over =
      event.clientX >= area.left &&
      event.clientX <= area.right &&
      event.clientY >= area.top &&
      event.clientY <= area.bottom;
    if (
      over &&
      Math.hypot(event.clientX - gallery.restingAt.x, event.clientY - gallery.restingAt.y) > 4
    )
      frame.inert = false;
  }

  // From page.js, through background.js to each of the tab's frames: the one showing the
  // page acts. Esc's release comes after the page has gone.
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === 'page-key' && message.phase === 'keyup')
      return onKeyUp({ type: 'keyup', key: message.key });
    const page =
      gallery && isPage(gallery.items[gallery.index]) ? gallery.items[gallery.index] : null;
    if (!page) return;
    if (message?.type === 'page-key') {
      heldKey = message.key;
      closeStage();
    } else if (message?.type === 'page-address') {
      onPageAddress(page, message);
    }
  });

  // A page the presenter went to in it starts a new way forward, as in a tab. The same page under
  // another address (a site tidying it, a redirect, a reload) takes its place, and the tab's own Back
  // and Forward move along. Back and Forward here only say where they landed: the last one pressed,
  // not a page passed on the way when pressed in a row.
  function onPageAddress(page, { href, how, went, frameId }) {
    page.frameId = frameId;
    if (went !== undefined && went !== page.goes) return;
    const { visited, at } = page;
    if (how === 'push') {
      visited.splice(at + 1, Infinity, href);
      page.at = visited.length - 1;
    } else if (how === 'traverse' && [visited[at - 1], visited[at + 1]].includes(href)) {
      page.at = visited[at - 1] === href ? at - 1 : at + 1;
    } else {
      visited[at] = href;
    }
    updateNavbar();
  }

  // Back and Forward go through the pages visited in the frame. The tab's own Back would take the
  // whole tab back, out of the slideshow if the page has no page before it.
  function goInPage(delta) {
    const page = gallery.items[gallery.index];
    const at = page.at + delta;
    if (at < 0 || at >= page.visited.length) return;
    page.at = at;
    page.goes = (page.goes ?? 0) + 1;
    askBackground({
      type: 'page-go',
      frameId: page.frameId,
      href: page.visited[at],
      go: page.goes,
    });
    updateNavbar();
  }

  // The slideshow ending with the page open, or the tab going elsewhere.
  window.addEventListener(
    'pagehide',
    () => gallery && isPage(gallery.items[0]) && askBackground({ type: 'page-closed' }),
  );

  async function askBackground(message) {
    try {
      return await chrome.runtime.sendMessage(message);
    } catch {
      return null; // The extension was updated or reloaded since this page opened.
    }
  }

  // The slide comes back first, so it's there on coming back to this tab. The page browsed to, if
  // page.js says; the link's own address otherwise (a YouTube video's page, not its player).
  function openInNewTab() {
    const address = browsedTo(gallery.items[gallery.index]);
    closeStage();
    window.open(address.href, '_blank', 'noopener');
  }

  // ----- Sites that refuse to be shown -----

  // Without every site allowed, a site that refuses to be framed (`X-Frame-Options` or CSP
  // `frame-ancestors`) shows as Chrome's grey error page, and nothing the slideshow can see of a
  // frame tells the two apart (Chrome hides it). An <object> can: where a frame shows that page, it
  // fails to load (its `error` event), as it does for a missing page or site. Slides' CSP lets
  // objects load only from Slides itself, so the <object> goes in a page of Slides' site whose CSP a
  // declarativeNetRequest rule of ours lifts (background.js, CHECK_PAGE_RULE: a "not found" page, at
  // an address only we ask for). Every ancestor of the <object> is then on docs.google.com, as for
  // the page's own frame, so the site's framing headers give the same answer in both. The frame is
  // sandboxed without scripts, and so is the site in it: it can't play, count a visit or take the
  // slideshow's window. Meanwhile the page waits out of sight, for a moment at most, so that a
  // refusal doesn't flash.
  const CHECK_PAGE = 'https://docs.google.com/presentation/slides-companion-check';
  const CHECK_HIDES_MS = 1000;
  // The page out of sight while it's checked, for a moment at most if given; what's returned shows
  // it again.
  function hideWhileChecking(page, ms) {
    const CHECKING = 'slides-companion-spotlight-checking';
    page.classList.add(CHECKING);
    const timer = ms && setTimeout(() => page.classList.remove(CHECKING), ms);
    return () => {
      clearTimeout(timer);
      page.classList.remove(CHECKING);
    };
  }
  const EXTENSION_ORIGIN = new URL(chrome.runtime.getURL('')).origin;

  // Whether the page can be shown, or is a PDF: with every site allowed nothing refuses,
  // so only the second is asked. Google's PDF viewer is neither.
  function checkPage(item) {
    if (inPdfViewer(item)) return;
    if (item.allSites) askType(item);
    else checkRefusal(item);
  }

  function checkRefusal(item) {
    const page = gallery.stage.querySelector('.slides-companion-spotlight-website');
    const probe = document.createElement('iframe');
    probe.className = 'slides-companion-spotlight-probe';
    probe.setAttribute('sandbox', 'allow-same-origin');
    probe.setAttribute('aria-hidden', 'true');
    probe.tabIndex = -1;
    const reveal = hideWhileChecking(page, CHECK_HIDES_MS);
    const decided = (refused) => {
      probe.remove();
      reveal();
      // A PDF fails here too, as it does in the page's frame: the viewer is asked first.
      if (refused && mayBePdf(item)) return askViewer(item, page);
      if (refused && gallery?.items[gallery.index] === item) showRefusal(item);
    };
    probe.addEventListener(
      'load',
      () => {
        // Unreachable (offline), there's nothing to tell: the page shows as it comes.
        const doc = probe.contentDocument;
        if (!doc?.body) return decided(false);
        const load = (data, loaded, failed) => {
          const object = doc.createElement('object');
          object.type = 'text/html';
          object.data = data;
          object.addEventListener('load', loaded);
          object.addEventListener('error', failed);
          doc.body.append(object);
        };
        // First a page of nothing, which loads only once our rule has lifted Slides' (if it hasn't,
        // every site would seem to refuse, so it's better to say nothing).
        load(
          'data:text/html,',
          () =>
            load(
              item.shown,
              () => decided(false),
              () => decided(true),
            ),
          () => decided(false),
        );
      },
      { once: true },
    );
    probe.src = CHECK_PAGE;
    gallery.stage.append(probe);
  }

  // Our message in its place (refused.html), naming the site, with Open in new tab and Allow all sites.
  function showRefusal(item) {
    item.refused = true;
    const site = siteName(item);
    const message = document.createElement('iframe');
    message.className = 'slides-companion-spotlight-refused';
    message.title = text('refusedTitle', site);
    message.src = chrome.runtime.getURL(
      `refused.html?${new URLSearchParams({ hl: globalThis.slidesCompanion.locale(), site })}`,
    );
    gallery.stage.querySelector('.slides-companion-spotlight-picture').replaceChildren(message);
    gallery.stage.querySelector('.slides-companion-spotlight-status').textContent = text(
      'refusedTitle',
      site,
    );
  }

  // Every site allowed from the message: the page shows, now that it can.
  async function showAllowed(item) {
    if (!item.refused) return;
    item.refused = false;
    item.allSites = Boolean((await askBackground({ type: 'page-open' }))?.allSites);
    if (gallery?.items[gallery.index] !== item) return;
    gallery.stage.querySelector('.slides-companion-spotlight-status').textContent = '';
    gallery.stage
      .querySelector('.slides-companion-spotlight-picture')
      .replaceChildren(pageFrame(item));
    checkPage(item);
  }

  // The gallery takes every key, so Tab goes nowhere else: into the message, at its first button, or
  // its last going back. Out of it, Tab comes back to the slideshow by itself.
  function focusRefusal(last) {
    const message = gallery.stage.querySelector('.slides-companion-spotlight-refused');
    if (!message) return;
    message.focus();
    message.contentWindow.postMessage({ type: 'focus', last }, EXTENSION_ORIGIN);
  }

  // What the message asks the stage to do.
  window.addEventListener('message', (event) => {
    const message = gallery?.stage.querySelector('.slides-companion-spotlight-refused');
    if (!message || event.source !== message.contentWindow || event.origin !== EXTENSION_ORIGIN)
      return;
    if (event.data?.source !== 'slides-companion-refused') return;
    const item = gallery.items[gallery.index];
    if (event.data.type === 'open') openInNewTab();
    else if (event.data.type === 'close') closeStage();
    else if (event.data.type === 'allowed') showAllowed(item);
    else if (event.data.type === 'key' && event.data.key === 'Escape') {
      // Its release comes to this window (see onKeyUp).
      heldKey = event.data.key;
      closeStage();
    }
  });

  // ----- Keyboard -----

  // Right to left, ← goes forward, as in Slides' slideshow.
  const NAVIGATION = {
    ArrowRight: () => step(rightToLeft() ? -1 : 1),
    ArrowDown: () => step(1),
    PageDown: () => step(1),
    ArrowLeft: () => step(rightToLeft() ? 1 : -1),
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
      if (event.key === 'Tab') return focusRefusal(event.shiftKey);
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

  // Keys reach Slides through a hidden iframe while editing, and the page itself otherwise; so does
  // the right-click menu's opening.
  const listened = new WeakSet();
  function listen(target) {
    if (!target || listened.has(target)) return;
    listened.add(target);
    target.addEventListener('keydown', onKeydown, true);
    target.addEventListener('keyup', onKeyUp, true);
    if (IN_SLIDESHOW) return;
    const added = () => requestAnimationFrame(() => addToContextMenu());
    target.addEventListener('contextmenu', added, true);
    // Slides opens it on these keys itself, without the browser's contextmenu event.
    target.addEventListener(
      'keydown',
      (event) =>
        (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)) && added(),
      true,
    );
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

  // ----- Download -----

  // The picture file Slides holds for an image: as it was added (a crop is drawn over it), at up to
  // 2048px, the most Slides keeps. Only for one picture: a group of them is no one file.
  function imageFile(item) {
    if (!item || isPage(item)) return null;
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

  // A plain click on the slide, with the stage closed. With the pen on, clicks draw. (The laser
  // pointer keeps clicks, like links and videos do.)
  function plainClickOnSlide(event, selector) {
    if (
      gallery ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey
    )
      return null;
    if (document.querySelector('.sketchyViewerContent.disable-pointer-events')) return null;
    return event.target instanceof Element
      ? event.target.closest(`.punch-viewer-svgpage-svgcontainer ${selector}`)
      : null;
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
    // Waiting for its animation, the link isn't shown yet: the click goes on to the next step.
    // Its parent is checked, not the link: Slides draws a link on words as an <a opacity="0">
    // over them, which checkVisibility() always counts as hidden. The animation is still caught,
    // since checkVisibility({ opacityProperty }) looks at every ancestor's opacity.
    const address = link && isShowing(link.parentElement) && linkAddress(link);
    if (!address) return null;
    const shown = pdfViewer(address) ?? shownAddress(address);
    return { address, shown, visited: [shown], at: 0 };
  }

  // ----- PDFs -----

  // A PDF shows in Google's viewer, as Drive shows one. Chrome's own viewer isn't let into the page's
  // frame (sandboxed), and out of it a link in the PDF would take the slideshow's whole tab. Google
  // fetches the PDF, so one it can't reach (a company's own) says so, and opens in a new tab from
  // the bar. It speaks Slides' language. An address ending in .pdf goes there straight away; any
  // other, once found to be a PDF (askViewer, askType).
  const PDF_VIEWER = 'https://docs.google.com/viewer';
  // How long the viewer, out of sight, has to say what it got.
  const VIEWER_WAIT_MS = 5000;
  const inPdfViewer = (item) => item.shown.startsWith(`${PDF_VIEWER}?`);
  // Not known yet, and not shown in a player (YouTube's, Drive's: another path), which never is.
  const mayBePdf = (item) =>
    item.pdf === undefined &&
    !inPdfViewer(item) &&
    new URL(item.shown).pathname === item.address.pathname;

  function viewerAddress(address) {
    const viewer = new URL(`${PDF_VIEWER}?embedded=true`);
    viewer.searchParams.set('url', address.href);
    if (document.documentElement.lang) viewer.searchParams.set('hl', document.documentElement.lang);
    return viewer.href;
  }
  const pdfViewer = (address) => (/\.pdf$/i.test(address.pathname) ? viewerAddress(address) : null);

  // What the viewer got, as its page says ("application/pdf", "text/html"), read from Slides' own
  // site: a PDF, a web page, or null when it got nothing ("No preview available") or can't tell
  // (Google changed its page).
  function viewerGot(frame) {
    try {
      const scripts = [...frame.contentDocument.scripts]
        .map((script) => script.textContent)
        .join('\n');
      if (scripts.includes('"application/pdf"')) return 'pdf';
      if (scripts.includes('"text/html"')) return 'page';
    } catch {}
    return null;
  }

  // The link shown at another address: as any page (an address ending in .pdf that's a page about
  // the PDF, GitHub's, which the viewer would show as its code), or in the viewer.
  function showAt(item, shown) {
    item.shown = shown;
    item.visited = [shown];
    item.at = 0;
    if (gallery?.items[gallery.index] !== item) return;
    gallery.stage
      .querySelector('.slides-companion-spotlight-picture')
      .replaceChildren(pageFrame(item));
    checkPage(item);
  }

  // Without every site allowed, a PDF fails the refusal check, as a site that refuses does. Before
  // saying so, Google's viewer is asked what the address is, out of sight and without its scripts
  // (it can't play or count anything): a PDF shows in it; anything else gets the message. Meanwhile
  // the page stays out of sight, as it's Chrome's error page. Google sees only addresses that would
  // fail otherwise.
  function askViewer(item, page) {
    if (gallery?.items[gallery.index] !== item) return;
    const reveal = hideWhileChecking(page);
    const probe = document.createElement('iframe');
    probe.className = 'slides-companion-spotlight-probe';
    probe.setAttribute('sandbox', 'allow-same-origin');
    probe.setAttribute('aria-hidden', 'true');
    probe.tabIndex = -1;
    let done = false;
    const decided = (got) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      probe.remove();
      if (got) item.pdf = got === 'pdf';
      if (gallery?.items[gallery.index] !== item) return;
      if (item.pdf) return showAt(item, viewerAddress(item.address));
      reveal();
      showRefusal(item);
    };
    const timer = setTimeout(() => decided(null), VIEWER_WAIT_MS);
    probe.addEventListener('load', () => decided(viewerGot(probe)), { once: true });
    probe.src = viewerAddress(item.address);
    gallery.stage.append(probe);
  }

  // With every site allowed, nothing refuses, and a PDF shows as Chrome's "blocked" page instead:
  // the background asks the site itself what the address is, while the page waits out of sight
  // for a moment at most.
  async function askType(item) {
    if (!mayBePdf(item)) return;
    const reveal = hideWhileChecking(
      gallery.stage.querySelector('.slides-companion-spotlight-website'),
      CHECK_HIDES_MS,
    );
    const answer = await askBackground({ type: 'page-type', href: item.address.href });
    reveal();
    if (typeof answer?.pdf === 'boolean') item.pdf = answer.pdf;
    if (item.pdf && gallery?.items[gallery.index] === item && !inPdfViewer(item))
      showAt(item, viewerAddress(item.address));
  }

  // Slides sends links through Google's redirect (google.com/url?q=<address>). Links to a slide of
  // the deck are Slides' own to follow.
  function linkAddress(link) {
    const href = link.href?.baseVal ?? link.getAttribute('href') ?? '';
    if (href.startsWith('#')) return null;
    try {
      let address = new URL(href, location.href);
      if (address.hostname === 'www.google.com' && address.pathname === '/url')
        address = new URL(address.searchParams.get('q'));
      if (!['http:', 'https:'].includes(address.protocol)) return null;
      if (address.origin === location.origin && address.pathname === location.pathname) return null;
      return address;
    } catch {
      return null;
    }
  }

  // What the page shows for a link. YouTube and Drive refuse to show their pages inside another
  // page, but their players may be: a video plays from where the link starts it (?t=90, 1m30s).
  // A plain http page isn't let into the slideshow (an https page), so its https address is tried.
  function shownAddress(address) {
    const host = address.hostname.replace(/^(www|m)\./, '');
    const [, first, second, third] = address.pathname.split('/');
    if (host === 'drive.google.com') {
      const file =
        first === 'file' && second === 'd'
          ? third
          : first === 'open'
            ? address.searchParams.get('id')
            : null;
      if (file) return `https://drive.google.com/file/d/${encodeURIComponent(file)}/preview`;
    }
    const video =
      host === 'youtu.be'
        ? first
        : host !== 'youtube.com'
          ? null
          : first === 'watch'
            ? address.searchParams.get('v')
            : ['shorts', 'live'].includes(first)
              ? second
              : null;
    if (!video) {
      const secure = new URL(address);
      secure.protocol = 'https:';
      return secure.href;
    }
    const player = new URL(`https://www.youtube.com/embed/${encodeURIComponent(video)}`);
    player.searchParams.set('autoplay', '1');
    const [, hours = 0, minutes = 0, seconds = 0] =
      (address.searchParams.get('t') ?? '').match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/) ?? [];
    const start = hours * 3600 + minutes * 60 + Number(seconds);
    if (start) player.searchParams.set('start', start);
    return player.href;
  }

  // With every site allowed, the rule letting sites be shown goes in first. If an image
  // opened on the stage meanwhile, the rule comes out again. Without, the page is checked for a
  // refusal.
  async function openPage(page) {
    page.allSites = Boolean((await askBackground({ type: 'page-open' }))?.allSites);
    if (!gallery) openStage([page], 0, siteName(page));
    else if (!isPage(gallery.items[0])) askBackground({ type: 'page-closed' });
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
      const name = document
        .querySelector('.punch-viewer-svgpage-a11yelement')
        ?.getAttribute('aria-label');
      if (!name || name === slideName) return;
      slideName = name;
      closeStage();
    }).observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-label'],
    });
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
      if (
        event.origin !== location.origin ||
        event.data?.type !== ESCAPE_MESSAGE ||
        !navigator.keyboard
      )
        return;
      if (event.data.keep) navigator.keyboard.lock(['Escape']).catch(() => {});
      else navigator.keyboard.unlock();
    });
    // Leaving full screen another way (the green button, a gesture) ends the slideshow with the
    // gallery open, and Esc goes back to the browser for the next one.
    document.addEventListener(
      'fullscreenchange',
      () => document.fullscreenElement || navigator.keyboard?.unlock(),
    );
  }
}

// The stage: a black cover over Slides, like its own slideshow, that shows one item at a time from a
// list, with a bar of controls below it, its own keys, and its closing. spotlight.js puts the
// slide's images on it, and links.js the page a link goes to; each registers its kind of item
// (register, below) with how to show it and its own part of the bar.
{
  const { text, html, rightToLeft, arrows } = globalThis.slidesCompanion;
  // The slideshow runs in its own page: an iframe in the editor, or a window of its own.
  const {
    inSlideshow: IN_SLIDESHOW,
    penOn,
    pointedAt,
    SLIDE_CHANGED,
  } = globalThis.slidesCompanion.slides;
  // The pointer hides after resting this long; the controls also show this long when the stage opens.
  const IDLE_MS = 2000;
  const { icon, afterExitFade } = globalThis.slidesCompanion.ui;
  const CLOSE_ICON = icon(
    'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  );
  const PREVIOUS_ICON = icon('M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z');
  const NEXT_ICON = icon('M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z');

  let current = null;
  // The last key pressed while the stage was open, while it's held down.
  let heldKey = null;

  // Each kind of item the stage shows, in the order its part of the bar comes. A kind has:
  //   matches(item): whether the item is of this kind.
  //   render(item): what shows on the stage for it, or null when it can't be shown.
  //   bar(): its group of controls, as HTML, between the steps and Close.
  //   update(stage, item): its controls, for the item shown (of any kind: it hides them).
  //   click(target): a click on the bar; true when it was one of its controls.
  //   and, if it needs them: fit(area) on resizing, shown(item), pointerMove(event) while open,
  //   closed(items), tab(backwards) for Tab while open, keydown(event) while closed.
  const kinds = [];
  const kindOf = (item) => kinds.find((kind) => kind.matches(item));
  const shownItem = () => (current ? current.items[current.index] : null);

  // (Named openStage and closeStage, not open and close: content scripts aren't modules, and a
  // function declared in a block also lands on the window, where it would replace window.open.)
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
        ${kinds.map((kind) => kind.bar()).join('')}
        <div class="slides-companion-spotlight-group">
          <button type="button" class="slides-companion-spotlight-close" aria-label="${html('spotlightClose')}" aria-description="${html('spotlightCloseTip')}" data-slides-companion-tip="${html('spotlightCloseTip')}">${CLOSE_ICON}</button>
        </div>
      </div>
      <div class="slides-companion-spotlight-status" aria-live="polite"></div>
`;

    // pressed: whether a press has started on the stage. The second click of a double click that
    // opened it began before it (its press counts on from the first), so it does nothing.
    // returnFocusTo: where keys went before, for them to go there again once it closes.
    const returnFocusTo = document.activeElement;
    // tip: the controls' tooltip (see Tooltips).
    const tip = controlsTip(stage);
    current = {
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
      if (event.detail === 1) current.pressed = true;
      tip.press();
    });
    stage.addEventListener('mouseover', (event) =>
      tip.pointAt(event.target.closest('[data-slides-companion-tip]')),
    );
    stage.addEventListener('click', onClick);
    stage.addEventListener('mousemove', onMouseMove);
    // Leaving the stage, or going over a page, where the stage no longer hears the pointer.
    // The stage stays a moment as it fades out, after it has closed.
    const pointerGone = () => {
      if (!current) return;
      current.pointer = null;
      tip.pointAt(null);
      updateBars();
    };
    stage.addEventListener('mouseleave', pointerGone);
    stage.addEventListener(
      'mouseout',
      (event) => event.relatedTarget?.matches?.('iframe') && pointerGone(),
    );

    document.body.append(stage);
    const area = stage.querySelector('.slides-companion-spotlight-picture');
    new ResizeObserver(() => current && kindOf(shownItem())?.fit?.(area)).observe(area);
    if (!show(start)) {
      stage.remove();
      current = null;
      return;
    }
    stage.getBoundingClientRect(); // Start the fade from transparent.
    stage.classList.add('slides-companion-spotlight-open');
    if (IN_SLIDESHOW) keepEscape(true);
    // Show the controls briefly so it's clear how to move and leave; after that, only on approach.
    current.flashTimer = setTimeout(() => {
      if (!current) return;
      current.flashTimer = 0;
      updateBars();
    }, IDLE_MS);
    updateBars();
  }

  function show(index) {
    if (!current || index < 0 || index >= current.items.length || index === current.index)
      return false;
    const item = current.items[index];
    const kind = kindOf(item);
    const picture = kind?.render(item);
    if (!picture) return false;
    current.index = index;
    const area = current.stage.querySelector('.slides-companion-spotlight-picture');
    area.replaceChildren(picture);
    kind.fit?.(area);
    kind.shown?.(item);
    updateBar();
    const count = current.items.length;
    say(count > 1 ? text('spotlightPosition', index + 1, count) : '');
    return true;
  }

  const step = (delta) => current && show(current.index + delta);

  function closeStage() {
    if (!current) return;
    const closing = current;
    const { stage, idleTimer, flashTimer, returnFocusTo } = closing;
    current = null;
    clearTimeout(idleTimer);
    clearTimeout(flashTimer);
    closing.tip.hide();
    if (IN_SLIDESHOW) keepEscape(false);
    kindOf(closing.items[0])?.closed?.(closing.items);
    // A click on a button or into a page took the keys onto the stage.
    if (stage.contains(document.activeElement)) returnFocusTo?.focus({ preventScroll: true });
    stage.classList.remove('slides-companion-spotlight-open');
    afterExitFade(() => stage.remove());
  }

  // Closed by a key heard elsewhere (a page on the stage): its release comes to this window, or is
  // passed on (keyReleased), and until then its repeats are kept from Slides.
  function closeByKey(key) {
    heldKey = key;
    closeStage();
  }

  // What's shown in place of the item (a message about it), and what's read out.
  function replace(picture) {
    current?.stage.querySelector('.slides-companion-spotlight-picture').replaceChildren(picture);
  }
  function say(words) {
    if (current)
      current.stage.querySelector('.slides-companion-spotlight-status').textContent = words;
  }

  // ----- Controls -----

  // One bar, in sections split by dividers like Slides' toolbar: ‹ 2/5 › (the position out of the
  // total, between previous and next, with more than one item); then each kind's own (a page's
  // site, Download image); then Close.
  function updateBar() {
    if (!current) return;
    const { items, index, stage } = current;
    const count = items.length;
    stage.querySelector('.slides-companion-spotlight-steps').hidden = count < 2;
    stage.querySelector('.slides-companion-spotlight-page').textContent = `${index + 1}/${count}`;
    stage.querySelector('.slides-companion-spotlight-previous').disabled = index === 0;
    stage.querySelector('.slides-companion-spotlight-next').disabled = index === count - 1;
    for (const kind of kinds) kind.update(stage, items[index]);
  }

  // The bar lives in the safe area below the picture, and shows only while the pointer is above or
  // below the picture, so moving the mouse over the picture shows nothing.
  function updateBars() {
    const { stage, pointer, flashTimer } = current;
    const area = stage.querySelector('.slides-companion-spotlight-picture').getBoundingClientRect();
    const shown =
      Boolean(flashTimer) || Boolean(pointer && (pointer.y < area.top || pointer.y > area.bottom));
    stage
      .querySelector('.slides-companion-spotlight-bar')
      .classList.toggle('slides-companion-spotlight-bar-shown', shown);
  }

  // The pointer shows while it moves and hides when it rests, like in the slideshow.
  function revealPointer() {
    current.stage.classList.add('slides-companion-spotlight-pointer');
    clearTimeout(current.idleTimer);
    current.idleTimer = setTimeout(
      () => current?.stage.classList.remove('slides-companion-spotlight-pointer'),
      IDLE_MS,
    );
  }

  function onMouseMove(event) {
    if (!current) return;
    current.pointer = { x: event.clientX, y: event.clientY };
    for (const kind of kinds) kind.pointerMove?.(event);
    updateBars();
    revealPointer();
  }

  function onClick(event) {
    if (!current.pressed) return onMouseMove(event);
    if (event.target.closest('.slides-companion-spotlight-bar')) {
      if (event.target.closest('.slides-companion-spotlight-close')) closeStage();
      else if (event.target.closest('.slides-companion-spotlight-previous')) step(-1);
      else if (event.target.closest('.slides-companion-spotlight-next')) step(1);
      else kinds.some((kind) => kind.click(event.target));
      return;
    }
    // Like Drive's preview: a click on the picture does nothing, and a click on the black around it
    // closes.
    if (!event.target.closest('.slides-companion-spotlight-picture > *')) return closeStage();
    onMouseMove(event);
  }

  // ----- Tooltips -----

  // Like Slides' own in the editor's toolbar: the control's name, centred 5px below it, or above
  // where there's no room.
  function controlsTip(stage) {
    const tooltip = globalThis.slidesCompanion.ui.tooltip({
      className: 'slides-companion-spotlight-tooltip',
      parent: stage,
    });
    return globalThis.slidesCompanion.ui.hoverTip(tooltip, (control) => {
      tooltip.say(control.dataset.slidesCompanionTip);
      tooltip.place(control.getBoundingClientRect(), { gap: 5, flip: true });
    });
  }

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
    End: () => show(current.items.length - 1),
    Escape: closeStage,
    ' ': closeStage,
    Enter: closeStage,
  };
  const CLOSING_KEYS = ['Escape', ' ', 'Enter'];

  function onKeydown(event) {
    if (current) {
      // Slides must not act on keys while the stage covers it (Delete would delete the selection).
      event.stopImmediatePropagation();
      if (!event.metaKey && !event.ctrlKey) event.preventDefault();
      if (event.key === 'Tab') return kinds.forEach((kind) => kind.tab?.(event.shiftKey));
      // The Space that opened the stage, held down, doesn't close it again.
      if (event.repeat && CLOSING_KEYS.includes(event.key)) return;
      heldKey = event.key;
      if (!event.metaKey && !event.ctrlKey && !event.altKey) NAVIGATION[event.key]?.();
      return;
    }
    // The key that closed the stage, still held down: its repeats mustn't reach Slides (Space and
    // Enter would skip slides, Esc would end the slideshow).
    if (heldKey === event.key) {
      if (event.repeat) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      onKeyUp(); // A new press: its release went unheard.
    }
    for (const kind of kinds) kind.keydown?.(event);
  }

  // Keys reach Slides through a hidden iframe while editing, and the page itself otherwise. Each
  // watcher hears of both, as they come.
  const keyTargets = [];
  const keyWatchers = [];
  function onKeyTargets(watcher) {
    keyWatchers.push(watcher);
    keyTargets.forEach(watcher);
  }
  function addKeyTarget(target) {
    if (!target || keyTargets.includes(target)) return;
    keyTargets.push(target);
    keyWatchers.forEach((watcher) => watcher(target));
  }
  onKeyTargets((target) => {
    target.addEventListener('keydown', onKeydown, true);
    target.addEventListener('keyup', onKeyUp, true);
  });
  // Registered at document_start in the slideshow, so it hears keys before Slides does.
  addKeyTarget(window);
  function listenToTextTarget() {
    const iframe = document.querySelector('iframe.docs-texteventtarget-iframe');
    if (!iframe?.contentWindow) return false;
    addKeyTarget(iframe.contentWindow);
    return true;
  }
  if (!IN_SLIDESHOW && !listenToTextTarget()) {
    const observer = new MutationObserver(() => {
      if (listenToTextTarget()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // In full screen, Esc is the browser's: it leaves full screen, which ends Slides' slideshow,
  // before the page hears the key. While the stage is open, the page asks to keep Esc (only the
  // top page may), so Esc closes the stage and the slideshow goes on.
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
    if (IN_SLIDESHOW && released === 'Escape' && !current) keepEscape(false);
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
    // stage open, and Esc goes back to the browser for the next one.
    document.addEventListener(
      'fullscreenchange',
      () => document.fullscreenElement || navigator.keyboard?.unlock(),
    );
  }

  // ----- Slideshow -----

  // A plain click on the slide, with the stage closed. With the pen on, clicks draw. (The laser
  // pointer keeps clicks, like links and videos do.)
  function plainClickOnSlide(event, selector) {
    if (
      current ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey
    )
      return null;
    if (penOn()) return null;
    const target = pointedAt(event);
    return target instanceof Element
      ? target.closest(`.punch-viewer-svgpage-svgcontainer ${selector}`)
      : null;
  }

  // The slide can change under the stage (it advances by itself, or from Next in the presenter
  // view): what's on it was about the slide that's gone.
  if (IN_SLIDESHOW) document.addEventListener(SLIDE_CHANGED, () => closeStage());

  globalThis.slidesCompanion.stage = {
    register: (kind) => kinds.push(kind),
    open: openStage,
    close: closeStage,
    closeByKey,
    keyReleased: (key) => onKeyUp({ type: 'keyup', key }),
    isOpen: () => Boolean(current),
    item: shownItem,
    items: () => current?.items ?? null,
    element: () => current?.stage ?? null,
    replace,
    say,
    updateBar,
    plainClickOnSlide,
    onKeyTargets,
  };
}

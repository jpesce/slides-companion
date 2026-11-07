// Zoom: during a slideshow, scroll (or press + and −) to zoom into the slide where the pointer is,
// and drag to look around. Fully zoomed out, everything works as usual. While zoomed in, only what
// shows a pointing hand can be clicked (links, videos, images to spotlight); a click anywhere else
// does nothing, so it never changes slides by accident. Changing slides starts the next one whole. The live slide is
// scaled, so video and animations go on. The "When you scroll during a slideshow" setting can make
// scrolling do nothing, or give the wheel back to Slides, which then changes slides with it.
// (Scrolling in the editor: see scroll.js.)
{
  const IN_SLIDESHOW = /\/(local)?present$/.test(location.pathname);
  const ZOOMED_CLASS = 'slides-companion-zoomed';
  const DRAGGING_CLASS = 'slides-companion-zoom-dragging';
  const INK_CLASS = 'slides-companion-zoom-ink';
  const MAX_SCALE = 5;
  // How much one pixel of scrolling changes the magnification: a mouse notch is about 100 pixels,
  // a trackpad pinch sends much smaller steps.
  const WHEEL_RATE = 0.002;
  const PINCH_RATE = 0.01;
  // How quickly scrolling eases to its new zoom: most of the way in about 100ms.
  const EASE_MS = 40;
  // A press that moves further than this is a drag, not a click.
  const DRAG_THRESHOLD = 4;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  // The zoom shown now, and the one scrolling is easing to.
  let zoom = { scale: 1, x: 0, y: 0 };
  let target = zoom;
  let easing = { frame: 0, time: 0 };
  // The press the zoom owns while zoomed in: { startX, startY, from, moved, released }.
  let press = null;
  let slideLabel = null;

  // The slide. Slides draws the laser pointer and the pen on layers beside it, at the pointer's
  // place on the screen, so those don't scale with the slide (see Ink for the pen's ink).
  const slideView = () => document.querySelector('.sketchyViewerContent');
  // The pen's ink: the strokes group in the first of those layers (the second is the laser's).
  const inkLayer = () => document.querySelector('.punch-slide-markup-surface > g');
  const slideName = () => document.querySelector('.punch-viewer-svgpage-a11yelement')?.getAttribute('aria-label');
  // What scrolling does: 'zoom', 'nothing' or 'slides' (see settings.js).
  const scrolling = () => globalThis.slidesCompanion.settings.get('slideshowScroll');
  const galleryOpen = () => Boolean(document.querySelector('.slides-companion-spotlight'));
  // With the pen on, dragging draws.
  const penOn = () => Boolean(document.querySelector('.sketchyViewerContent.disable-pointer-events'));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  // Where the slide sits before scaling: its offset inside its (unscaled) offset parent.
  function layoutOrigin(element) {
    const parent = element.offsetParent?.getBoundingClientRect() ?? { left: 0, top: 0 };
    return { left: parent.left + element.offsetLeft, top: parent.top + element.offsetTop };
  }

  // A zoom: scale from the slide's top left corner, then shift, so the slide always fills its area.
  function fitted(element, scale, x, y) {
    return {
      scale,
      x: clamp(x, element.offsetWidth * (1 - scale), 0),
      y: clamp(y, element.offsetHeight * (1 - scale), 0),
    };
  }

  // The slide and the pen's ink are moved together, in the same frame, from the same numbers. (Eased
  // by CSS instead, the browser moved the slide on its own and the ink with the page, which
  // drifted apart while zooming.)
  function show(state) {
    zoom = state;
    const { scale, x, y } = state;
    const element = slideView();
    if (element) {
      element.style.transformOrigin = '0 0';
      element.style.transform = scale > 1 ? `translate(${x}px, ${y}px) scale(${scale})` : '';
    }
    const ink = inkLayer();
    if (ink) {
      const on = inkZoom(state, inkSpace(ink));
      ink.style.transform = scale > 1 ? `translate(${on.x}px, ${on.y}px) scale(${scale})` : '';
      // The pen's dot under the pointer, beside the ink, grows to the width of the line it draws.
      const dot = ink.parentNode.querySelector(':scope > circle');
      if (dot) dot.style.r = scale > 1 ? `${dot.getAttribute('r') * scale}px` : '';
    }
    document.documentElement.classList.toggle(ZOOMED_CLASS, scale > 1);
  }

  // Straight there: dragging, and a new slide.
  function jumpTo(state) {
    cancelAnimationFrame(easing.frame);
    easing.frame = 0;
    target = state;
    show(state);
  }

  // Eased there, so a mouse wheel's notches don't jump. Scale and shift close the same fraction of
  // the way each frame, which keeps the point under the pointer in place all the way.
  function easeTo(state) {
    target = state;
    if (reducedMotion.matches) return jumpTo(state);
    if (!easing.frame) {
      easing.time = performance.now();
      easing.frame = requestAnimationFrame(easeStep);
    }
  }

  function easeStep(now) {
    // A frame's time can be a little before the scroll that started the easing.
    const t = 1 - Math.exp(-Math.max(0, now - easing.time) / EASE_MS);
    easing.time = now;
    const next = {
      scale: zoom.scale + (target.scale - zoom.scale) * t,
      x: zoom.x + (target.x - zoom.x) * t,
      y: zoom.y + (target.y - zoom.y) * t,
    };
    const arrived = Math.abs(target.scale - next.scale) < 0.001 && Math.abs(target.x - next.x) < 0.5 && Math.abs(target.y - next.y) < 0.5;
    show(arrived ? target : next);
    easing.frame = arrived ? 0 : requestAnimationFrame(easeStep);
  }

  function reset() {
    if (zoom.scale !== 1 || target.scale !== 1) jumpTo({ scale: 1, x: 0, y: 0 });
  }

  // ----- Ink -----

  // Slides records the pen's ink where the pointer is on the screen, as if the slide weren't zoomed,
  // and draws it again from that record (on every move while drawing, on coming back to the slide,
  // and fitted to the new size when the window changes size). So the ink layer takes the slide's
  // zoom, and each stroke undoes the zoom it was drawn at: it shows under the pen while drawing, and
  // afterwards stays on what it marks. Ink is like paint on the slide, so it's as thick on the slide
  // whatever the zoom it's drawn at: zoomed in, the pen draws thicker on the screen.
  // A stroke is known by its slide and where it starts on the slide ("M x y"), which every redraw of
  // it keeps; a tap of the pen is a dot, known by its centre.
  const strokeZooms = new Map();
  // Kept ink from earlier slideshows is placed on the whole slide already (see ink.js).
  const STROKES = 'path:not(.slides-companion-kept-ink), circle:not(.slides-companion-kept-ink)';

  // The ink layer covers the window; the slide can sit lower or further right in it, between bars,
  // when the screen isn't the slide's shape. Its units per pixel follow its viewBox (normally 1).
  function inkSpace(ink) {
    const svg = ink.ownerSVGElement;
    const box = svg.getBoundingClientRect();
    const ratio = svg.viewBox.baseVal.width / box.width;
    const slide = slideView();
    const origin = slide ? layoutOrigin(slide) : box;
    return {
      unit: Number.isFinite(ratio) && ratio > 0 ? ratio : 1,
      left: origin.left - box.left,
      top: origin.top - box.top,
      width: slide?.offsetWidth || box.width,
    };
  }

  globalThis.slidesCompanion.inkSpace = inkSpace;

  // The slide's zoom as the ink layer takes it: from the layer's corner, in its units.
  function inkZoom({ scale, x, y }, space) {
    return {
      x: (x + (1 - scale) * space.left) * space.unit,
      y: (y + (1 - scale) * space.top) * space.unit,
    };
  }

  function placeStroke(stroke) {
    const start =
      stroke.nodeName === 'circle'
        ? [stroke.getAttribute('cx'), stroke.getAttribute('cy')]
        : stroke.getAttribute('d')?.match(/^M\s*([-\d.e]+)[\s,]+([-\d.e]+)/)?.slice(1);
    if (!start) return;
    // Kept as parts of the slide's width, which a new window size doesn't change.
    const space = inkSpace(stroke);
    const onSlide = (value, offset) => (value / space.unit - offset) / space.width;
    const key = `${slideName()} ${onSlide(start[0], space.left).toFixed(4)} ${onSlide(start[1], space.top).toFixed(4)}`;
    if (!strokeZooms.has(key)) strokeZooms.set(key, { scale: zoom.scale, x: zoom.x / space.width, y: zoom.y / space.width });
    const drawn = strokeZooms.get(key);
    if (drawn.scale === 1) return;
    const { scale } = drawn;
    const { x, y } = inkZoom({ scale, x: drawn.x * space.width, y: drawn.y * space.width }, space);
    stroke.setAttribute('transform', `matrix(${1 / scale} 0 0 ${1 / scale} ${-x / scale} ${-y / scale})`);
    // Undoing the zoom thins the line too, so it's drawn that much thicker. (Slides' own width is
    // kept, in case the same line is placed again.)
    const size = stroke.nodeName === 'circle' ? 'r' : 'stroke-width';
    stroke.dataset.slidesCompanionSize ??= stroke.getAttribute(size);
    stroke.setAttribute(size, stroke.dataset.slidesCompanionSize * scale);
  }

  let inkWatch = { layer: null, observer: null };
  function watchInk() {
    const ink = inkLayer();
    if (!ink || ink === inkWatch.layer) return;
    inkWatch.observer?.disconnect();
    ink.classList.add(INK_CLASS);
    ink.querySelectorAll(STROKES).forEach(placeStroke);
    show(zoom);
    // A stroke comes in new, or (in case Slides refits one in place) moves.
    const observer = new MutationObserver((mutations) => {
      for (const { type, target: changed, addedNodes } of mutations) {
        const strokes = type === 'attributes' ? [changed] : addedNodes;
        for (const node of strokes) if (node instanceof Element && node.matches(STROKES)) placeStroke(node);
      }
    });
    observer.observe(ink, { childList: true, subtree: true, attributes: true, attributeFilter: ['d', 'cx', 'cy'] });
    inkWatch = { layer: ink, observer };
  }

  // ----- Scroll to zoom -----

  // Scrolling zooms in and out around the pointer, and never changes slides, even fully zoomed out
  // (a trackpad keeps scrolling for a moment after the fingers lift). Set to do nothing, it's just
  // kept from Slides.
  function onWheel(event) {
    const choice = scrolling();
    if (choice === 'slides' || galleryOpen()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const element = slideView();
    if (choice !== 'zoom' || !element) return;
    const rate = event.ctrlKey ? PINCH_RATE : WHEEL_RATE;
    zoomAround(element, Math.exp(-event.deltaY * rate), event.clientX, event.clientY);
  }

  // Zooms by a factor, keeping the point on the screen at (clientX, clientY) in place. Steps add up
  // on where the zoom is going, so quick scrolling isn't lost to the easing.
  function zoomAround(element, factor, clientX, clientY) {
    // Ink keeps the zoom it's drawn at, so the zoom holds still while the pen draws.
    if (penOn() && pointer?.buttons & 1) return;
    const from = target;
    const scale = clamp(from.scale * factor, 1, MAX_SCALE);
    if (scale === from.scale) return;
    const origin = layoutOrigin(element);
    const px = clientX - origin.left;
    const py = clientY - origin.top;
    easeTo(fitted(element, scale, px - ((px - from.x) * scale) / from.scale, py - ((py - from.y) * scale) / from.scale));
    // Zooming mid-drag: the drag goes on from the new zoom.
    if (press && !press.released) Object.assign(press, { startX: clientX, startY: clientY, from: target });
  }

  // ----- Keys to zoom -----

  // + and − zoom in and out too, so the keyboard alone can zoom (= is + without Shift, and the number
  // pad's keys count). They zoom around the pointer, around the middle of a video it's over (a
  // video's frame keeps the pointer's moves to itself), or around the middle of the slide when Slides
  // has hidden the pointer. Slides has no use for these keys in a slideshow, so it still hears them.
  // On a black or white screen, they just bring the slide back, as any key does, without zooming it.
  // With ⌘, Ctrl or Alt, they're the browser's zoom.
  const ZOOM_KEYS = { '+': 1, '=': 1, '-': -1, _: -1 };
  // Each press zooms in or out this much: from the whole slide to the closest in four presses.
  const KEY_FACTOR = 1.5;
  // Where the pointer last was: { x, y, buttons, frame }, frame being the video it went over, if it
  // did. Null when it has left the window, or hasn't come in yet.
  let pointer = null;

  function trackPointer(event) {
    if (event.type === 'mouseout') {
      if (!event.relatedTarget) pointer = null;
      return;
    }
    const frame = event.target instanceof HTMLIFrameElement && slideView()?.contains(event.target) ? event.target : null;
    pointer = { x: event.clientX, y: event.clientY, buttons: event.buttons, frame };
  }

  function zoomPoint(element) {
    const origin = layoutOrigin(element);
    const area = { left: origin.left, top: origin.top, right: origin.left + element.offsetWidth, bottom: origin.top + element.offsetHeight };
    // Holding the slide, it's the pointer, which is where the drag goes on from.
    if (pointer && press && !press.released) return [pointer.x, pointer.y];
    // The middle of what shows of the video, when zooming has taken part of it off the screen.
    if (pointer?.frame?.isConnected) {
      const box = pointer.frame.getBoundingClientRect();
      const left = Math.max(box.left, area.left);
      const top = Math.max(box.top, area.top);
      return [(left + Math.min(box.right, area.right)) / 2, (top + Math.min(box.bottom, area.bottom)) / 2];
    }
    // Slides hides the pointer (and the laser's and the pen's dot) when it's left still.
    if (pointer && document.body.style.cursor !== 'none') return [pointer.x, pointer.y];
    return [(area.left + area.right) / 2, (area.top + area.bottom) / 2];
  }

  function onKeydown(event) {
    const direction = ZOOM_KEYS[event.key];
    if (!direction || event.metaKey || event.ctrlKey || event.altKey || event.isComposing || galleryOpen()) return;
    if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return;
    if ([...document.querySelectorAll('.punch-viewer-interruption')].some((screen) => screen.checkVisibility())) return;
    const element = slideView();
    if (element) zoomAround(element, KEY_FACTOR ** direction, ...zoomPoint(element));
  }

  // ----- Drag to look around -----

  // While zoomed in, a press on the slide is the zoom's: dragging looks around, and neither a drag
  // nor a plain click reaches Slides, so nothing changes slides by accident. Slides' controls,
  // links and the pen keep their presses (videos are frames of their own and keep theirs too), and
  // a plain click on an image still spotlights it (see onClick).
  function ownsPress(event) {
    if (target.scale === 1 || penOn() || galleryOpen()) return false;
    return !(event.target instanceof Element && event.target.closest('.punch-viewer-navbar, .punch-viewer-navbar-menu, a'));
  }

  const swallow = (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  // Decided when the press starts, and kept until its click, or until the next press: nothing in
  // between hands the rest of it to Slides. (Trackpads can send moves that say no button is held
  // mid-drag; if that ended the press, its release and click went on to change slides.)
  function startPress(event) {
    press = ownsPress(event) ? { startX: event.clientX, startY: event.clientY, from: target, released: false } : null;
    // Grabbing the slide takes it straight to where scrolling was taking it.
    if (press) jumpTo(target);
    return press;
  }

  // Cancelling it would also cancel the mouse events the drag runs on, so it's only kept from Slides.
  function onPointerDown(event) {
    if (event.button !== 0) return;
    // Ink keeps the zoom it starts at, so the zoom gets there first.
    if (penOn()) jumpTo(target);
    else if (startPress(event)) event.stopImmediatePropagation();
  }

  function onMouseDown(event) {
    if (event.button !== 0) return;
    // Normally the pointerdown just before it already decided.
    if (!press || press.released) startPress(event);
    // Also keeps the browser from selecting or dragging what's under the pointer.
    if (press) swallow(event);
  }

  // Only while the button is held (a move saying otherwise just doesn't pan), and still zoomed in
  // (the slide can change mid-drag, from the keyboard or a clicker).
  function onMouseMove(event) {
    if (!press || press.released || !(event.buttons & 1) || target.scale === 1) return;
    const dx = event.clientX - press.startX;
    const dy = event.clientY - press.startY;
    if (!press.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    press.moved = true;
    document.documentElement.classList.add(DRAGGING_CLASS);
    jumpTo(fitted(slideView(), press.from.scale, press.from.x + dx, press.from.y + dy));
  }

  // The rest of a press the zoom owns: Slides mustn't go to the next slide, nor spotlight an image.
  function onRelease(event) {
    if (!press) return;
    swallow(event);
    press.released = true;
    stopPanning();
  }

  // The click, and the double click when two presses come quickly, end the press.
  function onClick(event) {
    if (!press) return;
    const plainClick = event.type === 'click' && !press.moved;
    if (event.type === 'dblclick' || event.detail < 2) press = null;
    // A plain click on an image goes on to the spotlight, which keeps it from Slides. It's the
    // spotlight's call, so the click works exactly where its pointing hand shows.
    if (plainClick && globalThis.slidesCompanion.spotlightTakesClick?.(event)) return;
    swallow(event);
  }

  function stopPanning() {
    document.documentElement.classList.remove(DRAGGING_CLASS);
  }

  // ----- Slide changes -----

  // A new window size (moving to a projector, say) keeps the same part of the slide in view.
  let slideSize = { element: null, width: 0 };
  const slideResizes = new ResizeObserver(([{ target: element }]) => {
    const width = element.offsetWidth;
    if (slideSize.width && width !== slideSize.width && target.scale > 1) {
      const grown = width / slideSize.width;
      jumpTo(fitted(element, target.scale, target.x * grown, target.y * grown));
    } else {
      show(zoom); // The ink layer may have moved against the slide.
    }
    slideSize.width = width;
  });

  function watchSlide() {
    const element = slideView();
    if (!element || element === slideSize.element) return;
    slideResizes.disconnect();
    slideResizes.observe(element);
    slideSize = { element, width: 0 };
  }

  // Each slide starts whole. Slides labels the slide it shows ("Slide 3 of 9").
  function onSlideMaybeChanged() {
    const label = slideName();
    if (!label || label === slideLabel) return;
    slideLabel = label;
    reset();
  }

  if (IN_SLIDESHOW) {
    // Registered at document_start, and before the spotlight's, so a drag over an image isn't taken
    // for a click on it.
    window.addEventListener('wheel', onWheel, { capture: true, passive: false });
    // Ahead of the presses the zoom keeps from everything else.
    for (const type of ['mousemove', 'mouseover', 'mouseout', 'mousedown', 'mouseup']) window.addEventListener(type, trackPointer, { capture: true, passive: true });
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('mousedown', onMouseDown, true);
    window.addEventListener('mousemove', onMouseMove, { capture: true, passive: true });
    window.addEventListener('keydown', onKeydown, true);
    window.addEventListener('pointerup', onRelease, true);
    window.addEventListener('mouseup', onRelease, true);
    window.addEventListener('click', onClick, true);
    window.addEventListener('dblclick', onClick, true);
    window.addEventListener('blur', stopPanning);
    new MutationObserver(() => {
      watchSlide();
      watchInk();
      onSlideMaybeChanged();
    }).observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-label'],
    });
    // Choosing something else mid-slideshow leaves nothing zoomed. (Only that choice: the extension
    // saves other things as it goes, such as the pen's ink after each line.)
    chrome.storage.onChanged.addListener((changes, area) => area === 'sync' && 'slideshowScroll' in changes && scrolling() !== 'zoom' && reset());
  }
}

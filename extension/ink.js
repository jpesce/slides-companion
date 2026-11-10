// Ink that stays: what the pen draws on a slide during a slideshow is kept on this computer, and
// shows again on that slide the next time the deck is presented, until Erase all clears it. It's
// off unless the "Keep what you draw" setting is on.
{
  const IN_SLIDESHOW = /\/(local)?present$/.test(location.pathname);
  const KEY = `ink ${location.pathname.match(/\/d\/([^/]+)/)?.[1]}`;
  const KEPT_CLASS = 'slides-companion-kept-ink';
  const SVG = 'http://www.w3.org/2000/svg';
  // Slides' own strokes, and dots where the pen was tapped.
  const STROKES = `:scope > path:not(.${KEPT_CLASS}), :scope > circle:not(.${KEPT_CLASS})`;

  const keeping = () => globalThis.slidesCompanion.settings.get('keepInk');
  const inkLayer = () => document.querySelector('.punch-slide-markup-surface > g');
  // The slide's page id, which stays the same when slides are moved around in the deck.
  const slideId = () =>
    document.querySelector('.punch-viewer-svgpage-svgcontainer > svg > g[id]')?.id;
  const penOn = () =>
    Boolean(document.querySelector('.sketchyViewerContent.disable-pointer-events'));

  // Strokes kept from earlier slideshows, by slide: { color, width, points: [x, y, x, y, …], dot },
  // the points as parts of the slide's width from its top left corner, and the width in pixels, as
  // Slides keeps the pen's width whatever the window's size.
  let kept = {};
  // What's saved: the kept strokes, and what's drawn on top of them this time.
  let saved = {};
  // When a fresh player takes over mid-slideshow (see live-edits.js), what the pen drew goes with
  // it, by slide: what this player was handed, and that with what's drawn here.
  let carried = {};
  let carrying = {};
  const loaded = chrome.storage.local.get(KEY).then((stored) => {
    kept = stored[KEY] ?? {};
    saved = { ...kept };
  });

  // ----- Saving -----

  const round = (value) => Math.round(value * 1e4) / 1e4;

  // A stroke drawn while zoomed undoes the zoom with a transform of its own (see zoom.js).
  function read(stroke, space) {
    const matrix = stroke.transform.baseVal.consolidate()?.matrix;
    const scale = (matrix?.a ?? 1) / space.unit;
    const onSlide = (x, y) => {
      const point = matrix ? new DOMPoint(x, y).matrixTransform(matrix) : { x, y };
      return [
        round((point.x / space.unit - space.left) / space.width),
        round((point.y / space.unit - space.top) / space.width),
      ];
    };
    if (stroke.nodeName === 'circle') {
      const at = onSlide(Number(stroke.getAttribute('cx')), Number(stroke.getAttribute('cy')));
      return {
        color: stroke.getAttribute('fill'),
        width: round(2 * Number(stroke.getAttribute('r')) * scale),
        points: at,
        dot: true,
      };
    }
    // Slides draws a stroke as a line through the pointer's places: "M x y L x y x y …".
    const numbers = (stroke.getAttribute('d').match(/-?[\d.]+(?:e[-+]?\d+)?/g) ?? []).map(Number);
    const points = [];
    for (let i = 0; i + 1 < numbers.length; i += 2)
      points.push(...onSlide(numbers[i], numbers[i + 1]));
    return {
      color: stroke.getAttribute('stroke'),
      width: round(Number(stroke.getAttribute('stroke-width')) * scale),
      points,
    };
  }

  // One write each time, so it's done even if the slideshow ends right after.
  function store(slide, strokes) {
    loaded.then(() => {
      if (strokes.length) saved[slide] = strokes;
      else delete saved[slide];
      if (Object.keys(saved).length) chrome.storage.local.set({ [KEY]: saved });
      else chrome.storage.local.remove(KEY);
    });
  }

  // Handed over on the player's frame, and handed on from its page.
  function takeCarried() {
    const handed = window.frameElement?.dataset.slidesCompanionInk;
    carried = handed ? JSON.parse(handed) : {};
    carrying = { ...carried };
  }
  function handOn() {
    document.documentElement.dataset.slidesCompanionInk = JSON.stringify(carrying);
  }

  // After each stroke, the slide's ink is saved: what was kept, and what was drawn this time.
  // Not kept, it's still handed on.
  function save() {
    const ink = inkLayer();
    const slide = slideId();
    if (!ink || !slide) return;
    const space = globalThis.slidesCompanion.inkSpace(ink);
    const drawn = [...ink.querySelectorAll(STROKES)].map((stroke) => read(stroke, space));
    if (keeping()) return store(slide, [...(kept[slide] ?? []), ...drawn]);
    carrying[slide] = [...(carried[slide] ?? []), ...drawn];
    handOn();
  }

  // Slides erases only its own strokes, so the kept ones go too.
  function eraseAll() {
    const slide = slideId();
    if (!slide) return;
    delete carried[slide];
    delete carrying[slide];
    handOn();
    if (!keeping()) return render();
    delete kept[slide];
    render();
    store(slide, []);
  }

  // ----- Showing -----

  function draw({ color, width, points, dot }, space) {
    const at = (i) => (points[i] * space.width + (i % 2 ? space.top : space.left)) * space.unit;
    const element = document.createElementNS(SVG, dot ? 'circle' : 'path');
    const places = [];
    for (let i = 0; i + 1 < points.length; i += 2) places.push(`${at(i)} ${at(i + 1)}`);
    const attributes = dot
      ? { fill: color, r: (width / 2) * space.unit, cx: at(0), cy: at(1) }
      : {
          stroke: color,
          'stroke-width': width * space.unit,
          'stroke-linejoin': 'round',
          'stroke-linecap': 'round',
          d: `M ${places[0]} L ${places.slice(1).join(' ') || places[0]}`,
        };
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
    element.classList.add(KEPT_CLASS);
    return element;
  }

  // Slides draws its ink again on coming back to a slide and on a new window size, and drops the
  // kept strokes when it does; they go back in under what's drawn this time.
  let shown = { ink: null, slide: null };
  const shownStrokes = (slide) => (keeping() ? (kept[slide] ?? []) : (carried[slide] ?? []));
  const inkRedraws = new MutationObserver(() => {
    const strokes = shownStrokes(shown.slide);
    if (shown.ink.querySelectorAll(`:scope > .${KEPT_CLASS}`).length !== strokes.length) render();
  });

  function render() {
    const ink = inkLayer();
    const slide = slideId();
    if (!ink || !slide) return;
    if (ink !== shown.ink) {
      inkRedraws.disconnect();
      inkRedraws.observe(ink, { childList: true });
    }
    shown = { ink, slide };
    ink.querySelectorAll(`:scope > .${KEPT_CLASS}`).forEach((stroke) => stroke.remove());
    const strokes = shownStrokes(slide);
    if (!strokes.length) return;
    const space = globalThis.slidesCompanion.inkSpace(ink);
    ink.prepend(...strokes.map((stroke) => draw(stroke, space)));
  }

  function onKeydown(event) {
    if (
      event.repeat ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      globalThis.slidesCompanion.isTyping(event)
    )
      return;
    // Erase all is Shift + A, or Enter or Space on it in the eraser's menu.
    const menuItem = document.querySelector(
      '.punch-viewer-navbar-eraser-menu .goog-menuitem-highlight',
    );
    const fromMenu = menuItem?.offsetParent && (event.key === 'Enter' || event.key === ' ');
    if (fromMenu || (event.shiftKey && event.key.toLowerCase() === 'a')) eraseAll();
  }

  function onMouseUp(event) {
    if (
      event.target instanceof Element &&
      event.target.closest('.punch-viewer-navbar-eraser-menu [role="menuitem"]')
    )
      eraseAll();
  }

  if (IN_SLIDESHOW) {
    takeCarried();
    // Handed over again just before taking over, with what was drawn since.
    document.addEventListener('slides-companion-ink', () => {
      takeCarried();
      render();
    });
    Promise.all([loaded, globalThis.slidesCompanion.settings.ready]).then(() => {
      render();
      new MutationObserver(() => {
        if (inkLayer() !== shown.ink || slideId() !== shown.slide) render();
      }).observe(document, { subtree: true, childList: true });
    });
    // After Slides has finished the stroke.
    window.addEventListener('pointerup', () => penOn() && setTimeout(save), true);
    window.addEventListener('keydown', onKeydown, true);
    window.addEventListener('mouseup', onMouseUp, true);
    window.addEventListener('resize', () => requestAnimationFrame(render));
    chrome.storage.onChanged.addListener(
      (changes, area) => area === 'sync' && 'keepInk' in changes && render(),
    );
  }
}

// Zoom: during a slideshow, scroll to zoom into the slide where the pointer is, and drag to look
// around. Fully zoomed out, everything works as usual. While zoomed in, only what shows a pointing
// hand can be clicked (links, videos, images to spotlight); a click anywhere else does nothing, so
// it never changes slides by accident. Changing slides starts the next one whole. The live slide is
// scaled, so video and animations go on. The "Zoom in when you scroll" setting gives the scroll
// wheel back to Slides, which then changes slides with it.
{
  const IN_SLIDESHOW = /\/(local)?present$/.test(location.pathname);
  const ZOOMED_CLASS = 'slides-companion-zoomed';
  const DRAGGING_CLASS = 'slides-companion-zoom-dragging';
  const RESETTING_CLASS = 'slides-companion-zoom-resetting';
  const MAX_SCALE = 5;
  // How much one pixel of scrolling changes the magnification: a mouse notch is about 100 pixels,
  // a trackpad pinch sends much smaller steps.
  const WHEEL_RATE = 0.002;
  const PINCH_RATE = 0.01;
  // A press that moves further than this is a drag, not a click.
  const DRAG_THRESHOLD = 4;

  let zoom = { scale: 1, x: 0, y: 0 };
  // The press the zoom owns while zoomed in: { startX, startY, from, moved, released }.
  let press = null;
  let slideLabel = null;

  // Holds the slide and the layers Slides draws the laser pointer and the pen on.
  const container = () => document.querySelector('.sketchyViewerContainer');
  const enabled = () => globalThis.slidesCompanion.settings.get('zoomOnScroll');
  const galleryOpen = () => Boolean(document.querySelector('.slides-companion-spotlight'));
  // With the pen on, dragging draws.
  const penOn = () => Boolean(document.querySelector('.sketchyViewerContent.disable-pointer-events'));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  // Where the container sits before scaling: its offset inside its (unscaled) offset parent.
  function layoutOrigin(element) {
    const parent = element.offsetParent?.getBoundingClientRect() ?? { left: 0, top: 0 };
    return { left: parent.left + element.offsetLeft, top: parent.top + element.offsetTop };
  }

  // Scale from the container's top left corner, then shift; the slide always fills its area.
  function apply(element, scale, x, y) {
    x = clamp(x, element.offsetWidth * (1 - scale), 0);
    y = clamp(y, element.offsetHeight * (1 - scale), 0);
    zoom = { scale, x, y };
    element.style.transformOrigin = '0 0';
    element.style.transform = scale > 1 ? `translate(${x}px, ${y}px) scale(${scale})` : '';
    document.documentElement.classList.toggle(ZOOMED_CLASS, scale > 1);
  }

  function reset() {
    const element = container();
    if (!element || zoom.scale === 1) return;
    element.classList.add(RESETTING_CLASS);
    apply(element, 1, 0, 0);
    element.getBoundingClientRect();
    element.classList.remove(RESETTING_CLASS);
  }

  // ----- Scroll to zoom -----

  // Scrolling zooms in and out around the pointer, and never changes slides, even fully zoomed out
  // (a trackpad keeps scrolling for a moment after the fingers lift).
  function onWheel(event) {
    if (!enabled() || galleryOpen()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const element = container();
    if (!element || event.type !== 'wheel') return;
    const rate = event.ctrlKey ? PINCH_RATE : WHEEL_RATE;
    const scale = clamp(zoom.scale * Math.exp(-event.deltaY * rate), 1, MAX_SCALE);
    if (scale === zoom.scale) return;
    // The point under the pointer stays under it.
    const origin = layoutOrigin(element);
    const px = event.clientX - origin.left;
    const py = event.clientY - origin.top;
    apply(element, scale, px - ((px - zoom.x) * scale) / zoom.scale, py - ((py - zoom.y) * scale) / zoom.scale);
  }

  // ----- Drag to look around -----

  // While zoomed in, a press on the slide is the zoom's: dragging looks around, and neither a drag
  // nor a plain click reaches Slides, so nothing changes slides by accident. Slides' controls,
  // links and the pen keep their presses (videos are frames of their own and keep theirs too), and
  // a plain click on an image still spotlights it (see onClick).
  function ownsPress(event) {
    if (zoom.scale === 1 || penOn() || galleryOpen()) return false;
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
    press = ownsPress(event) ? { startX: event.clientX, startY: event.clientY, from: zoom, released: false } : null;
    return press;
  }

  // Cancelling it would also cancel the mouse events the drag runs on, so it's only kept from Slides.
  function onPointerDown(event) {
    if (event.button === 0 && startPress(event)) event.stopImmediatePropagation();
  }

  function onMouseDown(event) {
    if (event.button !== 0) return;
    // Normally the pointerdown just before it already decided.
    if (!press || press.released) startPress(event);
    // Also keeps the browser from selecting or dragging what's under the pointer.
    if (press) swallow(event);
  }

  // Only while the button is held (a move saying otherwise just doesn't pan).
  function onMouseMove(event) {
    if (!press || press.released || !(event.buttons & 1)) return;
    const dx = event.clientX - press.startX;
    const dy = event.clientY - press.startY;
    if (!press.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    press.moved = true;
    document.documentElement.classList.add(DRAGGING_CLASS);
    apply(container(), press.from.scale, press.from.x + dx, press.from.y + dy);
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

  // Each slide starts whole. Slides labels the slide it shows ("Slide 3 of 9").
  function onSlideMaybeChanged() {
    const label = document.querySelector('.punch-viewer-svgpage-a11yelement')?.getAttribute('aria-label');
    if (!label || label === slideLabel) return;
    slideLabel = label;
    reset();
  }

  if (IN_SLIDESHOW) {
    // Registered at document_start, and before the spotlight's, so a drag over an image isn't taken
    // for a click on it.
    window.addEventListener('wheel', onWheel, { capture: true, passive: false });
    window.addEventListener('mousewheel', onWheel, { capture: true, passive: false });
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('mousedown', onMouseDown, true);
    window.addEventListener('mousemove', onMouseMove, { capture: true, passive: true });
    window.addEventListener('pointerup', onRelease, true);
    window.addEventListener('mouseup', onRelease, true);
    window.addEventListener('click', onClick, true);
    window.addEventListener('dblclick', onClick, true);
    window.addEventListener('blur', stopPanning);
    new MutationObserver(onSlideMaybeChanged).observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-label'],
    });
    // Turning the setting off mid-slideshow leaves nothing zoomed.
    chrome.storage.onChanged.addListener(() => enabled() || reset());
  }
}

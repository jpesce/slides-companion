// Pieces of Slides' interface that more than one feature draws: its tooltip, its icons, and the fade
// its dialogs leave with. Loaded in the editor, in the slideshow's frames and in presenter view.
{
  // Material's exit fade, which Slides' dialogs leave with: 75 ms (see settings-dialog.css and
  // spotlight.css). `done` runs once it's over, at once when the system asks for reduced motion.
  const EXIT_MS = 75;
  const afterExitFade = (done) =>
    setTimeout(done, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : EXIT_MS);

  // An icon from its path: Material Icons' are drawn on a 24-unit square, Material Symbols' on
  // `0 -960 960 960`.
  const icon = (path, viewBox = '0 0 24 24') =>
    `<svg viewBox="${viewBox}" aria-hidden="true"><path d="${path}"/></svg>`;

  // Slides' tooltip, its jfk-tooltip: its words, and an arrow pointing up at what it's about if
  // `arrow`. Slides' own stylesheet draws it where there is one (the editor and presenter view);
  // elsewhere `className` names ours. It's in `parent` only while it shows.
  function tooltip({ className = 'jfk-tooltip', arrow = false, parent = document.body } = {}) {
    const element = document.createElement('div');
    element.className = className;
    element.setAttribute('role', 'tooltip');
    const words = document.createElement('div');
    words.className = 'jfk-tooltip-contentId';
    element.append(words);
    let point = null;
    if (arrow) {
      point = document.createElement('div');
      point.className = 'jfk-tooltip-arrow jfk-tooltip-arrowup';
      for (const part of ['before', 'after']) {
        const half = document.createElement('div');
        half.className = `jfk-tooltip-arrowimpl${part}`;
        point.append(half);
      }
      element.append(point);
    }
    return {
      element,
      arrow: point,
      say(text) {
        words.textContent = text;
        if (!element.isConnected) parent.append(element);
      },
      hide: () => element.remove(),
      // Centred below `anchor` (a rectangle on the screen), `gap` pixels from it, inside the window
      // and no further left than `from`; above it where there's no room below, if `flip`. Returns
      // where its left edge went.
      place(anchor, { gap, from = 0, flip = false }) {
        // Measured from the window's edge, so its old place doesn't squeeze it.
        element.style.left = '0px';
        const { width, height } = element.getBoundingClientRect();
        const origin = element.offsetParent?.getBoundingClientRect() ?? { left: 0, top: 0 };
        // On a whole pixel, as Slides puts its own.
        const left = Math.floor(
          Math.max(
            0,
            Math.min(
              Math.max(from, anchor.left + anchor.width / 2 - width / 2),
              innerWidth - width,
            ),
          ),
        );
        const below = anchor.bottom + gap;
        const top = !flip || below + height <= innerHeight ? below : anchor.top - gap - height;
        element.style.left = `${left - origin.left}px`;
        element.style.top = `${top - origin.top}px`;
        return left;
      },
    };
  }

  // Slides' tooltip on hover, as measured on its toolbar in the editor: it shows once the pointer
  // has been on a control for 300 ms, moves at once to a control the pointer goes straight on to,
  // and goes 50 ms after the pointer leaves or presses, not to come back until it has left the
  // control. `show(control)` says and places the tip for a control; `tip` is from tooltip() above,
  // and controls name themselves to screen readers, so they don't hear it twice.
  const SHOW_MS = 300;
  const HIDE_MS = 50;

  function hoverTip(tip, show) {
    tip.element.setAttribute('aria-hidden', 'true');
    let over = null;
    let shown = false;
    let timer = 0;
    const hide = () => {
      clearTimeout(timer);
      tip.hide();
      shown = false;
    };
    const hideSoon = () => {
      clearTimeout(timer);
      timer = setTimeout(hide, HIDE_MS);
    };
    return {
      // The control the pointer is now on, or null when it's on none.
      pointAt(control) {
        if (control === over) return;
        over = control;
        clearTimeout(timer);
        if (!control) return hideSoon();
        if (shown) return show(control);
        timer = setTimeout(() => {
          shown = true;
          show(control);
        }, SHOW_MS);
      },
      press: hideSoon,
      hide,
    };
  }

  globalThis.slidesCompanion.ui = { afterExitFade, icon, tooltip, hoverTip };
}

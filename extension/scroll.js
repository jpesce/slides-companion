// Scrolling in the editor: over a slide, Slides goes to the next or previous slide. The "While
// editing" scroll setting can keep it from doing so. (During a slideshow, see zoom.js.)
{
  // Whether the browser can scroll the slide's area further the way the wheel turns.
  function canScroll(area, event) {
    // Shift + scroll scrolls sideways.
    const [x, y] = event.shiftKey && !event.deltaX ? [event.deltaY, 0] : [event.deltaX, event.deltaY];
    const room = (position, end, delta) => (delta < 0 && position > 0) || (delta > 0 && position < end - 1);
    if (room(area.scrollTop, area.scrollHeight - area.clientHeight, y)) return true;
    if (!x) return false;
    // Right to left, the area starts scrolled right, and scrollLeft counts down from 0.
    const rtl = getComputedStyle(area).direction === 'rtl';
    return room(rtl ? -area.scrollLeft : area.scrollLeft, area.scrollWidth - area.clientWidth, rtl ? -x : x);
  }

  // Slides listens for the wheel on the slide itself, and the browser scrolls a zoomed-in slide on
  // its own. So the wheel is kept from Slides, and the browser scrolls with it as before; the slide
  // list and speaker notes, outside the slide's area, scroll as usual too.
  function onWheel(event) {
    if (globalThis.slidesCompanion.settings.get('editorScroll') !== 'nothing') return;
    // Ctrl + scroll, and a trackpad pinch, zoom the editor.
    if (event.ctrlKey) return;
    const area = event.target instanceof Element && event.target.closest('#workspace-container');
    if (!area) return;
    event.stopImmediatePropagation();
    // Where it can't scroll, Slides cancels the wheel, or the browser would take it instead: on a
    // Mac, swiping sideways would go back a page.
    if (!canScroll(area, event)) event.preventDefault();
  }

  // Stopping the wheel here also keeps it from Slides' older "mousewheel" listeners.
  window.addEventListener('wheel', onWheel, { capture: true, passive: false });
}

// What the extension knows about how Slides builds its page, in one place: when Slides changes,
// this is what to check. Loaded after content.js, in the editor and in the slideshow's frames.
// (live-edits-main.js runs in the page's own world, where this can't reach: it reads presenter
// view's timer as countdown.js does.)
{
  const SLIDE_LABEL = '.punch-viewer-svgpage-a11yelement';
  const CURSOR_COVER = '.punch-viewer-cursor-hiding-component';
  const slides = {
    // A slideshow's own page: in its frame in the editor, or in a tab of its own.
    inSlideshow: /\/(local)?present$/.test(location.pathname),
    // How a slideshow labels the slide it shows, in the deck's language ("Slide 3 of 9").
    slideLabel: (doc = document) => doc?.querySelector(SLIDE_LABEL)?.getAttribute('aria-label'),
    // The slide a slideshow shows, by its page id, which stays the same when slides are moved.
    slideId: (doc = document) =>
      doc?.querySelector('.punch-viewer-svgpage-svgcontainer > svg > g[id]')?.id,
    // What a press or click on the slideshow is on. Once the pointer has rested a few seconds, the
    // slideshow hides it under a cover over the whole slide (.punch-viewer-cursor-hiding-component,
    // cursor: none) until it moves again, so a click without moving first lands on the cover: what
    // it meant is underneath.
    pointedAt: (event) =>
      event.target instanceof Element && event.target.matches(CURSOR_COVER)
        ? (event.target.ownerDocument
            .elementsFromPoint(event.clientX, event.clientY)
            .find((element) => element !== event.target) ?? null)
        : event.target,
    // With the pen on, dragging on the slide draws.
    penOn: (doc = document) =>
      Boolean(doc.querySelector('.sketchyViewerContent.disable-pointer-events')),
    // The pen's ink: the strokes group in the first of the layers Slides draws over the slide, at
    // the pointer's place on the screen (the second is the laser's).
    inkLayer: () => document.querySelector('.punch-slide-markup-surface > g'),
    // The menu item that opens presenter view, if `target` is in it: in the editor, Start
    // slideshow ▾ › Presenter view; in a slideshow, ⋮ › Open speaker notes, which has this icon.
    presenterViewItem: (target) => {
      const item = target instanceof Element ? target.closest('.goog-menuitem') : null;
      if (!item || item.classList.contains('goog-menuitem-disabled')) return null;
      return item.matches('.punch-qanda-presenter-view-menu-item-content') ||
        (item.closest('.punch-viewer-navbar-menu') && item.querySelector('.docs-icon-notes'))
        ? item
        : null;
    },
    // The editor's Slideshow button, which starts the slideshow from the selected slide, as
    // presenter view does.
    startSlideshowButton: '#punch-start-presentation-left',
    // Sent on the slideshow's document when its slide changes.
    SLIDE_CHANGED: 'slides-companion-slide-changed',
  };
  globalThis.slidesCompanion.slides = slides;

  if (slides.inSlideshow) {
    let shown = null;
    new MutationObserver(() => {
      const label = slides.slideLabel();
      if (!label || label === shown) return;
      shown = label;
      document.dispatchEvent(new Event(slides.SLIDE_CHANGED));
    }).observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-label'],
    });
  }
}

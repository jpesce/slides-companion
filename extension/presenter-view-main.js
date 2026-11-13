// Presenter view floating over the slideshow, in the page's own world, where Slides opens it (see
// presenter-view.js for the rest). Slides opens presenter view with window.open, by name, from the
// editor (Start slideshow ▾ › Presenter view) or from the slideshow's player (its ⋮ menu, S). When
// presenter-view.js has a picture-in-picture window ready for it, Slides gets that window instead,
// and writes presenter view into it as it would into its own. Runs in the editor and in each of the
// slideshow's frames, ahead of live-edits-main.js and live-edits-frame.js, which then see the window
// as presenter view's.
{
  const PRESENTER_VIEW = /^punch_speaker_notes/;
  // On the editor's page while a window waits for Slides (presenter-view.js).
  const READY_ATTRIBUTE = 'data-slides-companion-floating-ready';
  // The window handed over, on the editor's window, for every frame to find.
  const HANDED = Symbol.for('slides-companion floating presenter view');

  const open = window.open;
  window.open = function (url, name) {
    if (!PRESENTER_VIEW.test(String(name ?? ''))) return open.apply(this, arguments);
    try {
      const editor = window.top;
      const floating = editor.documentPictureInPicture?.window;
      const root = editor.document.documentElement;
      if (root.hasAttribute(READY_ATTRIBUTE)) {
        root.removeAttribute(READY_ATTRIBUTE);
        if (floating) {
          editor[HANDED] = floating;
          return floating;
        }
      }
      // Asked for again while it floats, it's found, as a window of its own is by its name (a
      // picture-in-picture window has none).
      if (floating && editor[HANDED] === floating) return floating;
    } catch {
      // A slideshow in a page of its own, whose top isn't Slides' editor.
    }
    return open.apply(this, arguments);
  };
}

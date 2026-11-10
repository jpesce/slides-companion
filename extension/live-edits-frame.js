// Live edits, in a slideshow's own world (see live-edits.js). A copy loading out of sight doesn't
// take the keyboard from the player on screen, and a copy taking over presenter view takes over the
// window that's open, as it is, and its timer. Slides opens presenter view with
// window.open, by name: from the player, or from the editor as a slideshow starts with it.
// live-edits-main.js keeps track of the window.
{
  const PRESENTER_VIEW = /^punch_speaker_notes/;
  const state = () => window.frameElement?.dataset.slidesCompanionPlayer;
  const isCopy = () => window.frameElement?.hasAttribute('data-slides-companion-copy');

  for (const owner of [HTMLElement.prototype, SVGElement.prototype, window]) {
    const focus = owner.focus;
    owner.focus = function () {
      if (state() !== 'loading') return focus.apply(this, arguments);
    };
  }

  // Slides' presenter view timer belongs to the player, and starts from nothing when a copy takes
  // over: the copy's clock is put forward by the time that was on it, so the timer goes on from there.
  let shift = 0;
  const now = Date.now;
  Date.now = () => now() + shift;
  document.addEventListener(
    'slides-companion-clock',
    (event) => (shift = isCopy() ? Number(event.detail) || 0 : 0),
  );

  const open = window.open;
  window.open = function (url, name) {
    if (!PRESENTER_VIEW.test(String(name ?? ''))) return open.apply(this, arguments);
    const presenterView = window.top[Symbol.for('slides-companion presenter view')];
    const args = [...arguments];
    const name_ = presenterView?.name();
    // An empty address finds the window without loading it again.
    if (isCopy() && name_) [args[0], args[1]] = ['', name_];
    const opened = open.apply(this, args);
    presenterView?.opened(opened);
    return opened;
  };
}

// Presenter view, floating over the slideshow. On one screen, Slides' presenter view hides behind a
// full-screen slideshow, so it opens in Chrome's picture-in-picture window instead, which stays on
// top. It's still Slides' own presenter view (its timer, slides and notes, and our countdown),
// opened the ways Slides opens it: Start slideshow ▾ › Presenter view, the slideshow's ⋮ › Open
// speaker notes, and S. Settings says where it opens: floating, in a window of its own as Slides
// does, or floating unless a second screen is connected (screen.isExtended, which needs no
// permission). With "just your notes" chosen, what floats is floating notes (notes.js).
//
// Slides opens presenter view with window.open as the click or key lands, but a picture-in-picture
// window takes a moment to arrive, and can only be asked for on a click or key. So the click or key
// is held back from Slides, the window asked for, and then it's played again: when Slides opens
// presenter view, presenter-view-main.js hands it the window. Only the editor's page can have the
// window, so the slideshow asks the editor through events on the editor's page, as floating notes
// does; a click or key in the slideshow lets the editor ask, as Chrome's user activation reaches
// the frames above.
{
  const { slides, settings, isTyping } = globalThis.slidesCompanion;
  const FLOAT_EVENT = 'slides-companion-float-presenter-view';
  const FLOATED_EVENT = 'slides-companion-presenter-view-floated';
  const OPEN_NOTES_EVENT = 'slides-companion-open-notes';
  // On the editor's page while a window waits for Slides (presenter-view-main.js).
  const READY_ATTRIBUTE = 'data-slides-companion-floating-ready';
  // countdown.js knows the window, and its deck, by this name: a picture-in-picture window has no
  // name of its own, and no opener.
  const FLOATING_NAME = 'slides-companion-presenter-view ';
  // The size Slides asks for its own window.
  const SIZE = { width: 730, height: 580 };
  // How long a window waits for Slides before it closes, should Slides not open presenter view.
  const READY_MS = 3000;

  // The editor's page: this one, or the one a slideshow started from the editor is in. A slideshow
  // in a tab of its own opens presenter view as Slides does.
  function editorDocument() {
    try {
      return window.top.document.querySelector('#speakernotes') ? window.top.document : null;
    } catch {
      return null;
    }
  }
  const inEditor = !slides.inSlideshow && window === window.top;
  const editor = inEditor ? document : editorDocument();
  if (editor && (inEditor || slides.inSlideshow)) {
    if (inEditor) answer();
    hold();
  }

  function floats() {
    const opens = settings.get('presenterViewOpens');
    return (
      'documentPictureInPicture' in window.top &&
      (opens === 'floating' || (opens === 'auto' && !window.top.screen.isExtended))
    );
  }
  const justNotes = () => settings.get('presenterViewFloats') === 'notes';

  // ----- The editor asks for the window -----

  function answer() {
    let asking = false;
    document.addEventListener(FLOAT_EVENT, async () => {
      if (asking) return;
      asking = true;
      // Opening the window takes the browser out of full screen, which would end the slideshow.
      const keeping = globalThis.slidesCompanion.keepSlideshowThroughOpening();
      let floating = null;
      try {
        floating = await documentPictureInPicture.requestWindow(SIZE);
      } catch {
        // Not allowed, as without a click or key: Slides opens its own window.
      }
      keeping(Boolean(floating));
      asking = false;
      if (floating) ready(floating);
      document.dispatchEvent(new CustomEvent(FLOATED_EVENT));
    });
  }

  function ready(floating) {
    const deck = location.pathname.match(/\/d\/([^/]+)/)?.[1] ?? '';
    floating.name = FLOATING_NAME + deck;
    const root = document.documentElement;
    root.setAttribute(READY_ATTRIBUTE, '');
    setTimeout(() => {
      if (!root.hasAttribute(READY_ATTRIBUTE) || documentPictureInPicture.window !== floating)
        return;
      root.removeAttribute(READY_ATTRIBUTE);
      floating.close();
    }, READY_MS);
  }

  // ----- Holding back the click or key -----

  function hold() {
    // Only the presenter's own keys and clicks are held back: not the ones played again here, nor
    // the S live edits presses in a fresh copy of the player, for it to take over the window that's
    // open (live-edits.js).

    // Asks the editor for the window, and once it's there (or didn't come), plays the click or key
    // again for Slides. Pressed again meanwhile, only the first is played: the second would find the
    // window taken, and Slides would open its own.
    let asked = false;
    function float(replay) {
      if (asked) return;
      asked = true;
      editor.addEventListener(
        FLOATED_EVENT,
        () => {
          asked = false;
          replay();
        },
        { once: true },
      );
      editor.dispatchEvent(new CustomEvent(FLOAT_EVENT));
    }
    const openNotes = () => editor.dispatchEvent(new CustomEvent(OPEN_NOTES_EVENT));

    // S, in the slideshow. Registered at document_start, ahead of Slides.
    const isPresenterViewKey = (event) =>
      event.key?.toLowerCase() === 's' &&
      !event.shiftKey &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey;
    if (slides.inSlideshow) {
      window.addEventListener(
        'keydown',
        (event) => {
          if (!event.isTrusted || !isPresenterViewKey(event) || event.repeat || isTyping(event))
            return;
          if (!floats()) return;
          event.preventDefault();
          event.stopImmediatePropagation();
          if (justNotes()) return openNotes();
          const { target, key, code, keyCode, which } = event;
          const init = {
            key,
            code,
            keyCode,
            which,
            bubbles: true,
            cancelable: true,
            composed: true,
          };
          float(() => target.dispatchEvent(new KeyboardEvent('keydown', init)));
        },
        true,
      );
    }

    // The menu items. Slides' menus act as the button comes up, so the whole click is held back,
    // and the window asked for only once it's done: asked for on the press, the new window can
    // take the focus before the release, which closes the menu without opening presenter view, or
    // the release goes missing.
    const PARTS = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
    let held = null;
    for (const type of PARTS) {
      window.addEventListener(
        type,
        (event) => {
          if (!event.isTrusted || event.button !== 0) return;
          const item = slides.presenterViewItem(event.target);
          if (type === 'pointerdown') held = item && floats() ? item : null;
          if (!held || item !== held) return;
          // (Not the press's default, which would leave out the mouse's own events.)
          if (type !== 'pointerdown') event.preventDefault();
          event.stopImmediatePropagation();
          if (type !== 'click') return;
          held = null;
          if (justNotes()) {
            openNotes();
            notesInstead();
          } else float(() => replay(item, event));
        },
        true,
      );
    }

    function replay(item, { clientX, clientY }) {
      const init = { bubbles: true, cancelable: true, composed: true, button: 0, clientX, clientY };
      for (const part of PARTS) {
        const Type = part.startsWith('pointer') ? PointerEvent : MouseEvent;
        item.dispatchEvent(
          new Type(part, { ...init, buttons: part.endsWith('down') ? 1 : 0, isPrimary: true }),
        );
      }
    }

    // With just the notes floating, presenter view's menu item closes its menu, and in the editor
    // starts the slideshow, as Start slideshow ▾ › Presenter view does, with the notes over it.
    function notesInstead() {
      if (slides.inSlideshow) return globalThis.slidesCompanion.closeSlideshowMenu?.();
      const start = document.querySelector(slides.startSlideshowButton);
      if (!start) return;
      const box = start.getBoundingClientRect();
      const init = {
        bubbles: true,
        cancelable: true,
        button: 0,
        clientX: box.x + box.width / 2,
        clientY: box.y + box.height / 2,
      };
      for (const part of ['mousedown', 'mouseup', 'click'])
        start.dispatchEvent(new MouseEvent(part, init));
    }
  }
}

// Floating notes: the current slide's speaker notes in a small window that stays on top, so the
// slides can stay full screen with your notes in front of you. Opened from the View menu, beside
// "Show speaker notes", or during a slideshow from its ⋮ menu or with Shift+S. It stays open
// between slideshows, and while editing it shows the selected slide's notes. It's Chrome's
// Picture-in-Picture window, which meeting apps leave out when you share only the slideshow's tab
// or window. Inside, it's presenter view's notes pane, dressed in Slides' own styles.
{
  const IN_SLIDESHOW = /\/(local)?present$/.test(location.pathname);
  // The editor owns the window, so it outlives each slideshow; a slideshow started from the editor
  // runs in an iframe there, and asks the editor through events on the editor's page.
  const TOGGLE_EVENT = 'slides-companion-toggle-notes';
  const SLIDE_EVENT = 'slides-companion-slide-shown';
  const FULL_SCREEN_EVENT = 'slides-companion-full-screen';
  const SLIDESHOW_GONE_EVENT = 'slides-companion-slideshow-gone';
  // On the editor's page while the window is open, and while the slideshow is out of full screen.
  const OPEN_ATTRIBUTE = 'data-slides-companion-notes-open';
  const WINDOWED_ATTRIBUTE = 'data-slides-companion-windowed';
  const MENU_ITEM_CLASS = 'slides-companion-notes-menuitem';
  const label = (open) => (open ? 'Close floating notes' : 'Open floating notes');

  const isToggleKey = (event) =>
    event.key?.toLowerCase() === 's' && event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey;
  // Slides' own shortcut for full screen.
  const isFullScreenKey = (event) =>
    event.key?.toLowerCase() === 'f' && event.shiftKey && (event.metaKey || event.ctrlKey) && !event.altKey;

  // Slides builds its menus once and keeps them, but may move its items: ours goes back after
  // `after()` whenever they change.
  function keepInMenu(item, after) {
    const place = () => {
      const anchor = after();
      if (anchor && anchor.nextElementSibling !== item) anchor.after(item);
      return anchor;
    };
    new MutationObserver((_, finding) => {
      const anchor = place();
      if (!anchor) return;
      finding.disconnect();
      new MutationObserver(place).observe(anchor.parentElement, { childList: true });
    }).observe(document, { subtree: true, childList: true });
  }

  if (!IN_SLIDESHOW && window === window.top) inEditor();
  if (IN_SLIDESHOW) inSlideshow();

  function inEditor() {
    // Presenter view's notes zoom by this much a step, from 6 steps out to 8 in.
    const ZOOM_STEP = 1.15;
    const ZOOM_OUT = -6;
    const ZOOM_IN = 8;
    // Presenter view's layout, less its tabs, so the notes fill the window. The Full screen button
    // lines up with the zoom buttons.
    const LAYOUT_CSS = `
      .punch-viewer-speakernotes-base { margin-top: 0; }
      .jfk-button-disabled { pointer-events: none; }
      [data-full-screen] { vertical-align: top; }`;
    // Presenter view's notes pane, in the page around it there.
    const PANE_HTML = `
      <div class="punch-viewer-speakernotes punch-viewer-client-rendered-notes">
      <div class="punch-viewer-speakernotes-base">
        <div class="punch-viewer-speakernotes-text-header-container">
          <h3 class="punch-viewer-speakernotes-text-header"></h3>
          <div class="punch-viewer-speakernotes-zoom-container">
            <div role="button" class="goog-inline-block jfk-button jfk-button-standard" tabindex="0" title="Put the slideshow back in full screen" data-full-screen style="display: none;">
              <span class="jfk-button-label">Full screen</span>
            </div>
            <div role="button" class="goog-inline-block jfk-button jfk-button-standard jfk-button-narrow jfk-button-collapse-right" tabindex="0" title="Zoom out" data-zoom="-1">
              <div class="punch-viewer-speakernotes-zoom-minus punch-viewer-speakernotes-zoom-button jfk-button-img punch-viewer-icon-large"></div>
            </div><div role="button" class="goog-inline-block jfk-button jfk-button-standard jfk-button-narrow jfk-button-collapse-left" tabindex="0" title="Zoom in" data-zoom="1">
              <div class="punch-viewer-speakernotes-zoom-plus punch-viewer-speakernotes-zoom-button jfk-button-img punch-viewer-icon-large"></div>
            </div>
          </div>
        </div>
        <div class="punch-viewer-speakernotes-text-body-scrollable">
          <div class="punch-viewer-speakernotes-text-body">
            <div class="punch-viewer-speakernotes-text-body-zoomable"></div>
          </div>
        </div>
      </div>
      </div>`;
    // The slideshow loads Roboto in one weight; presenter view's header is bold.
    const ROBOTO = 'https://fonts.googleapis.com/css?family=Roboto:400,500,700';

    // The window, while it's open, and what it last showed.
    let floating = null;
    let shown = { slide: null, notes: null };
    let zoom = 0;
    let size = { width: 420, height: 320 };
    // How Slides names a slide, in the deck's language, learnt from the last slideshow.
    let slideLabel = 'Slide {n} of {total}';
    // What an empty notes box says, learnt from the last one seen (see showsPlaceholder).
    let placeholder = 'Click to add speaker notes';
    chrome.storage.local.get(['notesZoom', 'notesWindow', 'slideLabel', 'notesPlaceholder']).then((stored) => {
      zoom = stored.notesZoom ?? zoom;
      size = stored.notesWindow ?? size;
      slideLabel = stored.slideLabel ?? slideLabel;
      placeholder = stored.notesPlaceholder ?? placeholder;
    });

    // The player on screen: a copy may have taken over from Slides' own (see live-edits.js).
    const slideshow = () => globalThis.slidesCompanion.slideshowFrame()?.contentDocument ?? null;

    // During a slideshow, Slides labels the slide for screen readers: "Slide 3 of 9: Title". While
    // editing, it's the selected slide, in the slideshow's words.
    function slideName() {
      const name = slideshow()?.querySelector('.punch-viewer-svgpage-a11yelement')?.getAttribute('aria-label')?.match(/^[^:]*/)[0];
      if (name) {
        const learnt = name.replace(/\d+/, '{n}').replace(/\d+/, '{total}');
        if (learnt !== slideLabel && learnt.includes('{total}')) {
          slideLabel = learnt;
          chrome.storage.local.set({ slideLabel }).catch(() => {});
        }
        return name;
      }
      const selected = location.href.match(/slide=id\.([^&#]+)/)?.[1];
      const slides = [...document.querySelectorAll('.punch-filmstrip-thumbnail[data-slide-page-id]')];
      const index = slides.findIndex((slide) => slide.dataset.slidePageId === selected);
      return index < 0 ? '' : slideLabel.replace('{n}', index + 1).replace('{total}', slides.length);
    }

    // ----- Notes -----

    // The editor draws the notes as SVG (it goes on doing it under a slideshow): a group per
    // paragraph, one per line, and a <text> per word, in its style, with the spaces left out.
    // Written back as presenter view writes them.
    function notes(doc) {
      const fragment = doc.createDocumentFragment();
      if (showsPlaceholder()) return fragment;
      for (const paragraph of document.querySelectorAll('#speakernotes-workspace g[id*="-paragraph-"]')) {
        const words = paragraph.querySelectorAll('g.sketchy-text-content-text text');
        // Presenter view writes an empty paragraph as a line break.
        if (!words.length) {
          fragment.append(doc.createElement('br'));
          continue;
        }
        const p = doc.createElement('p');
        p.dir = 'auto';
        p.style.cssText = 'line-height:1.2;margin-top:0pt;margin-bottom:0pt;';
        let span = null;
        let previous = null;
        for (const word of words) {
          const style = runStyle(word);
          if (span?.dataset.run !== style) {
            span = doc.createElement('span');
            span.dataset.run = style;
            span.style.cssText = style;
            p.append(span);
          }
          span.textContent += spaceBefore(word, previous) + word.textContent;
          previous = word;
        }
        for (const run of p.children) delete run.dataset.run;
        fragment.append(p);
      }
      return fragment;
    }

    // An empty notes box says "Click to add speaker notes", in Slides' language, drawn just like
    // notes; presenter view shows nothing. Drawn fresh, it lacks the opacity Slides gives what you
    // wrote, so its words are learnt there. But deleting what you wrote leaves the opacity on, so
    // it's the words that tell.
    function showsPlaceholder() {
      const workspace = document.querySelector('#speakernotes-workspace');
      const words = [...(workspace?.querySelectorAll('g.sketchy-text-content-text text') ?? [])];
      const text = words.map((word) => word.textContent).join(' ');
      if (!text) return false;
      const fresh = !workspace.querySelector('g[direction]')?.style.opacity;
      if (fresh && workspace.querySelectorAll('g[id*="-paragraph-"]').length === 1 && text !== placeholder) {
        placeholder = text;
        chrome.storage.local.set({ notesPlaceholder: placeholder }).catch(() => {});
      }
      return text === placeholder;
    }

    function runStyle(word) {
      const { fontFamily, fontSize, fill, fontWeight, fontStyle, textDecoration } = word.style;
      return [
        `font-family:${fontFamily}`,
        `font-size:${fontSize}`,
        `color:${fill || '#000000'}`,
        `font-weight:${fontWeight || 400}`,
        `font-style:${fontStyle || 'normal'}`,
        `text-decoration:${textDecoration || 'none'}`,
        'white-space:pre-wrap',
      ].join(';');
    }

    // Words on one line are a space apart when there's a gap between them; a style changing within
    // a word leaves none. A line that wraps was a space.
    function spaceBefore(word, previous) {
      if (!previous) return '';
      if (previous.parentNode !== word.parentNode) return ' ';
      const end = Number(previous.getAttribute('x') ?? 0) + previous.getComputedTextLength();
      return Number(word.getAttribute('x') ?? 0) - end > 1 ? ' ' : '';
    }

    function render() {
      if (!floating) return;
      const doc = floating.document;
      const slide = slideName();
      const zoomable = doc.querySelector('.punch-viewer-speakernotes-text-body-zoomable');
      const written = doc.createElement('div');
      written.append(notes(doc));
      if (slide === shown.slide && written.innerHTML === shown.notes) return;
      doc.querySelector('.punch-viewer-speakernotes-text-header').textContent = slide;
      zoomable.replaceChildren(...written.childNodes);
      if (slide !== shown.slide) doc.querySelector('.punch-viewer-speakernotes-text-body-scrollable').scrollTop = 0;
      shown = { slide, notes: zoomable.innerHTML };
    }

    // The notes can change a moment after the slide does, a word at a time. The slideshow says when
    // its slide changes; while editing, the filmstrip shows which slide is selected.
    let pending = 0;
    const renderSoon = () => {
      clearTimeout(pending);
      pending = setTimeout(render);
    };
    const observer = new MutationObserver(renderSoon);
    function watch() {
      const notesPanel = document.querySelector('#speakernotes') ?? document.body;
      observer.observe(notesPanel, { subtree: true, childList: true, characterData: true, attributes: true });
      const filmstrip = document.querySelector('.punch-filmstrip-thumbnail')?.parentElement;
      if (filmstrip) observer.observe(filmstrip, { subtree: true, childList: true, attributes: true });
    }
    document.addEventListener(SLIDE_EVENT, renderSoon);

    // ----- Zoom -----

    function applyZoom() {
      const doc = floating.document;
      const scale = ZOOM_STEP ** zoom;
      const zoomable = doc.querySelector('.punch-viewer-speakernotes-text-body-zoomable');
      zoomable.style.transform = `scale(${scale})`;
      zoomable.style.width = `${100 / scale}%`;
      for (const button of doc.querySelectorAll('[data-zoom]')) {
        const atEnd = zoom === (button.dataset.zoom > 0 ? ZOOM_IN : ZOOM_OUT);
        button.classList.toggle('jfk-button-disabled', atEnd);
        button.setAttribute('aria-disabled', String(atEnd));
      }
    }

    function zoomBy(steps) {
      zoom = Math.min(ZOOM_IN, Math.max(ZOOM_OUT, zoom + steps));
      applyZoom();
      chrome.storage.local.set({ notesZoom: zoom }).catch(() => {});
    }

    // Presenter view's buttons are Closure's, which light up as the pointer and focus come and go.
    function wireButton(button, press) {
      const state = (name, on) => button.classList.toggle(`jfk-button-${name}`, on);
      button.addEventListener('mouseenter', () => state('hover', true));
      button.addEventListener('mouseleave', () => (state('hover', false), state('active', false)));
      button.addEventListener('mousedown', (event) => (event.preventDefault(), state('active', true)));
      button.addEventListener('mouseup', () => state('active', false));
      button.addEventListener('focus', () => state('focused', true));
      button.addEventListener('blur', () => state('focused', false));
      button.addEventListener('click', press);
      button.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        event.stopPropagation();
        press();
      });
    }

    // ----- Full screen -----

    // Opening a window takes the browser out of full screen, and Slides ends a slideshow that
    // leaves full screen. So Slides isn't told, and the slideshow goes on in the browser's window
    // until you take it back to full screen: with the notes window's Full screen button, the
    // slideshow's ⋮ menu or ⌘+Shift+F (the browser allows it only right after a click or key).
    // Opened before the slideshow, the window stays on top of it as it goes full screen.
    let fullScreenToRestore = null;
    const FULL_SCREEN_CHANGES = ['fullscreenchange', 'webkitfullscreenchange'];

    // Keeps the slideshow going through the browser leaving full screen as the window opens.
    // Returns what stops it, once the window is open (or didn't open).
    function keepSlideshowThroughOpening() {
      const fullScreen = document.fullscreenElement;
      if (!fullScreen) return () => {};
      const stop = () => FULL_SCREEN_CHANGES.forEach((type) => window.removeEventListener(type, hide, true));
      function hide(event) {
        if (document.fullscreenElement) return;
        // Ahead of Slides, which listens further down.
        event.stopImmediatePropagation();
        fullScreenToRestore = fullScreen;
        showWindowed();
        setTimeout(stop);
      }
      FULL_SCREEN_CHANGES.forEach((type) => window.addEventListener(type, hide, true));
      return (opened) => (opened ? setTimeout(stop, 1500) : stop());
    }

    const restoreFullScreen = () => fullScreenToRestore?.requestFullscreen().catch(() => {});
    document.addEventListener(FULL_SCREEN_EVENT, restoreFullScreen);

    // The ways back to full screen show only while there's one to go back to.
    function showWindowed() {
      if (!fullScreenToRestore?.isConnected || document.fullscreenElement) fullScreenToRestore = null;
      document.documentElement.toggleAttribute(WINDOWED_ATTRIBUTE, Boolean(fullScreenToRestore));
      const button = floating?.document.querySelector('[data-full-screen]');
      if (button) button.style.display = fullScreenToRestore ? '' : 'none';
    }
    document.addEventListener('fullscreenchange', showWindowed);
    document.addEventListener(SLIDESHOW_GONE_EVENT, () => {
      fullScreenToRestore = null;
      showWindowed();
    });

    // ----- The window -----

    // The slideshow's stylesheet, which dresses presenter view: the slideshow's own link, or where
    // the editor's page says it is.
    function viewerStylesheet() {
      const linked = slideshow()?.querySelector('link[rel="stylesheet"][href*="viewer_css"]')?.href;
      if (linked) return linked;
      const direction = document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr';
      const pattern = new RegExp(`/static/presentation/client/css/\\d+-viewer_css_${direction}\\.css`);
      for (const script of document.scripts) {
        const found = script.textContent.match(pattern)?.[0];
        if (found) return new URL(found, location.href).href;
      }
      return null;
    }

    // A second request while one is pending would replace the window it opens.
    let opening = false;
    async function open() {
      if (floating || opening) return;
      opening = true;
      const stopKeeping = keepSlideshowThroughOpening();
      try {
        floating = await documentPictureInPicture.requestWindow(size);
      } catch {
        stopKeeping(false);
        return;
      } finally {
        opening = false;
      }
      stopKeeping(true);
      const doc = floating.document;
      doc.title = 'Speaker notes';
      for (const href of [viewerStylesheet(), ROBOTO]) {
        if (!href) continue;
        const sheet = doc.createElement('link');
        sheet.rel = 'stylesheet';
        sheet.href = href;
        doc.head.append(sheet);
      }
      const layout = doc.createElement('style');
      layout.textContent = LAYOUT_CSS;
      doc.head.append(layout);
      doc.body.className = 'punch-viewer-speakernotes-body';
      doc.body.innerHTML = PANE_HTML;
      for (const button of doc.querySelectorAll('[data-zoom]')) wireButton(button, () => zoomBy(Number(button.dataset.zoom)));
      wireButton(doc.querySelector('[data-full-screen]'), restoreFullScreen);
      applyZoom();
      shown = { slide: null, notes: null };
      render();
      watch();

      // During a slideshow, the keys a clicker or the keyboard sends here go on to it, so it still
      // answers while this window has the focus. Shift+S closes it, and ⌘+Shift+F is full screen.
      for (const type of ['keydown', 'keyup']) {
        doc.addEventListener(type, (event) => {
          if (isToggleKey(event)) {
            if (type === 'keydown') close();
            return;
          }
          if (isFullScreenKey(event)) {
            event.preventDefault();
            if (type === 'keydown') restoreFullScreen();
            return;
          }
          const show = slideshow();
          if (!show || ['Escape', 'Tab'].includes(event.key) || event.metaKey || event.ctrlKey || event.altKey) return;
          event.preventDefault();
          const { key, code, keyCode, which, shiftKey, repeat } = event;
          (show.activeElement ?? show.body).dispatchEvent(
            new KeyboardEvent(type, { key, code, keyCode, which, shiftKey, repeat, bubbles: true, cancelable: true }),
          );
        });
      }
      floating.addEventListener('pagehide', () => {
        if (floating.innerWidth && floating.innerHeight) {
          size = { width: floating.innerWidth, height: floating.innerHeight };
          chrome.storage.local.set({ notesWindow: size }).catch(() => {});
        }
        observer.disconnect();
        floating = null;
        showState();
      });
      showState();
      showWindowed();
    }

    function close() {
      floating?.close();
    }

    const toggle = () => (floating ? close() : open());
    document.addEventListener(TOGGLE_EVENT, toggle);

    // For the slideshow's menu, and ours below.
    function showState() {
      document.documentElement.toggleAttribute(OPEN_ATTRIBUTE, Boolean(floating));
      item.classList.toggle('goog-option-selected', Boolean(floating));
      item.setAttribute('aria-checked', String(Boolean(floating)));
    }

    // ----- The View menu -----

    // Below "Show speaker notes", and like it: ticked while the window is open.
    const item = document.createElement('div');
    item.className = `goog-menuitem apps-menuitem goog-option ${MENU_ITEM_CLASS}`;
    item.setAttribute('role', 'menuitemcheckbox');
    item.innerHTML = `
      <div class="goog-menuitem-content">
        <div class="goog-menuitem-checkbox"></div>
        <span class="goog-menuitem-label">Show floating notes</span>
      </div>`;
    // Slides closes this menu as the button goes down on anything it doesn't know, before a click.
    item.addEventListener('mousedown', (event) => {
      if (event.button !== 0) return;
      item.classList.remove('goog-menuitem-highlight');
      toggle();
    });
    // From the keyboard, Escape (pressed and let go) closes it, and focus goes back to the slide, as
    // after Slides' own items.
    globalThis.slidesCompanion.menuItem(item, () => {
      const focused = document.activeElement;
      for (const type of ['keydown', 'keyup']) {
        focused.dispatchEvent(new KeyboardEvent(type, { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
      }
      toggle();
    });
    showState();
    // Slides builds the View menu when it first opens. Its item is named like the notes panel.
    keepInMenu(item, () => {
      const notesName = document.querySelector('#speakernotes')?.getAttribute('aria-label')?.toLowerCase();
      if (!notesName) return null;
      const options = document.querySelectorAll(`.shell-menu [role="menuitemcheckbox"]:not(.${MENU_ITEM_CLASS})`);
      return [...options].find((option) => option.textContent.toLowerCase().includes(notesName));
    });
  }

  function inSlideshow() {
    // A slideshow started from the editor; one in a tab of its own has no notes to read.
    const editor = (() => {
      try {
        return window.top !== window && window.top.document.querySelector('#speakernotes') ? window.top.document : null;
      } catch {
        return null;
      }
    })();
    if (!editor) return;
    const tell = (type) => editor.dispatchEvent(new CustomEvent(type));
    const isWindowed = () => editor.documentElement.hasAttribute(WINDOWED_ATTRIBUTE);

    // Shift+S, beside S for presenter view. Registered at document_start, ahead of Slides.
    window.addEventListener(
      'keydown',
      (event) => {
        if (!isToggleKey(event) || event.repeat) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        tell(TOGGLE_EVENT);
      },
      true,
    );
    // Slides believes it's still full screen while it's out of it behind its back (see the
    // editor's part), so its shortcut would try to leave.
    window.addEventListener(
      'keydown',
      (event) => {
        if (!isFullScreenKey(event) || !isWindowed()) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!event.repeat) tell(FULL_SCREEN_EVENT);
      },
      true,
    );
    window.addEventListener('pagehide', () => tell(SLIDESHOW_GONE_EVENT));
    let slide = null;
    new MutationObserver(() => {
      const name = document.querySelector('.punch-viewer-svgpage-a11yelement')?.getAttribute('aria-label');
      if (!name || name === slide) return;
      slide = name;
      tell(SLIDE_EVENT);
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-label'] });

    // ----- The ⋮ menu -----

    // Below Slides' item for presenter view ("Open speaker notes"), which has this icon.
    const item = document.createElement('div');
    item.className = `goog-menuitem apps-menuitem ${MENU_ITEM_CLASS}`;
    item.setAttribute('role', 'menuitem');
    item.innerHTML = `
      <div class="goog-menuitem-content">
        <div class="docs-icon goog-inline-block goog-menuitem-icon" aria-hidden="true">
          <div class="docs-icon-img-container docs-icon-img docs-icon-picture-in-picture-top-right-20"></div>
        </div>
        <span class="goog-menuitem-label"></span>
        <span class="goog-menuitem-accel" aria-label="Shift+S">Shift+S</span>
      </div>`;
    const chooseNotes = () => {
      closeMenu();
      tell(TOGGLE_EVENT);
    };
    item.addEventListener('click', (event) => {
      event.stopPropagation();
      item.classList.remove('goog-menuitem-highlight');
      chooseNotes();
    });
    globalThis.slidesCompanion.menuItem(item, chooseNotes);
    const showState = () => {
      item.querySelector('.goog-menuitem-label').textContent = label(editor.documentElement.hasAttribute(OPEN_ATTRIBUTE));
    };
    showState();
    new MutationObserver(showState).observe(editor.documentElement, { attributes: true, attributeFilter: [OPEN_ATTRIBUTE] });
    keepInMenu(item, () => document.querySelector('.punch-viewer-navbar-menu .docs-icon-notes')?.closest('.goog-menuitem'));

    // Out of full screen behind Slides' back, its menu still offers "Exit full screen". In its
    // place, Slides' own "Enter full screen" item, which it keeps hidden and switched off.
    let enter = null;
    function showFullScreenItem() {
      const exit = document.querySelector('.punch-viewer-navbar-menu .docs-icon-fullscreen-exit')?.closest('.goog-menuitem');
      const slidesEnter = document.querySelector('.punch-viewer-navbar-menu .docs-icon-fullscreen')?.closest('.goog-menuitem');
      if (!exit || !slidesEnter) return;
      const windowed = isWindowed();
      globalThis.slidesCompanion.hideMenuItem(exit, windowed);
      if (!windowed) {
        enter?.remove();
        enter = null;
        return;
      }
      if (enter?.isConnected) return;
      enter = slidesEnter.cloneNode(true);
      for (const element of [enter, ...enter.querySelectorAll('[id]')]) element.removeAttribute('id');
      enter.classList.remove('goog-menuitem-disabled');
      enter.removeAttribute('aria-disabled');
      enter.style.display = '';
      const chooseFullScreen = () => {
        closeMenu();
        tell(FULL_SCREEN_EVENT);
      };
      enter.addEventListener('click', (event) => {
        event.stopPropagation();
        enter.classList.remove('goog-menuitem-highlight');
        chooseFullScreen();
      });
      globalThis.slidesCompanion.menuItem(enter, chooseFullScreen);
      exit.after(enter);
    }
    showFullScreenItem();
    new MutationObserver(showFullScreenItem).observe(editor.documentElement, { attributes: true, attributeFilter: [WINDOWED_ATTRIBUTE] });

    // Pressing ⋮ again closes the menu, as Slides does. (Esc would end the slideshow.) Focus goes
    // back to the slideshow, as after Slides' own items, so Space goes on to the next slide.
    function closeMenu() {
      const more = document.querySelector('.punch-viewer-navbar-more');
      if (more?.getAttribute('aria-expanded') !== 'true') return;
      for (const type of ['mousedown', 'mouseup']) more.dispatchEvent(new MouseEvent(type, { bubbles: true, button: 0 }));
      more.blur();
    }
  }
}

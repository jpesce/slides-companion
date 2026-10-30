// The Settings dialog, opened from the companion. It mirrors Slides' Tools › Preferences dialog
// (a Material 3 dialog): same layout, type, colours, controls, buttons and motion.
{
  const TITLE_ID = 'slides-companion-settings-title';
  // Matches the closing fade in settings-dialog.css.
  const EXIT_MS = 75;

  const SETTINGS_HTML = `
    <div class="slides-companion-dialog-scrim"></div>
    <div class="slides-companion-dialog" role="dialog" aria-modal="true" aria-labelledby="${TITLE_ID}">
      <h2 class="slides-companion-dialog-title" id="${TITLE_ID}">Slides Companion settings</h2>
      <div class="slides-companion-dialog-content">
        <h3 class="slides-companion-dialog-section">Spotlight</h3>
        <p class="slides-companion-dialog-text">
          Select an image and press Space to see it full screen. Use ← and → to go through the
          other images on the slide.
        </p>
        <fieldset class="slides-companion-dialog-group">
          <legend class="slides-companion-dialog-legend">When images are grouped</legend>
          <label class="slides-companion-dialog-option">
            <input type="radio" name="groupedImages" value="together">
            <span class="slides-companion-radio" aria-hidden="true"></span>
            <span class="slides-companion-dialog-label">
              Show the group as one image
              <span class="slides-companion-dialog-hint">(for example, a photo grouped with its caption)</span>
            </span>
          </label>
          <label class="slides-companion-dialog-option">
            <input type="radio" name="groupedImages" value="apart">
            <span class="slides-companion-radio" aria-hidden="true"></span>
            <span class="slides-companion-dialog-label">
              Show each image on its own
              <span class="slides-companion-dialog-hint">(for example, photos grouped to keep a layout tidy)</span>
            </span>
          </label>
        </fieldset>
      </div>
      <div class="slides-companion-dialog-actions">
        <button type="button" class="slides-companion-button-text" data-action="cancel">Cancel</button>
        <button type="button" class="slides-companion-button-filled" data-action="ok">OK</button>
      </div>
    </div>`;

  let root = null;
  let returnFocusTo = null;

  function open(opener) {
    if (root) return;
    const { settings } = globalThis.slidesCompanion;
    returnFocusTo = opener ?? null;

    root = document.createElement('div');
    root.className = 'slides-companion-dialog-root';
    root.innerHTML = SETTINGS_HTML;
    const checked = root.querySelector(`input[name="groupedImages"][value="${settings.get('groupedImages')}"]`);
    if (checked) checked.checked = true;

    // Slides listens on the page for keys and clicks (arrows move objects, Delete deletes them).
    for (const type of ['keydown', 'keyup', 'keypress', 'mousedown', 'mouseup', 'click', 'contextmenu', 'wheel']) {
      root.addEventListener(type, (event) => event.stopPropagation());
    }
    root.addEventListener('keydown', onKeydown);
    root.querySelector('.slides-companion-dialog-scrim').addEventListener('click', close);
    root.querySelector('[data-action="cancel"]').addEventListener('click', close);
    root.querySelector('[data-action="ok"]').addEventListener('click', save);

    document.body.append(root);
    root.getBoundingClientRect(); // Start the transition from the closed state.
    root.classList.add('slides-companion-dialog-open');
    (checked ?? root.querySelector('input')).focus();
  }

  function save() {
    const choice = root.querySelector('input[name="groupedImages"]:checked');
    if (choice) globalThis.slidesCompanion.settings.set({ groupedImages: choice.value });
    close();
  }

  function close() {
    if (!root) return;
    const closing = root;
    root = null;
    closing.classList.remove('slides-companion-dialog-open');
    closing.classList.add('slides-companion-dialog-closing');
    setTimeout(() => closing.remove(), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : EXIT_MS);
    returnFocusTo?.focus();
  }

  function onKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'Enter' && !event.target.matches('button')) {
      event.preventDefault();
      save();
    } else if (event.key === 'Tab') {
      trapFocus(event);
    }
  }

  // Keep Tab inside the dialog: the radio group (one stop), Cancel, OK.
  function trapFocus(event) {
    const stops = [
      root.querySelector('input:checked') ?? root.querySelector('input'),
      ...root.querySelectorAll('button'),
    ];
    const index = stops.indexOf(document.activeElement);
    const next = (index + (event.shiftKey ? -1 : 1) + stops.length) % stops.length;
    event.preventDefault();
    stops[next].focus();
  }

  globalThis.slidesCompanion ??= {};
  globalThis.slidesCompanion.openSettings = open;
}

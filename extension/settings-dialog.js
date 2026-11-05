// The Settings dialog, opened from the companion. Its frame mirrors Slides' Tools › Preferences
// dialog (a Material 3 dialog): type, colours, controls, buttons and motion. Each feature has a page
// of its own, chosen from a list down the side as in Google Meet's Settings.
{
  // Matches the closing fade in settings-dialog.css.
  const EXIT_MS = 75;
  // Material's checkmark, drawn in by stroke (see settings-dialog.css).
  const CHECKMARK = '<svg viewBox="0 0 24 24"><path d="M1.73 12.91 8.1 19.28 22.79 4.59"/></svg>';

  // An option in a group of choices.
  const radio = (name, value, label, hint) => `
    <label class="slides-companion-dialog-option">
      <input type="radio" name="${name}" value="${value}">
      <span class="slides-companion-radio" aria-hidden="true"></span>
      <span class="slides-companion-dialog-label">
        ${label}
        <span class="slides-companion-dialog-hint">(${hint})</span>
      </span>
    </label>`;

  // Material Symbols (Apache 2.0), the icons Meet's Settings uses.
  const icon = (path) => `<svg viewBox="0 -960 960 960" aria-hidden="true"><path d="${path}"/></svg>`;

  // One row in the list down the side for each feature, and its page of settings.
  const FEATURES = [
    {
      id: 'spotlight',
      name: 'Spotlight',
      icon: icon('M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm40-80h480L570-480 450-320l-90-120-120 160Zm-40 80v-560 560Z'),
      page: `
        <p class="slides-companion-dialog-text">
          Select an image and press Space to see it full screen, on black. Use ← and → to go through
          the other images on the slide.
        </p>
        <label class="slides-companion-dialog-option">
          <input type="checkbox" name="spotlightOnClick">
          <span class="slides-companion-checkbox" aria-hidden="true">${CHECKMARK}</span>
          <span class="slides-companion-dialog-label">
            Spotlight an image when you click it in a full screen slideshow
            <span class="slides-companion-dialog-hint">(clicking anywhere else goes to the next slide, unless you’ve zoomed in)</span>
          </span>
        </label>
        <fieldset class="slides-companion-dialog-group">
          <legend class="slides-companion-dialog-legend">When images are grouped</legend>
          ${radio('groupedImages', 'together', 'Show the group as one image', 'for example, a photo grouped with its caption')}
          ${radio('groupedImages', 'apart', 'Show each image on its own', 'for example, photos grouped to keep a layout tidy')}
        </fieldset>`,
    },
    {
      id: 'links',
      name: 'Links',
      icon: icon('M440-280H280q-83 0-141.5-58.5T80-480q0-83 58.5-141.5T280-680h160v80H280q-50 0-85 35t-35 85q0 50 35 85t85 35h160v80ZM320-440v-80h320v80H320Zm200 160v-80h160q50 0 85-35t35-85q0-50-35-85t-85-35H520v-80h160q83 0 141.5 58.5T880-480q0 83-58.5 141.5T680-280H520Z'),
      page: `
        <p class="slides-companion-dialog-text">
          During a slideshow, click a link to open it over the slide, and press Esc to come back. Some
          sites don’t allow being shown over a slide. For those, choose Open in new tab at the bottom
          of the screen, or let them all be shown.
        </p>
        <iframe class="slides-companion-dialog-frame" src="${chrome.runtime.getURL('all-sites.html')}" title="Every site"></iframe>
        <fieldset class="slides-companion-dialog-group">
          <legend class="slides-companion-dialog-legend">When you click a link during a slideshow</legend>
          ${radio('slideshowLinks', 'here', 'Open it over the slide', 'press Esc to come back to your slide, right where you left it')}
          ${radio('slideshowLinks', 'tab', 'Open it in a new tab', 'as Slides does on its own')}
        </fieldset>`,
    },
    {
      id: 'scrolling',
      name: 'Scrolling',
      icon: icon('M480-80q-116 0-198-82t-82-198v-240q0-116 82-198t198-82q116 0 198 82t82 198v240q0 116-82 198T480-80Zm40-520h160q0-72-45.5-127T520-796v196Zm-240 0h160v-196q-69 14-114.5 69T280-600Zm200 440q83 0 141.5-58.5T680-360v-160H280v160q0 83 58.5 141.5T480-160Zm0-360Zm40-80Zm-80 0Zm40 80Z'),
      page: `
        <p class="slides-companion-dialog-text">
          What happens when you scroll over a slide with a mouse wheel or trackpad.
        </p>
        <fieldset class="slides-companion-dialog-group">
          <legend class="slides-companion-dialog-legend">During a slideshow</legend>
          ${radio('slideshowScroll', 'zoom', 'Zoom into the slide', 'drag to look around while zoomed in')}
          ${radio('slideshowScroll', 'nothing', 'Do nothing', 'so a brush of the trackpad never skips a slide')}
          ${radio('slideshowScroll', 'slides', 'Go to the next or previous slide', 'as Slides does on its own')}
        </fieldset>
        <fieldset class="slides-companion-dialog-group">
          <legend class="slides-companion-dialog-legend">While editing</legend>
          ${radio('editorScroll', 'slides', 'Go to the next or previous slide', 'as Slides does on its own')}
          ${radio('editorScroll', 'nothing', 'Do nothing', 'you can still scroll around a slide you’ve zoomed into')}
        </fieldset>`,
    },
    {
      id: 'pen',
      name: 'Pen',
      icon: icon('m490-527 37 37 217-217-37-37-217 217ZM200-200h37l233-233-37-37-233 233v37Zm355-205L405-555l167-167-29-29-219 219-56-56 218-219q24-24 56.5-24t56.5 24l29 29 50-50q12-12 28.5-12t28.5 12l93 93q12 12 12 28.5T828-678L555-405ZM270-120H120v-150l285-285 150 150-285 285Z'),
      page: `
        <p class="slides-companion-dialog-text">
          During a slideshow, press Shift + L to draw on a slide.
        </p>
        <label class="slides-companion-dialog-option">
          <input type="checkbox" name="keepInk">
          <span class="slides-companion-checkbox" aria-hidden="true">${CHECKMARK}</span>
          <span class="slides-companion-dialog-label">
            Keep what you draw after the slideshow ends
            <span class="slides-companion-dialog-hint">(it’s back on the same slide the next time you present on this computer, until you choose Erase all)</span>
          </span>
        </label>`,
    },
    {
      id: 'timer',
      name: 'Timer',
      icon: icon('M360-840v-80h240v80H360Zm80 440h80v-240h-80v240Zm-99.5 291.5Q275-137 226-186t-77.5-114.5Q120-366 120-440t28.5-139.5Q177-645 226-694t114.5-77.5Q406-800 480-800q62 0 119 20t107 58l56-56 56 56-56 56q38 50 58 107t20 119q0 74-28.5 139.5T734-186q-49 49-114.5 77.5T480-80q-74 0-139.5-28.5ZM678-242q82-82 82-198t-82-198q-82-82-198-82t-198 82q-82 82-82 198t82 198q82 82 198 82t198-82ZM480-440Z'),
      page: `
        <p class="slides-companion-dialog-text">
          In presenter view, press the timer button beside Pause and Reset, or the time itself, to count
          down from how long you have. Past the end, it keeps counting in red. Each deck remembers its
          time.
        </p>
        <fieldset class="slides-companion-dialog-group">
          <legend class="slides-companion-dialog-legend">Turn the timer orange</legend>
          ${radio('countdownWarning', '1', '1 minute before the end', 'for short talks')}
          ${radio('countdownWarning', '2', '2 minutes before the end', 'time to wrap up most talks')}
          ${radio('countdownWarning', '5', '5 minutes before the end', 'for long talks and workshops')}
        </fieldset>`,
    },
    {
      id: 'live-edits',
      name: 'Edits during a slideshow',
      icon: icon('M160-160v-80h110l-16-14q-52-46-73-105t-21-119q0-111 66.5-197.5T400-790v84q-72 26-116 88.5T240-478q0 45 17 87.5t53 78.5l10 10v-98h80v240H160Zm400-10v-84q72-26 116-88.5T720-482q0-45-17-87.5T650-648l-10-10v98h-80v-240h240v80H690l16 14q49 49 71.5 106.5T800-482q0 111-66.5 197.5T560-170Z'),
      page: `
        <p class="slides-companion-dialog-text">
          When the deck is edited while you present it, by you in another tab or by someone else, the
          slideshow shows it within a few seconds. Other slides update without anyone noticing.
        </p>
        <fieldset class="slides-companion-dialog-group">
          <legend class="slides-companion-dialog-legend">The slide on screen changes</legend>
          ${radio('liveEdits', 'now', 'Right away', 'it fades into its new version once nothing on it is moving')}
          ${radio('liveEdits', 'later', 'Once you’ve moved to another slide', 'so it never changes while you’re talking about it')}
          ${radio('liveEdits', 'off', 'Not until the next slideshow', 'the whole slideshow stays as it was when you started, as Slides does on its own')}
        </fieldset>`,
    },
  ];

  const tabId = (feature) => `slides-companion-settings-tab-${feature.id}`;
  const pageId = (feature) => `slides-companion-settings-page-${feature.id}`;

  // Laid out like Google Meet's Settings: the features down the side, the chosen one's page beside
  // them, and the first one chosen.
  const SETTINGS_HTML = `
    <div class="slides-companion-dialog-scrim"></div>
    <div class="slides-companion-dialog" role="dialog" aria-modal="true" aria-label="Slides Companion settings">
      <div class="slides-companion-settings-side">
        <h2 class="slides-companion-dialog-title">Settings</h2>
        <div class="slides-companion-settings-features" role="tablist" aria-orientation="vertical">
          ${FEATURES.map((feature, index) => `
            <button type="button" class="slides-companion-settings-feature" role="tab" id="${tabId(feature)}"
              aria-controls="${pageId(feature)}" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}">
              ${feature.icon}<span>${feature.name}</span>
            </button>`).join('')}
        </div>
      </div>
      <div class="slides-companion-settings-main">
        <div class="slides-companion-dialog-content">
          ${FEATURES.map((feature, index) => `
            <div class="slides-companion-settings-page" role="tabpanel" id="${pageId(feature)}" aria-labelledby="${tabId(feature)}"${index === 0 ? '' : ' hidden'}>
              ${feature.page}
            </div>`).join('')}
        </div>
        <div class="slides-companion-dialog-actions">
          <button type="button" class="slides-companion-button-text" data-action="cancel">Cancel</button>
          <button type="button" class="slides-companion-button-filled" data-action="ok">OK</button>
        </div>
      </div>
    </div>`;

  // Sent to the framed "Show every site" checkbox (all-sites.js), which acts on OK or Cancel.
  const ALL_SITES_SOURCE = 'slides-companion-all-sites';
  const allSitesFrame = () => root?.querySelector('.slides-companion-dialog-frame');
  const tellAllSites = (message) => allSitesFrame()?.contentWindow.postMessage(message, new URL(allSitesFrame().src).origin);

  let root = null;
  let returnFocusTo = null;

  function openDialog(opener) {
    if (root) return;
    const { settings } = globalThis.slidesCompanion;
    returnFocusTo = opener ?? null;

    root = document.createElement('div');
    root.className = 'slides-companion-dialog-root';
    root.innerHTML = SETTINGS_HTML;
    for (const input of root.querySelectorAll('input')) {
      input.checked = input.type === 'checkbox' ? settings.get(input.name) : settings.get(input.name) === input.value;
    }

    // Slides listens on the page for keys and clicks (arrows move objects, Delete deletes them).
    for (const type of ['keydown', 'keyup', 'keypress', 'mousedown', 'mouseup', 'click', 'contextmenu', 'wheel']) {
      root.addEventListener(type, (event) => event.stopPropagation());
    }
    root.addEventListener('keydown', onKeydown);
    root.querySelector('.slides-companion-dialog-scrim').addEventListener('click', closeDialog);
    root.querySelector('[data-action="cancel"]').addEventListener('click', closeDialog);
    root.querySelector('[data-action="ok"]').addEventListener('click', save);
    const features = root.querySelector('[role="tablist"]');
    features.addEventListener('click', (event) => {
      const feature = event.target.closest('[role="tab"]');
      if (feature) showFeature(feature);
    });
    features.addEventListener('keydown', onFeatureKeydown);

    window.addEventListener('message', onFrameMessage);
    document.body.append(root);
    root.getBoundingClientRect(); // Start the transition from the closed state.
    root.classList.add('slides-companion-dialog-open');
    controlStops()[0].focus();
  }

  function save() {
    const choices = [...root.querySelectorAll('input[type="checkbox"], input[type="radio"]:checked')];
    globalThis.slidesCompanion.settings.set(
      Object.fromEntries(choices.map((input) => [input.name, input.type === 'checkbox' ? input.checked : input.value])),
    );
    tellAllSites('save');
    closeDialog();
  }

  function closeDialog() {
    if (!root) return;
    tellAllSites('cancel'); // Unheard after OK.
    window.removeEventListener('message', onFrameMessage);
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
      closeDialog();
    } else if (event.key === 'Enter' && !event.target.matches('button')) {
      event.preventDefault();
      save();
    } else if (event.key === 'Tab') {
      trapFocus(event);
    }
  }

  const featureTabs = () => [...root.querySelectorAll('[role="tab"]')];

  // Shows a feature's page. Only the chosen feature is a Tab stop in the list.
  function showFeature(chosen) {
    for (const feature of featureTabs()) {
      const isChosen = feature === chosen;
      feature.setAttribute('aria-selected', isChosen);
      feature.tabIndex = isChosen ? 0 : -1;
      root.querySelector(`#${feature.getAttribute('aria-controls')}`).hidden = !isChosen;
    }
    root.querySelector('.slides-companion-dialog-content').scrollTop = 0;
  }

  // ↑ and ↓ go through the list, Home and End to its ends, showing each feature on the way.
  function onFeatureKeydown(event) {
    const features = featureTabs();
    const index = features.indexOf(event.target);
    const next = { ArrowUp: index - 1, ArrowDown: index + 1, Home: 0, End: features.length - 1 }[event.key];
    if (index === -1 || next === undefined) return;
    event.preventDefault();
    const feature = features[(next + features.length) % features.length];
    showFeature(feature);
    feature.focus();
  }

  // The framed checkbox: its size, and the dialog's keys pressed in it.
  function onFrameMessage(event) {
    const frame = allSitesFrame();
    if (!frame || event.source !== frame.contentWindow || event.data?.source !== ALL_SITES_SOURCE) return;
    if (event.data.type === 'height') frame.style.height = `${event.data.height}px`;
    if (event.data.type !== 'key') return;
    if (event.data.key === 'Escape') closeDialog();
    else if (event.data.key === 'Enter') save();
    else trapFocus({ shiftKey: event.data.shiftKey, preventDefault() {} });
  }

  // One Tab stop per control, in order: the chosen feature in the list, then on its page each
  // checkbox (one of them framed) and each radio group (its checked option, or its first).
  function controlStops() {
    const page = root.querySelector('.slides-companion-settings-page:not([hidden])');
    const controls = page.querySelectorAll(':scope > label input, .slides-companion-dialog-frame, fieldset');
    return [
      root.querySelector('[role="tab"][aria-selected="true"]'),
      ...[...controls].map((control) =>
        control.matches('fieldset') ? (control.querySelector('input:checked') ?? control.querySelector('input')) : control,
      ),
    ];
  }

  // Keep Tab inside the dialog: the list, the page's controls, Cancel, OK.
  function trapFocus(event) {
    const stops = [...controlStops(), ...root.querySelectorAll('.slides-companion-dialog-actions button')];
    const index = stops.indexOf(document.activeElement);
    const next = (index + (event.shiftKey ? -1 : 1) + stops.length) % stops.length;
    event.preventDefault();
    stops[next].focus();
    if (stops[next] === allSitesFrame()) tellAllSites('focus');
  }

  globalThis.slidesCompanion ??= {};
  globalThis.slidesCompanion.openSettings = openDialog;
}

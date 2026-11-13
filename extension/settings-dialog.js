// The Settings dialog, opened from the companion or the extension's button in the browser. Its
// frame mirrors Slides' Tools › Preferences dialog (a Material 3 dialog): type, colours, controls,
// buttons and motion. Each feature has a page of its own, chosen from a list down the side as in
// Google Meet's Settings.
{
  // Material's checkmark, drawn in by stroke (see settings-dialog.css).
  const CHECKMARK = '<svg viewBox="0 0 24 24"><path d="M1.73 12.91 8.1 19.28 22.79 4.59"/></svg>';

  // A message, made safe to write into the dialog's HTML.
  const words = (key, ...values) => globalThis.slidesCompanion.html(key, ...values);
  const { text } = globalThis.slidesCompanion;

  // An option in a group of choices, its label and hint named by message.
  const radio = (name, value, label, hint) => `
    <label class="slides-companion-dialog-option">
      <input type="radio" name="${name}" value="${value}">
      <span class="slides-companion-radio" aria-hidden="true"></span>
      <span class="slides-companion-dialog-label">
        ${words(label)}<span class="slides-companion-dialog-hint">${words('hint', text(hint))}</span>
      </span>
    </label>`;

  // A checkbox, its label and hint named by message.
  const checkbox = (name, label, hint) => `
    <label class="slides-companion-dialog-option">
      <input type="checkbox" name="${name}">
      <span class="slides-companion-checkbox" aria-hidden="true">${CHECKMARK}</span>
      <span class="slides-companion-dialog-label">
        ${words(label)}<span class="slides-companion-dialog-hint">${words('hint', text(hint))}</span>
      </span>
    </label>`;

  const about = (key, ...values) =>
    `<p class="slides-companion-dialog-text">${words(key, ...values)}</p>`;
  const legend = (key) => `<legend class="slides-companion-dialog-legend">${words(key)}</legend>`;

  // Material Symbols (Apache 2.0), the icons Meet's Settings uses.
  const icon = (path) => globalThis.slidesCompanion.ui.icon(path, '0 -960 960 960');

  // One row in the list down the side for each feature, and its page of settings.
  const FEATURES = [
    {
      id: 'spotlight',
      name: 'spotlightName',
      summary: 'spotlightSummary',
      icon: icon(
        'M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm40-80h480L570-480 450-320l-90-120-120 160Zm-40 80v-560 560Z',
      ),
      page: () => `
        ${about('spotlightAbout')}
        ${checkbox('spotlightOnClick', 'spotlightOnClick', 'spotlightOnClickHint')}
        <fieldset class="slides-companion-dialog-group">
          ${legend('groupedImages')}
          ${radio('groupedImages', 'together', 'groupedTogether', 'groupedTogetherHint')}
          ${radio('groupedImages', 'apart', 'groupedApart', 'groupedApartHint')}
        </fieldset>`,
    },
    {
      id: 'links',
      name: 'linksName',
      summary: 'linksSummary',
      icon: icon(
        'M440-280H280q-83 0-141.5-58.5T80-480q0-83 58.5-141.5T280-680h160v80H280q-50 0-85 35t-35 85q0 50 35 85t85 35h160v80ZM320-440v-80h320v80H320Zm200 160v-80h160q50 0 85-35t35-85q0-50-35-85t-85-35H520v-80h160q83 0 141.5 58.5T880-480q0 83-58.5 141.5T680-280H520Z',
      ),
      // The framed notice speaks the dialog’s language.
      page: () => `
        ${about('linksAbout')}
        <iframe class="slides-companion-dialog-frame slides-companion-dialog-frame-empty" src="${chrome.runtime.getURL(`all-sites.html?hl=${globalThis.slidesCompanion.locale()}`)}" title="${words('allSitesFrame')}"></iframe>
        <fieldset class="slides-companion-dialog-group">
          ${legend('slideshowLinks')}
          ${radio('slideshowLinks', 'here', 'linksHere', 'linksHereHint')}
          ${radio('slideshowLinks', 'tab', 'linksTab', 'asSlidesDoes')}
        </fieldset>`,
    },
    {
      id: 'zoom',
      name: 'zoomName',
      summary: 'zoomSummary',
      icon: icon(
        'M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Zm-40-60v-80h-80v-80h80v-80h80v80h80v80h-80v80h-80Z',
      ),
      page: () => `
        ${about('zoomAbout')}
        <fieldset class="slides-companion-dialog-group">
          ${legend('slideshowScroll')}
          ${radio('slideshowScroll', 'zoom', 'scrollZoom', 'scrollZoomHint')}
          ${radio('slideshowScroll', 'nothing', 'scrollNothing', 'scrollNothingHint')}
          ${radio('slideshowScroll', 'slides', 'scrollSlides', 'asSlidesDoes')}
        </fieldset>
        <fieldset class="slides-companion-dialog-group">
          ${legend('editorScroll')}
          ${radio('editorScroll', 'slides', 'scrollSlides', 'asSlidesDoes')}
          ${radio('editorScroll', 'nothing', 'scrollNothing', 'editorScrollNothingHint')}
        </fieldset>`,
    },
    {
      id: 'pen',
      name: 'penName',
      summary: 'penSummary',
      icon: icon(
        'm490-527 37 37 217-217-37-37-217 217ZM200-200h37l233-233-37-37-233 233v37Zm355-205L405-555l167-167-29-29-219 219-56-56 218-219q24-24 56.5-24t56.5 24l29 29 50-50q12-12 28.5-12t28.5 12l93 93q12 12 12 28.5T828-678L555-405ZM270-120H120v-150l285-285 150 150-285 285Z',
      ),
      page: () => `
        ${about('penAbout')}
        ${checkbox('keepInk', 'keepInk', 'keepInkHint')}`,
    },
    {
      id: 'presenter-view',
      name: 'presenterViewName',
      summary: 'presenterViewSummary',
      // Slides' picture-in-picture icon (floating notes' menu item), drawn as Material Symbols are.
      icon: icon(
        'M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm0-80h640v-480H160v480Zm320-280h240v-160H480v160Z',
      ),
      page: () => `
        ${about('presenterViewAbout')}
        <fieldset class="slides-companion-dialog-group">
          ${legend('presenterViewOpens')}
          ${radio('presenterViewOpens', 'auto', 'presenterViewAuto', 'presenterViewAutoHint')}
          ${radio('presenterViewOpens', 'floating', 'presenterViewFloating', 'presenterViewFloatingHint')}
          ${radio('presenterViewOpens', 'window', 'presenterViewWindow', 'asSlidesDoes')}
        </fieldset>
        <fieldset class="slides-companion-dialog-group">
          ${legend('presenterViewFloats')}
          ${radio('presenterViewFloats', 'all', 'floatsAll', 'floatsAllHint')}
          ${radio('presenterViewFloats', 'notes', 'floatsNotes', 'floatsNotesHint')}
        </fieldset>`,
    },
    {
      id: 'timer',
      name: 'timerName',
      summary: 'timerSummary',
      icon: icon(
        'M360-840v-80h240v80H360Zm80 440h80v-240h-80v240Zm-99.5 291.5Q275-137 226-186t-77.5-114.5Q120-366 120-440t28.5-139.5Q177-645 226-694t114.5-77.5Q406-800 480-800q62 0 119 20t107 58l56-56 56 56-56 56q38 50 58 107t20 119q0 74-28.5 139.5T734-186q-49 49-114.5 77.5T480-80q-74 0-139.5-28.5ZM678-242q82-82 82-198t-82-198q-82-82-198-82t-198 82q-82 82-82 198t82 198q82 82 198 82t198-82ZM480-440Z',
      ),
      page: () => `
        ${about('timerAbout')}
        ${checkbox('countdownBar', 'countdownBar', 'countdownBarHint')}
        <fieldset class="slides-companion-dialog-group">
          ${legend('countdownWarning')}
          ${radio('countdownWarning', '1', 'warning1', 'warning1Hint')}
          ${radio('countdownWarning', '2', 'warning2', 'warning2Hint')}
          ${radio('countdownWarning', '5', 'warning5', 'warning5Hint')}
        </fieldset>`,
    },
    {
      id: 'live-edits',
      name: 'liveEditsName',
      summary: 'liveEditsSummary',
      icon: icon(
        'M160-160v-80h110l-16-14q-52-46-73-105t-21-119q0-111 66.5-197.5T400-790v84q-72 26-116 88.5T240-478q0 45 17 87.5t53 78.5l10 10v-98h80v240H160Zm400-10v-84q72-26 116-88.5T720-482q0-45-17-87.5T650-648l-10-10v98h-80v-240h240v80H690l16 14q49 49 71.5 106.5T800-482q0 111-66.5 197.5T560-170Z',
      ),
      page: () => `
        ${about('liveEditsAbout')}
        <fieldset class="slides-companion-dialog-group">
          ${legend('liveEdits')}
          ${radio('liveEdits', 'now', 'liveEditsNow', 'liveEditsNowHint')}
          ${radio('liveEdits', 'later', 'liveEditsLater', 'liveEditsLaterHint')}
          ${radio('liveEdits', 'off', 'liveEditsOff', 'liveEditsOffHint')}
        </fieldset>`,
    },
    {
      id: 'companion',
      name: 'companionName',
      summary: 'companionSummary',
      icon: icon(
        'M620-520q25 0 42.5-17.5T680-580q0-25-17.5-42.5T620-640q-25 0-42.5 17.5T560-580q0 25 17.5 42.5T620-520Zm-280 0q25 0 42.5-17.5T400-580q0-25-17.5-42.5T340-640q-25 0-42.5 17.5T280-580q0 25 17.5 42.5T340-520Zm263.5 221.5Q659-337 684-400H276q25 63 80.5 101.5T480-260q68 0 123.5-38.5ZM324-111.5Q251-143 197-197t-85.5-127Q80-397 80-480t31.5-156Q143-709 197-763t127-85.5Q397-880 480-880t156 31.5Q709-817 763-763t85.5 127Q880-563 880-480t-31.5 156Q817-251 763-197t-127 85.5Q563-80 480-80t-156-31.5ZM480-480Zm227 227q93-93 93-227t-93-227q-93-93-227-93t-227 93q-93 93-93 227t93 227q93 93 227 93t227-93Z',
      ),
      page: () => `
        ${about('companionAbout')}
        ${checkbox('showCompanion', 'showCompanion', 'showCompanionHint')}`,
    },
  ];

  const tabId = (feature) => `slides-companion-settings-tab-${feature.id}`;
  const pageId = (feature) => `slides-companion-settings-page-${feature.id}`;

  // Laid out like Google Meet's Settings: the features down the side, each with a line on what it's
  // about as in Android's Settings, the chosen one's page beside them, and the first one chosen.
  // Each page opens with an illustration of the feature, as Android's Settings pages do
  // (illustrations.js). Written as it opens, in the language Slides is in then.
  const settingsHtml = () => `
    <div class="slides-companion-dialog-scrim"></div>
    <div class="slides-companion-dialog" role="dialog" aria-modal="true" aria-label="${words('settingsLabel')}">
      <div class="slides-companion-settings-side">
        <h2 class="slides-companion-dialog-title">${words('settingsTitle')}</h2>
        <div class="slides-companion-settings-features" role="tablist" aria-orientation="vertical">
          ${FEATURES.map(
            (feature, index) => `
            <button type="button" class="slides-companion-settings-feature" role="tab" id="${tabId(feature)}"
              aria-controls="${pageId(feature)}" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}"
              aria-labelledby="${tabId(feature)}-name" aria-describedby="${tabId(feature)}-summary">
              ${feature.icon}
              <span class="slides-companion-settings-feature-text">
                <span id="${tabId(feature)}-name">${words(feature.name)}</span>
                <span class="slides-companion-settings-feature-summary" id="${tabId(feature)}-summary">${words(feature.summary)}</span>
              </span>
            </button>`,
          ).join('')}
        </div>
      </div>
      <div class="slides-companion-settings-main">
        <div class="slides-companion-dialog-content">
          ${FEATURES.map(
            (feature, index) => `
            <div class="slides-companion-settings-page" role="tabpanel" id="${pageId(feature)}" aria-labelledby="${tabId(feature)}"${index === 0 ? '' : ' hidden'}>
              ${globalThis.slidesCompanion.illustrations[feature.id]}
              ${feature.page()}
            </div>`,
          ).join('')}
        </div>
        <div class="slides-companion-dialog-actions">
          <button type="button" class="slides-companion-button-text" data-action="cancel">${words('cancel')}</button>
          <button type="button" class="slides-companion-button-filled" data-action="ok">${words('ok')}</button>
        </div>
      </div>
    </div>`;

  // The framed notice asking for every site (all-sites.js), shown only while it's missing.
  const ALL_SITES_SOURCE = 'slides-companion-all-sites';
  const EXTENSION_ORIGIN = new URL(chrome.runtime.getURL('')).origin;
  const allSitesFrame = () => root?.querySelector('.slides-companion-dialog-frame');
  const tellAllSites = (message) =>
    allSitesFrame()?.contentWindow.postMessage(message, new URL(allSitesFrame().src).origin);

  let root = null;
  let returnFocusTo = null;

  function openDialog(opener) {
    if (root) return;
    const { settings } = globalThis.slidesCompanion;
    // Back to the companion, or opened from the browser's button, to what had the keys (Slides'
    // text event target, which its keyboard shortcuts need).
    returnFocusTo = opener ?? document.activeElement;

    root = document.createElement('div');
    root.className = 'slides-companion-dialog-root';
    // Laid out in our words' direction: right to left in Arabic or Hebrew, but English stays left to
    // right even where Slides is right to left in a language we don't speak (Persian, Urdu).
    root.dir = globalThis.slidesCompanion.dir();
    root.innerHTML = settingsHtml();
    for (const input of root.querySelectorAll('input')) {
      input.checked =
        input.type === 'checkbox'
          ? settings.get(input.name)
          : settings.get(input.name) === input.value;
    }

    // Slides listens on the page for keys and clicks (arrows move objects, Delete deletes them).
    for (const type of [
      'keydown',
      'keyup',
      'keypress',
      'mousedown',
      'mouseup',
      'click',
      'contextmenu',
      'wheel',
    ]) {
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
    playIllustration();
    root.getBoundingClientRect(); // Start the transition from the closed state.
    root.classList.add('slides-companion-dialog-open');
    controlStops()[0].focus();
  }

  function save() {
    const choices = [
      ...root.querySelectorAll('input[type="checkbox"], input[type="radio"]:checked'),
    ];
    globalThis.slidesCompanion.settings.set(
      Object.fromEntries(
        choices.map((input) => [
          input.name,
          input.type === 'checkbox' ? input.checked : input.value,
        ]),
      ),
    );
    closeDialog();
  }

  function closeDialog() {
    if (!root) return;
    window.removeEventListener('message', onFrameMessage);
    const closing = root;
    root = null;
    closing.classList.remove('slides-companion-dialog-open');
    closing.classList.add('slides-companion-dialog-closing');
    globalThis.slidesCompanion.ui.afterExitFade(() => closing.remove());
    // The companion may be gone, hidden by these very settings.
    if (returnFocusTo?.isConnected) returnFocusTo.focus();
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
    playIllustration();
  }

  // The shown page's illustration plays from its start, and the others wait. With motion reduced,
  // it holds still on the moment that shows the feature best.
  function playIllustration() {
    for (const illustration of root.querySelectorAll('.slides-companion-dialog-illustration'))
      illustration.pauseAnimations();
    const shown = root.querySelector(
      '.slides-companion-settings-page:not([hidden]) .slides-companion-dialog-illustration',
    );
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      shown.setCurrentTime(Number(shown.dataset.still));
    } else {
      shown.setCurrentTime(0);
      shown.unpauseAnimations();
    }
  }

  // ↑ and ↓ go through the list, Home and End to its ends, showing each feature on the way.
  function onFeatureKeydown(event) {
    const features = featureTabs();
    const index = features.indexOf(event.target);
    const next = { ArrowUp: index - 1, ArrowDown: index + 1, Home: 0, End: features.length - 1 }[
      event.key
    ];
    if (index === -1 || next === undefined) return;
    event.preventDefault();
    const feature = features[(next + features.length) % features.length];
    showFeature(feature);
    feature.focus();
  }

  // The framed notice: its size, and the dialog's keys pressed in it.
  function onFrameMessage(event) {
    const frame = allSitesFrame();
    if (
      !frame ||
      event.source !== frame.contentWindow ||
      event.origin !== EXTENSION_ORIGIN ||
      event.data?.source !== ALL_SITES_SOURCE
    )
      return;
    if (event.data.type === 'height') {
      // Gone while it had the keys (its button chosen with Enter): they go to what takes its place.
      const held = document.activeElement === frame ? controlStops().indexOf(frame) : -1;
      frame.style.height = `${event.data.height}px`;
      frame.classList.toggle('slides-companion-dialog-frame-empty', !event.data.height);
      if (!event.data.height && held > 0) controlStops()[held]?.focus();
    }
    if (event.data.type !== 'key') return;
    if (event.data.key === 'Escape') closeDialog();
    else trapFocus({ shiftKey: event.data.shiftKey, preventDefault() {} });
  }

  // One Tab stop per control, in order: the chosen feature in the list, then on its page each
  // checkbox, the framed notice's button while it shows, and each radio group (its checked option, or
  // its first).
  function controlStops() {
    const page = root.querySelector('.slides-companion-settings-page:not([hidden])');
    const controls = page.querySelectorAll(
      ':scope > label input, .slides-companion-dialog-frame:not(.slides-companion-dialog-frame-empty), fieldset',
    );
    return [
      root.querySelector('[role="tab"][aria-selected="true"]'),
      ...[...controls].map((control) =>
        control.matches('fieldset')
          ? (control.querySelector('input:checked') ?? control.querySelector('input'))
          : control,
      ),
    ];
  }

  // Keep Tab inside the dialog: the list, the page's controls, Cancel, OK.
  function trapFocus(event) {
    const stops = [
      ...controlStops(),
      ...root.querySelectorAll('.slides-companion-dialog-actions button'),
    ];
    const index = stops.indexOf(document.activeElement);
    const next = (index + (event.shiftKey ? -1 : 1) + stops.length) % stops.length;
    event.preventDefault();
    stops[next].focus();
    if (stops[next] === allSitesFrame()) tellAllSites('focus');
  }

  globalThis.slidesCompanion ??= {};
  globalThis.slidesCompanion.openSettings = openDialog;

  // The extension's button in the browser's toolbar opens Settings here too (background.js), named
  // in Slides' language as the companion is.
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === 'settings-open') openDialog();
  });
  chrome.runtime
    .sendMessage({ type: 'settings-here', title: text('settingsLabel') })
    .catch(() => {});
}

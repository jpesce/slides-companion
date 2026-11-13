// Our keys in Slides' Keyboard shortcuts dialog (Help › Keyboard shortcuts, or ⌘+/ or Ctrl+/), in a
// section of their own after Slides' sections, made from one of them so it looks the same.
// The editor and the slideshow each have the dialog, each with the keys that work there. Slides
// builds the dialog each time it opens, and its list again at each letter typed in its search, so
// the section goes back in after each build, keeping only the keys whose name matches, as Slides does.
{
  const { text, settings, arrows } = globalThis.slidesCompanion;
  const IN_SLIDESHOW = globalThis.slidesCompanion.slides.inSlideshow;
  // Slides' own classes, which give our section Slides' look.
  const SLIDES = 'appsElementsKeyboardShortcutsDialog';
  const OURS = 'slides-companion-shortcuts';

  // What each key does, and its keys: each way of pressing it, a list of keys pressed together. Only
  // the keys that can do something here, with the presenter's settings.
  function shortcuts() {
    // During a slideshow, Spotlight opens from a click on an image, if Settings lets it.
    const spotlight = !IN_SLIDESHOW || settings.get('spotlightOnClick');
    // Right to left, Slides goes forward with ←, and so does Spotlight.
    const { forward, back } = arrows();
    // Keys named as Slides names them in this dialog, in its language.
    const named = (key) => text(key).split(' ');
    return [
      // During a slideshow, Space is Slides' (next slide).
      !IN_SLIDESHOW && ['shortcutSpotlight', [named('dialogKeySpace')]],
      spotlight && ['shortcutNextImage', [[forward], ['↓']]],
      spotlight && ['shortcutPreviousImage', [[back], ['↑']]],
      spotlight && ['shortcutFirstImage', [named('dialogKeyHome')]],
      spotlight && ['shortcutLastImage', [named('dialogKeyEnd')]],
      spotlight && ['shortcutCloseSpotlight', [named('dialogKeyEsc')]],
      ['shortcutZoomIn', [['+'], ['=']]],
      ['shortcutZoomOut', [['-']]],
      globalThis.slidesCompanion.floatingNotesHere() && [
        'shortcutFloatingNotes',
        [[...named('dialogKeyShift'), 'S']],
      ],
      // Only while links open over the slide (in Settings, Links).
      settings.get('slideshowLinks') === 'here' && ['shortcutClosePage', [named('dialogKeyEsc')]],
    ]
      .filter(Boolean)
      .map(([name, ways]) => ({ name: text(name), ways }));
  }

  // As Slides' search: from the start of any word of the name, whatever the case. Where it is, or
  // null when it isn't there. (Matched on the name itself, so that where it is stays right in
  // languages whose letters change length in lower case.)
  function find(name, query) {
    const wanted = query.trim();
    if (!wanted) return { at: 0, length: 0 };
    const escaped = wanted.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}`, 'iu').exec(name);
    return match && { at: match.index, length: match[0].length };
  }

  // A section of Slides', copied the first time the dialog shows one (a search can leave none), with
  // what ties it to Slides' scripts taken out, so a click on our rows is nobody's (and its loading
  // row says nothing to screen readers).
  let model = null;
  function keepModel(list) {
    if (model) return;
    const table = list.querySelector(`:scope > .${SLIDES}ShortcutTable:not(.${OURS})`);
    if (!table?.querySelector(`.${SLIDES}ShortcutName`)) return;
    model = table.cloneNode(true);
    for (const element of [model, ...model.querySelectorAll('*')]) {
      for (const name of ['jsaction', 'jscontroller', 'jsname', 'jslog', 'id', 'aria-live'])
        element.removeAttribute(name);
    }
  }

  function key(name) {
    const element = document.createElement('kbd');
    element.className = `${SLIDES}Key`;
    element.textContent = name;
    // As Slides marks its one-character keys (S, →).
    if ([...name].length === 1) {
      element.classList.add(`${SLIDES}SingleChar`);
      element.setAttribute('aria-label', name.toLowerCase());
    }
    return element;
  }

  function fillRow(row, { name, ways, found }, last) {
    const mark = document.createElement('span');
    mark.className = `${SLIDES}ShortcutNameHighlight`;
    mark.textContent = name.slice(found.at, found.at + found.length);
    const before = name.slice(0, found.at);
    const after = name.slice(found.at + found.length);
    row
      .querySelector(`.${SLIDES}ShortcutName`)
      .replaceChildren(...[before, mark, after].filter((part) => part !== ''));
    const keys = [];
    ways.forEach((pressed, index) => {
      if (index) keys.push(text('shortcutOr'));
      const sequence = document.createElement('span');
      sequence.className = `${SLIDES}KeySequence`;
      sequence.append(...pressed.map(key));
      keys.push(sequence);
    });
    row.querySelector(`.${SLIDES}KeySequenceList`).replaceChildren(...keys);
    // Slides draws no line under a section's last row.
    for (const cell of row.cells) cell.classList.toggle(`${SLIDES}TableCellNoBorder`, last);
    return row;
  }

  function section(query) {
    const found = shortcuts()
      .map((shortcut) => ({ ...shortcut, found: find(shortcut.name, query) }))
      .filter((shortcut) => shortcut.found);
    if (!found.length || !model) return null;
    const table = model.cloneNode(true);
    table.classList.add(OURS);
    table.querySelector(`.${SLIDES}CategoryLabel`).textContent = text('extensionName');
    const row = table.querySelector(`tr:has(.${SLIDES}ShortcutName)`);
    row.parentElement.replaceChildren(
      ...found.map((shortcut, index) =>
        fillRow(row.cloneNode(true), shortcut, index === found.length - 1),
      ),
    );
    return table;
  }

  // Ours last, and Slides' "No results" hidden while ours has some.
  function place(list, search) {
    keepModel(list);
    list.querySelector(`:scope > .${OURS}`)?.remove();
    const ours = section(search.value);
    const notice = list.querySelector(`:scope > .${SLIDES}NoResultsNotice`);
    if (notice) notice.hidden = Boolean(ours);
    if (ours) list.append(ours);
  }

  function watch(dialog) {
    const list = dialog.querySelector(`.${SLIDES}ShortcutsContainer`);
    const search = dialog.querySelector(`.${SLIDES}SearchInputField`);
    if (!list || !search) return false;
    const update = () => {
      place(list, search);
      rebuilt.takeRecords(); // Ours.
    };
    const rebuilt = new MutationObserver(update);
    update();
    rebuilt.observe(list, { childList: true });
    // Slides may keep its list as it is when the letter typed changes nothing of its own.
    search.addEventListener('input', update);
    return true;
  }

  // Slides' dialogs come in at the end of the page, their content sometimes a moment after.
  function onAdded(node) {
    if (!(node instanceof HTMLElement) || !node.matches('[class*="WizDialog-dialog"]')) return;
    if (watch(node)) return;
    const filling = new MutationObserver(() => {
      if (!node.isConnected || watch(node)) filling.disconnect();
    });
    filling.observe(node, { childList: true, subtree: true });
    setTimeout(() => filling.disconnect(), 5000);
  }

  function start() {
    new MutationObserver((records) => {
      for (const record of records) record.addedNodes.forEach(onAdded);
    }).observe(document.body, { childList: true });
  }

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
}

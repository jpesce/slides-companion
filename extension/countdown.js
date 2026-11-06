// A countdown in presenter view. The timer button beside Pause and Reset, or the time itself, opens a
// menu: count up, as usual, or count down from a time in the list or one the presenter types, and,
// counting down, add a minute. Slides' own timer keeps the time, so Pause and Reset work as before. The
// countdown turns orange shortly before the end, and red with a minus sign once time is up. Under it,
// a bar fills up as the time goes. Each deck remembers its time and whether it was counting down, on
// this computer.
{
  // Presenter view is a window Slides opens under this name: a slideshow page when signed in, and a
  // blank page Slides writes itself when not.
  const IN_PRESENTER_VIEW = /^punch_speaker_notes_/.test(window.name);
  const ELAPSED = '.punch-viewer-speakernotes-timer-time:not(.slides-companion-countdown)';

  // The deck, from presenter view's address, or the editor's that opened it.
  function deckKey() {
    try {
      const { pathname } = location.protocol === 'about:' ? window.opener.location : location;
      return `countdown ${pathname.match(/\/d\/([^/]+)/)[1]}`;
    } catch {
      return null;
    }
  }

  // In words, each number with its unit: "20 min", "1h", "1 hour 30 min", "90 sec".
  const IN_WORDS = /^(?:(\d+)\s*h(?:(?:ou)?rs?)?\.?\s*)?(?:(\d+)\s*m(?:in(?:ute)?s?)?\.?\s*)?(?:(\d+)\s*s(?:ec(?:ond)?s?)?\.?)?$/i;
  // Under 100 hours, as the timer shows hours in two digits.
  const LONGEST = 100 * 3600 - 1;

  // "20" is 20 minutes, and so is "20 min"; "20:30" is 20 minutes 30 seconds; "1:20:00", or "1h 20",
  // is an hour and 20 minutes. Digits typed full width (as Japanese and Chinese keyboards do) count
  // too. Nothing, or 0, is no countdown. Anything else, or minutes or seconds past 59 after a colon,
  // isn't a time.
  function parse(text) {
    const trimmed = text.normalize('NFKC').trim();
    if (!trimmed) return 0;
    let seconds = null;
    if (/^\d+(:\d{1,2}){1,2}$/.test(trimmed)) {
      const [first, ...rest] = trimmed.split(':').map(Number);
      if (rest.every((part) => part < 60)) seconds = [first, ...rest].reduce((total, part) => total * 60 + part, 0);
    } else {
      // A number on its own, or after hours, is minutes.
      const words = trimmed.replace(/^(\d+)$|(h\S*\s*\d+)$/i, '$1$2m').match(IN_WORDS);
      if (words) {
        const [, hours = 0, minutes = 0, secs = 0] = words;
        seconds = hours * 3600 + minutes * 60 + Number(secs);
      }
    }
    return seconds !== null && seconds <= LONGEST ? seconds : null;
  }

  // As Slides shows time: 00:00:00.
  const format = (seconds) =>
    [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map((part) => String(part).padStart(2, '0')).join(':');
  // As it's typed: 20:00, or 1:20:00.
  const formatTyped = (seconds) => format(seconds).replace(/^00:/, '').replace(/^0(?=\d)/, '');

  // As it's said: 20 minutes, 1 hour 30 minutes.
  const spoken = (seconds) =>
    [[Math.floor(seconds / 3600), 'hour'], [Math.floor(seconds / 60) % 60, 'minute'], [seconds % 60, 'second']]
      .filter(([count]) => count)
      .map(([count, unit]) => `${count} ${unit}${count === 1 ? '' : 's'}`)
      .join(' ');

  // The times in the menu.
  const PRESETS = [5, 10, 15, 20, 30, 45, 60].map((minutes) => minutes * 60);

  // Whether the timer counts down, from how many seconds, and the last time typed that the menu
  // doesn't have. The countdown starts when it's turned on, or when Slides' timer is reset; `start` is
  // Slides' time then. Minutes added along the way are for this talk only.
  let counting = { down: false, from: 0, typed: 0 };
  let start = 0;
  let added = 0;
  let last = 0;
  let elapsed = null;
  let countdown = null;
  let bar = null;
  let timerButton = null;
  let editor = null;
  let menu = null;
  let returnFocusTo = null;
  // What presenter view shows: { down, text, warning, over, bar, gone }, gone being the share of the
  // time gone.
  let shown = { down: false, text: '', warning: false, over: false, bar: false, gone: 0 };

  // Slides' time, in seconds, or null while it doesn't show one.
  function timeOnTimer() {
    const match = elapsed.textContent.match(/^(\d+):(\d\d):(\d\d)$/);
    return match && match[1] * 3600 + match[2] * 60 + Number(match[3]);
  }

  function show() {
    if (!elapsed) return;
    const time = timeOnTimer();
    if (time === null) return;
    // A fresh player taking over presenter view mid-slideshow (see live-edits.js) has Slides write it
    // afresh, and starts Slides' timer from nothing for a moment, before it catches up: what was shown
    // stays as it was, the countdown standing in for Slides' time.
    if (document.documentElement.hasAttribute('data-slides-companion-taking-over')) return paint(shown, { standIn: true });
    // Reset starts the countdown over, from the time chosen.
    if (time < last) [start, added] = [0, 0];
    last = time;
    const total = counting.from + added;
    const left = total - (time - start);
    const warning = Number(globalThis.slidesCompanion.settings.get('countdownWarning')) * 60;
    const down = counting.down && total > 0;
    shown = {
      down,
      // Past the end, the minus sign comes from countdown.css.
      text: format(down ? Math.abs(left) : time),
      warning: down && left >= 0 && left <= warning,
      over: down && left < 0,
      bar: down && Boolean(globalThis.slidesCompanion.settings.get('countdownBar')),
      gone: down ? Math.min(1, Math.max(0, 1 - left / total)) : 0,
    };
    paint(shown);
  }

  // The countdown in place of Slides' time (or the field, while a time is typed), and the bar, which
  // stays while a time is typed.
  function paint(view, { standIn = false } = {}) {
    const down = (view.down || standIn) && !editor;
    elapsed.hidden = down || Boolean(editor);
    countdown.hidden = !down;
    // Only when it shows: presenter view's watch for Slides writing it (attach) hears every change.
    if (down) countdown.textContent = view.text;
    for (const element of [countdown, bar]) {
      element.classList.toggle('slides-companion-countdown-warning', view.warning);
      element.classList.toggle('slides-companion-countdown-over', view.over);
    }
    bar.hidden = !view.bar;
    document.documentElement.classList.toggle(BAR_SHOWN, view.bar);
    bar.firstChild.style.width = `${view.gone * 100}%`;
  }

  // Once the extension is updated or turned off, a presenter view already open can't save; the
  // timer goes on working as chosen.
  function remember() {
    const key = deckKey();
    try {
      if (key) chrome.storage.local.set({ [key]: counting }).catch(() => {});
    } catch {}
  }

  // Turning the countdown on starts it; changing the time while it runs keeps the time already spent,
  // as the time chosen is the talk's length.
  function countDownFrom(seconds) {
    if (!counting.down) start = timeOnTimer() ?? 0;
    added = 0;
    counting = { ...counting, down: true, from: seconds };
    remember();
    show();
  }

  function countUp() {
    added = 0;
    counting = { ...counting, down: false };
    remember();
    show();
  }

  function addMinute() {
    added += 60;
    show();
  }

  // Below the field, a tooltip like Slides' says what Enter does, or what the field can read.
  function tooltip(field) {
    const element = document.createElement('div');
    element.className = 'jfk-tooltip';
    element.id = 'slides-companion-countdown-hint';
    element.setAttribute('role', 'tooltip');
    const text = Object.assign(document.createElement('div'), { className: 'jfk-tooltip-contentId' });
    const arrow = Object.assign(document.createElement('div'), { className: 'jfk-tooltip-arrow jfk-tooltip-arrowup' });
    arrow.append(...['before', 'after'].map((part) => Object.assign(document.createElement('div'), { className: `jfk-tooltip-arrowimpl${part}` })));
    element.append(text, arrow);
    field.setAttribute('aria-describedby', element.id);
    document.body.append(element);
    // Under the field, its arrow pointing up at the field's middle; centred, unless that would take it
    // past the field's left edge, where presenter view's window begins.
    element.say = (words) => {
      text.textContent = words;
      // Measured from the window's edge, so its old place doesn't squeeze it.
      element.style.left = '0px';
      const box = field.getBoundingClientRect();
      const middle = box.left + box.width / 2;
      const left = Math.max(0, Math.min(Math.max(box.left, middle - element.offsetWidth / 2), innerWidth - element.offsetWidth));
      element.style.left = `${left + scrollX}px`;
      element.style.top = `${box.bottom + 8 + scrollY}px`;
      arrow.style.left = `${middle - left}px`;
    };
    return element;
  }

  // Typing a time, in place of the time shown. Enter counts down from it; Escape, clicking elsewhere
  // or typing nothing leaves things as they were.
  function edit() {
    if (editor) return editor.focus();
    editor = document.createElement('input');
    editor.className = 'slides-companion-countdown-input';
    editor.setAttribute('aria-label', 'Count down from (minutes, or hours:minutes:seconds)');
    editor.placeholder = 'Minutes';
    // As wide as the time it replaces.
    editor.style.width = `${(counting.down ? countdown : elapsed).offsetWidth}px`;
    editor.value = counting.typed ? formatTyped(counting.typed) : '';
    let hint = null;
    const howTo = counting.down ? 'Press Enter to change the time' : 'Press Enter to start the countdown';
    // Removing the field blurs it, which would close it again.
    const close = () => {
      const closing = editor;
      editor = null;
      closing.remove();
      hint.remove();
      show();
    };
    const finish = () => {
      const chosen = parse(editor.value);
      if (chosen === null) {
        editor.setAttribute('aria-invalid', 'true');
        hint.say('Type minutes, like 20, or a time, like 1:20:00');
        editor.select();
        return;
      }
      close();
      if (!chosen) return;
      // A time the menu has is just ticked there; any other is added to it.
      if (!PRESETS.includes(chosen)) counting = { ...counting, typed: chosen };
      countDownFrom(chosen);
    };
    // Slides' presenter view listens on the page for keys (the arrows change slides, R resets).
    for (const type of ['keydown', 'keyup', 'keypress']) editor.addEventListener(type, (event) => event.stopPropagation());
    editor.addEventListener('keydown', (event) => {
      // Enter also confirms what a Japanese or Chinese keyboard is composing.
      if (event.isComposing) return;
      if (event.key === 'Enter') finish();
      else if (event.key === 'Escape') close();
    });
    editor.addEventListener('input', () => {
      editor.removeAttribute('aria-invalid');
      hint.say(howTo);
    });
    editor.addEventListener('blur', () => editor && close());
    elapsed.parentElement.append(editor);
    show();
    hint = tooltip(editor);
    hint.say(howTo);
    editor.focus();
    editor.select();
  }

  // What the menu offers. Choosing how the timer counts ticks it, as the slide picker ticks the slide.
  function choices() {
    const times = counting.typed && !PRESETS.includes(counting.typed) ? [...PRESETS, counting.typed] : PRESETS;
    return [
      { label: 'Count up, as usual', checked: !counting.down, act: countUp },
      null,
      ...times.map((seconds) => ({
        label: `Count down from ${spoken(seconds)}`,
        checked: counting.down && counting.from === seconds,
        act: () => countDownFrom(seconds),
      })),
      { label: 'Other time…', act: edit },
      ...(counting.down ? [null, { label: 'Add 1 minute', act: addMinute }] : []),
    ];
  }

  // The menu, made like presenter view's slide picker so Slides' own styles dress it: below the timer
  // button, lined up with its right edge as Slides' slideshow menu is with its button, or below the
  // time, lined up with its left edge. The pointer or the arrows light up a choice. Focus goes back
  // where it was once it closes.
  function openMenu(anchor, { keyboard = false } = {}) {
    returnFocusTo = document.activeElement;
    const actions = new Map();
    menu = document.createElement('div');
    menu.className = 'goog-menu goog-menu-vertical slides-companion-countdown-menu';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', 'Timer');
    menu.tabIndex = -1;
    choices().forEach((choice, index) => {
      const element = document.createElement('div');
      if (!choice) {
        element.className = 'goog-menuseparator';
        element.setAttribute('role', 'separator');
        return menu.append(element);
      }
      const option = 'checked' in choice;
      element.className = `goog-menuitem${option ? ' goog-option' : ''}${choice.checked ? ' goog-option-selected' : ''}`;
      element.id = `slides-companion-countdown-choice-${index}`;
      element.setAttribute('role', option ? 'menuitemradio' : 'menuitem');
      if (option) element.setAttribute('aria-checked', choice.checked);
      const content = document.createElement('div');
      content.className = 'goog-menuitem-content';
      if (option) content.append(Object.assign(document.createElement('div'), { className: 'goog-menuitem-checkbox' }));
      content.append(choice.label);
      element.append(content);
      actions.set(element, choice.act);
      menu.append(element);
    });
    const items = [...actions.keys()];
    let lit = null;
    const light = (item, { reveal = false } = {}) => {
      lit = item;
      for (const each of items) each.classList.toggle('goog-menuitem-highlight', each === item);
      if (item) menu.setAttribute('aria-activedescendant', item.id);
      else menu.removeAttribute('aria-activedescendant');
      // In a short window the menu scrolls; the arrows bring the choice they light into view.
      if (reveal) item.scrollIntoView({ block: 'nearest' });
    };
    const pick = (item) => {
      closeMenu();
      actions.get(item)();
    };
    menu.addEventListener('mouseover', (event) => {
      const item = event.target.closest('.goog-menuitem');
      if (item) light(item);
    });
    menu.addEventListener('mouseleave', () => light(null));
    // Keeps focus in the menu, and the choices from being selected as text.
    menu.addEventListener('mousedown', (event) => event.preventDefault());
    menu.addEventListener('click', (event) => {
      const item = event.target.closest('.goog-menuitem');
      if (item) pick(item);
    });
    // Slides' presenter view listens on the page for keys. Enter picks as it goes down and Space as it
    // comes up, like the timer button, so the key that picks doesn't reach the button and open the menu
    // again.
    for (const type of ['keydown', 'keyup', 'keypress']) menu.addEventListener(type, (event) => event.stopPropagation());
    menu.addEventListener('keydown', (event) => {
      const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
      const from = lit ? items.indexOf(lit) : step > 0 ? -1 : items.length;
      if (step) light(items[(from + step + items.length) % items.length], { reveal: true });
      else if (event.key === 'Home') light(items[0], { reveal: true });
      else if (event.key === 'End') light(items.at(-1), { reveal: true });
      else if (event.key === 'Enter' && lit) pick(lit);
      else if (event.key === 'Escape' || event.key === 'Tab') closeMenu();
      else if (event.key !== ' ') return;
      event.preventDefault();
    });
    menu.addEventListener('keyup', (event) => event.key === ' ' && lit && pick(lit));
    // Clicking elsewhere, or another window.
    menu.addEventListener('focusout', () => menu && closeMenu({ refocus: false }));

    document.body.append(menu);
    // No taller than the window (Slides' menu scrolls), less its padding and border.
    menu.style.maxHeight = `${innerHeight - (menu.offsetHeight - menu.clientHeight) - 12}px`;
    const box = anchor.getBoundingClientRect();
    const left = anchor === timerButton ? box.right - menu.offsetWidth : box.left;
    menu.style.left = `${Math.max(0, Math.min(left, innerWidth - menu.offsetWidth)) + scrollX}px`;
    menu.style.top = `${Math.max(0, Math.min(box.bottom, innerHeight - menu.offsetHeight)) + scrollY}px`;
    anchor.classList.add(anchor === timerButton ? 'jfk-button-checked' : 'slides-companion-countdown-open');
    timerButton.setAttribute('aria-expanded', 'true');
    menu.focus({ preventScroll: true });
    // Opened from the keyboard, the first choice is lit, as in Slides' menus.
    if (keyboard) light(items[0]);
  }

  // Removing the menu blurs it, which would close it again.
  function closeMenu({ refocus = true } = {}) {
    if (!menu) return;
    const closing = menu;
    menu = null;
    closing.remove();
    timerButton.classList.remove('jfk-button-checked');
    timerButton.setAttribute('aria-expanded', 'false');
    elapsed.parentElement.classList.remove('slides-companion-countdown-open');
    if (refocus) returnFocusTo?.focus();
  }

  const toggleMenu = (anchor, options) => (menu ? closeMenu() : openMenu(anchor, options));

  // Under the time, a bar of the time gone, as Slides' recording studio shows its time limit (see
  // countdown.css). Decorative: the time says it all.
  const BAR_SHOWN = 'slides-companion-countdown-bar-shown';
  function makeBar() {
    const element = document.createElement('div');
    element.className = 'slides-companion-countdown-bar';
    element.setAttribute('aria-hidden', 'true');
    element.hidden = true;
    element.append(Object.assign(document.createElement('div'), { className: 'slides-companion-countdown-bar-fill' }));
    return element;
  }

  const TITLE = 'Count down from a time you choose';

  // Material's timer icon.
  const TIMER_ICON =
    '<svg class="jfk-button-img" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61 1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.96 8.96 0 0 0 12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>';

  // A button like Pause and Reset beside it, with an icon as there's no room for a word, pressed while
  // its menu is open, as the slide picker is. Slides' own code dresses its buttons as the pointer and
  // focus come and go; this does the same.
  function button() {
    const element = document.createElement('div');
    element.setAttribute('role', 'button');
    element.setAttribute('aria-label', 'Timer');
    element.setAttribute('aria-haspopup', 'menu');
    element.setAttribute('aria-expanded', 'false');
    element.title = TITLE;
    element.tabIndex = 0;
    element.className = 'jfk-button jfk-button-standard jfk-button-narrow punch-viewer-speakernotes-timer-button slides-companion-countdown-button';
    element.innerHTML = TIMER_ICON;
    const state = (name, on) => element.classList.toggle(`jfk-button-${name}`, on);
    element.addEventListener('mouseenter', () => state('hover', true));
    element.addEventListener('mouseleave', () => (state('hover', false), state('active', false)));
    element.addEventListener('mousedown', (event) => {
      // Keeps focus in the menu, so the click closes it rather than the menu closing as it blurs.
      event.preventDefault();
      state('active', true);
    });
    element.addEventListener('mouseup', () => state('active', false));
    element.addEventListener('focus', () => state('focused', true));
    element.addEventListener('blur', () => state('focused', false));
    element.addEventListener('click', () => toggleMenu(element));
    // Slides' presenter view listens on the page for keys (Space goes to the next slide).
    for (const type of ['keydown', 'keyup']) {
      element.addEventListener(type, (event) => {
        if (!['Enter', ' ', 'ArrowDown'].includes(event.key)) return;
        event.stopPropagation();
        event.preventDefault();
        if (type === 'keydown' ? event.key !== ' ' : event.key === ' ') toggleMenu(element, { keyboard: true });
      });
    }
    return element;
  }

  // Slides writes presenter view after opening it, and its timer ticks by changing its text.
  function attach() {
    const found = document.querySelector(ELAPSED);
    if (!found || found === elapsed) return;
    elapsed = found;
    countdown = document.createElement('div');
    countdown.className = 'punch-viewer-speakernotes-timer-time slides-companion-countdown';
    countdown.setAttribute('role', 'timer');
    elapsed.after(countdown);
    const container = elapsed.parentElement;
    container.classList.add('slides-companion-countdown-container');
    container.title = TITLE;
    container.addEventListener('mousedown', (event) => event.target !== editor && event.preventDefault());
    container.addEventListener('click', () => editor || toggleMenu(container));
    timerButton = button();
    document.querySelector('.punch-viewer-speakernotes-timer-button-container')?.append(timerButton);
    bar?.remove();
    bar = makeBar();
    elapsed.closest('.punch-viewer-speakernotes-timer-panel').append(bar);
    new MutationObserver(show).observe(elapsed, { childList: true, characterData: true, subtree: true });
    new MutationObserver(show).observe(document.documentElement, { attributes: true, attributeFilter: ['data-slides-companion-taking-over'] });
    show();
  }

  if (IN_PRESENTER_VIEW) {
    const key = deckKey();
    Promise.all([key ? chrome.storage.local.get(key) : {}, globalThis.slidesCompanion.settings.ready]).then(([stored]) => {
      counting = { ...counting, ...stored[key] };
      attach();
      new MutationObserver(attach).observe(document, { subtree: true, childList: true });
    });
    chrome.storage.onChanged.addListener(
      (changes, area) => area === 'sync' && ('countdownWarning' in changes || 'countdownBar' in changes) && show(),
    );
  }
}

// Live edits: an edit made while the deck is presented from the editor (in another tab, on another
// device, by a co-author) shows in the slideshow within a few seconds. Slides' player takes the deck
// once, as the slideshow starts, and can't be given a new one; reloading it ends the slideshow. So
// a fresh copy of the player loads out of sight on the slide on screen, at the same animation step,
// and takes over when nothing is moving: unchanged, the slide looks just the same; edited, it
// dissolves into its new version. Full screen, the clicker, presenter view, presenting through
// Meet, auto-play and the pen or laser carry on. Slides' own player stays, out of sight and
// silenced: the editor ends the slideshow through it. See live-edits-main.js for what's done in the
// editor page's own world.
{
  const { inSlideshow, slideId, slideLabel, penOn } = globalThis.slidesCompanion.slides;
  const IN_EDITOR = window === window.top && !inSlideshow;
  const PLAYER = 'iframe.punch-present-iframe';
  // To and from live-edits-main.js.
  const CHECK_EVENT = 'slides-companion-live-check';
  const RESULT_EVENT = 'slides-companion-live-result';
  const STARTED_EVENT = 'slides-companion-slideshow-started';
  const ENDED_EVENT = 'slides-companion-slideshow-ended';
  const SHOWN_EVENT = 'slides-companion-player-shown';
  // How often the deck is checked while it's edited. An edit is taken once a check finds nothing
  // new since the one before.
  const CHECK_MS = 1000;
  // How often a copy getting ready looks to see if it can take over.
  const TICK_MS = 150;
  const DISSOLVE_MS = 500;
  // Slides' auto-play intervals, in the order of its menu.
  const AUTO_PLAY_SECONDS = [1, 2, 3, 5, 10, 15, 20, 30, 60];
  // How many animation steps a copy may take to catch up with the slide on screen, and how long it's
  // given to get to a slide.
  const MAX_STEPS = 40;
  const GOING_MS = 600;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  // When the slide on screen changes: 'now', 'later' (once you've moved to another slide) or 'off'
  // (see settings.js).
  const updates = () => globalThis.slidesCompanion.settings.get('liveEdits');
  const state = (frame) => frame.dataset.slidesCompanionPlayer ?? 'shown';
  const players = () => [...document.querySelectorAll(PLAYER)];
  const shownPlayer = () => players().find((frame) => state(frame) === 'shown') ?? null;
  const slidesPlayer = () =>
    players().find((frame) => !('slidesCompanionCopy' in frame.dataset)) ?? null;
  const running = () => Boolean(slidesPlayer()?.getBoundingClientRect().width);

  // The slide a player shows, by its page id, and its number ("Slide 3 of 9").
  const slideOf = (doc) =>
    slideId(doc) ??
    new URLSearchParams(doc?.defaultView?.location.search).get('slide')?.replace(/^id\./, '');
  const numberOf = (doc) => Number(slideLabel(doc)?.match(/\d+/)?.[0]);

  // Keys, as Slides reads them.
  function press(doc, key, shiftKey = false) {
    const code = { ArrowRight: 39, Enter: 13 }[key] ?? key.toUpperCase().charCodeAt(0);
    const char = key.length === 1 ? key.charCodeAt(0) : key === 'Enter' ? 13 : 0;
    const target = doc.activeElement ?? doc.body;
    for (const type of ['keydown', 'keypress', 'keyup']) {
      if (type === 'keypress' && !char) continue;
      const which = type === 'keypress' ? char : code;
      target.dispatchEvent(
        new KeyboardEvent(type, {
          key,
          keyCode: which,
          which,
          charCode: type === 'keypress' ? char : 0,
          shiftKey,
          bubbles: true,
          cancelable: true,
        }),
      );
    }
  }

  // ----- Noticing edits -----

  // The slides whose thumbnail changed since the last check.
  let hinted = new Set();
  let checkTimer = 0;
  let checking = false;
  // What the edits added up to at the last check, and the slides edited, once they've stopped.
  let lastVersion = null;
  let edited = null;

  let requests = 0;
  const replies = new Map();
  document.addEventListener(RESULT_EVENT, (event) => {
    const result = JSON.parse(event.detail);
    replies.get(result.id)?.(result);
    replies.delete(result.id);
  });
  function check(pages) {
    const id = ++requests;
    return new Promise((resolve) => {
      replies.set(id, resolve);
      setTimeout(() => replies.delete(id) && resolve(null), 5000);
      document.dispatchEvent(
        new CustomEvent(CHECK_EVENT, { detail: JSON.stringify({ id, pages }) }),
      );
    });
  }

  function scheduleCheck() {
    if (!checkTimer) checkTimer = setTimeout(runCheck, CHECK_MS);
  }

  async function runCheck() {
    checkTimer = 0;
    if (checking) return scheduleCheck();
    checking = true;
    const pages = [...hinted];
    hinted = new Set();
    const result = await check(pages);
    checking = false;
    if (running()) onResult(result);
  }

  function onResult(result) {
    const { changed = [], moved = false } = result?.shown ?? {};
    if (updates() === 'off' || (!changed.length && !moved)) {
      // Nothing to show, or edits undone.
      lastVersion = null;
      edited = null;
      return discard();
    }
    if (result.version !== lastVersion) {
      // Still being edited.
      lastVersion = result.version;
      if (copy && !copy.revealing) discard();
      return scheduleCheck();
    }
    edited = new Set(changed);
    const { loading } = result;
    if (copy && loading && !loading.changed.length && !loading.moved) return;
    discard();
    prepare();
  }

  // Slides redraws a slide's thumbnail in the filmstrip whenever it changes, and adds, removes or
  // moves thumbnails with the slides.
  const filmstrip = new MutationObserver((records) => {
    let structure = false;
    for (const record of records) {
      const target =
        record.target.nodeType === Node.ELEMENT_NODE ? record.target : record.target.parentElement;
      if (!target || target.closest('.punch-full-screen-element')) continue;
      const thumbnail = target.closest('.punch-filmstrip-thumbnail[data-slide-page-id]');
      if (thumbnail) hinted.add(thumbnail.dataset.slidePageId);
      else if (
        record.type === 'childList' &&
        [...record.addedNodes, ...record.removedNodes].some(
          (node) =>
            node.nodeType === Node.ELEMENT_NODE &&
            (node.matches('.punch-filmstrip-thumbnail') ||
              node.querySelector('.punch-filmstrip-thumbnail')),
        )
      )
        structure = true;
    }
    if (hinted.size || structure) scheduleCheck();
  });

  // ----- The copy -----

  // { frame, stuck, tries, until }: the copy getting ready, if there's one, the slide it can't get
  // to, how often it tried, and until when it's on its way.
  let copy = null;
  let tickTimer = 0;

  function prepare() {
    const shown = shownPlayer();
    const own = slidesPlayer();
    const doc = shown?.contentDocument;
    if (!own || !slideOf(doc)) return;
    const frame = own.cloneNode(false);
    frame.removeAttribute('id');
    delete frame.dataset.slidesCompanionLoaded;
    frame.inert = false;
    frame.dataset.slidesCompanionCopy = '';
    frame.dataset.slidesCompanionPlayer = 'loading';
    frame.dataset.slidesCompanionInk = doc.documentElement.dataset.slidesCompanionInk ?? '';
    const autoPlay = autoPlayOf(shown);
    if (autoPlay) {
      const url = new URL(own.src);
      url.searchParams.set('start', 'true');
      url.searchParams.set('delayms', autoPlay.delay);
      url.searchParams.set('loop', autoPlay.loop);
      frame.src = url;
      frame.dataset.slidesCompanionAutoPlay = JSON.stringify(autoPlay);
    }
    Object.assign(frame.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      visibility: 'visible',
      opacity: '0',
      pointerEvents: 'none',
      transition: '',
    });
    // Should it take the keyboard anyway, it goes back to the slideshow on screen.
    frame.addEventListener('focus', () => state(frame) === 'loading' && shownPlayer()?.focus());
    own.parentElement.append(frame);
    if (hasPresenterView()) tell('slides-companion-presenter-view-watch');
    copy = { frame, stuck: null, tries: new Map(), until: 0 };
    tick();
  }

  function discard() {
    clearTimeout(tickTimer);
    if (!copy || copy.revealing) return;
    copy.frame.remove();
    copy = null;
  }

  // Getting the copy to the slide on screen, at the same step, then taking over once nothing's
  // moving.
  function tick() {
    clearTimeout(tickTimer);
    if (!copy || copy.revealing) return;
    const shown = shownPlayer();
    const doc = shown?.contentDocument;
    if (!doc) return discard();
    tickTimer = setTimeout(tick, TICK_MS);
    const copyDoc = copy.frame.contentDocument;
    if (
      !('slidesCompanionLoaded' in copy.frame.dataset) ||
      !copyDoc?.body ||
      copyDoc.fonts.status !== 'loaded'
    )
      return;
    // The copy is out of sight: its transitions and animations needn't play out.
    finishAnimations(copyDoc);
    const target = slideOf(doc);
    const at = slideOf(copyDoc);
    if (!target || !at || copy.stuck === target || performance.now() < copy.until || !calm(doc))
      return;
    if (at !== target) {
      // The copy starts where the slideshow started. It's taken to the slide on screen as you can
      // in any slideshow, typing its number and Enter: the number on screen, or, if slides were
      // moved, its place in the filmstrip.
      const tries = copy.tries.get(target) ?? 0;
      copy.tries.set(target, tries + 1);
      const thumbnails = [
        ...document.querySelectorAll('.punch-filmstrip-thumbnail[data-slide-page-id]'),
      ];
      const number = [
        numberOf(doc),
        thumbnails.findIndex((thumbnail) => thumbnail.dataset.slidePageId === target) + 1,
      ][tries];
      if (!number) copy.stuck = target;
      else for (const key of [...String(number), 'Enter']) press(copyDoc, key);
      copy.until = performance.now() + GOING_MS;
      return;
    }
    copy.tries.delete(target);
    if (!sameStep(doc, copyDoc)) {
      const steps = copy.tries.get(`${target} steps`) ?? 0;
      copy.tries.set(`${target} steps`, steps + 1);
      if (steps >= MAX_STEPS) copy.stuck = target;
      else press(copyDoc, 'ArrowRight');
      return;
    }
    // Set to show edits once you've moved on: the slide on screen stays as it is.
    if (updates() === 'later' && edited?.has(target)) return;
    if (updates() === 'off') return discard();
    reveal(shown, edited?.has(target));
  }

  function finishAnimations(doc) {
    for (const animation of doc.getAnimations()) {
      try {
        if (
          animation.playState === 'running' &&
          Number.isFinite(animation.effect?.getComputedTiming().endTime)
        )
          animation.finish();
      } catch {}
    }
  }

  // A calm moment: not mid-transition or animation, not zoomed in or with an image spotlit, no menu
  // open, no video on the slide, no button held (drawing with the pen, say).
  function calm(doc) {
    if (
      doc.documentElement.classList.contains('slides-companion-zoomed') ||
      doc.querySelector('.slides-companion-spotlight, :active')
    )
      return false;
    const moving = doc
      .getAnimations()
      .some(
        (animation) =>
          animation.playState === 'running' &&
          Number.isFinite(animation.effect?.getComputedTiming().endTime),
      );
    const shows = (element) => element.getBoundingClientRect().width > 0;
    return !moving && ![...doc.querySelectorAll('[role="menu"], iframe, video')].some(shows);
  }

  // Animations show a slide's objects step by step; the copy is at the same step when the same
  // objects are hidden. Objects edited away, or added, don't count.
  function hiddenObjects(doc) {
    const page = doc.querySelector('.punch-viewer-svgpage-svgcontainer > svg');
    const view = doc.defaultView;
    const hidden = new Map();
    for (const object of page?.querySelectorAll('g[id]') ?? []) {
      let shows = true;
      for (
        let element = object;
        element && element !== page && shows;
        element = element.parentElement
      ) {
        const style = view.getComputedStyle(element);
        shows =
          style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0;
      }
      hidden.set(object.id, !shows);
    }
    return hidden;
  }
  function sameStep(doc, copyDoc) {
    const shown = hiddenObjects(doc);
    const copied = hiddenObjects(copyDoc);
    return [...shown].every(([id, hidden]) => !copied.has(id) || copied.get(id) === hidden);
  }

  // Auto-play, as Slides' ⋮ menu shows it: Play, Pause, the intervals, Loop. The menu is drawn once
  // it's been opened; a copy started playing remembers it.
  function autoPlayOf(frame) {
    const doc = frame.contentDocument;
    const menu = [...doc.querySelectorAll('[role="menu"]')].find(
      (element) => element.querySelectorAll('.goog-option').length === AUTO_PLAY_SECONDS.length + 1,
    );
    if (!menu)
      return frame.dataset.slidesCompanionAutoPlay
        ? JSON.parse(frame.dataset.slidesCompanionAutoPlay)
        : null;
    const pause = menu.querySelectorAll('.goog-menuitem:not(.goog-option)')[1];
    if (!pause || pause.classList.contains('goog-menuitem-disabled')) return null;
    const options = [...menu.querySelectorAll('.goog-option')];
    const chosen = options
      .slice(0, -1)
      .findIndex((option) => option.getAttribute('aria-checked') === 'true');
    return {
      delay: (AUTO_PLAY_SECONDS[chosen] ?? 2) * 1000,
      loop: options.at(-1).getAttribute('aria-checked') === 'true',
    };
  }

  // Presenter view, opened from a player or the editor, and the time on its timer (see
  // live-edits-main.js).
  const tell = (type, detail) => document.dispatchEvent(new CustomEvent(type, { detail }));
  function hasPresenterView() {
    tell('slides-companion-presenter-view');
    return document.documentElement.hasAttribute('data-slides-companion-presenter-view');
  }
  function presenterViewTime() {
    tell('slides-companion-presenter-view-time');
    return document.documentElement.dataset.slidesCompanionPresenterViewTime;
  }

  // The copy takes over the presenter view window, which Slides opens by name. Slides starts its
  // timer again from nothing, so the copy's clock is put forward by the time that was on it (see
  // live-edits-frame.js): the timer's next tick catches up. Meanwhile the time shown stays as it was
  // (see countdown.js).
  function takeOverPresenterView(copyDoc) {
    const time = presenterViewTime();
    press(copyDoc, 's');
    // After Slides writes presenter view afresh.
    tell('slides-companion-presenter-view-taking-over', 'true');
    setTimeout(() => {
      if (time) copyDoc.dispatchEvent(new CustomEvent('slides-companion-clock', { detail: time }));
      setTimeout(() => tell('slides-companion-presenter-view-taking-over', 'false'), 1100);
    }, 300);
  }

  function reveal(shown, dissolve) {
    const { frame } = copy;
    copy.revealing = true;
    clearTimeout(tickTimer);
    const doc = shown.contentDocument;
    const copyDoc = frame.contentDocument;
    const pen = penOn(doc);
    const laser = !pen && Boolean(doc.querySelector('.sketchyViewerContainer.cursor-none'));
    const presenterView = hasPresenterView();
    // What the pen drew, slide by slide (see ink.js).
    frame.dataset.slidesCompanionInk = doc.documentElement.dataset.slidesCompanionInk ?? '';
    copyDoc.dispatchEvent(new CustomEvent('slides-companion-ink'));

    frame.dataset.slidesCompanionPlayer = 'shown';
    shown.dataset.slidesCompanionPlayer = 'replaced';
    frame.style.pointerEvents = '';
    frame.focus();
    if (pen) press(copyDoc, 'L', true);
    if (laser) press(copyDoc, 'l');
    if (presenterView) takeOverPresenterView(copyDoc);
    // Presenting through Meet, Meet's controls go with it (see live-edits-main.js).
    tell(SHOWN_EVENT);

    const done = () => {
      if ('slidesCompanionCopy' in shown.dataset) shown.remove();
      else putAway(shown);
      if (copy?.frame === frame) copy = null;
      edited = null;
      lastVersion = null;
      // Edits made while the copy loaded.
      scheduleCheck();
    };
    if (dissolve && !reducedMotion.matches) {
      frame.style.transition = `opacity ${DISSOLVE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`;
      frame.style.opacity = '1';
      setTimeout(done, DISSOLVE_MS);
    } else {
      frame.style.opacity = '1';
      done();
    }
  }

  // Slides' own player, replaced, stays in its place out of sight, and can't be reached. Not hidden:
  // presenting through Meet, Meet shows what's on screen where the slide of Slides' own player is,
  // and shows nothing new once that's hidden.
  function putAway(frame) {
    frame.style.opacity = '0';
    frame.inert = true;
    silence(frame);
  }

  // And it keeps quiet: its videos stopped, and stopped again should it move on by itself
  // (auto-play).
  const hushed = new WeakMap();
  function silence(frame) {
    const doc = frame.contentDocument;
    if (!doc || hushed.has(frame)) return;
    const hush = () => {
      for (const media of doc.querySelectorAll('video, audio')) {
        media.muted = true;
        media.pause();
      }
      for (const embed of doc.querySelectorAll('iframe:not([src="about:blank"])'))
        embed.src = 'about:blank';
    };
    hush();
    const observer = new MutationObserver(hush);
    observer.observe(doc, { subtree: true, childList: true });
    hushed.set(frame, observer);
  }

  // ----- Starting and ending -----

  let watching = false;
  function sync() {
    const now = running() && updates() !== 'off';
    if (now === watching) return;
    watching = now;
    if (watching)
      filmstrip.observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true,
      });
    else {
      filmstrip.disconnect();
      clearTimeout(checkTimer);
      checkTimer = 0;
      hinted = new Set();
      lastVersion = null;
      edited = null;
      discard();
    }
  }

  // The slideshow ended: the copies go, and Slides' own player is as it was.
  function ended() {
    clearTimeout(tickTimer);
    copy = null;
    for (const frame of document.querySelectorAll(`${PLAYER}[data-slides-companion-copy]`))
      frame.remove();
    for (const frame of players()) {
      hushed.get(frame)?.disconnect();
      hushed.delete(frame);
      delete frame.dataset.slidesCompanionPlayer;
      frame.style.opacity = '';
      frame.inert = false;
    }
    watching = false;
    filmstrip.disconnect();
  }

  if (IN_EDITOR) {
    document.addEventListener(ENDED_EVENT, () => setTimeout(ended));
    globalThis.slidesCompanion.settings.ready.then(() => {
      // From the moment a player loads, so no edit goes unseen; and, should that be missed, soon after.
      document.addEventListener(STARTED_EVENT, sync);
      setInterval(sync, 1000);
    });
  }

  // The player on screen, for the rest of the extension.
  globalThis.slidesCompanion ??= {};
  globalThis.slidesCompanion.slideshowFrame = shownPlayer;
}

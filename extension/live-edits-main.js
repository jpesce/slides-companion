// Live edits, in the editor page's own world, where Slides' scripts are (see live-edits.js for the
// rest). A slideshow started from the editor takes the deck from the editor at the start, through
// objects Slides puts on the editor's window (SK_svgDataApi, SK_viewerDataApi,
// SK_viewerEventListener, SK_webFontsDataApi). This keeps watch on those objects so that:
// - it knows each slide as the player on screen got it, to tell which slides were edited since;
// - a fresh copy of the player, loading out of sight, isn't heard ending the slideshow as it starts,
//   or asking for the deck's fonts (which makes the editor switch off its Slideshow button); it gets
//   the fonts the first player got instead;
// - a player that's been replaced can't move the editor to its slide;
// - presenting through Meet, Meet's controls work the player on screen;
// - it knows whether presenter view is open (see live-edits-frame.js).
// Players are told apart by the window their code runs in; live-edits.js marks each player's frame
// with data-slides-companion-player: "loading", "shown" or "replaced" (Slides' own player, until
// replaced, has none).
//
// Not strict mode: a wrapper reads its caller, to know which player called.
{
  const PLAYER = 'iframe.punch-present-iframe';
  // To and from live-edits.js.
  const CHECK_EVENT = 'slides-companion-live-check';
  const RESULT_EVENT = 'slides-companion-live-result';
  const STARTED_EVENT = 'slides-companion-slideshow-started';
  const ENDED_EVENT = 'slides-companion-slideshow-ended';
  const SHOWN_EVENT = 'slides-companion-player-shown';

  // The player whose code a function belongs to.
  function playerOf(fn) {
    if (typeof fn !== 'function') return null;
    for (const frame of document.querySelectorAll(PLAYER)) {
      try {
        if (fn instanceof frame.contentWindow.Function) return frame;
      } catch {}
    }
    return null;
  }
  const state = (frame) => frame?.dataset.slidesCompanionPlayer ?? (frame ? 'shown' : null);
  const isCopy = (frame) => Boolean(frame && 'slidesCompanionCopy' in frame.dataset);
  const shownPlayer = () =>
    [...document.querySelectorAll(PLAYER)].find((frame) => state(frame) === 'shown') ?? null;
  const loadingPlayer = () =>
    document.querySelector(`${PLAYER}[data-slides-companion-player="loading"]`);

  // Slides puts each object on the window as a slideshow starts; its methods are wrapped once.
  const wrapped = new WeakSet();
  // Which objects Slides has put on the window, and what live edits looked for and didn't find.
  // These are Slides' private parts, and Slides can change them without notice: live-edits.js turns
  // live edits off for the slideshow if any is missing (see `lacking`), rather than misbehave.
  const seen = new Set();
  const missing = new Set();
  function watch(name, wrap) {
    let value;
    Object.defineProperty(window, name, {
      configurable: true,
      enumerable: true,
      get: () => value,
      set(next) {
        value = next;
        const proto = next && Object.getPrototypeOf(next);
        if (proto) seen.add(name);
        if (proto && !wrapped.has(proto)) {
          wrapped.add(proto);
          wrap(proto);
        }
      },
    });
  }
  // Wraps one of an object's methods: `make(original)` gives what takes its place.
  function hook(name, proto, method, make) {
    const original = proto[method];
    if (typeof original !== 'function') return missing.add(`${name}.${method}`);
    proto[method] = make(original);
  }
  // The objects a slideshow started from the editor always puts on the window.
  const REQUIRED = ['SK_svgDataApi', 'SK_viewerDataApi', 'SK_viewerEventListener'];
  const lacking = () => [...REQUIRED.filter((name) => !seen.has(name)), ...missing];

  // ----- Slides as each player got them -----

  // Slides numbers some ids afresh each time it draws a slide ("e23_21"), both numbers: the second
  // one too when the computer is busy. They're numbered here as they first come, so that
  // only what refers to what counts.
  function fingerprint(svg) {
    const ids = new Map();
    const text = String(svg).replace(/\be\d+_\d+\b/g, (id) => {
      if (!ids.has(id)) ids.set(id, ids.size);
      return `e_${ids.get(id)}`;
    });
    let hash = 0;
    for (let i = 0; i < text.length; i++) hash = (Math.imul(hash, 31) + text.charCodeAt(i)) | 0;
    return `${text.length}:${hash}`;
  }

  // By player: each slide's fingerprint, and the deck's order when it started.
  const delivered = new WeakMap();
  const orders = new WeakMap();
  // The editor's fingerprint of each slide, at the last check.
  const current = new Map();
  let svgApi = null;

  const deckOrder = () =>
    [...document.querySelectorAll('.punch-filmstrip-thumbnail[data-slide-page-id]')]
      .map((thumbnail) => thumbnail.dataset.slidePageId)
      .join(' ') + ` / ${window.SK_viewerDataApi?.getSlidePageCount?.()}`;

  watch('SK_svgDataApi', (proto) => {
    hook(
      'SK_svgDataApi',
      proto,
      'requestPage3',
      (requestPage) =>
        function (pageId, prefetch, onImages, onSvg) {
          svgApi = this;
          const frame = playerOf(onSvg);
          if (!frame) return requestPage.apply(this, arguments);
          const args = [...arguments];
          args[3] = function (svg) {
            if (!delivered.has(frame)) delivered.set(frame, new Map());
            delivered.get(frame).set(pageId, fingerprint(svg));
            return onSvg.apply(this, arguments);
          };
          return requestPage.apply(this, args);
        },
    );
  });

  const ask = (pageId) =>
    new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(null), 3000);
      try {
        svgApi.requestPage3(
          pageId,
          false,
          () => {},
          (svg) => {
            clearTimeout(timeout);
            resolve(fingerprint(svg));
          },
        );
      } catch {
        clearTimeout(timeout);
        resolve(null);
      }
    });

  // How the deck differs from what a player got: the slides edited since, and whether slides were
  // added, removed or moved.
  function differences(frame) {
    const got = frame && delivered.get(frame);
    if (!got) return null;
    const changed = [...current]
      .filter(([pageId, print]) => print && got.has(pageId) && got.get(pageId) !== print)
      .map(([pageId]) => pageId);
    return { changed, moved: orders.has(frame) && orders.get(frame) !== deckOrder() };
  }

  document.addEventListener(CHECK_EVENT, async (event) => {
    const { id, pages } = JSON.parse(event.detail);
    if (svgApi) {
      const prints = await Promise.all(pages.map(ask));
      pages.forEach((pageId, i) => current.set(pageId, prints[i]));
    }
    const shown = differences(shownPlayer());
    const loading = differences(loadingPlayer());
    const gone = lacking();
    // For the tests, which name what's gone when Slides changes.
    document.documentElement.dataset.slidesCompanionLiveEdits = gone.length
      ? `missing ${gone.join(', ')}`
      : 'working';
    // What the edits so far add up to, to tell when they've stopped.
    const version = fingerprint(
      JSON.stringify([...current].filter(([pageId]) => shown?.changed.includes(pageId))) +
        deckOrder(),
    );
    document.dispatchEvent(
      new CustomEvent(RESULT_EVENT, {
        detail: JSON.stringify({ id, shown, loading, version, missing: gone }),
      }),
    );
  });

  // The deck's order as each player started.
  watch('SK_viewerDataApi', (proto) => {
    hook(
      'SK_viewerDataApi',
      proto,
      'requestViewerModel',
      (requestViewerModel) =>
        function (callback) {
          const frame = playerOf(callback);
          if (frame) orders.set(frame, deckOrder());
          return requestViewerModel.apply(this, arguments);
        },
    );
  });

  // ----- What the players tell the editor -----

  watch('SK_viewerEventListener', (proto) => {
    const name = 'SK_viewerEventListener';
    hook(
      name,
      proto,
      'onLoad',
      (onLoad) =>
        function loaded() {
          const frame = playerOf(loaded.caller);
          // Players are told apart by who calls: without it, a copy loading out of sight could end
          // the slideshow.
          if (!frame) missing.add('Function.caller');
          // A new slideshow: what was checked during the last one is out of date.
          if (!isCopy(frame)) current.clear();
          const result = onLoad.apply(this, arguments);
          document.dispatchEvent(new CustomEvent(STARTED_EVENT));
          return result;
        },
    );
    hook(
      name,
      proto,
      'onExit',
      (onExit) =>
        function exit() {
          // A copy says it's leaving as it starts, before it's shown.
          if (state(playerOf(exit.caller)) === 'loading') return;
          const result = onExit.apply(this, arguments);
          document.dispatchEvent(new CustomEvent(ENDED_EVENT));
          return result;
        },
    );
    hook(
      name,
      proto,
      'onDisplayPageChanged',
      (onDisplayPageChanged) =>
        function changed() {
          // Only the player on screen moves the editor to its slide.
          if (['loading', 'replaced'].includes(state(playerOf(changed.caller)))) return;
          return onDisplayPageChanged.apply(this, arguments);
        },
    );
    hook(
      name,
      proto,
      'onAllPagesLoad',
      (onAllPagesLoad) =>
        function allLoaded() {
          const frame = playerOf(allLoaded.caller);
          if (frame) frame.dataset.slidesCompanionLoaded = '';
          return onAllPagesLoad.apply(this, arguments);
        },
    );
  });

  // ----- Presenting through Meet -----

  // Meet's code in the editor puts SK_remoteCoordinator on the window, once. A player hands Meet
  // its controls (Next, Previous, a slide's number) through it, and from then on says what's on
  // screen: as it loads, and when the editor tells it Meet has joined (onConnectRemote). Meet works
  // the last player that did. So only the player on screen gets Meet: a copy loading out of sight
  // finds Meet isn't there, and connects as it's shown; a replaced one goes quiet, and Meet joining
  // it joins the one on screen instead.
  const connect = (frame) => {
    try {
      frame?.contentWindow.SK_editorEventListener?.onConnectRemote();
    } catch {}
  };
  const quietUnlessShown = (frame, listener) =>
    new Proxy(listener, {
      get(target, key) {
        const value = Reflect.get(target, key);
        if (typeof value !== 'function') return value;
        return function () {
          if (state(frame) === 'shown') return value.apply(target, arguments);
        };
      },
    });
  let coordinator;
  Object.defineProperty(window, 'SK_remoteCoordinator', {
    configurable: true,
    enumerable: true,
    get: () => coordinator,
    set(next) {
      coordinator = next;
      const getRemoteEventListener = next?.getRemoteEventListener;
      if (typeof getRemoteEventListener !== 'function') return;
      next.getRemoteEventListener = function asked() {
        const frame = playerOf(asked.caller);
        const listener = getRemoteEventListener.apply(this, arguments);
        if (!frame || !listener) return listener;
        if (state(frame) === 'replaced') connect(shownPlayer());
        return state(frame) === 'shown' ? quietUnlessShown(frame, listener) : null;
      };
    },
  });
  document.addEventListener(SHOWN_EVENT, () => coordinator && connect(shownPlayer()));

  // The fonts, from the first player's request, and the copies waiting for them.
  const fonts = { setWebFontsMetadataCallback: null, setWebFontsListCallback: null };
  const waiting = { setWebFontsMetadataCallback: [], setWebFontsListCallback: [] };
  watch('SK_webFontsDataApi', (proto) => {
    for (const method of Object.keys(fonts)) {
      hook(
        'SK_webFontsDataApi',
        proto,
        method,
        (original) =>
          function (callback) {
            const frame = playerOf(callback);
            if (isCopy(frame)) {
              waiting[method] = waiting[method].filter((copy) => copy.frame.isConnected);
              waiting[method].push({ frame, callback });
              if (fonts[method]) setTimeout(() => callback(...fonts[method]));
              return;
            }
            fonts[method] = null;
            return original.call(this, function () {
              fonts[method] = [...arguments];
              for (const copy of waiting[method]) {
                try {
                  if (copy.frame.isConnected) copy.callback(...arguments);
                } catch {}
              }
              return callback.apply(this, arguments);
            });
          },
      );
    }
  });

  // Presenter view's window, opened by the editor as a slideshow starts with it, or by a player
  // (see live-edits-frame.js).
  let presenterView = null;
  const PRESENTER_VIEW = /^punch_speaker_notes/;
  const open = window.open;
  window.open = function (url, name) {
    const opened = open.apply(this, arguments);
    if (PRESENTER_VIEW.test(String(name ?? ''))) presenterView = opened;
    return opened;
  };
  // Open while its window isn't closed. (A floating one, presenter-view-main.js, has no name.)
  const presenterViewOpen = () => Boolean(presenterView && !presenterView.closed);
  document.addEventListener('slides-companion-presenter-view', () => {
    document.documentElement.toggleAttribute(
      'data-slides-companion-presenter-view',
      presenterViewOpen(),
    );
  });

  // The time on presenter view's timer, to the millisecond: its seconds, and how long since it last
  // ticked. Nothing while it's paused. The same element as countdown.js's ELAPSED: this file runs in
  // the page's own world, where slides-dom.js and countdown.js can't be reached, so a change to one
  // goes to the other.
  const TIMER = '.punch-viewer-speakernotes-timer-time:not(.slides-companion-countdown)';
  let ticked = 0;
  let ticks = null;
  document.addEventListener('slides-companion-presenter-view-watch', () => {
    const doc = presenterViewOpen() && presenterView.document;
    if (!doc || ticks?.doc === doc) return;
    ticks?.disconnect();
    ticks = new MutationObserver((records) => {
      const changed = (record) =>
        (record.target.nodeType === Node.ELEMENT_NODE
          ? record.target
          : record.target.parentElement
        )?.closest(TIMER);
      if (records.some(changed)) ticked = performance.now();
    });
    ticks.doc = doc;
    ticks.observe(doc, { subtree: true, childList: true, characterData: true });
  });
  document.addEventListener('slides-companion-presenter-view-time', () => {
    const doc = presenterViewOpen() && presenterView.document;
    const match = doc?.querySelector(TIMER)?.textContent.match(/^(\d+):(\d\d):(\d\d)$/);
    const since = performance.now() - ticked;
    const time =
      match && since < 1500
        ? (match[1] * 3600 + match[2] * 60 + Number(match[3])) * 1000 + Math.min(since, 999)
        : null;
    if (time === null) delete document.documentElement.dataset.slidesCompanionPresenterViewTime;
    else document.documentElement.dataset.slidesCompanionPresenterViewTime = Math.round(time);
  });
  // While a copy takes it over (see countdown.js).
  document.addEventListener('slides-companion-presenter-view-taking-over', (event) => {
    const doc = presenterViewOpen() && presenterView.document;
    doc?.documentElement.toggleAttribute(
      'data-slides-companion-taking-over',
      event.detail === 'true',
    );
    if (event.detail === 'true') keepOpen();
  });

  // A player closes presenter view as it goes, which a copy that's been replaced does when it's
  // removed. Only the player on screen, or Slides itself, closes it. Players are known by their
  // window's Function.prototype, held weakly: a removed one's window is gone.
  const replaced = new WeakSet();
  const KEEPING = Symbol('slides-companion keeping presenter view open');
  function keepOpen() {
    for (const frame of document.querySelectorAll(PLAYER)) {
      try {
        if (state(frame) === 'replaced') replaced.add(frame.contentWindow.Function.prototype);
      } catch {}
    }
    const win = presenterViewOpen() && presenterView;
    if (!win || win.close[KEEPING]) return;
    const close = win.close;
    win.close = function closing() {
      const caller = closing.caller;
      if (caller && replaced.has(Object.getPrototypeOf(caller))) return;
      return close.call(win);
    };
    win.close[KEEPING] = true;
  }
  window[Symbol.for('slides-companion presenter view')] = {
    window: () => (presenterViewOpen() ? presenterView : null),
    opened: (opened) => (presenterView = opened),
  };
}

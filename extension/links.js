// Links during a slideshow: a link clicked opens its page on the stage (stage.js), over the slide,
// so the presenter never leaves the slideshow. YouTube and Drive show in their players, PDFs in
// Google's viewer, and a site that refuses to be shown inside another page says so, with a way to
// open it in a new tab or to allow every site. With every site allowed, page.js in the page hands
// Esc back and says where it went, for Back and Forward.
{
  const { text, html } = globalThis.slidesCompanion;
  const { pointedAt } = globalThis.slidesCompanion.slides;
  const stage = globalThis.slidesCompanion.stage;
  const { icon } = globalThis.slidesCompanion.ui;
  const BACK_ICON = icon('M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20z');
  const FORWARD_ICON = icon('m12 4-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z');
  const NEW_TAB_ICON = icon(
    'M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3z',
  );

  // A page a link goes to: { address, shown }. With every site allowed, page.js says where the
  // page goes: `visited` lists the addresses, from the one first shown, `at` is where it is among
  // them (Back and Forward move it), `goes` counts Back and Forward, and `frameId` is how to reach it.
  // The stage's other items are objects on the slide (spotlight.js).
  const isPage = (item) => Boolean(item) && !(item instanceof Element);
  // The first is the link's own page: its address (a YouTube video's page, not its player).
  const browsedTo = (page) => (page.at > 0 ? new URL(page.visited[page.at]) : page.address);
  const siteName = (page) => browsedTo(page).hostname.replace(/^www\./, '');
  const shownPage = () => (isPage(stage.item()) ? stage.item() : null);
  const websiteFrame = () => stage.element()?.querySelector('.slides-companion-spotlight-website');

  // The page, live. Sandboxed without top navigation, so it can't take the slideshow's window.
  function pageFrame(item) {
    const { address, shown } = item;
    const frame = document.createElement('iframe');
    frame.className = 'slides-companion-spotlight-website';
    // How page.js knows it's in this frame.
    frame.name = 'slides-companion-page';
    frame.title = address.hostname;
    frame.setAttribute(
      'sandbox',
      'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads allow-presentation',
    );
    frame.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    frame.src = shown;
    // Pages can take the keys as they open (a search box), and the slideshow can't hear keys there,
    // so Esc wouldn't close it. The page sleeps until the pointer comes over it, and the keys come
    // back if it takes them before.
    frame.inert = true;
    // A page on Slides' own site (a Doc, another deck) is in reach: Esc there closes it too, once
    // the presenter has gone into it. Other sites can't be listened to; page.js does it there, with
    // every site allowed.
    // Google's viewer shows nothing until it has loaded, and it then says what it got: a web page's
    // code doesn't flash meanwhile.
    let reveal = inPdfViewer(item) ? hideWhileChecking(frame, VIEWER_WAIT_MS) : null;
    if (reveal)
      askViewerAgain(frame, () => {
        reveal();
        reveal = hideWhileChecking(frame, VIEWER_WAIT_MS);
      });
    frame.addEventListener('load', () => {
      try {
        frame.contentWindow.addEventListener('keydown', onPageKeydown, true);
      } catch {}
      if (!inPdfViewer(item)) return;
      const got = viewerGot(frame);
      if (got) item.pdf = got === 'pdf';
      if (got === 'page') showAt(item, shownAddress(item.address));
      else reveal();
    });
    return frame;
  }

  // ----- Controls -----

  // The page's site, with a way to open it in a new tab, and Back and Forward once page.js says
  // where the page is.
  const bar = () => `
        <div class="slides-companion-spotlight-group slides-companion-spotlight-sitebar" hidden>
          <button type="button" class="slides-companion-spotlight-back" aria-label="${html('spotlightBack')}" data-slides-companion-tip="${html('spotlightBack')}" hidden>${BACK_ICON}</button>
          <button type="button" class="slides-companion-spotlight-forward" aria-label="${html('spotlightForward')}" data-slides-companion-tip="${html('spotlightForward')}" hidden>${FORWARD_ICON}</button>
          <div class="slides-companion-spotlight-site" dir="auto"></div>
          <button type="button" class="slides-companion-spotlight-new-tab" aria-label="${html('openInNewTab')}" data-slides-companion-tip="${html('openInNewTab')}">${NEW_TAB_ICON}</button>
        </div>`;

  function update(element, item) {
    const page = isPage(item) ? item : null;
    element.querySelector('.slides-companion-spotlight-sitebar').hidden = !page;
    element.querySelector('.slides-companion-spotlight-site').textContent = page
      ? siteName(page)
      : '';
    const back = element.querySelector('.slides-companion-spotlight-back');
    const forward = element.querySelector('.slides-companion-spotlight-forward');
    back.hidden = forward.hidden = page?.frameId === undefined;
    back.disabled = !(page?.at > 0);
    forward.disabled = !(page?.at < page?.visited.length - 1);
  }

  function click(target) {
    if (target.closest('.slides-companion-spotlight-new-tab')) openInNewTab();
    else if (target.closest('.slides-companion-spotlight-back')) goInPage(-1);
    else if (target.closest('.slides-companion-spotlight-forward')) goInPage(1);
    else return false;
    return true;
  }

  // Its release, if it happens with the page gone, comes to this window (see stage.js).
  function onPageKeydown(event) {
    if (event.key !== 'Escape' || !stage.isOpen()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    stage.closeByKey(event.key);
  }

  // The window loses the keys to a page inside it.
  function keepKeysFromSleepingPage() {
    const frame = stage.element()?.querySelector('.slides-companion-spotlight-website[inert]');
    if (frame && document.activeElement === frame) frame.blur();
  }
  window.addEventListener('blur', () => setTimeout(keepKeysFromSleepingPage));

  // Chrome also says the pointer moved when the page appears under it, so it has to really move.
  let restingAt = null;
  function wakePage(event) {
    const frame = stage.element()?.querySelector('.slides-companion-spotlight-website[inert]');
    if (!frame) return;
    restingAt ??= { x: event.clientX, y: event.clientY };
    const area = frame.getBoundingClientRect();
    const over =
      event.clientX >= area.left &&
      event.clientX <= area.right &&
      event.clientY >= area.top &&
      event.clientY <= area.bottom;
    if (over && Math.hypot(event.clientX - restingAt.x, event.clientY - restingAt.y) > 4)
      wake(frame);
  }

  // A page that shares Slides' process (one on google.com, such as a Doc) gets the wheel once it
  // wakes, but Chrome keeps scrolling it as if it were still inert: taking the frame out of the
  // layout for a moment has Chrome look at it again. It doesn't reload the page.
  function wake(frame) {
    frame.inert = false;
    frame.style.display = 'none';
    frame.getBoundingClientRect();
    frame.style.display = '';
  }

  // From page.js, through background.js to each of the tab's frames: the one showing the
  // page acts. Esc's release comes after the page has gone.
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === 'page-key' && message.phase === 'keyup')
      return stage.keyReleased(message.key);
    const page = shownPage();
    if (!page) return;
    if (message?.type === 'page-key') stage.closeByKey(message.key);
    else if (message?.type === 'page-address') onPageAddress(page, message);
  });

  // A page the presenter went to in it starts a new way forward, as in a tab. The same page under
  // another address (a site tidying it, a redirect, a reload) takes its place, and the tab's own Back
  // and Forward move along. Back and Forward here only say where they landed: the last one pressed,
  // not a page passed on the way when pressed in a row.
  function onPageAddress(page, { href, how, went, frameId }) {
    page.frameId = frameId;
    if (went !== undefined && went !== page.goes) return;
    const { visited, at } = page;
    if (how === 'push') {
      visited.splice(at + 1, Infinity, href);
      page.at = visited.length - 1;
    } else if (how === 'traverse' && [visited[at - 1], visited[at + 1]].includes(href)) {
      page.at = visited[at - 1] === href ? at - 1 : at + 1;
    } else {
      visited[at] = href;
    }
    stage.updateBar();
  }

  // Back and Forward go through the pages visited in the frame. The tab's own Back would take the
  // whole tab back, out of the slideshow if the page has no page before it.
  function goInPage(delta) {
    const page = stage.item();
    const at = page.at + delta;
    if (at < 0 || at >= page.visited.length) return;
    page.at = at;
    page.goes = (page.goes ?? 0) + 1;
    askBackground({
      type: 'page-go',
      frameId: page.frameId,
      href: page.visited[at],
      go: page.goes,
    });
    stage.updateBar();
  }

  // The slideshow ending with the page open, or the tab going elsewhere.
  window.addEventListener(
    'pagehide',
    () => isPage(stage.items()?.[0]) && askBackground({ type: 'page-closed' }),
  );

  async function askBackground(message) {
    try {
      return await chrome.runtime.sendMessage(message);
    } catch {
      return null; // The extension was updated or reloaded since this page opened.
    }
  }

  // The slide comes back first, so it's there on coming back to this tab. The page browsed to, if
  // page.js says; the link's own address otherwise (a YouTube video's page, not its player).
  function openInNewTab() {
    const address = browsedTo(stage.item());
    stage.close();
    window.open(address.href, '_blank', 'noopener');
  }

  // ----- Sites that refuse to be shown -----

  // Without every site allowed, a site that refuses to be framed (`X-Frame-Options` or CSP
  // `frame-ancestors`) shows as Chrome's grey error page, and nothing the slideshow can see of a
  // frame tells the two apart (Chrome hides it). An <object> can: where a frame shows that page, it
  // fails to load (its `error` event), as it does for a missing page or site. Slides' CSP lets
  // objects load only from Slides itself, so the <object> goes in a page of Slides' site whose CSP a
  // declarativeNetRequest rule of ours lifts (background.js, CHECK_PAGE_RULE: a "not found" page, at
  // an address only we ask for). Every ancestor of the <object> is then on docs.google.com, as for
  // the page's own frame, so the site's framing headers give the same answer in both. The frame is
  // sandboxed without scripts, and so is the site in it: it can't play, count a visit or take the
  // slideshow's window. Meanwhile the page waits out of sight, for a moment at most, so that a
  // refusal doesn't flash.
  const CHECK_PAGE = 'https://docs.google.com/presentation/slides-companion-check';
  const CHECK_HIDES_MS = 1000;
  // The page out of sight while it's checked, for a moment at most if given; what's returned shows
  // it again.
  function hideWhileChecking(page, ms) {
    const CHECKING = 'slides-companion-spotlight-checking';
    page.classList.add(CHECKING);
    const timer = ms && setTimeout(() => page.classList.remove(CHECKING), ms);
    return () => {
      clearTimeout(timer);
      page.classList.remove(CHECKING);
    };
  }
  const EXTENSION_ORIGIN = new URL(chrome.runtime.getURL('')).origin;

  // Whether the page can be shown, or is a PDF: with every site allowed nothing refuses,
  // so only the second is asked. Google's PDF viewer is neither.
  function checkPage(item) {
    if (inPdfViewer(item)) return;
    if (item.allSites) askType(item);
    else checkRefusal(item);
  }

  // A frame out of sight, without scripts, that asks about an address.
  function probeFrame() {
    const probe = document.createElement('iframe');
    probe.className = 'slides-companion-spotlight-probe';
    probe.setAttribute('sandbox', 'allow-same-origin');
    probe.setAttribute('aria-hidden', 'true');
    probe.tabIndex = -1;
    return probe;
  }

  function checkRefusal(item) {
    const page = websiteFrame();
    const probe = probeFrame();
    const reveal = hideWhileChecking(page, CHECK_HIDES_MS);
    const decided = (refused) => {
      probe.remove();
      reveal();
      // A PDF fails here too, as it does in the page's frame: the viewer is asked first.
      if (refused && mayBePdf(item)) return askViewer(item, page);
      if (refused && stage.item() === item) showRefusal(item);
    };
    probe.addEventListener(
      'load',
      () => {
        // Unreachable (offline), there's nothing to tell: the page shows as it comes.
        const doc = probe.contentDocument;
        if (!doc?.body) return decided(false);
        const load = (data, loaded, failed) => {
          const object = doc.createElement('object');
          object.type = 'text/html';
          object.data = data;
          object.addEventListener('load', loaded);
          object.addEventListener('error', failed);
          doc.body.append(object);
        };
        // First a page of nothing, which loads only once our rule has lifted Slides' (if it hasn't,
        // every site would seem to refuse, so it's better to say nothing).
        load(
          'data:text/html,',
          () =>
            load(
              item.shown,
              () => decided(false),
              () => decided(true),
            ),
          () => decided(false),
        );
      },
      { once: true },
    );
    probe.src = CHECK_PAGE;
    stage.element().append(probe);
  }

  // Our message in its place (refused.html), naming the site, with Open in new tab and Allow all sites.
  function showRefusal(item) {
    item.refused = true;
    const site = siteName(item);
    const message = document.createElement('iframe');
    message.className = 'slides-companion-spotlight-refused';
    message.title = text('refusedTitle', site);
    message.src = chrome.runtime.getURL(
      `refused.html?${new URLSearchParams({ hl: globalThis.slidesCompanion.locale(), site })}`,
    );
    stage.replace(message);
    stage.say(text('refusedTitle', site));
  }

  // Every site allowed from the message: the page shows, now that it can.
  async function showAllowed(item) {
    if (!item.refused) return;
    item.refused = false;
    item.allSites = Boolean((await askBackground({ type: 'page-open' }))?.allSites);
    if (stage.item() !== item) return;
    stage.say('');
    stage.replace(pageFrame(item));
    checkPage(item);
  }

  // The stage takes every key, so Tab goes nowhere else: into the message, at its first button, or
  // its last going back. Out of it, Tab comes back to the slideshow by itself.
  function focusRefusal(last) {
    const message = stage.element()?.querySelector('.slides-companion-spotlight-refused');
    if (!message) return;
    message.focus();
    message.contentWindow.postMessage({ type: 'focus', last }, EXTENSION_ORIGIN);
  }

  // What the message asks the stage to do.
  window.addEventListener('message', (event) => {
    const message = stage.element()?.querySelector('.slides-companion-spotlight-refused');
    if (!message || event.source !== message.contentWindow || event.origin !== EXTENSION_ORIGIN)
      return;
    if (event.data?.source !== 'slides-companion-refused') return;
    const item = stage.item();
    if (event.data.type === 'open') openInNewTab();
    else if (event.data.type === 'close') stage.close();
    else if (event.data.type === 'allowed') showAllowed(item);
    // Its release comes to this window (see stage.js).
    else if (event.data.type === 'key' && event.data.key === 'Escape')
      stage.closeByKey(event.data.key);
  });

  // ----- PDFs -----

  // A PDF shows in Google's viewer, as Drive shows one. Chrome's own viewer isn't let into the page's
  // frame (sandboxed), and out of it a link in the PDF would take the slideshow's whole tab. Google
  // fetches the PDF, so one it can't reach (a company's own) says so, and opens in a new tab from
  // the bar. It speaks Slides' language. An address ending in .pdf goes there straight away; any
  // other, once found to be a PDF (askViewer, askType).
  const PDF_VIEWER = 'https://docs.google.com/viewer';
  // How long the viewer, out of sight, has to say what it got.
  const VIEWER_WAIT_MS = 5000;
  const inPdfViewer = (item) => item.shown.startsWith(`${PDF_VIEWER}?`);
  // Not known yet, and not shown in a player (YouTube's, Drive's: another path), which never is.
  const mayBePdf = (item) =>
    item.pdf === undefined &&
    !inPdfViewer(item) &&
    new URL(item.shown).pathname === item.address.pathname;

  function viewerAddress(address) {
    const viewer = new URL(`${PDF_VIEWER}?embedded=true`);
    viewer.searchParams.set('url', address.href);
    if (document.documentElement.lang) viewer.searchParams.set('hl', document.documentElement.lang);
    return viewer.href;
  }
  const pdfViewer = (address) => (/\.pdf$/i.test(address.pathname) ? viewerAddress(address) : null);

  // Now and then the viewer answers nothing (204 No Content) at once, sometimes several times in a
  // row when it's asked often: it's asked again, a little later each time.
  //
  // A frame can't hear it: no `load` comes, and it would stay empty. But its document is on Slides'
  // own site, so the slideshow sees whether the viewer's page has come: within a second when it
  // answers, while `load` can take several more. Without it by then, the frame asks again, waiting
  // longer each time (a slow network gets its page on a later try, as it would have anyway).
  // `waitAgain` restarts the wait out of sight.
  const FRAME_ASKS_AGAIN_MS = [2000, 3000, 4000];
  function askViewerAgain(frame, waitAgain, tries = 0) {
    const asked = frame.src;
    if (tries === FRAME_ASKS_AGAIN_MS.length) return;
    setTimeout(() => {
      if (!frame.isConnected || frame.src !== asked) return;
      let blank;
      try {
        blank = frame.contentDocument?.URL === 'about:blank';
      } catch {
        return;
      }
      if (!blank) return;
      waitAgain();
      frame.src = asked;
      askViewerAgain(frame, waitAgain, tries + 1);
    }, FRAME_ASKS_AGAIN_MS[tries]);
  }

  // What the viewer got, as its page says ("application/pdf", "text/html"), read from Slides' own
  // site: a PDF, a web page, or null when it got nothing ("No preview available") or can't tell
  // (Google changed its page).
  function viewerGot(frame) {
    try {
      return gotFrom(
        [...frame.contentDocument.scripts].map((script) => script.textContent).join('\n'),
      );
    } catch {
      return null;
    }
  }
  function gotFrom(text) {
    if (text.includes('"application/pdf"')) return 'pdf';
    if (text.includes('"text/html"')) return 'page';
    return null;
  }

  // The link shown at another address: as any page (an address ending in .pdf that's a page about
  // the PDF, GitHub's, which the viewer would show as its code), or in the viewer.
  function showAt(item, shown) {
    item.shown = shown;
    item.visited = [shown];
    item.at = 0;
    if (stage.item() !== item) return;
    stage.replace(pageFrame(item));
    checkPage(item);
  }

  // Without every site allowed, a PDF fails the refusal check, as a site that refuses does. Before
  // saying so, Google's viewer is asked what the address is (its page, not run: nothing plays or is
  // counted): a PDF shows in it; anything else gets the message. Meanwhile the page stays out of
  // sight, as it's Chrome's error page. Google sees only addresses that would fail otherwise.
  async function askViewer(item, page) {
    if (stage.item() !== item) return;
    const reveal = hideWhileChecking(page);
    const got = await viewerSays(item.address);
    if (got) item.pdf = got === 'pdf';
    if (stage.item() !== item) return;
    if (item.pdf) return showAt(item, viewerAddress(item.address));
    reveal();
    showRefusal(item);
  }

  // The slideshow is on the viewer's own site, so it's asked with fetch, which (unlike a frame,
  // where nothing loads) sees when the viewer answers nothing (see askViewerAgain).
  const FETCH_ASKS_AGAIN_MS = [500, 1500, 3000];
  async function viewerSays(address, tries = 0) {
    try {
      const answer = await fetch(viewerAddress(address), {
        credentials: 'include',
        signal: AbortSignal.timeout(VIEWER_WAIT_MS),
      });
      if (answer.status === 204 && tries < FETCH_ASKS_AGAIN_MS.length) {
        await new Promise((resolve) => setTimeout(resolve, FETCH_ASKS_AGAIN_MS[tries]));
        return viewerSays(address, tries + 1);
      }
      return gotFrom(await answer.text());
    } catch {
      return null;
    }
  }

  // With every site allowed, nothing refuses, and a PDF shows as Chrome's "blocked" page instead:
  // the background asks the site itself what the address is, while the page waits out of sight
  // for a moment at most.
  async function askType(item) {
    if (!mayBePdf(item)) return;
    const reveal = hideWhileChecking(websiteFrame(), CHECK_HIDES_MS);
    const answer = await askBackground({ type: 'page-type', href: item.address.href });
    reveal();
    if (typeof answer?.pdf === 'boolean') item.pdf = answer.pdf;
    if (item.pdf && stage.item() === item && !inPdfViewer(item))
      showAt(item, viewerAddress(item.address));
  }

  // ----- Opening -----

  // Slides sends links through Google's redirect (google.com/url?q=<address>). Links to a slide of
  // the deck are Slides' own to follow.
  function linkAddress(link) {
    const href = link.href?.baseVal ?? link.getAttribute('href') ?? '';
    if (href.startsWith('#')) return null;
    try {
      let address = new URL(href, location.href);
      if (address.hostname === 'www.google.com' && address.pathname === '/url')
        address = new URL(address.searchParams.get('q'));
      if (!['http:', 'https:'].includes(address.protocol)) return null;
      if (address.origin === location.origin && address.pathname === location.pathname) return null;
      return address;
    } catch {
      return null;
    }
  }

  // What the page shows for a link. YouTube and Drive refuse to show their pages inside another
  // page, but their players may be: a video plays from where the link starts it (?t=90, 1m30s).
  // A plain http page isn't let into the slideshow (an https page), so its https address is tried.
  function shownAddress(address) {
    const host = address.hostname.replace(/^(www|m)\./, '');
    const [, first, second, third] = address.pathname.split('/');
    if (host === 'drive.google.com') {
      const file =
        first === 'file' && second === 'd'
          ? third
          : first === 'open'
            ? address.searchParams.get('id')
            : null;
      if (file) return `https://drive.google.com/file/d/${encodeURIComponent(file)}/preview`;
    }
    const video =
      host === 'youtu.be'
        ? first
        : host !== 'youtube.com'
          ? null
          : first === 'watch'
            ? address.searchParams.get('v')
            : ['shorts', 'live'].includes(first)
              ? second
              : null;
    if (!video) {
      const secure = new URL(address);
      secure.protocol = 'https:';
      return secure.href;
    }
    const player = new URL(`https://www.youtube.com/embed/${encodeURIComponent(video)}`);
    player.searchParams.set('autoplay', '1');
    const [, hours = 0, minutes = 0, seconds = 0] =
      (address.searchParams.get('t') ?? '').match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/) ?? [];
    const start = hours * 3600 + minutes * 60 + Number(seconds);
    if (start) player.searchParams.set('start', start);
    return player.href;
  }

  // A link opens a new tab; it opens its page on the stage instead, unless the "When you click a
  // link during a slideshow" setting says otherwise. Ctrl/⌘-click and middle click still open a tab.
  function clickedPage(event) {
    if (globalThis.slidesCompanion.settings.get('slideshowLinks') !== 'here') return null;
    const link = stage.plainClickOnSlide(event, 'a');
    // Waiting for its animation, the link isn't shown yet: the click goes on to the next step.
    // Its parent is checked, not the link: Slides draws a link on words as an <a opacity="0">
    // over them, which checkVisibility() always counts as hidden. The animation is still caught,
    // since checkVisibility({ opacityProperty }) looks at every ancestor's opacity.
    const address =
      link &&
      link.parentElement.checkVisibility({ opacityProperty: true, visibilityProperty: true }) &&
      linkAddress(link);
    if (!address) return null;
    const shown = pdfViewer(address) ?? shownAddress(address);
    return { address, shown, visited: [shown], at: 0 };
  }

  // With every site allowed, the rule letting sites be shown goes in first. If an image
  // opened on the stage meanwhile, the rule comes out again. Without, the page is checked for a
  // refusal.
  async function openPage(page) {
    page.allSites = Boolean((await askBackground({ type: 'page-open' }))?.allSites);
    if (!stage.isOpen()) stage.open([page], 0, siteName(page));
    else if (!isPage(stage.items()[0])) askBackground({ type: 'page-closed' });
  }

  stage.register({
    matches: isPage,
    render: pageFrame,
    bar,
    update,
    click,
    shown: checkPage,
    pointerMove: wakePage,
    closed: () => {
      restingAt = null;
      askBackground({ type: 'page-closed' });
    },
    tab: focusRefusal,
  });

  // Listening on the window at document_start puts us ahead of Slides' own click handling, and of
  // spotlight.js's (an image in a link is the link's).
  window.addEventListener(
    'click',
    (event) => {
      const page = clickedPage(event);
      if (!page) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      // The click focused the link, where keys don't reach the slideshow once it's back.
      pointedAt(event).closest('a').blur();
      openPage(page);
    },
    true,
  );
}

// A page opened over the slide from a link (spotlight.js). Registered by background.js on every
// site once the presenter lets every site open over the slide (card 56), so it runs in every frame
// but acts only in that page: the frame spotlight.js names, right inside Slides. The slideshow can't
// hear keys in another site, so Esc comes back to it from here; and it says where the page is, for
// Open in new tab, and Back and Forward (card 58).
{
  const NAME = 'slides-companion-page';
  if (window.name.split(' ')[0] === NAME && location.ancestorOrigins?.[0] === 'https://docs.google.com') {
    // Which Back or Forward brought it here, if one did: the frame's name keeps it across the move,
    // made in place. A page arriving otherwise (a link clicked before Back's page came) isn't theirs.
    const arrived = window.navigation?.activation?.navigationType ?? 'push';
    const went = arrived === 'replace' ? Number(window.name.split(' ')[1]) || undefined : undefined;
    window.name = NAME;

    const send = async (message) => {
      try {
        await chrome.runtime.sendMessage(message);
      } catch {} // The extension was updated or reloaded since the page opened.
    };

    // Its release too, for the slideshow to give Esc back to the browser only then (spotlight.js).
    for (const type of ['keydown', 'keyup']) {
      window.addEventListener(
        type,
        (event) => {
          if (event.key !== 'Escape') return;
          event.preventDefault();
          event.stopImmediatePropagation();
          send({ type: 'page-key', key: event.key, phase: type });
        },
        true,
      );
    }

    // Each page it goes to, also within the page (a site moving between its pages without loading),
    // and how: to a new page (push), or the same one under another address (replace, reload), or back
    // or forward (traverse: the tab's own Back goes through the frame's pages too).
    let reported = null;
    const report = (how, went) => {
      if (location.href === reported) return;
      reported = location.href;
      send({ type: 'page-address', href: location.href, how, went });
    };
    report(arrived, went);
    // Still this page: a Back or Forward to an address only a #part away moves within it.
    window.navigation?.addEventListener('currententrychange', (event) => {
      window.name = NAME;
      report(event.navigationType);
    });

    // Back and Forward: in place, so the tab's own history isn't added to.
    chrome.runtime.onMessage.addListener((message) => {
      if (message?.type !== 'page-go') return;
      window.name = `${NAME} ${message.go}`;
      location.replace(message.href);
    });
  }
}

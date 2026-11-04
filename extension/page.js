// A page opened over the slide from a link (spotlight.js). Registered by background.js on every
// site once the presenter lets every site open over the slide (card 56), so it runs in every frame
// but acts only in that page: the frame spotlight.js names, right inside Slides. The slideshow can't
// hear keys in another site, so Esc comes back to it from here; and it says where the page is, for
// Open in new tab, and Back and Forward (card 58).
if (window.name === 'slides-companion-page' && location.ancestorOrigins?.[0] === 'https://docs.google.com') {
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

  // Each page it goes to, also within the page (a site moving between its pages without loading).
  let reported = null;
  const report = () => {
    if (location.href === reported) return;
    reported = location.href;
    send({ type: 'page-address', href: location.href });
  };
  report();
  window.navigation?.addEventListener('currententrychange', report);

  // Back and Forward: in place, so the tab's own history isn't added to.
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === 'page-go') location.replace(message.href);
  });
}

// The message shown over the slide instead of a site that refuses to be shown inside another page,
// in a frame of ours on the Spotlight stage (spotlight.js). Open in new tab and closing
// are the stage's to do, so they're told to it; Allow all sites asks Chrome here, as Chrome asks only
// from the extension's own pages, during a click. Once every site is allowed, the stage shows the
// page.
{
  const ALL_SITES = { origins: ['*://*/*'] };
  const SLIDES_ORIGIN = 'https://docs.google.com';
  const { text } = globalThis.slidesCompanion;
  const query = new URLSearchParams(location.search);
  document.documentElement.lang = query.get('hl') ?? 'en';
  document.documentElement.dir = globalThis.slidesCompanion.dir();
  const site = query.get('site') ?? '';

  const open = document.querySelector('.slides-companion-refused-open');
  const allow = document.querySelector('.slides-companion-refused-allow');
  document.title = text('refusedTitle', site);
  document.querySelector('.slides-companion-refused-title').textContent = text('refusedTitle', site);
  document.querySelector('.slides-companion-refused-text').textContent = text('refusedLine');
  open.textContent = text('openInNewTab');
  allow.textContent = text('allSitesAllow');

  const tell = (message) => parent.postMessage({ source: 'slides-companion-refused', ...message }, SLIDES_ORIGIN);

  open.addEventListener('click', () => tell({ type: 'open' }));
  allow.addEventListener('click', async () => {
    try {
      if (await chrome.permissions.request(ALL_SITES)) tell({ type: 'allowed' });
    } catch {}
  });
  // Allowed another way meanwhile (Settings, in another tab).
  chrome.permissions.onAdded.addListener(async () => (await chrome.permissions.contains(ALL_SITES)) && tell({ type: 'allowed' }));

  // A click on the black around the message closes the stage, as around a picture.
  document.addEventListener('click', (event) => [document.body, document.documentElement].includes(event.target) && tell({ type: 'close' }));

  // Tabbed into from the stage: the first button, or the last going back.
  window.addEventListener('message', (event) => {
    if (event.source !== parent || event.origin !== SLIDES_ORIGIN || event.data?.type !== 'focus') return;
    document.documentElement.classList.add('slides-companion-tabbed');
    (event.data.last ? allow : open).focus();
  });
  window.addEventListener('mousedown', () => document.documentElement.classList.remove('slides-companion-tabbed'));

  // Esc closes the stage, as everywhere on it. (Tab goes on out of the frame by itself.)
  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    tell({ type: 'key', key: event.key });
  });
}

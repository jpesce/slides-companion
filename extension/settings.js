// User settings, saved with chrome.storage.sync so they follow the user to other computers.
// Other scripts read them through `slidesCompanion.settings`.
// Loaded once per page, though presenter view's scripts list it too (see manifest.json).
if (!globalThis.slidesCompanion?.settings) {
  const DEFAULTS = {
    // Spotlight: 'together' shows a group as one image, 'apart' shows each image in it on its own.
    groupedImages: 'together',
    // During a slideshow, clicking an image shows it full screen; off, the click changes slide.
    spotlightOnClick: true,
    // During a slideshow, a link clicked opens its page 'here', over the slide, or in a new 'tab'
    // as Slides does.
    slideshowLinks: 'here',
    // What scrolling over a slide does. During a slideshow: 'zoom' zooms into it, 'nothing' does
    // nothing, 'slides' goes to the next or previous slide as Slides does. While editing: 'slides'
    // or 'nothing'.
    slideshowScroll: 'zoom',
    editorScroll: 'slides',
    // What the pen draws in a slideshow shows again the next time the deck is presented. Off, as in
    // Slides, the pen's ink goes when the slideshow ends.
    keepInk: false,
    // In presenter view, how many minutes before the end the countdown turns orange.
    countdownWarning: '2',
    // An edit made during a slideshow from the editor shows in it: 'now' as soon as it's calm,
    // 'later' once the slide on screen isn't the one edited, 'off' not until the next slideshow.
    liveEdits: 'now',
  };

  let values = { ...DEFAULTS };
  const ready = chrome.storage.sync.get(DEFAULTS).then((stored) => {
    values = stored;
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (key in DEFAULTS) values[key] = newValue ?? DEFAULTS[key];
    }
  });

  globalThis.slidesCompanion ??= {};
  globalThis.slidesCompanion.settings = {
    ready,
    get: (key) => values[key],
    set: (entries) => {
      Object.assign(values, entries);
      return chrome.storage.sync.set(entries);
    },
  };
}

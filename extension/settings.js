// User settings, saved with chrome.storage.sync so they follow the user to other computers.
// Other scripts read them through `slidesCompanion.settings`.
{
  const DEFAULTS = {
    // Spotlight: 'together' shows a group as one image, 'apart' shows each image in it on its own.
    groupedImages: 'together',
    // During a slideshow, clicking an image shows it full screen; off, the click changes slide.
    spotlightOnClick: true,
    // What scrolling over a slide does. During a slideshow: 'zoom' zooms into it, 'nothing' does
    // nothing, 'slides' goes to the next or previous slide as Slides does. While editing: 'slides'
    // or 'nothing'.
    slideshowScroll: 'zoom',
    editorScroll: 'slides',
    // What the pen draws in a slideshow shows again the next time the deck is presented. Off, as in
    // Slides, the pen's ink goes when the slideshow ends.
    keepInk: false,
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

// User settings, saved with chrome.storage.sync so they follow the user to other computers.
// Other scripts read them through `slidesCompanion.settings`.
{
  const DEFAULTS = {
    // Spotlight: 'together' shows a group as one image, 'apart' shows each image in it on its own.
    groupedImages: 'together',
    // During a slideshow, a click on an image: 'spotlight' shows it full screen, 'next' changes slide.
    slideshowImageClick: 'spotlight',
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

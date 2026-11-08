// Dev auto-reload, loaded by background.js; the release build (npm run build) leaves it out.
// `npm run dev` rewrites dev-stamp.txt whenever a file in extension/ changes; this polls it,
// reloads the extension, then reloads open Slides tabs so they get the new content script.
// Store installs have an update_url, so this never runs there.
const isUnpacked = !('update_url' in chrome.runtime.getManifest());

if (isUnpacked) {
  // Unpacked extensions are exempt from the 30-second alarm minimum.
  chrome.alarms.create('dev-reload', { periodInMinutes: 1 / 60 });

  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== 'dev-reload') return;

    let stamp;
    try {
      const response = await fetch(chrome.runtime.getURL('dev-stamp.txt'), { cache: 'no-store' });
      if (!response.ok) return;
      stamp = (await response.text()).trim();
    } catch {
      return; // No watcher running.
    }

    const { devStamp } = await chrome.storage.local.get('devStamp');
    if (devStamp === stamp) return;

    await chrome.storage.local.set({ devStamp: stamp, devReloadTabs: devStamp !== undefined });
    if (devStamp !== undefined) chrome.runtime.reload();
  });

  // storage.local survives the reload (storage.session does not).
  chrome.storage.local.get('devReloadTabs').then(async ({ devReloadTabs }) => {
    if (!devReloadTabs) return;
    await chrome.storage.local.set({ devReloadTabs: false });
    const tabs = await chrome.tabs.query({ url: 'https://docs.google.com/presentation/*' });
    for (const tab of tabs) chrome.tabs.reload(tab.id);
  });
}

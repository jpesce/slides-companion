// Dev auto-reload. `npm run dev` rewrites dev-stamp.txt whenever a file in extension/
// changes; this polls it, reloads the extension, then reloads open Slides tabs so they
// get the new content script. Store installs have an update_url, so this never runs there.
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

// Every site opens over the slide (card 56), once the presenter lets it from Settings, which asks
// Chrome for access to every site. While a page is open over a slide, the tab's frames lose the
// headers sites use to refuse being shown inside another page. page.js runs in that page to hand
// Esc back to the slideshow and say where it is.
const ALL_SITES = { origins: ['*://*/*'] };
const PAGE_SCRIPT = { id: 'page', matches: ['*://*/*'], js: ['page.js'], allFrames: true, runAt: 'document_start' };

// One at a time: registering the same script twice fails.
let pageScriptSync = Promise.resolve();
function syncPageScript() {
  pageScriptSync = pageScriptSync.then(async () => {
    const granted = await chrome.permissions.contains(ALL_SITES);
    const registered = (await chrome.scripting.getRegisteredContentScripts({ ids: [PAGE_SCRIPT.id] })).length > 0;
    if (granted && !registered) await chrome.scripting.registerContentScripts([PAGE_SCRIPT]);
    if (!granted && registered) await chrome.scripting.unregisterContentScripts({ ids: [PAGE_SCRIPT.id] });
  }).catch(() => {});
  return pageScriptSync;
}
syncPageScript();
chrome.permissions.onAdded.addListener(syncPageScript);
chrome.permissions.onRemoved.addListener(syncPageScript);

// Spotlight checks whether a site refuses to be shown inside another page (card 130) from a "not
// found" page of Slides' site, at an address only it asks for; Slides' pages let objects load only
// from Slides itself, and this one, without its rules, lets the check load the site. Dynamic rules
// have their own ids, apart from the tabs' session rules below.
const CHECK_PAGE_RULE = {
  id: 1,
  action: { type: 'modifyHeaders', responseHeaders: [{ header: 'content-security-policy', operation: 'remove' }] },
  // Only that address (nothing in it can be chosen by a page), and only in Slides' own pages.
  condition: {
    urlFilter: '|https://docs.google.com/presentation/slides-companion-check|',
    resourceTypes: ['sub_frame'],
    initiatorDomains: ['docs.google.com'],
  },
};
const checkPageRule = chrome.declarativeNetRequest
  .updateDynamicRules({ removeRuleIds: [CHECK_PAGE_RULE.id], addRules: [CHECK_PAGE_RULE] })
  .catch(() => {});

// A session rule per tab, its id the tab's.
const frameHeadersRule = (tabId) => ({
  id: tabId,
  action: {
    type: 'modifyHeaders',
    responseHeaders: [
      { header: 'x-frame-options', operation: 'remove' },
      { header: 'content-security-policy', operation: 'remove' },
    ],
  },
  // Slides' own frames (the slideshow) keep theirs.
  condition: { tabIds: [tabId], resourceTypes: ['sub_frame'], excludedRequestDomains: ['docs.google.com'] },
});
const dropFrameHeadersRule = (tabId) => chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [tabId] });
chrome.tabs.onRemoved.addListener((tabId) => dropFrameHeadersRule(tabId).catch(() => {}));

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  const tabId = sender.tab?.id;
  if (tabId === undefined) return;
  switch (message?.type) {
    // spotlight.js is about to show a page: it waits for the answer (whether every site can be
    // shown) so the page loads with the rules in place (this tab's, or the check's), and page.js in
    // it, if every site was only just allowed (card 130).
    case 'page-open':
      Promise.all([syncPageScript(), checkPageRule]).then(() => chrome.permissions.contains(ALL_SITES)).then(async (allSites) => {
        if (allSites) {
          await chrome.declarativeNetRequest
            .updateSessionRules({ removeRuleIds: [tabId], addRules: [frameHeadersRule(tabId)] })
            .catch(() => {});
        }
        respond({ allSites });
      });
      return true;
    case 'page-closed':
      dropFrameHeadersRule(tabId).catch(() => {});
      return;
    // From page.js, for spotlight.js in whichever of the tab's frames shows the page.
    case 'page-key':
    case 'page-address':
      chrome.tabs.sendMessage(tabId, { ...message, frameId: sender.frameId }).catch(() => {});
      return;
    // From spotlight.js, for page.js: go to another page (Back, Forward).
    case 'page-go':
      chrome.tabs.sendMessage(tabId, message, { frameId: message.frameId }).catch(() => {});
      return;
  }
});

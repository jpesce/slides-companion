// Dev auto-reload (dev-reload.js), for the unpacked extension. The release build (npm run build)
// drops this line and that file, with the alarms permission only it uses.
importScripts('dev-reload.js');

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

// Whether an address is a PDF, asked of its site (card 170), for spotlight.js to show it in Google's
// viewer: only with every site allowed, which lets the extension ask any site. Without the
// presenter's cookies, as Google's viewer will fetch it. A GET stops at the headers, for sites that
// don't answer HEAD. Null when the site doesn't say.
const TYPE_WAIT_MS = 3000;
async function isPdf(href) {
  if (!(await chrome.permissions.contains(ALL_SITES))) return null;
  const typeOf = async (method) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TYPE_WAIT_MS);
    try {
      const response = await fetch(href, { method, credentials: 'omit', cache: 'no-store', signal: controller.signal });
      return response.ok ? (response.headers.get('content-type') ?? '') : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  };
  const type = (await typeOf('HEAD')) ?? (await typeOf('GET'));
  return type === null ? null : /^application\/pdf\b/i.test(type);
}

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
    case 'page-type':
      isPdf(message.href).then((pdf) => respond({ pdf }));
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

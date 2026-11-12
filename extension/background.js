// Dev auto-reload (dev-reload.js), for the unpacked extension. The release build (npm run build)
// drops this line and that file, with the alarms permission only it uses.
importScripts('dev-reload.js');

// Every site opens over the slide, once the presenter lets it from Settings, which asks
// Chrome for access to every site. While a page is open over a slide, the tab's frames lose the
// headers sites use to refuse being shown inside another page. page.js runs in that page to hand
// Esc back to the slideshow and say where it is.
const ALL_SITES = { origins: ['*://*/*'] };
const PAGE_SCRIPT = {
  id: 'page',
  matches: ['*://*/*'],
  js: ['page.js'],
  allFrames: true,
  runAt: 'document_start',
};

// One at a time: registering the same script twice fails.
let pageScriptSync = Promise.resolve();
function syncPageScript() {
  pageScriptSync = pageScriptSync
    .then(async () => {
      const granted = await chrome.permissions.contains(ALL_SITES);
      const registered =
        (await chrome.scripting.getRegisteredContentScripts({ ids: [PAGE_SCRIPT.id] })).length > 0;
      if (granted && !registered) await chrome.scripting.registerContentScripts([PAGE_SCRIPT]);
      if (!granted && registered)
        await chrome.scripting.unregisterContentScripts({ ids: [PAGE_SCRIPT.id] });
    })
    .catch(() => {});
  return pageScriptSync;
}
syncPageScript();
chrome.permissions.onAdded.addListener(syncPageScript);
chrome.permissions.onRemoved.addListener(syncPageScript);

// Spotlight checks whether a site refuses to be shown inside another page from a "not
// found" page of Slides' site, at an address only it asks for; Slides' pages let objects load only
// from Slides itself, and this one, without its rules, lets the check load the site. Dynamic rules
// have their own ids, apart from the tabs' session rules below.
const CHECK_PAGE_RULE = {
  id: 1,
  action: {
    type: 'modifyHeaders',
    responseHeaders: [{ header: 'content-security-policy', operation: 'remove' }],
  },
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
  condition: {
    tabIds: [tabId],
    resourceTypes: ['sub_frame'],
    excludedRequestDomains: ['docs.google.com'],
  },
});
const dropFrameHeadersRule = (tabId) =>
  chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [tabId] });
chrome.tabs.onRemoved.addListener((tabId) => dropFrameHeadersRule(tabId).catch(() => {}));

// Whether an address is a PDF, asked of its site, for spotlight.js to show it in Google's
// viewer: only with every site allowed, which lets the extension ask any site. Without the
// presenter's cookies, as Google's viewer will fetch it. A GET stops at the headers, for sites that
// don't answer HEAD. Null when the site doesn't say.
//
// Asked over https, so nobody on the way sees the address or changes the answer, and it's one trip
// rather than two for the many sites that send http on to https. Over http only when an http
// address's site can't be reached over https at all (old servers), as the viewer would fetch it.
const TYPE_WAIT_MS = 3000;
async function isPdf(href) {
  let address;
  try {
    address = new URL(href);
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(address.protocol)) return null;
  if (!(await chrome.permissions.contains(ALL_SITES))) return null;
  // The response's type; null when the site answered without saying, undefined when it couldn't
  // be reached.
  const typeOf = async (url, method) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TYPE_WAIT_MS);
    try {
      const response = await fetch(url, {
        method,
        credentials: 'omit',
        cache: 'no-store',
        signal: controller.signal,
      });
      return response.ok ? (response.headers.get('content-type') ?? '') : null;
    } catch {
      return undefined;
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  };
  const ask = async (url) => {
    const head = await typeOf(url, 'HEAD');
    return head === null ? await typeOf(url, 'GET') : head;
  };
  const secure = new URL(address);
  secure.protocol = 'https:';
  let type = await ask(secure.href);
  if (type === undefined && address.protocol === 'http:') type = await ask(address.href);
  return type === null || type === undefined ? null : /^application\/pdf\b/i.test(type);
}

// The extension's button in the browser's toolbar opens Settings, so they're there even with the
// companion hidden. Only Slides' editor can show them, so the button is off everywhere, its title
// saying where to go (the manifest's default_title), and settings-dialog.js turns it on in its own
// tab as it loads, titled in Slides' language. Chrome drops a tab's own button state when the tab
// loads another page, which turns it off again there. Turned off each time the worker starts (a
// tab's own state wins over it), as turning the extension off and on fires neither onInstalled
// nor onStartup; the two listeners start the worker at those moments.
const buttonOffEverywhere = () => chrome.action.disable().catch(() => {});
buttonOffEverywhere();
chrome.runtime.onInstalled.addListener(buttonOffEverywhere);
chrome.runtime.onStartup.addListener(buttonOffEverywhere);
// A function declaration, so it's on the worker's global object, where the tests can call it.
function openSettingsIn(tabId) {
  return chrome.tabs.sendMessage(tabId, { type: 'settings-open' }, { frameId: 0 }).catch(() => {});
}
chrome.action.onClicked.addListener((tab) => openSettingsIn(tab.id));

// What each part of the extension asks, by who may ask it: spotlight.js and settings-dialog.js, in
// Slides' pages, and page.js, in a page shown over the slide (a frame, never a tab's own page).
// page.js runs on every site, so a site can't use it to ask for anything else.
const FROM_SLIDES = new Set(['page-open', 'page-type', 'page-closed', 'page-go', 'settings-here']);
const FROM_PAGE = new Set(['page-key', 'page-address']);
const SLIDES_ORIGIN = 'https://docs.google.com';

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  const tabId = sender.tab?.id;
  if (tabId === undefined) return;
  if (
    FROM_SLIDES.has(message?.type)
      ? sender.origin !== SLIDES_ORIGIN
      : !FROM_PAGE.has(message?.type) || sender.frameId === 0
  )
    return;
  switch (message.type) {
    // spotlight.js is about to show a page: it waits for the answer (whether every site can be
    // shown) so the page loads with the rules in place (this tab's, or the check's), and page.js in
    // it, if every site was only just allowed.
    case 'page-open':
      Promise.all([syncPageScript(), checkPageRule])
        .then(() => chrome.permissions.contains(ALL_SITES))
        .then(async (allSites) => {
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
    // From settings-dialog.js, in the editor: this tab can show Settings.
    case 'settings-here':
      if (sender.frameId !== 0) return;
      chrome.action.enable(tabId).catch(() => {});
      chrome.action.setTitle({ tabId, title: String(message.title).slice(0, 100) }).catch(() => {});
      return;
  }
});

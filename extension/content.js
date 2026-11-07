// Marks the page so tests and tools can tell the extension is running, and which build.
document.documentElement.dataset.slidesCompanion = chrome.runtime.getManifest().version;

// Whether a key goes into something typed in (a search box, a comment), where our keys must leave it be.
globalThis.slidesCompanion ??= {};
globalThis.slidesCompanion.isTyping = (event) =>
  event.target instanceof Element && (Boolean(event.target.closest('input, textarea, select')) || event.target.isContentEditable);

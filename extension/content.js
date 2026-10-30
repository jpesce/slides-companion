// Marks the page so tests and tools can tell the extension is running, and which build.
document.documentElement.dataset.slidesCompanion = chrome.runtime.getManifest().version;

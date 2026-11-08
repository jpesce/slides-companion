// Watches extension/ and rewrites extension/dev-stamp.txt on every change.
// The unpacked extension polls that file and reloads itself (see extension/dev-reload.js).
// A change to _locales also writes extension/messages.js afresh (scripts/build-messages.mjs).
import { watch, writeFileSync } from 'node:fs';
import path from 'node:path';
import { build as buildMessages } from './build-messages.mjs';

const extensionDir = path.resolve(import.meta.dirname, '../extension');
const stampFile = path.join(extensionDir, 'dev-stamp.txt');

let timer;
function touch(reason) {
  clearTimeout(timer);
  timer = setTimeout(() => {
    writeFileSync(stampFile, String(Date.now()));
    console.log(`[dev] ${new Date().toLocaleTimeString()} reload: ${reason}`);
  }, 150);
}

touch('watcher started');
watch(extensionDir, { recursive: true }, (_event, file) => {
  if (!file || path.basename(file) === 'dev-stamp.txt') return;
  // Chrome's own files, written when it loads the extension: reloading for them would loop.
  if (file.startsWith('_metadata')) return;
  if (file.startsWith(`_locales${path.sep}`)) {
    try {
      buildMessages();
    } catch (error) {
      console.log(`[dev] messages not written: ${error.message}`);
    }
  }
  touch(file);
});
console.log(`[dev] watching ${extensionDir}`);

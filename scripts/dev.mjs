// Watches extension/ and rewrites extension/dev-stamp.txt on every change.
// The unpacked extension polls that file and reloads itself (see extension/background.js).
import { watch, writeFileSync } from 'node:fs';
import path from 'node:path';

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
  if (file && path.basename(file) !== 'dev-stamp.txt') touch(file);
});
console.log(`[dev] watching ${extensionDir}`);

// The release build (`npm run build`, `make build`): the extension as the Chrome Web Store gets it.
// Copies extension/ to build/slides-companion/, without the dev auto-reload (dev-reload.js, its line
// in background.js and the alarms permission only it uses), and zips that for upload, as
// build/slides-companion-v<version>.zip. Tests can run on the copy: EXTENSION_PATH=build/slides-companion.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { render as renderMessages } from './build-messages.mjs';

const root = path.resolve(import.meta.dirname, '..');
const source = path.join(root, 'extension');
const BUILD_DIR = path.join(root, 'build');

// Files that are only for working on the extension.
const DEV_FILES = new Set(['dev-reload.js', 'dev-stamp.txt', '_metadata', '.DS_Store']);
const DEV_LINE = "importScripts('dev-reload.js');";
const LICENSE_FILES = ['LICENSE', 'THIRD-PARTY-NOTICES.txt'];
// Permissions only the dev auto-reload uses.
const DEV_PERMISSIONS = ['alarms'];

const fail = (message) => {
  throw new Error(`Build stopped: ${message}`);
};

// Into `buildDir` (build/, or elsewhere for a test).
export function build({ buildDir = BUILD_DIR } = {}) {
  const outDir = path.join(buildDir, 'slides-companion');
  // messages.js is made from _locales and checked in; a stale one would ship old words.
  if (fs.readFileSync(path.join(source, 'messages.js'), 'utf8') !== renderMessages()) {
    fail(
      'extension/messages.js is out of date with _locales. Run `npm run messages` and commit it.',
    );
  }

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.cpSync(source, outDir, {
    recursive: true,
    filter: (file) => !DEV_FILES.has(path.basename(file)),
  });
  // The licenses travel with the package: ours (GPLv3) and the icons' (Apache 2.0).
  for (const file of LICENSE_FILES) fs.copyFileSync(path.join(root, file), path.join(outDir, file));

  // background.js loads the dev auto-reload in one line, with the comment above it.
  const backgroundPath = path.join(outDir, 'background.js');
  const background = fs.readFileSync(backgroundPath, 'utf8');
  const devBlock = new RegExp(
    `^(?://.*\\n)*${DEV_LINE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n\\n?`,
    'm',
  );
  if (!devBlock.test(background))
    fail(`background.js no longer has the line ${DEV_LINE}; update scripts/build.mjs.`);
  fs.writeFileSync(backgroundPath, background.replace(devBlock, ''));

  const manifestPath = path.join(outDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  for (const permission of DEV_PERMISSIONS) {
    if (!manifest.permissions.includes(permission))
      fail(`the manifest no longer asks for ${permission}; update scripts/build.mjs.`);
  }
  manifest.permissions = manifest.permissions.filter(
    (permission) => !DEV_PERMISSIONS.includes(permission),
  );
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  // Nothing left that mentions the dev files.
  const leftovers = fs
    .readdirSync(outDir, { recursive: true })
    .filter((file) => /\.(js|json|html|css)$/.test(file) && !file.startsWith('_locales'))
    .filter((file) =>
      /dev-reload|dev-stamp|chrome\.alarms/.test(fs.readFileSync(path.join(outDir, file), 'utf8')),
    );
  if (leftovers.length) fail(`dev code is still in ${leftovers.join(', ')}.`);

  const zip = path.join(buildDir, `slides-companion-v${manifest.version}.zip`);
  fs.rmSync(zip, { force: true });
  // -X leaves out macOS's extra file attributes.
  execFileSync('zip', ['-r', '-X', '-q', zip, '.'], { cwd: outDir });
  return { manifest, outDir, zip };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { manifest, outDir, zip } = build();
    console.log(
      `Built ${manifest.version} in ${path.relative(root, outDir)}/ and ${path.relative(root, zip)}`,
    );
    console.log(`Permissions: ${manifest.permissions.join(', ')}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

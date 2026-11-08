// Helpers for the makefile's release steps.
//   node scripts/release.mjs version          the version in extension/manifest.json
//   node scripts/release.mjs bump <part>      raises it (major, minor or patch) and starts its
//                                             section in CHANGELOG.md
//   node scripts/release.mjs notes <version>  that version's section of CHANGELOG.md, for its tag
//                                             and GitHub release; fails while it's missing or
//                                             still says "Unreleased"
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const MANIFEST = new URL('../extension/manifest.json', import.meta.url);
const CHANGELOG = new URL('../CHANGELOG.md', import.meta.url);
const UNRELEASED = 'Unreleased';

export const version = () => JSON.parse(fs.readFileSync(MANIFEST, 'utf8')).version;

// A version's section: from its "## v1.2.3 - date" heading to the next "## ".
function section(text, number) {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => new RegExp(`^## v${number.replaceAll('.', '\\.')}(\\s|$)`).test(line));
  if (start < 0) return null;
  const end = lines.findIndex((line, index) => index > start && line.startsWith('## '));
  return { heading: lines[start], body: lines.slice(start + 1, end < 0 ? undefined : end).join('\n').trim() };
}

export function notes(number, text = fs.readFileSync(CHANGELOG, 'utf8')) {
  const found = section(text, number);
  if (!found) throw new Error(`CHANGELOG.md has no section for v${number}. Add "## v${number} - YYYY-MM-DD" with what changed.`);
  if (found.heading.includes(UNRELEASED)) throw new Error(`CHANGELOG.md still says v${number} is ${UNRELEASED}: put today's date in its heading.`);
  if (!found.body || /^-\s*$/m.test(found.body)) throw new Error(`CHANGELOG.md's section for v${number} has an empty line to fill in.`);
  return found.body;
}

export function bumped(number, part) {
  const [major, minor, patch] = number.split('.').map(Number);
  if (part === 'major') return `${major + 1}.0.0`;
  if (part === 'minor') return `${major}.${minor + 1}.0`;
  if (part === 'patch') return `${major}.${minor}.${patch + 1}`;
  throw new Error(`Bump major, minor or patch, not "${part}".`);
}

function bump(part) {
  const from = version();
  const to = bumped(from, part);
  const manifest = fs.readFileSync(MANIFEST, 'utf8');
  // Only the version line changes, so the manifest keeps its layout.
  fs.writeFileSync(MANIFEST, manifest.replace(`"version": "${from}"`, `"version": "${to}"`));
  const changelog = fs.readFileSync(CHANGELOG, 'utf8');
  if (!section(changelog, to)) {
    const at = changelog.search(/^## /m);
    const entry = `## v${to} - ${UNRELEASED}\n\n- \n\n`;
    fs.writeFileSync(CHANGELOG, at < 0 ? `${changelog.trimEnd()}\n\n${entry}` : changelog.slice(0, at) + entry + changelog.slice(at));
  }
  return to;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [command, argument] = process.argv.slice(2);
  try {
    if (command === 'version') console.log(version());
    else if (command === 'notes') console.log(notes(argument ?? version()));
    else if (command === 'bump') console.log(bump(argument));
    else throw new Error('Use: version, bump <major|minor|patch>, or notes [version].');
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

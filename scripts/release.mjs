// Helpers for the makefile's release steps.
//   node scripts/release.mjs version          the version in extension/manifest.json
//   node scripts/release.mjs bump <part>      raises it (major, minor or patch) and starts its
//                                             section in CHANGELOG.md
//   node scripts/release.mjs notes <version>  that version's section of CHANGELOG.md, for its tag
//                                             and GitHub release; fails while it's missing or
//                                             still says "Unreleased"
//   node scripts/release.mjs testing          before `npm run test:build`'s tests: notes the commit
//   node scripts/release.mjs tested           after they pass: marks that commit as tested
//   node scripts/release.mjs ensure-tested    fails unless this commit passed them, for `make all`
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const MANIFEST = new URL('../extension/manifest.json', import.meta.url);
const CHANGELOG = new URL('../CHANGELOG.md', import.meta.url);
const UNRELEASED = 'Unreleased';

export const version = () => JSON.parse(fs.readFileSync(MANIFEST, 'utf8')).version;

// A version's section: from its "## v1.2.3 - date" heading to the next "## ".
export function section(text, number) {
  const lines = text.split('\n');
  const start = lines.findIndex((line) =>
    new RegExp(`^## v${number.replaceAll('.', '\\.')}(\\s|$)`).test(line),
  );
  if (start < 0) return null;
  const end = lines.findIndex((line, index) => index > start && line.startsWith('## '));
  return {
    heading: lines[start],
    body: lines
      .slice(start + 1, end < 0 ? undefined : end)
      .join('\n')
      .trim(),
  };
}

export function notes(number, text = fs.readFileSync(CHANGELOG, 'utf8')) {
  const found = section(text, number);
  if (!found)
    throw new Error(
      `CHANGELOG.md has no section for v${number}. Add "## v${number} - YYYY-MM-DD" with what changed.`,
    );
  if (found.heading.includes(UNRELEASED))
    throw new Error(
      `CHANGELOG.md still says v${number} is ${UNRELEASED}: put today's date in its heading.`,
    );
  if (!found.body || /^-\s*$/m.test(found.body))
    throw new Error(`CHANGELOG.md's section for v${number} has an empty line to fill in.`);
  return found.body;
}

export function bumped(number, part) {
  const [major, minor, patch] = number.split('.').map(Number);
  if (part === 'major') return `${major + 1}.0.0`;
  if (part === 'minor') return `${major}.${minor + 1}.0`;
  if (part === 'patch') return `${major}.${minor}.${patch + 1}`;
  throw new Error(`Bump major, minor or patch, not "${part}".`);
}

// The manifest with only its version line changed, so it keeps its layout.
export function withVersion(manifest, from, to) {
  const line = `"version": "${from}"`;
  if (!manifest.includes(line))
    throw new Error(`extension/manifest.json has no ${line} line to change.`);
  return manifest.replace(line, `"version": "${to}"`);
}

// The changelog with a section started for the version, above the newest one, unless it has one.
export function withSection(changelog, number) {
  if (section(changelog, number)) return changelog;
  const at = changelog.search(/^## /m);
  const entry = `## v${number} - ${UNRELEASED}\n\n- \n\n`;
  return at < 0
    ? `${changelog.trimEnd()}\n\n${entry}`
    : changelog.slice(0, at) + entry + changelog.slice(at);
}

function bump(part) {
  const from = version();
  const to = bumped(from, part);
  fs.writeFileSync(MANIFEST, withVersion(fs.readFileSync(MANIFEST, 'utf8'), from, to));
  fs.writeFileSync(CHANGELOG, withSection(fs.readFileSync(CHANGELOG, 'utf8'), to));
  return to;
}

// `make all` releases only a commit whose build passed every test. `npm run test:build` notes the
// commit before its tests and marks it once they pass, if nothing changed in between.
const PENDING = new URL('../build/.testing', import.meta.url);
const tested = (number) => new URL(`../build/.tested-${number}`, import.meta.url);
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const committed = () => (git('status', '--porcelain') ? null : git('rev-parse', 'HEAD'));

function testing() {
  fs.rmSync(PENDING, { force: true });
  const commit = committed();
  if (!commit) return "Uncommitted changes: this run won't count for a release.";
  fs.writeFileSync(PENDING, commit);
  return `Testing ${commit.slice(0, 7)}.`;
}

function markTested() {
  const commit = fs.existsSync(PENDING) ? fs.readFileSync(PENDING, 'utf8') : null;
  fs.rmSync(PENDING, { force: true });
  if (!commit || commit !== committed())
    return 'Not marked as tested: the code changed during the run, or had uncommitted changes.';
  fs.writeFileSync(tested(version()), commit);
  return `Marked ${commit.slice(0, 7)} as tested for v${version()}.`;
}

function ensureTested() {
  const number = version();
  const file = tested(number);
  const commit = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  if (!commit || commit !== committed()) {
    throw new Error(
      `v${number} hasn't passed the tests on its build at this commit. Run \`make test-build\` (about 20 minutes) first.`,
    );
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [command, argument] = process.argv.slice(2);
  try {
    if (command === 'version') console.log(version());
    else if (command === 'notes') console.log(notes(argument ?? version()));
    else if (command === 'bump') console.log(bump(argument));
    else if (command === 'testing') console.log(testing());
    else if (command === 'tested') console.log(markTested());
    else if (command === 'ensure-tested') ensureTested();
    else
      throw new Error(
        'Use: version, bump <major|minor|patch>, notes [version], testing, tested or ensure-tested.',
      );
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

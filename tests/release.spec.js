import { test, expect } from '@playwright/test';
import { bumped, notes, section, withSection, withVersion } from '../scripts/release.mjs';

// The release steps' helpers (scripts/release.mjs), which decide a release's version and notes.
// They need no browser.

const CHANGELOG = `# Changelog

Intro.

## v1.2.0 - 2026-11-09

- A change.
- Another.

## v1.1.0 - 2026-10-01

- An older change.
`;

test('a bump raises the right part of the version', () => {
  expect(bumped('1.2.3', 'major')).toBe('2.0.0');
  expect(bumped('1.2.3', 'minor')).toBe('1.3.0');
  expect(bumped('1.2.3', 'patch')).toBe('1.2.4');
  expect(() => bumped('1.2.3', 'huge')).toThrow('major, minor or patch');
});

test("a version's notes are its section, up to the next version", () => {
  expect(notes('1.2.0', CHANGELOG)).toBe('- A change.\n- Another.');
  expect(notes('1.1.0', CHANGELOG)).toBe('- An older change.');
  // 1.2 isn't 1.2.0, and a dot isn't any character.
  expect(section(CHANGELOG, '1.2')).toBeNull();
  expect(section(CHANGELOG, '1x2x0')).toBeNull();
});

test("notes refuse a version that's missing, undated or has an empty line", () => {
  expect(() => notes('9.9.9', CHANGELOG)).toThrow('no section for v9.9.9');
  expect(() => notes('1.3.0', withSection(CHANGELOG, '1.3.0'))).toThrow('Unreleased');
  const undatedFilledIn = withSection(CHANGELOG, '1.3.0').replace('Unreleased', '2026-12-01');
  expect(() => notes('1.3.0', undatedFilledIn)).toThrow('empty line');
});

test('a bump starts a section above the newest, once', () => {
  const started = withSection(CHANGELOG, '1.3.0');
  expect(started.indexOf('## v1.3.0 - Unreleased')).toBeLessThan(started.indexOf('## v1.2.0'));
  expect(started.startsWith('# Changelog\n\nIntro.\n\n## v1.3.0')).toBe(true);
  expect(withSection(started, '1.3.0')).toBe(started);
  expect(withSection('# Changelog\n', '0.1.0')).toBe('# Changelog\n\n## v0.1.0 - Unreleased\n\n- \n\n');
});

test("a bump changes only the manifest's version, and fails when it can't find it", () => {
  const manifest = '{\n  "name": "x",\n  "version": "1.2.0",\n  "other": "1.2.0"\n}\n';
  expect(withVersion(manifest, '1.2.0', '1.3.0')).toBe('{\n  "name": "x",\n  "version": "1.3.0",\n  "other": "1.2.0"\n}\n');
  expect(() => withVersion('{"version":"1.2.0"}', '1.2.0', '1.3.0')).toThrow('no "version": "1.2.0" line');
});

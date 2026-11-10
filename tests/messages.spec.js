import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { readLocales, render, resolve, DEFAULT_LOCALE } from '../scripts/build-messages.mjs';

// Our words live in extension/_locales; content scripts read them from messages.js, made from them.
test('messages.js is made from the messages in _locales (npm run messages)', () => {
  expect(fs.readFileSync(new URL('../extension/messages.js', import.meta.url), 'utf8')).toBe(
    render(),
  );
});

test('every language has every message, with the same places for what goes in it', () => {
  const locales = readLocales();
  const places = (entry) => resolve(entry).match(/\$\d/g)?.sort() ?? [];
  const ours = locales[DEFAULT_LOCALE];
  for (const [locale, messages] of Object.entries(locales)) {
    expect(Object.keys(messages).sort(), locale).toEqual(Object.keys(ours).sort());
    for (const [key, entry] of Object.entries(messages))
      expect(places(entry), `${locale} ${key}`).toEqual(places(ours[key]));
  }
});

// Each message is asked for somewhere (by its key, quoted, or in the manifest as __MSG_key__), and
// each key asked for has a message: a missing one would stop the feature that asks for it.
test('every message is used, and every message asked for exists', () => {
  const dir = new URL('../extension/', import.meta.url);
  const code = fs
    .readdirSync(dir)
    .filter((file) => /\.(js|html|json)$/.test(file) && file !== 'messages.js')
    .map((file) => fs.readFileSync(new URL(file, dir), 'utf8'))
    .join('\n');
  const keys = Object.keys(readLocales()[DEFAULT_LOCALE]);
  const unused = keys.filter(
    (key) =>
      !code.includes(`'${key}'`) && !code.includes(`"${key}"`) && !code.includes(`__MSG_${key}__`),
  );
  expect(unused).toEqual([]);
  const asked = [...code.matchAll(/\b(?:text|html|words|about|legend)\('(\w+)'/g)].map(
    ([, key]) => key,
  );
  expect(asked.length).toBeGreaterThan(20);
  expect(asked.filter((key) => !keys.includes(key))).toEqual([]);
});

// Chrome and the Web Store show our name and line under it in every language, within their limits
// (75 and 132 characters). The store finds extensions by name, so it says what we do, after our own
// name, and names Google Slides as Google asks of other makers: after "for", marked ™, never first.
test('our name and summary in the Web Store fit, in every language', () => {
  for (const [locale, messages] of Object.entries(readLocales())) {
    const name = resolve(messages.storeName);
    expect([...name].length, `${locale}: ${name}`).toBeLessThanOrEqual(75);
    expect(name.startsWith(resolve(messages.extensionName)), `${locale}: ${name}`).toBe(true);
    expect(name, locale).toContain('Google');
    expect(name, locale).toContain('™');
    expect([...resolve(messages.extensionDescription)].length, locale).toBeLessThanOrEqual(132);
  }
});

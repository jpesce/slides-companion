// Writes our words in each language, from extension/_locales/*/messages.json, to
// extension/messages.js (`npm run messages`; `npm run dev` runs it on every change to _locales).
// Content scripts can't ask chrome.i18n for a language other than the browser's, nor fetch the
// extension's own files, so they load the messages as a script (see extension/i18n.js).
//
// Each message is kept as Chrome writes it out: named placeholders ($COUNT$, a name starting with a
// letter) become what they stand for ($1, $2, …) and "$$" becomes "$".
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const LOCALES = new URL('../extension/_locales/', import.meta.url);
const OUT = new URL('../extension/messages.js', import.meta.url);
export const DEFAULT_LOCALE = 'en';

// Every language's messages, as in its messages.json.
export function readLocales() {
  return Object.fromEntries(
    fs
      .readdirSync(LOCALES)
      .filter((locale) => fs.existsSync(new URL(`${locale}/messages.json`, LOCALES)))
      .sort((a, b) => (a === DEFAULT_LOCALE ? -1 : b === DEFAULT_LOCALE ? 1 : a.localeCompare(b)))
      .map((locale) => [locale, JSON.parse(fs.readFileSync(new URL(`${locale}/messages.json`, LOCALES), 'utf8'))]),
  );
}

// A message as Chrome gives it, its placeholders put in.
export function resolve({ message, placeholders = {} }) {
  const named = Object.fromEntries(Object.entries(placeholders).map(([name, { content }]) => [name.toLowerCase(), content]));
  return message
    .replace(/\$([a-z_@][a-z0-9_@]*)\$/gi, (whole, name) => {
      if (!(name.toLowerCase() in named)) throw new Error(`No placeholder ${whole} in "${message}"`);
      return named[name.toLowerCase()];
    })
    .replaceAll('$$', '$');
}

export function render(locales = readLocales()) {
  const messages = Object.fromEntries(
    Object.entries(locales).map(([locale, entries]) => [
      locale,
      Object.fromEntries(Object.entries(entries).map(([key, entry]) => [key, resolve(entry)])),
    ]),
  );
  // A language a line, each read with JSON.parse: every Slides frame loads all of them, and a string
  // of JSON is quicker to read in than the same object written as code.
  const lines = Object.entries(messages).map(([locale, words]) => `  ${JSON.stringify(locale)}: JSON.parse(${JSON.stringify(JSON.stringify(words))}),`);
  return `// Made by scripts/build-messages.mjs (npm run messages) from _locales: change those, not this.
// Our words in each language, by message (see i18n.js).
globalThis.slidesCompanion ??= {};
globalThis.slidesCompanion.messages = {
${lines.join('\n')}
};
`;
}

export const build = () => fs.writeFileSync(OUT, render());

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  build();
  console.log(`Wrote ${OUT.pathname}`);
}

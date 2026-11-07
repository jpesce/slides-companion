// Our words in Slides' language rather than the browser's: each page of Slides names its language
// in <html lang>, and we speak ours closest to it, else English. The words come from _locales, made
// into messages.js (scripts/build-messages.mjs), as chrome.i18n speaks only the browser's language.
{
  const { messages } = globalThis.slidesCompanion;
  const FALLBACK = 'en';
  const ours = Object.keys(messages);
  const chosen = new Map();
  // Google names some languages by their old codes, or by region where Chrome names the script.
  const ALSO = { iw: 'he', ji: 'yi', in: 'id', tl: 'fil', nb: 'no', zh_hk: 'zh_tw', zh_mo: 'zh_tw', zh_hant: 'zh_tw', zh_hans: 'zh_cn' };
  // Presenter view's language, once known: its opener can close or move on while it stays open.
  let borrowed = '';

  // Presenter view is a blank page the slideshow writes, without a language: it speaks the
  // slideshow's, in its opener (the editor's frame, or a slideshow in a tab of its own).
  function slidesLanguage() {
    const own = document.documentElement?.lang;
    if (own || borrowed) return own || borrowed;
    try {
      const opener = window.opener.document;
      const slideshow = opener.querySelector('iframe.punch-present-iframe')?.contentDocument?.documentElement.lang;
      borrowed = slideshow || opener.documentElement.lang;
    } catch {}
    return borrowed;
  }

  // The same language as ours (pt-BR), the language alone (pt), another of its kind (pt-PT), or English.
  function ourLocale(language) {
    if (!chosen.has(language)) {
      let wanted = language.toLowerCase().replaceAll('-', '_');
      const also = Object.keys(ALSO).find((code) => wanted === code || wanted.startsWith(`${code}_`));
      if (also) wanted = ALSO[also];
      const base = wanted.split('_')[0];
      const find = (matches) => ours.find((locale) => matches(locale.toLowerCase()));
      chosen.set(
        language,
        find((locale) => locale === wanted) ?? find((locale) => locale === base) ?? find((locale) => locale.startsWith(`${base}_`)) ?? FALLBACK,
      );
    }
    return chosen.get(language);
  }

  // The language we speak here, as Intl names it ("pt-BR"), for numbers and durations to agree with
  // the words around them.
  globalThis.slidesCompanion.locale = () => ourLocale(slidesLanguage()).replaceAll('_', '-');

  // A message, with what goes in its places ($1, $2…) in order.
  const text = (key, ...values) => {
    const message = messages[ourLocale(slidesLanguage())][key] ?? messages[FALLBACK][key];
    if (message === undefined) throw new Error(`No message ${key}`);
    return message.replace(/\$(\d)/g, (_, n) => values[n - 1] ?? '');
  };
  globalThis.slidesCompanion.text = text;

  // The same, safe to write into HTML: a translation may hold quotes, or "&".
  globalThis.slidesCompanion.html = (key, ...values) =>
    text(key, ...values).replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);
}

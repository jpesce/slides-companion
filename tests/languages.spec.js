import { test, expect, deckUrl } from './fixtures.js';
import { readLocales, resolve } from '../scripts/build-messages.mjs';

// Every language we speak, in Slides set to it. Our words are that language's, each fits
// where it goes as English does, and the keys are named and pointed as Slides does there (right to
// left, ← is the next one). language.spec.js goes through each window in Portuguese.
const slide = `${deckUrl}#slide=id.g35a1872bb6d_1_0`;
const RIGHT_IMAGE = '#workspace [id="editor-g35a1872bb6d_1_3"] image';
const SLIDES = 'appsElementsKeyboardShortcutsDialog';

// Our folder's name for each language, as Slides names it in its address (hl).
const SLIDES_CODE = { he: 'iw', es_419: 'es-419', pt_BR: 'pt-BR', pt_PT: 'pt-PT', zh_CN: 'zh-CN', zh_TW: 'zh-TW' };
const RIGHT_TO_LEFT = ['ar', 'he'];
const locales = readLocales();
const words = (locale) => Object.fromEntries(Object.entries(locales[locale]).map(([key, entry]) => [key, resolve(entry)]));

for (const locale of Object.keys(locales).filter((locale) => locale !== 'en')) {
  const hl = SLIDES_CODE[locale] ?? locale;
  const rightToLeft = RIGHT_TO_LEFT.includes(locale);

  test.describe(locale, () => {
    test.use({ slidesLanguage: hl });

    test(`Slides in ${hl}: our menus, Settings and shortcuts speak it, and fit`, async ({ context }) => {
      const say = words(locale);
      const text = (key, ...values) => say[key].replace(/\$(\d)/g, (_, n) => values[n - 1]);
      const page = await context.newPage();
      await page.goto(slide);
      await expect(page.locator(RIGHT_IMAGE)).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.lang)).toBe(hl);

      // A menu item of ours is on one line, as tall as Slides' items around it.
      const oneLine = async (item, slides) => {
        const [ours, theirs] = await Promise.all([item.evaluate((e) => e.offsetHeight), slides.evaluate((e) => e.offsetHeight)]);
        expect(ours, await item.textContent()).toBe(theirs);
      };

      // View, below Slides' "Show speaker notes", opened from the keyboard so access keys show: our
      // O is marked in our words, or written after them, "(O)", where they haven't it, as Slides
      // writes its own letters (Japanese "スピーカー ノートを表示(N)").
      await page.keyboard.press(process.platform === 'darwin' ? 'Control+Alt+v' : 'Alt+v');
      const notesItem = page.locator('.slides-companion-notes-menuitem');
      const notesWords = text('showFloatingNotes');
      const hasO = [...notesWords].some((character) => character.toLowerCase() === 'o');
      await expect(notesItem).toHaveText(hasO ? notesWords : `${notesWords}(O)`);
      await expect(notesItem.locator('.goog-menuitem-label')).toHaveAttribute('aria-label', `${notesWords} o`);
      await expect(notesItem.locator('.goog-menuitem-mnemonic-hint')).toHaveCSS('text-decoration-line', 'underline');
      // As tall as Slides' items written the same way ("(P)" after the words adds a pixel).
      const sameForm = hasO ? ':not(:has(.goog-menuitem-mnemonic-separator))' : ':has(.goog-menuitem-mnemonic-separator)';
      await oneLine(notesItem, page.locator(`.goog-menu:has(.slides-companion-notes-menuitem) > .goog-menuitem:not(.slides-companion-notes-menuitem):has(.goog-menuitem-label)${sameForm}:visible`).first());
      await page.keyboard.press('Escape');

      // The image's right-click menu.
      const box = await page.locator(RIGHT_IMAGE).first().boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' });
      const ours = page.locator('.slides-companion-spotlight-menuitem');
      await expect(ours.locator('.goog-menuitem-label')).toHaveText([text('spotlightMenuItem'), text('downloadImage')]);
      await expect(ours.locator('.goog-menuitem-accel')).toHaveText(text('spaceKey'));
      const slidesItem = ours.first().locator('xpath=..').locator('> .goog-menuitem:not(.slides-companion-spotlight-menuitem):has(.goog-menuitem-label)').first();
      for (const item of await ours.filter({ has: page.locator('.goog-menuitem-label') }).all()) await oneLine(item, slidesItem);
      await page.keyboard.press('Escape');

      // Settings: every feature's page, its name and the line under it inside its row, and nothing
      // wider than the dialog. Right to left, the list is on the right, as Slides lays out its own.
      const button = page.locator('.slides-companion-button');
      await expect(button).toHaveAttribute('aria-label', text('settingsLabel'));
      await button.click();
      const dialog = page.getByRole('dialog', { name: text('settingsLabel') });
      await expect(dialog.getByRole('heading').first()).toHaveText(text('settingsTitle'));
      for (const [name, summary] of [
        ['spotlightName', 'spotlightSummary'],
        ['linksName', 'linksSummary'],
        ['zoomName', 'zoomSummary'],
        ['penName', 'penSummary'],
        ['timerName', 'timerSummary'],
        ['liveEditsName', 'liveEditsSummary'],
      ]) {
        const tab = dialog.getByRole('tab', { name: text(name), exact: true });
        await expect(tab).toContainText(text(summary));
        await tab.click();
        const fits = await tab.evaluate((row) => {
          const words = row.querySelector('.slides-companion-settings-feature-text');
          const rowBox = row.getBoundingClientRect();
          const box = words.getBoundingClientRect();
          return { inRow: box.top >= rowBox.top && box.bottom <= rowBox.bottom, unbroken: words.scrollWidth <= words.clientWidth };
        });
        expect(fits, `${name} fits its row`).toEqual({ inRow: true, unbroken: true });
        const wide = await dialog.evaluate((element) => [...element.querySelectorAll('*')].filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'visible').map((e) => e.className));
        expect(wide, `${name}'s page has nothing too wide`).toEqual([]);
      }
      const [side, page_] = await Promise.all([
        dialog.locator('.slides-companion-settings-side').boundingBox(),
        dialog.locator('.slides-companion-dialog-text:visible').boundingBox(),
      ]);
      expect(side.x > page_.x, 'the list is on the right').toBe(rightToLeft);
      // The notice asking for every site is a page of ours, in a frame: in our language and its direction.
      const notice = page.frameLocator('.slides-companion-dialog-frame').locator('html');
      await expect(notice).toHaveAttribute('lang', locale.replaceAll('_', '-'));
      await expect(notice).toHaveAttribute('dir', rightToLeft ? 'rtl' : 'ltr');
      await dialog.getByRole('button', { name: text('cancel') }).click();

      // The Keyboard shortcuts dialog: our section's rows and keys, named as Slides names them here.
      await page.keyboard.press('ControlOrMeta+/');
      const section = page.locator('.slides-companion-shortcuts');
      await expect(section.locator(`.${SLIDES}CategoryLabel`)).toHaveText('Slides Companion');
      const rows = await section.locator(`tr:has(.${SLIDES}ShortcutName)`).evaluateAll((rows, SLIDES) =>
        rows.map((row) => [
          row.querySelector(`.${SLIDES}ShortcutName`).textContent,
          [...row.querySelector(`.${SLIDES}KeySequenceList`).childNodes].map((node) =>
            node.nodeType === Node.TEXT_NODE ? node.textContent.trim() : [...node.querySelectorAll('kbd')].map((key) => key.textContent),
          ),
        ]),
      SLIDES);
      const caps = (key) => text(key).split(' ');
      const [forward, back] = rightToLeft ? ['←', '→'] : ['→', '←'];
      expect(rows).toEqual([
        [text('shortcutSpotlight'), [caps('dialogKeySpace')]],
        [text('shortcutNextImage'), [[forward], text('shortcutOr'), ['↓']]],
        [text('shortcutPreviousImage'), [[back], text('shortcutOr'), ['↑']]],
        [text('shortcutFirstImage'), [caps('dialogKeyHome')]],
        [text('shortcutLastImage'), [caps('dialogKeyEnd')]],
        [text('shortcutCloseSpotlight'), [caps('dialogKeyEsc')]],
        [text('shortcutZoomIn'), [['+'], text('shortcutOr'), ['=']]],
        [text('shortcutZoomOut'), [['-']]],
        [text('shortcutFloatingNotes'), [[...caps('dialogKeyShift'), 'S']]],
        [text('shortcutClosePage'), [caps('dialogKeyEsc')]],
      ]);
      // "or" is the word Slides puts between its own keys.
      await expect(page.locator(`.${SLIDES}ShortcutTable:not(.slides-companion-shortcuts) .${SLIDES}KeySequenceList`).filter({ hasText: text('shortcutOr') }).first()).toBeAttached();
    });
  });
}

// Right to left, Slides goes forward with ← (its slideshow and its Keyboard shortcuts dialog say
// so), and mirrors its slideshow's bar. Spotlight does the same, in Hebrew and in Persian, which we
// don't speak yet: there our words are English, still with ← as next, and Settings reads left to right.
for (const [hl, locale] of [['iw', 'he'], ['fa', 'en']]) test.describe(`${hl}, right to left`, () => {
  test.use({ slidesLanguage: hl });

  test('Spotlight’s arrow keys and bar are mirrored, as Slides’ slideshow is', async ({ context }) => {
    const say = words(locale);
    const page = await context.newPage();
    await page.goto(slide);
    const image = page.locator(RIGHT_IMAGE).first();
    await expect(image).toBeVisible();
    const box = await image.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.keyboard.press('Space');
    const stage = page.locator('.slides-companion-spotlight');
    const status = stage.locator('.slides-companion-spotlight-status');
    const position = (index) => say.spotlightPosition.replace('$1', index).replace('$2', 2);
    await expect(status).toHaveText(position(2));
    await expect(stage).toHaveAttribute('dir', 'rtl');

    // → goes back, ← forward.
    await page.keyboard.press('ArrowRight');
    await expect(status).toHaveText(position(1));
    await page.keyboard.press('ArrowLeft');
    await expect(status).toHaveText(position(2));

    // Previous on the right, its chevron pointing right, as in Slides' bar.
    const [previous, next] = await Promise.all(
      ['previous', 'next'].map((name) => stage.locator(`.slides-companion-spotlight-${name}`).evaluate((button) => ({
        x: button.getBoundingClientRect().x,
        scale: getComputedStyle(button.querySelector('svg')).scale,
      }))),
    );
    expect(previous.x).toBeGreaterThan(next.x);
    expect([previous.scale, next.scale]).toEqual(['-1 1', '-1 1']);
    await expect(stage.locator('.slides-companion-spotlight-next')).toHaveAttribute('data-slides-companion-tip', say.spotlightNextTip.replace('$1', '←'));
    await expect(stage.locator('.slides-companion-spotlight-previous')).toHaveAttribute('data-slides-companion-tip', say.spotlightPreviousTip.replace('$1', '→'));
    await page.keyboard.press('Escape');

    // Settings is laid out in our words' direction.
    await page.locator('.slides-companion-button').click();
    await expect(page.locator('.slides-companion-dialog-root')).toHaveAttribute('dir', locale === 'he' ? 'rtl' : 'ltr');
  });
});

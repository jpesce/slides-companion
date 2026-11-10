import { test, expect, deckUrl } from './fixtures.js';

// Our keys in Slides' Keyboard shortcuts dialog (Help › Keyboard shortcuts, ⌘+/ or Ctrl+/).
// Slides' own words here are in the browser's language, ours in English (see fixtures.js).
const slide = `${deckUrl}#slide=id.g35a1872bb6d_1_0`;
const SLIDES = 'appsElementsKeyboardShortcutsDialog';
const dialogIn = (root) => root.locator(`[role="dialog"]:has(.${SLIDES}ContentContainer)`);
const ours = (dialog) => dialog.locator('.slides-companion-shortcuts');
const search = (dialog) => dialog.locator(`.${SLIDES}SearchInputField`);
const categories = (dialog) => dialog.locator(`.${SLIDES}CategoryLabel`);

// Each row as [what it does, its keys], the keys as read: "→ or ↓", "Shift S".
const rowsOf = (section) =>
  section.locator(`tr:has(.${SLIDES}ShortcutName)`).evaluateAll(
    (rows, SLIDES) =>
      rows.map((row) => [
        row.querySelector(`.${SLIDES}ShortcutName`).textContent,
        [...row.querySelector(`.${SLIDES}KeySequenceList`).childNodes]
          .map((node) =>
            node.nodeType === Node.TEXT_NODE
              ? node.textContent.trim()
              : [...node.querySelectorAll('kbd')].map((key) => key.textContent).join(' '),
          )
          .filter(Boolean)
          .join(' '),
      ]),
    SLIDES,
  );

const IN_SPOTLIGHT_AND_SLIDESHOW = [
  ['Next image in Spotlight', '→ or ↓'],
  ['Previous image in Spotlight', '← or ↑'],
  ['First image in Spotlight', 'Home'],
  ['Last image in Spotlight', 'End'],
  ['Close Spotlight', 'Esc'],
  ['Zoom in on the slide while presenting', '+ or ='],
  ['Zoom out while presenting', '-'],
  ['Open or close floating notes while presenting', 'Shift S'],
  ['Close a page opened over the slide', 'Esc'],
];

async function openEditorDialog(context) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(slide);
  await expect(page.locator('#workspace [id="editor-g35a1872bb6d_1_3"] image')).toBeVisible();
  await page.keyboard.press('ControlOrMeta+/');
  const dialog = dialogIn(page);
  await expect(ours(dialog)).toBeVisible();
  return { page, dialog, errors };
}

async function startSlideshow(context) {
  const page = await context.newPage();
  await page.goto(slide);
  await page.locator('#punch-start-presentation-left').click();
  const show = page.frameLocator('iframe.punch-present-iframe');
  await expect(show.locator('.punch-viewer-svgpage-a11yelement')).toHaveAttribute(
    'aria-label',
    /3/,
  );
  return { page, show };
}

// What makes a section look like Slides': its heading, a row's words and line, a key cap.
const looks = (section, SLIDES_) =>
  section.evaluate((table, SLIDES) => {
    const style = (selector, properties) => {
      const css = getComputedStyle(table.querySelector(selector));
      return properties.map((property) => css[property]);
    };
    return {
      heading: style(`.${SLIDES}CategoryLabel`, ['font', 'color']),
      headingCell: style('thead th', ['height', 'padding']),
      name: style(`.${SLIDES}ShortcutName`, ['font', 'color']),
      cell: style(`tbody th:has(.${SLIDES}ShortcutName)`, ['padding', 'borderBottom', 'width']),
      keys: style(`.${SLIDES}KeySequenceList`, [
        'display',
        'gap',
        'padding',
        'justifyContent',
        'font',
      ]),
      key: style('kbd', ['font', 'color', 'border', 'borderRadius', 'padding']),
    };
  }, SLIDES_);

test('Slides’ Keyboard shortcuts dialog lists our keys in a section like its own, after Slides’', async ({
  context,
}) => {
  const { page, dialog, errors } = await openEditorDialog(context);
  await expect(categories(dialog).last()).toHaveText('Slides Companion');
  expect(await categories(dialog).count()).toBeGreaterThan(1);
  expect(await rowsOf(ours(dialog))).toEqual([
    ['Spotlight the selected image', 'Space'],
    ...IN_SPOTLIGHT_AND_SLIDESHOW,
  ]);

  // Made from one of Slides' sections: the same type, keys and lines, and none under the last row.
  const slides = dialog.locator(`.${SLIDES}ShortcutTable:not(.slides-companion-shortcuts)`).first();
  expect(await looks(ours(dialog), SLIDES)).toEqual(await looks(slides, SLIDES));
  const lastCell = ours(dialog).locator(`tbody th:has(.${SLIDES}ShortcutName)`).last();
  await expect(lastCell).toHaveCSS('border-bottom-style', 'none');
  await expect(ours(dialog).locator('kbd', { hasText: /^S$/ })).toHaveAttribute('aria-label', 's');

  // A click on one of our rows is nobody's.
  await ours(dialog).getByText('Close Spotlight').click();
  await expect(ours(dialog)).toBeVisible();

  // The dialog is built anew each time it opens.
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await page.keyboard.press('ControlOrMeta+/');
  await expect(ours(dialog)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the dialog’s search finds our keys as it finds Slides’ own, from the start of a word', async ({
  context,
}) => {
  const { dialog } = await openEditorDialog(context);
  const notice = dialog.locator(`.${SLIDES}NoResultsNotice`);
  const highlighted = (section) =>
    section.locator(`.${SLIDES}ShortcutNameHighlight`).allTextContents();

  // Slides' zoom and ours.
  await search(dialog).fill('zoom');
  await expect(categories(dialog)).toHaveCount(2);
  await expect(categories(dialog).last()).toHaveText('Slides Companion');
  expect((await rowsOf(ours(dialog))).map(([name]) => name)).toEqual([
    'Zoom in on the slide while presenting',
    'Zoom out while presenting',
  ]);
  expect(await highlighted(ours(dialog))).toEqual(['Zoom', 'Zoom']);

  // Only ours: Slides' "No results" doesn't show.
  await search(dialog).fill('SPOT');
  await expect(categories(dialog)).toHaveText(['Slides Companion']);
  expect(await rowsOf(ours(dialog))).toHaveLength(6);
  expect(await highlighted(ours(dialog))).toEqual(['Spot', 'Spot', 'Spot', 'Spot', 'Spot', 'Spot']);
  await expect(notice).toBeHidden();

  // As Slides', not from the middle of a word.
  await search(dialog).fill('light');
  await expect(ours(dialog)).toHaveCount(0);
  await expect(notice).toBeVisible();

  await search(dialog).fill('');
  await expect(ours(dialog)).toBeVisible();
  expect(await rowsOf(ours(dialog))).toHaveLength(10);
});

test('during a slideshow, the dialog lists the keys that work there, and typing a capital S searches', async ({
  context,
}) => {
  const { page, show } = await startSlideshow(context);
  const dialog = await openSlideshowDialog(page, show);
  // Space is Slides' there, and a click spotlights an image.
  expect(await rowsOf(ours(dialog))).toEqual(IN_SPOTLIGHT_AND_SLIDESHOW);

  // Shift+S there is a letter, not the floating notes.
  const pages = context.pages().length;
  await search(dialog).click();
  await page.keyboard.press('Shift+S');
  await search(dialog).pressSequentially('pot');
  await expect(search(dialog)).toHaveValue('Spot');
  await expect(categories(dialog)).toHaveText(['Slides Companion']);
  await page.waitForTimeout(500);
  expect(context.pages()).toHaveLength(pages);
});

test.describe('with links opening in a new tab', () => {
  test.use({ settings: { liveEdits: 'off', slideshowLinks: 'tab' } });

  test('the dialog doesn’t say Esc closes a page over the slide', async ({ context }) => {
    const { dialog } = await openEditorDialog(context);
    expect((await rowsOf(ours(dialog))).map(([name]) => name)).not.toContain(
      'Close a page opened over the slide',
    );
  });
});

async function openSlideshowDialog(page, show) {
  const dialog = dialogIn(show);
  // The slideshow takes keys a moment after it shows.
  await expect(async () => {
    if (!(await dialog.count())) await page.keyboard.press('ControlOrMeta+/');
    await expect(ours(dialog)).toBeVisible({ timeout: 2000 });
  }).toPass();
  return dialog;
}

test.describe('with Spotlight off during a slideshow', () => {
  test.use({ settings: { liveEdits: 'off', spotlightOnClick: false } });

  test('the slideshow’s dialog leaves out Spotlight’s keys, which can’t do anything there', async ({
    context,
  }) => {
    const { page, show } = await startSlideshow(context);
    const dialog = await openSlideshowDialog(page, show);
    expect((await rowsOf(ours(dialog))).map(([name]) => name)).toEqual([
      'Zoom in on the slide while presenting',
      'Zoom out while presenting',
      'Open or close floating notes while presenting',
      'Close a page opened over the slide',
    ]);
  });
});

test('a slideshow in a tab of its own, without floating notes, doesn’t list their key', async ({
  context,
}) => {
  const page = await context.newPage();
  await page.goto(`${deckUrl.replace(/\/edit.*$/, '/present')}?slide=id.g35a1872bb6d_1_0`);
  await expect(page.locator('.punch-viewer-svgpage-a11yelement')).toHaveAttribute(
    'aria-label',
    /3/,
  );
  const dialog = await openSlideshowDialog(page, page);
  const names = (await rowsOf(ours(dialog))).map(([name]) => name);
  expect(names).toContain('Zoom in on the slide while presenting');
  expect(names).not.toContain('Open or close floating notes while presenting');
});

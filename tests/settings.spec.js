import { test, expect, deckUrl } from './fixtures.js';

const companion = (page) => page.locator('.slides-companion-button');
const dialog = (page) => page.getByRole('dialog', { name: 'Slides Companion settings' });
const together = (page) => dialog(page).getByRole('radio', { name: /Show the group as one image/ });
const apart = (page) => dialog(page).getByRole('radio', { name: /Show each image on its own/ });
const spotlightOnClick = (page) => dialog(page).getByRole('checkbox', { name: /Spotlight an image when you click it/ });
const feature = (page, name) => dialog(page).getByRole('tab', { name });
// Each feature's name, and the line below it on what it's about.
const FEATURES = [
  ['Spotlight', 'See images full screen'],
  ['Links', 'Open links over the slide'],
  ['Zoom & scroll', 'Mouse wheel and trackpad'],
  ['Pen', 'Draw on slides'],
  ['Timer', 'Count down in presenter view'],
  ['Edits during a slideshow', 'Shown within seconds'],
];

async function openDeck(context) {
  const page = await context.newPage();
  await page.goto(deckUrl);
  await expect(companion(page)).toBeVisible();
  return page;
}

test('the companion shows a tooltip and opens Settings', async ({ context }) => {
  const page = await openDeck(context);
  await companion(page).hover();
  await expect(page.locator('.jfk-tooltip', { hasText: 'Slides Companion settings' })).toBeVisible();

  await companion(page).click();
  await expect(dialog(page)).toBeVisible();
  // On the first feature, which has the keys.
  await expect(feature(page, 'Spotlight')).toBeFocused();
  await expect(spotlightOnClick(page)).toBeChecked();
  await expect(together(page)).toBeChecked();
  await feature(page, 'Links').click();
  await expect(dialog(page).getByRole('radio', { name: /Open it over the slide/ })).toBeChecked();
  await feature(page, 'Zoom & scroll').click();
  await expect(dialog(page).getByRole('group', { name: 'When you scroll during a slideshow' }).getByRole('radio', { name: /Zoom into the slide/ })).toBeChecked();
  await expect(dialog(page).getByRole('group', { name: 'When you scroll while editing' }).getByRole('radio', { name: /next or previous slide/ })).toBeChecked();
  await feature(page, 'Pen').click();
  await expect(dialog(page).getByRole('checkbox', { name: /Keep what you draw/ })).not.toBeChecked();
  await feature(page, 'Timer').click();
  await expect(dialog(page).getByRole('radio', { name: /2 minutes before the end/ })).toBeChecked();
  await feature(page, 'Edits during a slideshow').click();
  await expect(dialog(page).getByRole('radio', { name: /Right away/ })).toBeChecked();
});

test('each feature has a page of its own, saying what the feature does, and the choices on every page are saved', async ({ context }) => {
  const page = await openDeck(context);
  await companion(page).click();
  // A list of the features, the first one shown.
  await expect(dialog(page).getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical');
  const tabs = dialog(page).getByRole('tab');
  await expect(tabs).toHaveCount(FEATURES.length);
  // Each says in a line what it's about, read out after its name, and never cut short.
  for (const [index, [name, summary]] of FEATURES.entries()) {
    await expect(tabs.nth(index)).toHaveAccessibleName(name);
    await expect(tabs.nth(index)).toHaveAccessibleDescription(summary);
    await expect(tabs.nth(index)).toContainText(summary);
  }
  const cutShort = (lines) => lines.filter((line) => line.scrollWidth > line.clientWidth).length;
  expect(await dialog(page).locator('.slides-companion-settings-feature-summary').evaluateAll(cutShort)).toBe(0);
  await expect(feature(page, 'Spotlight')).toHaveAttribute('aria-selected', 'true');
  await expect(dialog(page).getByRole('tabpanel')).toHaveCount(1);
  await expect(dialog(page).getByRole('tabpanel', { name: 'Spotlight' })).toContainText('press Space to see it full screen');
  await expect(together(page)).toBeVisible();

  await feature(page, 'Pen').click();
  await expect(feature(page, 'Pen')).toHaveAttribute('aria-selected', 'true');
  await expect(feature(page, 'Spotlight')).toHaveAttribute('aria-selected', 'false');
  await expect(dialog(page).getByRole('tabpanel', { name: 'Pen' })).toContainText('press Shift + L to draw on a slide, and Shift + A to Erase all');
  await expect(together(page)).toHaveCount(0);
  await dialog(page).getByRole('checkbox', { name: /Keep what you draw/ }).check();
  await feature(page, 'Timer').click();
  await dialog(page).getByRole('radio', { name: /5 minutes before the end/ }).check();
  await feature(page, 'Spotlight').click();
  await apart(page).check();
  await dialog(page).getByRole('button', { name: 'OK' }).click();
  await expect(dialog(page)).toHaveCount(0);

  await page.reload();
  await companion(page).click();
  await expect(apart(page)).toBeChecked();
  await feature(page, 'Pen').click();
  await expect(dialog(page).getByRole('checkbox', { name: /Keep what you draw/ })).toBeChecked();
  await feature(page, 'Timer').click();
  await expect(dialog(page).getByRole('radio', { name: /5 minutes before the end/ })).toBeChecked();
});

test('each page opens with an illustration of its feature, which plays from its start, or holds still when motion is reduced', async ({ context }) => {
  const page = await openDeck(context);
  await companion(page).click();
  const content = dialog(page).locator('.slides-companion-dialog-content');
  const illustrations = dialog(page).locator('.slides-companion-dialog-illustration');
  const shown = dialog(page).locator('.slides-companion-settings-page:not([hidden]) .slides-companion-dialog-illustration');
  const playing = (all) => all.filter((illustration) => !illustration.animationsPaused()).length;
  for (const [name] of FEATURES) {
    await feature(page, name).click();
    // First on the page, the pane's full width, and only decoration for a screen reader.
    await expect(shown).toHaveAttribute('aria-hidden', 'true');
    expect(await shown.evaluate((illustration) => illustration === illustration.parentElement.firstElementChild)).toBe(true);
    expect(await shown.evaluate((illustration) => illustration.getBoundingClientRect().width)).toBe(495);
    expect(await shown.evaluate((illustration) => illustration.getCurrentTime())).toBeLessThan(1);
    expect(await illustrations.evaluateAll(playing)).toBe(1);
    // With it, the page still fits without scrolling.
    expect(await content.evaluate((pane) => pane.scrollHeight - pane.clientHeight)).toBeLessThanOrEqual(0);
  }

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await feature(page, 'Pen').click();
  expect(await illustrations.evaluateAll(playing)).toBe(0);
  expect(await shown.evaluate((illustration) => illustration.getCurrentTime())).toBeCloseTo(Number(await shown.getAttribute('data-still')));
});

test('↑ and ↓ go through the features, Home and End to the first and last, and Tab goes on into the page', async ({ context }) => {
  const page = await openDeck(context);
  await companion(page).click();
  await expect(feature(page, 'Spotlight')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(feature(page, 'Links')).toBeFocused();
  await expect(feature(page, 'Links')).toHaveAttribute('aria-selected', 'true');
  await expect(dialog(page).getByRole('tabpanel', { name: 'Links' })).toBeVisible();
  await page.keyboard.press('End');
  await expect(feature(page, 'Edits during a slideshow')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(feature(page, 'Spotlight')).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(feature(page, 'Edits during a slideshow')).toBeFocused();
  await page.keyboard.press('Home');
  await expect(feature(page, 'Spotlight')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(dialog(page).getByRole('tabpanel', { name: 'Zoom & scroll' })).toBeVisible();

  // The list is one Tab stop, then the page's own controls.
  await page.keyboard.press('Tab');
  await expect(dialog(page).getByRole('group', { name: 'When you scroll during a slideshow' }).getByRole('radio', { name: /Zoom into the slide/ })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(feature(page, 'Zoom & scroll')).toBeFocused();
  // Enter on a feature only shows it.
  await page.keyboard.press('Enter');
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog(page).getByRole('button', { name: 'OK' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(feature(page, 'Zoom & scroll')).toBeFocused();
});

test('OK saves a choice, and it is still there after a reload', async ({ context }) => {
  const page = await openDeck(context);
  await companion(page).click();
  await apart(page).check();
  await spotlightOnClick(page).uncheck();
  await dialog(page).getByRole('button', { name: 'OK' }).click();
  await expect(dialog(page)).toHaveCount(0);

  await page.reload();
  await companion(page).click();
  await expect(apart(page)).toBeChecked();
  await expect(spotlightOnClick(page)).not.toBeChecked();
});

test('Escape, Cancel and a click outside close without saving', async ({ context }) => {
  const page = await openDeck(context);
  const closeWays = [
    () => page.keyboard.press('Escape'),
    () => dialog(page).getByRole('button', { name: 'Cancel' }).click(),
    () => page.mouse.click(5, 5),
  ];
  for (const close of closeWays) {
    await companion(page).click();
    await apart(page).check();
    await close();
    await expect(dialog(page)).toHaveCount(0);
  }
  await companion(page).click();
  await expect(together(page)).toBeChecked();
});

test('the keyboard opens Settings from the companion', async ({ context }) => {
  const page = await openDeck(context);
  await companion(page).focus();
  await page.keyboard.press('Enter');
  await expect(dialog(page)).toBeVisible();
  // Tab goes into the page, Space turns the checkbox off, Enter saves.
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space');
  await page.keyboard.press('Enter');
  await expect(dialog(page)).toHaveCount(0);
  await expect(companion(page)).toBeFocused();

  await page.keyboard.press('Space');
  await page.keyboard.press('Tab');
  await expect(spotlightOnClick(page)).toBeFocused();
  await expect(spotlightOnClick(page)).not.toBeChecked();
  // Tab goes from the checkbox to the group of choices.
  await page.keyboard.press('Tab');
  await expect(together(page)).toBeFocused();
});

// The "Show every site over the slide" checkbox lives in a frame of the extension's own (Chrome
// asks for access to every site only from there). Chrome's question can't be answered by a test,
// so the frame's calls to it are played: they note what they were asked in the extension's storage.
async function playChromesQuestion(page) {
  const isAllSites = (frame) => frame.url().includes('/all-sites.html');
  await expect.poll(() => page.frames().some(isAllSites)).toBe(true);
  const frame = page.frames().find(isAllSites);
  await frame.waitForFunction(() => document.readyState === 'complete');
  await frame.evaluate(() => {
    chrome.permissions.request = async () => (await chrome.storage.local.set({ asked: true }), true);
    chrome.permissions.remove = async () => (await chrome.storage.local.set({ gaveBack: true }), true);
  });
  // The box doesn't move inside its frame while the dialog grows in, so a click would miss it.
  await page.locator('.slides-companion-dialog-root').evaluate((root) => Promise.all(root.getAnimations({ subtree: true }).map((animation) => animation.finished)));
  await feature(page, 'Links').click();
}
const allSites = (page) =>
  dialog(page).frameLocator('iframe.slides-companion-dialog-frame').getByRole('checkbox', { name: /Show every site over the slide/ });
const asked = (serviceWorker) => serviceWorker.evaluate(() => chrome.storage.local.get(['asked', 'gaveBack']));

test('ticking "Show every site" asks Chrome; Cancel gives the access back, OK keeps it', async ({ context, serviceWorker }) => {
  const page = await openDeck(context);
  await companion(page).click();
  await playChromesQuestion(page);
  await expect(allSites(page)).not.toBeChecked();
  await allSites(page).click();
  await expect(allSites(page)).toBeChecked();
  expect(await asked(serviceWorker)).toEqual({ asked: true });
  await dialog(page).getByRole('button', { name: 'Cancel' }).click();
  await expect.poll(() => asked(serviceWorker)).toEqual({ asked: true, gaveBack: true });
  await expect(page.locator('.slides-companion-dialog-root')).toHaveCount(0);

  await serviceWorker.evaluate(() => chrome.storage.local.remove(['asked', 'gaveBack']));
  await companion(page).click();
  await playChromesQuestion(page);
  await allSites(page).click();
  await expect(allSites(page)).toBeChecked();
  await expect.poll(() => asked(serviceWorker)).toEqual({ asked: true });
  await dialog(page).getByRole('button', { name: 'OK' }).click();
  await expect(dialog(page)).toHaveCount(0);
  await page.waitForTimeout(300);
  expect(await asked(serviceWorker)).toEqual({ asked: true });
});

test('Tab goes through the framed checkbox like the others, and Space ticks it', async ({ context, serviceWorker }) => {
  const page = await openDeck(context);
  await companion(page).click();
  await playChromesQuestion(page);
  // From the feature, the first control on its page.
  await expect(feature(page, 'Links')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(allSites(page)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(allSites(page)).toBeChecked();
  expect(await asked(serviceWorker)).toEqual({ asked: true });
  await page.keyboard.press('Tab');
  await expect(dialog(page).getByRole('radio', { name: /Open it over the slide/ })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(allSites(page)).toBeFocused();
  // Esc in the frame is the dialog's.
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toHaveCount(0);
});

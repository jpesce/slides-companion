import { test, expect, deckUrl } from './fixtures.js';

const companion = (page) => page.locator('.slides-companion-button');
const dialog = (page) => page.getByRole('dialog', { name: 'Slides Companion settings' });
const together = (page) => dialog(page).getByRole('radio', { name: /Show the group as one image/ });
const apart = (page) => dialog(page).getByRole('radio', { name: /Show each image on its own/ });
const spotlightOnClick = (page) => dialog(page).getByRole('checkbox', { name: /Spotlight an image when you click it/ });

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
  await expect(spotlightOnClick(page)).toBeChecked();
  await expect(together(page)).toBeChecked();
  await expect(dialog(page).getByRole('radio', { name: /Open it over the slide/ })).toBeChecked();
  await expect(dialog(page).getByRole('group', { name: 'During a slideshow' }).getByRole('radio', { name: /Zoom into the slide/ })).toBeChecked();
  await expect(dialog(page).getByRole('group', { name: 'While editing' }).getByRole('radio', { name: /next or previous slide/ })).toBeChecked();
  await expect(dialog(page).getByRole('checkbox', { name: /Keep what you draw/ })).not.toBeChecked();
  await expect(dialog(page).getByRole('radio', { name: /2 minutes before the end/ })).toBeChecked();
  await expect(dialog(page).getByRole('radio', { name: /Right away/ })).toBeChecked();
  await expect(spotlightOnClick(page)).toBeFocused();
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
  // Space turns the checkbox off, Enter saves.
  await page.keyboard.press('Space');
  await page.keyboard.press('Enter');
  await expect(dialog(page)).toHaveCount(0);
  await expect(companion(page)).toBeFocused();

  await page.keyboard.press('Space');
  await expect(spotlightOnClick(page)).not.toBeChecked();
  // Tab goes from the checkbox to the group of choices.
  await page.keyboard.press('Tab');
  await expect(together(page)).toBeFocused();
});

// The "Show every site over the slide" checkbox lives in a frame of the extension's own (Chrome
// asks for access to every site only from there). Chrome's question can't be answered by a test,
// so the frame's calls to it are played: they note what they were asked in the extension's storage.
async function playChromesQuestion(page) {
  const isAllSites = (frame) => frame.url().endsWith('/all-sites.html');
  await expect.poll(() => page.frames().some(isAllSites)).toBe(true);
  const frame = page.frames().find(isAllSites);
  await frame.waitForFunction(() => document.readyState === 'complete');
  await frame.evaluate(() => {
    chrome.permissions.request = async () => (await chrome.storage.local.set({ asked: true }), true);
    chrome.permissions.remove = async () => (await chrome.storage.local.set({ gaveBack: true }), true);
  });
  // The box doesn't move inside its frame while the dialog grows in, so a click would miss it.
  await page.locator('.slides-companion-dialog-root').evaluate((root) => Promise.all(root.getAnimations({ subtree: true }).map((animation) => animation.finished)));
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
  // From the group of choices before it.
  await together(page).focus();
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

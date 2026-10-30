import { test, expect, deckUrl } from './fixtures.js';

const companion = (page) => page.locator('.slides-companion-button');
const dialog = (page) => page.getByRole('dialog', { name: 'Slides Companion settings' });
const together = (page) => dialog(page).getByRole('radio', { name: /Show the group as one image/ });
const apart = (page) => dialog(page).getByRole('radio', { name: /Show each image on its own/ });

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
  await expect(together(page)).toBeChecked();
  await expect(together(page)).toBeFocused();
});

test('OK saves a choice, and it is still there after a reload', async ({ context }) => {
  const page = await openDeck(context);
  await companion(page).click();
  await apart(page).check();
  await dialog(page).getByRole('button', { name: 'OK' }).click();
  await expect(dialog(page)).toHaveCount(0);

  await page.reload();
  await companion(page).click();
  await expect(apart(page)).toBeChecked();
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
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(dialog(page)).toHaveCount(0);
  await expect(companion(page)).toBeFocused();

  await page.keyboard.press('Space');
  await expect(apart(page)).toBeChecked();
});

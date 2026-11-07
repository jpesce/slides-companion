import { test, expect, deckUrl } from './fixtures.js';

// Our words speak Slides' language, here Portuguese, beside Slides' own in each window.
test.use({ slidesLanguage: 'pt-BR' });

const slide = `${deckUrl}#slide=id.g35a1872bb6d_1_0`;
const RIGHT_IMAGE = '#workspace [id="editor-g35a1872bb6d_1_3"] image';

test('with Slides in Portuguese, our menu items, Settings and presenter view speak Portuguese', async ({ context }) => {
  const page = await context.newPage();
  await page.goto(slide);
  await expect(page.locator(RIGHT_IMAGE)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('pt-BR');

  // View, below Slides' "Mostrar anotações do apresentador".
  await page.locator('#docs-view-menu').click();
  await expect(page.locator('.goog-menuitem:has(+ .slides-companion-notes-menuitem)')).toHaveText(/Mostrar anotações do apresentador/);
  await expect(page.locator('.slides-companion-notes-menuitem')).toHaveText('Mostrar anotações flutuantes');
  await page.keyboard.press('Escape');

  // The image's right-click menu.
  const box = await page.locator(RIGHT_IMAGE).first().boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' });
  const ours = page.locator('.slides-companion-spotlight-menuitem');
  await expect(ours.locator('.goog-menuitem-label')).toHaveText(['Destacar imagem', 'Fazer download da imagem']);
  await expect(ours.locator('.goog-menuitem-accel')).toHaveText('Espaço');
  await page.keyboard.press('Escape');

  // Settings, and the framed checkbox in it.
  await expect(page.locator('.slides-companion-button')).toHaveAttribute('aria-label', 'Configurações do Slides Companion');
  await page.locator('.slides-companion-button').click();
  const dialog = page.getByRole('dialog', { name: 'Configurações do Slides Companion' });
  await expect(dialog.getByRole('heading')).toHaveText('Configurações');
  await expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeVisible();
  await dialog.getByRole('tab', { name: 'Links' }).click();
  await expect(dialog.getByText('o público vê a página sem você sair da apresentação')).toBeVisible();
  const allSites = page.frameLocator('.slides-companion-dialog-frame');
  await expect(allSites.locator('html')).toHaveAttribute('lang', 'pt-BR');
  await expect(allSites.locator('p')).toHaveText('Alguns sites não abrem sobre o seu slide até você permitir.');
  await expect(allSites.getByRole('button')).toHaveText('Permitir todos os sites');
  await dialog.getByRole('tab', { name: 'Contador' }).click();
  await expect(dialog.getByRole('radio', { name: /2 minutos antes do fim/ })).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancelar' }).click();

  // Presenter view, a blank page Slides writes: the timer's button and menu.
  await page.locator('#punch-start-presentation-right').click();
  const opened = context.waitForEvent('page');
  await page.locator('.goog-menuitem').filter({ visible: true }).first().click();
  const presenter = await opened;
  await expect(presenter.locator('.punch-viewer-speakernotes-timer-button').first()).toHaveText('Pausar');
  const timer = presenter.locator('.slides-companion-countdown-button');
  await expect(timer).toHaveAttribute('aria-label', 'Contador');
  await timer.click();
  const menu = presenter.locator('.slides-companion-countdown-menu');
  await expect(menu.locator('.goog-menuitem').first()).toHaveText('Contagem progressiva, como de costume');
  await expect(menu.getByText('Contagem regressiva de 1 hora', { exact: true })).toBeVisible();
  await expect(menu.getByText('Contagem regressiva de 20 minutos', { exact: true })).toBeVisible();
  await presenter.close();
});

test('with Slides in Portuguese, the slideshow’s ⋮ menu and the floating notes speak Portuguese', async ({ context }) => {
  const page = await context.newPage();
  await page.goto(slide);
  await page.locator('#punch-start-presentation-left').click();
  const show = page.frameLocator('iframe.punch-present-iframe');
  await expect(show.locator('.punch-viewer-svgpage-a11yelement')).toHaveAttribute('aria-label', /3/);
  expect(await show.locator('html').getAttribute('lang')).toBe('pt-BR');

  await page.mouse.move(300, 500);
  await show.locator('.punch-viewer-navbar-more').click();
  const item = show.locator('.slides-companion-notes-menuitem .goog-menuitem-label');
  await expect(item).toHaveText('Abrir anotações flutuantes');
  await expect(show.locator('.goog-menuitem:has(.docs-icon-notes) .goog-menuitem-label')).toHaveText('Abrir anotações do apresentador');

  const opened = context.waitForEvent('page');
  await item.click();
  const notes = await opened;
  await expect(notes).toHaveTitle('Anotações do apresentador');
  await expect(notes.locator('[data-zoom="1"]')).toHaveAttribute('title', 'Mais zoom');
  await expect(notes.locator('[data-zoom="-1"]')).toHaveAttribute('title', 'Menos zoom');
});

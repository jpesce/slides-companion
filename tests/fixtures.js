import { test as base, chromium } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// The extension the tests load: extension/, or the release build with
// EXTENSION_PATH=build/slides-companion (`npm run test:build`).
export const extensionPath = path.resolve(
  import.meta.dirname,
  '..',
  process.env.EXTENSION_PATH ?? 'extension',
);

// Our test deck. The test browser is signed out, so it must be shared as "Anyone with the link".
// Override with TEST_DECK_URL.
export const deckUrl =
  process.env.TEST_DECK_URL ??
  'https://docs.google.com/presentation/d/1XouicC310558IOk_VJ7uu55kxBO7TY-19suR998ONOo/edit';

// The test deck, by what each slide and element is for: Slides' page ids. In the editor, an element's
// id has `editor-` before it (`inEditor`); in a slideshow it's as it is here.
export const SLIDES = {
  // Slide 1: the deck's logo, its only image.
  first: 'p',
  // Slide 2: text.
  text: 'g35a1872bb6d_1_75',
  // Slide 3: two photos side by side and a caption text box.
  images: 'g35a1872bb6d_1_0',
  // Slide 4: a photo linked to google.com, a video, and words under it linked to google.com too. The
  // photo flies in from above as the slide starts.
  links: 'h2c87d6044fe40693_46_0',
  // A slide with a link to the next slide.
  toNext: 'h32d70ce72e2f224_8_0',
};
export const IDS = {
  logo: 'g35a1872bb6d_1_10',
  left: 'g35a1872bb6d_1_2',
  right: 'g35a1872bb6d_1_3',
  caption: 'g35a1872bb6d_1_1',
  linkedPhoto: 'h2c87d6044fe40693_46_2',
  video: 'h2c87d6044fe40693_46_7',
  // Slides draws a link on words as an <a opacity="0"> over them, unlike a picture's link, which
  // holds the picture.
  linkedWords: 'h24c32e9018c16eab_0_0',
};
export const inEditor = (id) => `editor-${id}`;
// The deck in the editor, on a slide; and a slideshow in a tab of its own, from a slide.
export const slideUrl = (slide) => `${deckUrl}#slide=id.${slide}`;
export const presentUrl = (slide) =>
  `${deckUrl.replace(/\/edit.*$/, '/present')}?slide=id.${slide}`;

// The extension as a test loads it: a copy, made once per run for each kind.
// - Chrome asks the presenter before giving the extension every site (Settings), and a test can't
//   answer it. With `test.use({ allSites: true })`, the copy has every site from the start.
// - The extension speaks Slides' language, and signed out, Slides speaks the location's. So unless a
//   test picks Slides' language (`test.use({ slidesLanguage: 'pt-BR' })`), the copy knows only
//   English, and every test reads the same words wherever it runs.
const copies = new Map();
function extensionCopy({ allSites, englishOnly }) {
  const kind = `${allSites ? 'all-sites' : 'own-sites'}-${englishOnly ? 'english' : 'every-language'}`;
  if (copies.has(kind)) return copies.get(kind);
  const copy = fs.mkdtempSync(path.join(os.tmpdir(), `slides-companion-${kind}-`));
  fs.cpSync(extensionPath, copy, { recursive: true });
  if (allSites) {
    const manifestPath = path.join(copy, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.host_permissions.push(...manifest.optional_host_permissions);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  }
  if (englishOnly) {
    fs.appendFileSync(
      path.join(copy, 'messages.js'),
      '\nglobalThis.slidesCompanion.messages = { en: globalThis.slidesCompanion.messages.en };\n',
    );
  }
  copies.set(kind, copy);
  return copy;
}

// Slides' pages: the editor, and the slideshow, in its frame or a tab of its own.
const SLIDES_PAGE =
  /^https:\/\/docs\.google\.com\/presentation\/d\/[^/]+\/(edit|present|localpresent)\b/;

// Branded Chrome ignores --load-extension since v137, so this uses Playwright's Chromium.
export const test = base.extend({
  allSites: [false, { option: true }],
  // The language Slides speaks, and so the extension. `hl` in the deck's address reaches the editor
  // but not the slideshow, so it goes on each of Slides' pages as they're asked for. (Asking changes
  // how Chromium loads: the floating notes window, which Playwright doesn't drive, then loads
  // nothing, not even its stylesheet.)
  slidesLanguage: [null, { option: true }],
  // Settings the extension starts with, to keep features out of each other's tests. Live edits
  // loads a fresh copy of the slideshow's player when it sees the deck change, and on a busy machine
  // Slides finishing its filmstrip can look like one, so other tests would find two players. Its own
  // tests, and Settings', use the extension's defaults: `test.use({ settings: {} })`.
  settings: [{ liveEdits: 'off' }, { option: true }],
  context: async ({ headless, allSites, slidesLanguage, settings }, use) => {
    const extension = extensionCopy({ allSites, englishOnly: !slidesLanguage });
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless,
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    });
    if (Object.keys(settings).length) {
      const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
      await worker.evaluate((values) => chrome.storage.sync.set(values), settings);
    }
    if (slidesLanguage) {
      await context.route(SLIDES_PAGE, (route) => {
        const url = new URL(route.request().url());
        if (url.searchParams.get('hl') === slidesLanguage) return route.fallback();
        url.searchParams.set('hl', slidesLanguage);
        return route.continue({ url: url.href });
      });
    }
    await use(context);
    await context.close();
  },
  serviceWorker: async ({ context }, use) => {
    const [worker] = context.serviceWorkers();
    await use(worker ?? (await context.waitForEvent('serviceworker')));
  },
});

export const expect = test.expect;

// Slides loads its captions code a moment after a slideshow starts, up to a second or so on a busy
// machine, and then builds the slideshow's ⋮ menu again: an open menu closes, and the keyboard goes
// back to the slide. The captions options menu is the last thing it adds. Wait for it before opening
// ⋮, as a presenter can't open it that fast.
export const slideshowSettled = (show) =>
  expect(show.locator('.captions-options-menu')).toBeAttached({ timeout: 15_000 });

// The deck's slideshow, in its frame in the editor, from a slide (the images by default), once the
// slide shows and `ready(show)`, if given, is done. With a `viewport`, in a window that size.
export async function startSlideshow(context, { slide = SLIDES.images, viewport, ready } = {}) {
  const page = await context.newPage();
  if (viewport) await page.setViewportSize(viewport);
  await page.goto(slideUrl(slide));
  await page.locator('#punch-start-presentation-left').click();
  const show = page.frameLocator('iframe.punch-present-iframe');
  await expect(
    show.locator(`.punch-viewer-svgpage-svgcontainer > svg > g[id="${slide}"]`),
  ).toBeVisible();
  await ready?.(show);
  return { page, show };
}

// For startSlideshow's `ready`: until a picture shows, the slideshow can't be clicked on it.
export const pictureShows = (id) => (show) =>
  expect(show.locator(`[id="${id}"] image`).first()).toBeVisible();

// The slide a slideshow is on, from its accessible label ("Slide 3 of 9").
export const slideNumber = (show) =>
  show
    .locator('.punch-viewer-svgpage-a11yelement')
    .getAttribute('aria-label')
    .then((label) => Number(label.match(/\d+/)[0]));

// A slideshow's zoom and shift (zoom.js), from the slide's transform.
export const slideZoom = (show) =>
  show.locator('.sketchyViewerContent').evaluate((element) => {
    const { a, e, f } = new DOMMatrix(element.style.transform);
    return { scale: Math.round(a * 100) / 100, x: Math.round(e), y: Math.round(f) };
  });

// Waits until `read()` gives the same twice in a row, a tenth of a second apart: something easing
// or flying in has come to rest.
export async function stopsChanging(read) {
  let last;
  await expect
    .poll(
      async () => {
        const now = JSON.stringify(await read());
        const still = now === last;
        last = now;
        return still;
      },
      { intervals: [100] },
    )
    .toBe(true);
}

// Scrolling eases to its zoom; this waits until it's there.
export const zoomSettled = (show) => stopsChanging(() => slideZoom(show));

// Spotlight's stage, where it shows pictures and pages, in the editor or a slideshow.
export const stage = (page) => page.locator('.slides-companion-spotlight');

// Opens Settings from the companion, on a feature's page.
export async function openSettings(page, feature) {
  await page.locator('.slides-companion-button').click();
  await page
    .getByRole('dialog', { name: 'Slides Companion settings' })
    .getByRole('tab', { name: feature })
    .click();
}

// The Spotlight gallery's bar shows only as the pointer comes near, or for a moment as the gallery
// opens. Playwright waits for a control to show before moving the pointer to it, so a test that comes
// to the bar after that moment would wait for ever. These move the pointer there first, as a
// presenter does.
export async function pointTo(page, control) {
  const box = await control.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
}

export async function press(page, control) {
  const box = await control.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

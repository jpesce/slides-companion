// Captures what the After Effects edit animates (build/demo/stills/), so the video moves as smoothly
// as After Effects can draw it, at any frame rate, and stays sharp when the camera zooms in:
// - slides/: every slide of the demo deck as vector art. Slides' export turns text into outlines, so
//   After Effects needs neither the deck's fonts nor a browser.
// - ui/: each state of the interface the video shows (Spotlight, a link's page, presenter view and
//   its timer menu, floating notes, the editor as someone types), as screenshots at 4×, and ui.json:
//   where each thing clicked is, in CSS pixels of its window, for the edit to move the pointer there.
// The edit draws the pointer and the motion between states; the extension's own motion is instant or
// a short fade, which the edit rebuilds from spotlight.css.
//   node scripts/demo/stills.mjs            (both; `slides` or `ui` for one)
//   node scripts/demo/stills.mjs ui live    (one part of ui/: spotlight, links, timer, notes, live)
import fs from 'node:fs';
import path from 'node:path';
import { SLIDES, LIVE_NUMBER } from './deck.mjs';
import {
  DECK,
  NOTES_WINDOW,
  VIEWPORT,
  endSlideshow,
  goToSlideInEditor,
  launch,
  nextSlide,
  openEditor,
  show,
  sleep,
  startSlideshow,
} from './record.mjs';

export const STILLS = path.resolve(import.meta.dirname, '../../build/demo/stills');
const UI = path.join(STILLS, 'ui');
const SCALE = 4;
const EARTHRISE = 'https://en.wikipedia.org/wiki/Earthrise';

const deckId = DECK.match(/\/d\/([^/]+)/)[1];

// The deck is shared by link, so Slides' export answers without signing in.
async function exportSlide(pageId, file) {
  const url = `https://docs.google.com/presentation/d/${deckId}/export/svg?id=${deckId}&pageid=${pageId}`;
  const response = await fetch(url);
  const type = response.headers.get('content-type') ?? '';
  if (!response.ok || !type.startsWith('image/svg'))
    throw new Error(`${pageId}: Slides answered ${response.status} ${type}`);
  fs.writeFileSync(file, await response.text());
  return file;
}

const report = (file) =>
  console.log(
    `${path.relative(process.cwd(), file)}: ${(fs.statSync(file).size / 1024).toFixed(0)} KB`,
  );

export async function slides() {
  const dir = path.join(STILLS, 'slides');
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, pageId] of Object.entries(SLIDES))
    report(await exportSlide(pageId, path.join(dir, `${name}.svg`)));
}

// ---- The interface.

const box = async (locator) => {
  const b = await locator.first().boundingBox();
  return b && { x: b.x, y: b.y, width: b.width, height: b.height };
};
const centreOf = (b) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });

async function shoot(page, name, clip) {
  const file = path.join(UI, `${name}.png`);
  await page.screenshot({ path: file, clip, animations: 'disabled', caret: 'initial' });
  report(file);
}

// Spotlight on the second picture: with its controls, as it opens, then without, once they've hidden.
async function spotlight(page, ui) {
  await openEditor(page, SLIDES.spotlight);
  await startSlideshow(page, `${SLIDES.spotlight}_photo1`);
  const photo = show(page).locator(`[id="${SLIDES.spotlight}_photo2"] image`);
  ui.spotlight = { photo: await box(photo) };
  const at = centreOf(ui.spotlight.photo);
  await page.mouse.move(at.x, at.y);
  await page.mouse.click(at.x, at.y);
  const stage = show(page).locator('.slides-companion-spotlight-open');
  await stage.waitFor();
  await stage
    .locator('img, image')
    .first()
    .evaluate((img) => img.decode?.() ?? img.ownerSVGElement?.getBBox())
    .catch(() => {});
  await sleep(400);
  ui.spotlight.bar = await box(show(page).locator('.slides-companion-spotlight-bar'));
  await shoot(page, 'spotlight-bar');
  // The controls hide when the pointer has rested a while (IDLE_MS in spotlight.js).
  await sleep(2600);
  await shoot(page, 'spotlight');
  await page.keyboard.press('Escape');
  await sleep(600);
}

// A link's page over the slide, once loaded: as it opens, with its controls, then without. Then the
// article itself, for the edit to scroll: the page taller than the window, and Wikipedia's sticky
// header, which shows only once the title has scrolled away.
async function links(page, context, ui) {
  await nextSlide(page, `${SLIDES.links}_title`);
  // Slides draws a text link as an SVG <a> over the words; its box is where to click.
  const link = await show(page)
    .locator(`[id="${SLIDES.links}_text"]`)
    .evaluate((shape) => {
      const words = [...shape.ownerSVGElement.querySelectorAll('a')].find((a) =>
        (a.href?.baseVal ?? a.getAttribute('href') ?? '').includes('Earthrise'),
      );
      const r = (words ?? shape).getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });
  const frame = await box(show(page).locator('body'));
  const linkBox = { ...link, x: link.x + (frame?.x ?? 0), y: link.y + (frame?.y ?? 0) };
  const at = { x: linkBox.x + linkBox.width * 0.4, y: linkBox.y + linkBox.height / 2 };
  ui.links = { link: linkBox, click: at };
  await page.mouse.move(at.x, at.y);
  await sleep(300);
  await shoot(page, 'links-hover');
  await page.mouse.click(at.x, at.y);
  const site = show(page).frameLocator('iframe.slides-companion-spotlight-website');
  await site
    .locator('#firstHeading')
    .waitFor({ timeout: 20000 })
    .catch(() => {});
  // Its pictures, and the page settling.
  await sleep(2500);
  await page.mouse.move(VIEWPORT.width / 2, VIEWPORT.height - 40);
  await sleep(500);
  ui.links.bar = await box(show(page).locator('.slides-companion-spotlight-bar'));
  ui.links.website = await box(show(page).locator('iframe.slides-companion-spotlight-website'));
  await shoot(page, 'links-bar');
  await page.mouse.move(VIEWPORT.width * 0.55, VIEWPORT.height * 0.4);
  await sleep(2600);
  await shoot(page, 'links');
  await show(page).locator('.slides-companion-spotlight-close').click({ force: true });
  await show(page).locator('.slides-companion-spotlight').waitFor({ state: 'detached' });

  await article(context, ui.links);
}

// The article on its own, at the size it had over the slide, so it looks the same: three screens of
// it, for the edit to scroll by SCROLL. Wikipedia's Contents and Appearance columns are sticky: they
// stop near the top while the article goes on under them, so the edit needs where they are, and the
// Contents column once scrolled, when it marks the section being read.
const SCROLL = 640;
export async function article(context, links) {
  const { width, height } = links.website;
  const page = await context.newPage();
  await page.setViewportSize({ width: Math.round(width), height: Math.round(height) });
  await page.goto(EARTHRISE, { waitUntil: 'load' });
  await sleep(2000);
  const tall = 3 * Math.round(height);
  links.article = { width: Math.round(width), height: tall, scroll: SCROLL };
  const file = path.join(UI, 'links-article.png');
  await page.screenshot({
    path: file,
    fullPage: true,
    clip: { x: 0, y: 0, width: Math.round(width), height: tall },
    animations: 'disabled',
  });
  report(file);
  const pinned = (selector) => box(page.locator(selector));
  links.article.contents = await pinned('#vector-toc-pinned-container');
  links.article.appearance = await pinned('#vector-appearance-pinned-container');
  links.article.details = await pinned('#Details');
  await page.evaluate((y) => window.scrollTo(0, y), SCROLL);
  await sleep(1000);
  links.article.stuck = await pinned('#vector-toc-pinned-container');
  await shoot(page, 'links-contents', links.article.stuck);
  await page.close();
}

// Presenter view: as it opens, the timer button hovered, its menu, the choice hovered, and counting
// down. The time ticks, so each second the edit shows is captured on its own, where the time is.
async function timer(page, context, ui) {
  await endSlideshow(page);
  await goToSlideInEditor(page, SLIDES.timer);
  await sleep(800);
  await page.locator('#punch-start-presentation-right').click();
  const opened = context.waitForEvent('page');
  await page.locator('.goog-menuitem').filter({ visible: true }).first().click();
  const presenter = await opened;
  await presenter.setViewportSize({ width: 1100, height: 680 });
  const button = presenter.locator('.slides-companion-countdown-button');
  await button.waitFor();
  await sleep(1500);
  const time = presenter.locator('.slides-companion-countdown-container');
  const item = (name) =>
    presenter.locator('.slides-companion-countdown-menu .goog-menuitem', { hasText: name });
  ui.timer = { size: { width: 1100, height: 680 }, button: await box(button) };
  await presenter.mouse.move(700, 600);
  await sleep(300);
  await shoot(presenter, 'timer');
  // Each second, where the time is, with nothing else changing.
  const ticks = async (name, texts) => {
    const shown = time.locator('.punch-viewer-speakernotes-timer-time:visible');
    const clip = await box(time);
    ui.timer[name] = clip;
    for (const text of texts) {
      for (let tries = 0; tries < 5; tries++) {
        await shown.evaluate((el, text) => (el.textContent = text), text);
        await shoot(presenter, `timer-${name}-${text.replaceAll(':', '')}`, clip);
        if ((await shown.textContent()) === text) break;
      }
    }
  };
  await ticks('elapsed', ['00:00:07', '00:00:08', '00:00:09', '00:00:10']);
  const b = centreOf(ui.timer.button);
  await presenter.mouse.move(b.x, b.y);
  await sleep(300);
  await shoot(presenter, 'timer-hover');
  await presenter.mouse.click(b.x, b.y);
  await item('Count down from 15 minutes').waitFor();
  await sleep(200);
  ui.timer.menu = await box(presenter.locator('.slides-companion-countdown-menu'));
  ui.timer.fifteen = await box(item('Count down from 15 minutes'));
  await shoot(presenter, 'timer-menu');
  // While the menu is open, the time has a border.
  await ticks('open', ['00:00:07', '00:00:08', '00:00:09', '00:00:10']);
  const f = centreOf(ui.timer.fifteen);
  await presenter.mouse.move(f.x, f.y);
  await sleep(300);
  await shoot(presenter, 'timer-menu-15');
  await presenter.mouse.click(f.x, f.y);
  await sleep(600);
  await shoot(presenter, 'timer-15');
  await ticks('countdown', ['00:15:00', '00:14:59', '00:14:58', '00:14:57']);
  await presenter.close();
}

// Floating notes beside the slideshow: as they open, then on the next slide. The video leaves out
// their zoom buttons, to keep the scene on what the notes are.
async function floatingNotes(page, context, ui) {
  await endSlideshow(page);
  await goToSlideInEditor(page, SLIDES.notes);
  await sleep(600);
  await startSlideshow(page, `${SLIDES.notes}_quote`);
  const opened = context.waitForEvent('page');
  await page.keyboard.press('Shift+S');
  const notes = await opened;
  await notes.setViewportSize(NOTES_WINDOW);
  await notes.locator('.punch-viewer-speakernotes-text-header').first().waitFor();
  await sleep(1200);
  ui.notes = { size: NOTES_WINDOW };
  await shoot(notes, 'notes');
  await page.keyboard.press('ArrowRight');
  await notes
    .getByText(/Slide 8\b/)
    .first()
    .waitFor({ timeout: 10000 });
  await sleep(800);
  await shoot(notes, 'notes-next');
  await page.keyboard.press('Shift+S');
  await notes.waitForEvent('close', { timeout: 5000 }).catch(() => notes.close());
}

// Someone changes 128 to 129 in the editor, key by key; then the slide as the slideshow shows it.
async function liveEdits(context, ui) {
  const editor = await context.newPage();
  // The companion in the toolbar blinks now and then, and a still could catch him with his eyes
  // shut. With reduced motion he doesn't blink, and his pupils still look where the mouse is.
  await editor.emulateMedia({ reducedMotion: 'reduce' });
  await openEditor(editor, SLIDES.liveEdits);
  // Close the speaker notes under the slide, as a presenter would, by dragging their divider down:
  // the video's headline already says what happens. View › Show speaker notes didn't close them for
  // this deck, opened by link and signed out.
  const divider = await box(editor.locator('.speakernotes-dragger-thumb'));
  if (divider) {
    const at = centreOf(divider);
    await editor.mouse.move(at.x, at.y);
    await editor.mouse.down();
    await editor.mouse.move(at.x, VIEWPORT.height - 1, { steps: 10 });
    await editor.mouse.up();
    await sleep(800);
  }
  await editor.mouse.move(800, 860);
  const number = editor.locator(`#workspace [id="editor-${LIVE_NUMBER}"]`);
  const card = (id) => box(editor.locator(`#workspace [id="editor-${SLIDES.liveEdits}_${id}"]`));
  ui.live = {
    number: await box(number),
    card: await card('card'),
    seats: await card('seats'),
  };
  await shoot(editor, 'editor');
  const n = centreOf(ui.live.number);
  await editor.mouse.move(n.x, n.y);
  await sleep(300);
  await shoot(editor, 'editor-hover');
  await editor.mouse.dblclick(n.x, n.y);
  await editor.keyboard.press('ControlOrMeta+A');
  await sleep(500);
  await shoot(editor, 'editor-selected');
  for (const typed of ['1', '12', '129']) {
    await editor.keyboard.type(typed.at(-1));
    await sleep(400);
    await shoot(editor, `editor-${typed}`);
  }
  await editor.keyboard.press('Escape');
  await editor.keyboard.press('Escape');
  await sleep(600);
  await shoot(editor, 'editor-done');

  // The slide with 129, once Slides has saved it.
  const before = fs.readFileSync(path.join(STILLS, 'slides', 'liveEdits.svg'), 'utf8');
  const after = path.join(STILLS, 'slides', 'liveEdits-129.svg');
  for (let tries = 0; ; tries++) {
    await sleep(2000);
    await exportSlide(SLIDES.liveEdits, after);
    if (fs.readFileSync(after, 'utf8') !== before) break;
    if (tries === 15) throw new Error('Slides never saved 129');
  }
  report(after);

  // Put the number back.
  await number.dblclick();
  await editor.keyboard.press('ControlOrMeta+A');
  await editor.keyboard.type('128');
  await editor.keyboard.press('Escape');
  await editor.keyboard.press('Escape');
  await sleep(3000);
  await editor.close();
}

// Every part of ui/, or only the one named; ui.json keeps what the other parts measured before.
export async function ui(only) {
  fs.mkdirSync(UI, { recursive: true });
  const parts = {
    spotlight: (page, context, shots) => spotlight(page, shots),
    links: (page, context, shots) => links(page, context, shots),
    timer: (page, context, shots) => timer(page, context, shots),
    notes: (page, context, shots) => floatingNotes(page, context, shots),
    live: (page, context, shots) => liveEdits(context, shots),
  };
  if (only && !parts[only]) throw new Error(`No part "${only}": ${Object.keys(parts).join(', ')}`);
  const json = path.join(UI, 'ui.json');
  const before = only && fs.existsSync(json) ? JSON.parse(fs.readFileSync(json, 'utf8')) : {};
  const { context, close } = await launch(SCALE);
  const shots = { ...before, scale: SCALE, viewport: VIEWPORT };
  try {
    const page = context.pages()[0] ?? (await context.newPage());
    for (const [name, part] of Object.entries(parts))
      if (!only || name === only) await part(page, context, shots);
  } finally {
    fs.writeFileSync(path.join(UI, 'ui.json'), JSON.stringify(shots, null, 2));
    await close();
  }
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const [only, part] = process.argv.slice(2);
  if (only !== 'ui') await slides();
  if (only !== 'slides') await ui(part);
}

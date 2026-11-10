// Records the demo: drives the demo deck in Playwright's Chromium with the extension loaded, and
// captures each window it shows (the editor, the slideshow, presenter view, floating notes) frame by
// frame with Chrome's own screencast, so no desktop, notifications or screen-recording permission
// get in. Writes build/demo/raw/: the frames, and story.json, which edit.mjs turns into the video.
//   node scripts/demo/record.mjs            (or `npm run demo` for both steps)
// The deck is shared "anyone with the link can edit", which the live-edits scene needs: the browser
// is signed out, like the tests'.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SLIDES, LIVE_NUMBER } from './deck.mjs';

export const DECK =
  process.env.DEMO_DECK_URL ??
  'https://docs.google.com/presentation/d/1NDwGq1xtrVbcPY94Px0Up1Em57N8K23oDEgdcP9J4dg/edit';
const EXTENSION = path.resolve(
  import.meta.dirname,
  '../..',
  process.env.EXTENSION_PATH ?? 'extension',
);
const RAW = path.resolve(import.meta.dirname, '../../build/demo/raw');
const VIEWPORT = { width: 1600, height: 900 };
const NOTES_WINDOW = { width: 480, height: 600 };
// Frames are captured at twice the size (with --force-device-scale-factor: the screencast otherwise
// captures CSS pixels), so the video can zoom in on what's clicked and stay sharp.
const SCALE = 2;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const slideUrl = (id) => `${DECK}?hl=en#slide=id.${id}`;

// ---- The pointer. The screencast doesn't show it, so each page draws one where the mouse goes.

export function drawPointer() {
  if (window.top !== window) return;
  const add = () => {
    if (document.getElementById('demo-pointer')) return;
    const pointer = document.createElement('div');
    pointer.id = 'demo-pointer';
    // Built node by node: Docs only takes trusted HTML.
    const svg = (name, attributes) => {
      const node = document.createElementNS('http://www.w3.org/2000/svg', name);
      for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
      return node;
    };
    const arrow = svg('svg', { width: 34, height: 34, viewBox: '0 0 28 28' }); // a little larger than life, for video
    arrow.append(
      svg('path', {
        d: 'M6 3v19.5l5-4.8 3.2 7.3 3.4-1.5-3.2-7.1H21z',
        fill: '#000',
        stroke: '#fff',
        'stroke-width': 1.6,
        'stroke-linejoin': 'round',
      }),
    );
    pointer.append(arrow);
    Object.assign(pointer.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      width: '34px',
      height: '34px',
      margin: '-4px 0 0 -7px',
      zIndex: '2147483647',
      pointerEvents: 'none',
      display: 'none',
      transition: 'transform 80ms',
    });
    document.documentElement.append(pointer);
  };
  window.demoPointer = (x, y, pressed) => {
    add();
    const pointer = document.getElementById('demo-pointer');
    // Full screen puts one element above everything else, so the pointer goes in it: for the
    // slideshow, that's a frame, and the pointer goes in the page inside it.
    const top = document.fullscreenElement;
    const host = top?.tagName === 'IFRAME' ? top.contentDocument?.documentElement : top;
    const into = host ?? document.documentElement;
    if (pointer.parentNode !== into) into.append(pointer);
    Object.assign(pointer.style, {
      display: 'block',
      left: `${x}px`,
      top: `${y}px`,
      transform: pressed ? 'scale(0.85)' : 'none',
    });
  };
}

// Signed out, Slides picks its language by location, and the slideshow it loads in a frame doesn't
// carry the editor's ?hl=en. This adds it, so the slideshow, presenter view and the extension speak English.
export function inEnglish() {
  const english = (url) => {
    if (typeof url !== 'string' || !/\/(local)?present\b/.test(url) || /[?&]hl=/.test(url))
      return url;
    return `${url}${url.includes('?') ? '&' : '?'}hl=en`;
  };
  const src = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src');
  Object.defineProperty(HTMLIFrameElement.prototype, 'src', {
    ...src,
    set(url) {
      src.set.call(this, english(url));
    },
  });
  const setAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, value) {
    return setAttribute.call(
      this,
      name,
      this instanceof HTMLIFrameElement && name === 'src' ? english(value) : value,
    );
  };
}

const pointers = new WeakMap();
async function moveTo(page, x, y, ms = 500) {
  const from = pointers.get(page) ?? { x: VIEWPORT.width / 2, y: VIEWPORT.height * 0.75 };
  const steps = Math.max(2, Math.round(ms / 25));
  for (let i = 1; i <= steps; i++) {
    const k = i / steps;
    const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; // ease in and out
    const px = from.x + (x - from.x) * e,
      py = from.y + (y - from.y) * e;
    await page.mouse.move(px, py);
    await page.evaluate(([px, py]) => window.demoPointer?.(px, py), [px, py]).catch(() => {});
    await sleep(ms / steps / 2);
  }
  pointers.set(page, { x, y });
}
async function centre(locator) {
  const box = await locator.boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
}
async function click(page, locator, { double = false, ms } = {}) {
  const { x, y } = await centre(locator);
  await clickAt(page, x, y, ms, double);
}
async function clickAt(page, x, y, ms, double = false) {
  await moveTo(page, x, y, ms);
  await sleep(150);
  await page.evaluate(([x, y]) => window.demoPointer?.(x, y, true), [x, y]).catch(() => {});
  if (double) await page.mouse.dblclick(x, y);
  else await page.mouse.click(x, y);
  await page.evaluate(([x, y]) => window.demoPointer?.(x, y, false), [x, y]).catch(() => {});
}

// Scrolls smoothly, as a trackpad does: many small steps over `ms`, eased in and out.
async function wheel(page, deltaY, ms) {
  const steps = Math.round(ms / 16);
  let done = 0;
  for (let i = 1; i <= steps; i++) {
    const k = i / steps;
    const eased = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    const next = Math.round(deltaY * eased);
    if (next !== done) await page.mouse.wheel(0, next - done);
    done = next;
    await sleep(16);
  }
}

// ---- Capture: each window's frames, timed from the start of the scene.

class Stream {
  constructor(scene, name, page) {
    this.scene = scene;
    this.name = name;
    this.page = page;
    this.frames = [];
    this.dir = path.join(RAW, scene.name, name);
    fs.mkdirSync(this.dir, { recursive: true });
  }
  async start() {
    this.cdp = await this.page.context().newCDPSession(this.page);
    this.cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
      const file = `${String(this.frames.length).padStart(5, '0')}.jpg`;
      this.frames.push({ file, t: metadata.timestamp - this.scene.start / 1000 });
      fs.writeFile(path.join(this.dir, file), Buffer.from(data, 'base64'), () => {});
      this.cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    });
    const size = this.page.viewportSize() ?? { width: 1600, height: 900 };
    await this.cdp.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 88,
      maxWidth: size.width * SCALE,
      maxHeight: size.height * SCALE,
      everyNthFrame: 1,
    });
  }
  async stop() {
    await this.cdp.send('Page.stopScreencast').catch(() => {});
    await this.cdp.detach().catch(() => {});
    fs.writeFileSync(`${this.dir}.json`, JSON.stringify(this.frames));
    const size =
      this.page.viewportSize() ??
      (await this.page.evaluate(() => ({ width: innerWidth, height: innerHeight })));
    return { name: this.name, width: size.width * SCALE, height: size.height * SCALE };
  }
}

// How long viewers get: to read what's about to happen, then to see it happen.
const READ = 1100;
const SEE = 1800;
const INTRO = 1900; // each feature opens on its slide alone, whose title says what it is

class Scene {
  constructor(name) {
    this.name = name;
    this.captions = [];
    this.focus = [];
  }
  async record(pages) {
    fs.rmSync(path.join(RAW, this.name), { recursive: true, force: true });
    this.start = Date.now();
    this.streams = Object.entries(pages).map(([name, page]) => new Stream(this, name, page));
    await Promise.all(this.streams.map((s) => s.start()));
    await sleep(300);
  }
  now() {
    return (Date.now() - this.start) / 1000;
  }
  // A snackbar saying what happens next. It stays until the next one, or the end of the scene.
  say(text, keys = []) {
    const now = this.now();
    this.quiet(now);
    this.captions.push({ text, keys, start: now, end: null });
  }
  quiet(now = this.now()) {
    const last = this.captions.at(-1);
    if (last && last.end === null) last.end = now;
  }
  // One step: the words first, then the action, then time to see what it did.
  async step(text, keys, action, { read = READ, see = SEE } = {}) {
    this.say(text, keys);
    await sleep(read);
    await action?.();
    await sleep(see);
  }
  // The video zooms in on part of a window (a box in its page, in CSS pixels), or back out (null).
  async zoom(stream, box, settle = 750) {
    this.focus.push({
      stream,
      t: this.now(),
      box: box && { x: box.x, y: box.y, width: box.width, height: box.height },
    });
    await sleep(settle);
  }
  async end(hold = 600) {
    await sleep(hold);
    const duration = this.now();
    this.quiet(duration);
    const streams = [];
    for (const s of this.streams) streams.push(await s.stop());
    return {
      name: this.name,
      duration,
      streams,
      captions: this.captions,
      focus: this.focus,
      scale: SCALE,
    };
  }
}

// A box around several, with room around them.
function around(boxes, pad = 24) {
  const x = Math.min(...boxes.map((b) => b.x)) - pad,
    y = Math.min(...boxes.map((b) => b.y)) - pad;
  const right = Math.max(...boxes.map((b) => b.x + b.width)) + pad,
    bottom = Math.max(...boxes.map((b) => b.y + b.height)) + pad;
  return { x, y, width: right - x, height: bottom - y };
}

// ---- Slides.

const PLAYER = 'iframe.punch-present-iframe';
const SHOWN = `${PLAYER}[data-slides-companion-player="shown"], ${PLAYER}:not([data-slides-companion-player])`;
const show = (page) => page.frameLocator(SHOWN).first();

async function openEditor(page, slide) {
  await page.goto(slideUrl(slide));
  await page.locator('#punch-start-presentation-left').waitFor();
  await page.locator(`#workspace [id^="editor-${slide}"]`).first().waitFor();
  await sleep(1500);
}
async function goToSlideInEditor(page, slide) {
  const thumbnail = page.locator(`.punch-filmstrip-thumbnail[data-slide-page-id="${slide}"]`);
  await thumbnail.scrollIntoViewIfNeeded();
  await thumbnail.click();
  await page.locator(`#workspace [id^="editor-${slide}"]`).first().waitFor();
}
async function startSlideshow(page, firstElement) {
  await page.locator('#punch-start-presentation-left').click();
  await show(page).locator(`[id="${firstElement}"]`).first().waitFor();
  await sleep(1200);
}
async function endSlideshow(page) {
  await page.keyboard.press('Escape');
  await page
    .locator(PLAYER)
    .first()
    .waitFor({ state: 'detached' })
    .catch(() => {});
  await sleep(800);
}
async function nextSlide(page, element) {
  await page.keyboard.press('ArrowRight');
  await show(page).locator(`[id="${element}"]`).first().waitFor();
  await sleep(900);
}

// ---- The scenes, in the order of the deck. Each returns the parts it recorded.

async function spotlightInEditor(page) {
  const scene = new Scene('spotlight-editor');
  await openEditor(page, SLIDES.spotlight);
  await scene.record({ editor: page });
  await sleep(INTRO);
  const photo = page.locator(`#workspace [id="editor-${SLIDES.spotlight}_photo1"] image`);
  await scene.step('Select a picture and press {Space}', [], async () => {
    await click(page, photo, { ms: 800 });
    await sleep(500);
    await page.keyboard.press('Space');
  });
  await scene.step('{→} for the next one', [], () => page.keyboard.press('ArrowRight'));
  await scene.step('{Esc} to close', [], () => page.keyboard.press('Escape'), { see: 1200 });
  return [await scene.end()];
}

async function spotlightInSlideshow(page) {
  const scene = new Scene('spotlight-slideshow');
  await startSlideshow(page, `${SLIDES.spotlight}_photo1`);
  await scene.record({ slideshow: page });
  await sleep(600);
  await scene.step('In a slideshow, just click a picture', [], () =>
    click(page, show(page).locator(`[id="${SLIDES.spotlight}_photo2"] image`), { ms: 800 }),
  );
  // The bar shows when the pointer comes near the bottom.
  const download = show(page).locator('.slides-companion-spotlight-download');
  await scene.step('Download it', [], async () => {
    await moveTo(page, VIEWPORT.width / 2, VIEWPORT.height - 40, 600);
    await download.waitFor();
    const bar = await show(page).locator('.slides-companion-spotlight-bar').boundingBox();
    await scene.zoom('slideshow', around([bar], 140));
    const saved = page.waitForEvent('download');
    await click(page, download, { ms: 600 });
    await (await saved).delete();
  });
  await scene.zoom('slideshow', null);
  const part = await scene.end(300);
  await moveTo(page, VIEWPORT.width * 0.62, VIEWPORT.height * 0.55, 0);
  await page.keyboard.press('Escape');
  await sleep(600);
  return [part];
}

async function links(page) {
  const scene = new Scene('links');
  await nextSlide(page, `${SLIDES.links}_card1_text`);
  await scene.record({ slideshow: page });
  await sleep(INTRO);
  // The card is the link. (Linked words still open a new tab, so the demo clicks the card.)
  const { box: card } = await centre(show(page).locator(`[id="${SLIDES.links}_card1"]`));
  const site = show(page).locator('iframe.slides-companion-spotlight-website');
  await scene.step(
    'Click a link',
    [],
    async () => {
      await clickAt(page, card.x + card.width * 0.72, card.y + card.height / 2, 800);
      await site.waitFor();
      await show(page)
        .frameLocator('iframe.slides-companion-spotlight-website')
        .locator('#firstHeading')
        .waitFor({ timeout: 15000 })
        .catch(() => {});
      await sleep(500);
    },
    { see: 600 },
  );
  await scene.step('It opens over your slide', [], async () => {
    await moveTo(page, VIEWPORT.width * 0.55, VIEWPORT.height * 0.6, 500);
    await wheel(page, 640, 1600);
  });
  // Browsing the page gives it the keys, so the ✕ brings the slide back.
  const close = show(page).locator('.slides-companion-spotlight-close');
  await scene.step('Close it to come back to your slide', [], async () => {
    await moveTo(page, VIEWPORT.width / 2, VIEWPORT.height - 40, 500);
    const bar = await show(page).locator('.slides-companion-spotlight-bar').boundingBox();
    await scene.zoom('slideshow', around([bar], 140));
    await click(page, close, { ms: 600 });
    await show(page).locator('.slides-companion-spotlight').waitFor({ state: 'detached' });
    await scene.zoom('slideshow', null, 0);
    await moveTo(page, VIEWPORT.width * 0.8, VIEWPORT.height * 0.85, 500);
  });
  return [await scene.end()];
}

async function zoom(page) {
  const scene = new Scene('zoom');
  const map = show(page).locator(`[id="${SLIDES.zoom}_map"] image`);
  await nextSlide(page, `${SLIDES.zoom}_map`);
  await scene.record({ slideshow: page });
  await sleep(INTRO);
  const { box } = await centre(map);
  // Moscow, top right of the map, where the army is at its thinnest.
  await moveTo(page, box.x + box.width * 0.86, box.y + box.height * 0.3, 700);
  await scene.step('Scroll to zoom in where the pointer is', [], () => wheel(page, -420, 1400));
  await scene.step(
    'Drag to look around',
    [],
    async () => {
      await page.mouse.down();
      await moveTo(page, VIEWPORT.width * 0.62, VIEWPORT.height * 0.45, 1400);
      await page.mouse.up();
    },
    { see: 1200 },
  );
  await scene.step(
    'Or press {−} to zoom out, {+} to zoom in',
    [],
    async () => {
      await page.keyboard.press('-');
      await sleep(900);
      await page.keyboard.press('-');
    },
    { see: 1400 },
  );
  return [await scene.end()];
}

async function pen(page) {
  const scene = new Scene('pen');
  const best = show(page).locator(`[id="${SLIDES.pen}_bar6"]`);
  await nextSlide(page, `${SLIDES.pen}_bar6`);
  await scene.record({ slideshow: page });
  await sleep(INTRO);
  await scene.step('Draw with Slides’ pen: {Shift} {L}', [], async () => {
    await page.keyboard.press('Shift+L');
    await sleep(500);
    // Circle June, the best month.
    const { x, y, box } = await centre(best);
    const rx = box.width * 1.05,
      ry = box.height * 0.68,
      cy = y - box.height * 0.08;
    await moveTo(page, x + rx, cy, 600);
    await page.mouse.down();
    for (let i = 0; i <= 44; i++) {
      const a = (i / 40) * 2 * Math.PI;
      const px = x + rx * Math.cos(a),
        py = cy - ry * Math.sin(a);
      await page.mouse.move(px, py);
      await page
        .evaluate(([px, py]) => window.demoPointer?.(px, py, true), [px, py])
        .catch(() => {});
      await sleep(22);
    }
    await page.mouse.up();
    pointers.set(page, { x: x + rx, y: cy });
    await page.keyboard.press('Shift+L');
  });
  await scene.step(
    'End the slideshow: {Esc}',
    [],
    async () => {
      await page.keyboard.press('Escape');
      await page
        .locator(PLAYER)
        .first()
        .waitFor({ state: 'detached' })
        .catch(() => {});
    },
    { see: 1000 },
  );
  await scene.step(
    'Present again: your drawing is still there',
    [],
    async () => {
      await click(page, page.locator('#punch-start-presentation-left'), { ms: 700 });
      await show(page).locator('.slides-companion-kept-ink').first().waitFor();
    },
    { see: 2400 },
  );
  return [await scene.end()];
}

async function timer(page, context) {
  await endSlideshow(page);
  await goToSlideInEditor(page, SLIDES.timer);
  await sleep(800);
  await page.locator('#punch-start-presentation-right').click();
  const opened = context.waitForEvent('page');
  await page.locator('.goog-menuitem').filter({ visible: true }).first().click();
  const presenter = await opened;
  await presenter.setViewportSize({ width: 1100, height: 680 });
  await presenter.addScriptTag({ content: `(${drawPointer})()` }).catch(() => {});
  const button = presenter.locator('.slides-companion-countdown-button');
  await button.waitFor();
  await sleep(1200);

  // The slide, as the audience sees it.
  const intro = new Scene('timer-intro');
  await intro.record({ slideshow: page });
  await sleep(INTRO);
  const parts = [await intro.end(0)];

  const scene = new Scene('timer');
  await scene.record({ presenter });
  await scene.step('Presenter view, on your screen only', [], null, { read: 0, see: 1900 });
  const menuItem = (name) =>
    presenter.locator('.slides-companion-countdown-menu .goog-menuitem', { hasText: name });
  await scene.step(
    'Click the timer',
    [],
    async () => {
      const clock = await button.boundingBox();
      // The clock, the timer button and the whole menu that opens under it, Add 1 minute included.
      await scene.zoom('presenter', {
        x: 0,
        y: 0,
        width: clock.x + clock.width + 240,
        height: clock.y + clock.height + 380,
      });
      await click(presenter, button, { ms: 700 });
      await menuItem('Count down from 15 minutes').waitFor();
    },
    { see: 1000 },
  );
  await scene.step(
    'Choose how long you have',
    [],
    () => click(presenter, menuItem('Count down from 15 minutes'), { ms: 600 }),
    { see: 2400 },
  );
  await scene.step(
    'Add a minute when you need one',
    [],
    async () => {
      await click(presenter, button, { ms: 500 });
      await sleep(600);
      await click(presenter, menuItem('Add 1 minute'), { ms: 600 });
    },
    { see: 2000 },
  );
  await scene.zoom('presenter', null);
  parts.push(await scene.end(300));
  await presenter.close();
  return parts;
}

async function floatingNotes(page, context) {
  await endSlideshow(page);
  await goToSlideInEditor(page, SLIDES.notes);
  await sleep(600);
  await startSlideshow(page, `${SLIDES.notes}_quote`);
  const intro = new Scene('notes-intro');
  await intro.record({ slideshow: page });
  await sleep(INTRO);
  const opened = context.waitForEvent('page');
  await intro.step('Press {Shift} {S}', [], () => page.keyboard.press('Shift+S'), { see: 400 });
  const notes = await opened;
  await notes.setViewportSize(NOTES_WINDOW); // this resizes the window itself too
  await notes
    .locator('.punch-viewer-speakernotes-text-header')
    .first()
    .waitFor()
    .catch(() => {});
  const parts = [await intro.end(0)];
  await notes.evaluate(drawPointer).catch(() => {});
  await sleep(900);

  const scene = new Scene('notes');
  await scene.record({ slideshow: page, notes });
  await scene.step('Your notes float on top, picture-in-picture', [], null, { read: 0, see: 2600 });
  await scene.step('Make them bigger', [], async () => {
    const zoomIn = notes.getByRole('button', { name: 'Zoom in' });
    await click(notes, zoomIn, { ms: 700 });
    await sleep(600);
    await click(notes, zoomIn, { ms: 200 });
  });
  await scene.step(
    'They follow the slideshow {→}',
    [],
    async () => {
      await page.keyboard.press('ArrowRight');
      await notes
        .getByText(/Slide 8\b/)
        .first()
        .waitFor({ timeout: 10000 })
        .catch(() => {});
    },
    { see: 2400 },
  );
  // Shown as what it is, a picture-in-picture window over the slideshow (edit.mjs).
  parts.push({ ...(await scene.end(300)), pip: 'notes' });
  await page.keyboard.press('Shift+S');
  await notes.waitForEvent('close', { timeout: 5000 }).catch(() => notes.close());
  return parts;
}

async function liveEdits(page, context) {
  // The slideshow is on the live edits slide; a second window edits the deck.
  const editor = await context.newPage();
  await openEditor(editor, SLIDES.liveEdits);
  await editor.evaluate(() => window.demoPointer?.(800, 700)).catch(() => {});
  await sleep(500);

  const intro = new Scene('live-intro');
  await intro.record({ slideshow: page });
  await sleep(INTRO);
  const parts = [await intro.end(0)];

  const number = editor.locator(`#workspace [id="editor-${LIVE_NUMBER}"]`);
  const scene = new Scene('live-editor');
  await scene.record({ editor });
  await scene.step(
    'Someone edits the deck in the editor',
    [],
    async () => {
      const cards = await editor
        .locator(
          `#workspace [id="editor-${SLIDES.liveEdits}_label"], #workspace [id="editor-${SLIDES.liveEdits}_card"], #workspace [id="editor-${SLIDES.liveEdits}_seats"]`,
        )
        .evaluateAll((all) =>
          all.map((el) => {
            const r = el.getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height };
          }),
        );
      await scene.zoom('editor', around(cards, 40));
      await click(editor, number, { double: true, ms: 800 });
      await editor.keyboard.press('ControlOrMeta+A');
      await sleep(300);
      await editor.keyboard.type('129', { delay: 220 });
      await editor.keyboard.press('Escape');
      await editor.keyboard.press('Escape');
    },
    { see: 900 },
  );
  parts.push(await scene.end(0));

  const shown = new Scene('live-slideshow');
  await shown.record({ slideshow: page });
  await shown.step(
    'The slideshow catches up by itself',
    [],
    () => show(page).getByText('129').first().waitFor({ timeout: 30000 }),
    { read: 300, see: 2400 },
  );
  parts.push(await shown.end(200));

  // Put the number back.
  await number.dblclick();
  await editor.keyboard.press('ControlOrMeta+A');
  await editor.keyboard.type('128');
  await editor.keyboard.press('Escape');
  await editor.keyboard.press('Escape');
  await sleep(2000);
  await editor.close();
  return parts;
}

export async function record() {
  fs.rmSync(RAW, { recursive: true, force: true });
  fs.mkdirSync(RAW, { recursive: true });
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'slides-companion-demo-'));
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    headless: !process.env.HEADED,
    viewport: VIEWPORT,
    deviceScaleFactor: SCALE,
    locale: 'en-US',
    acceptDownloads: true,
    args: [
      `--disable-extensions-except=${EXTENSION}`,
      `--load-extension=${EXTENSION}`,
      '--lang=en-US',
      '--hide-scrollbars',
      `--force-device-scale-factor=${SCALE}`,
      // A screen big enough that Chrome doesn't shrink the floating notes window.
      '--screen-info={3840x2160}',
      // Keep every window painting while another has focus: the slideshow behind presenter view or floating notes.
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--disable-background-timer-throttling',
    ],
  });
  await context.addInitScript(drawPointer);
  await context.addInitScript(inEnglish);
  // Floating notes opens as it was last left: a window beside the slideshow, as on a laptop, with
  // the notes zoomed a few steps in, as a presenter would have them, so they read on video.
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  await worker.evaluate(
    (size) => chrome.storage.local.set({ notesWindow: size, notesZoom: 6 }),
    NOTES_WINDOW,
  );
  try {
    const page = context.pages()[0] ?? (await context.newPage());
    const story = [
      {
        name: 'title',
        card: { title: 'Slides Companion', subtitle: 'Presenter tools for Google Slides' },
        duration: 2.8,
      },
    ];
    for (const scene of [
      spotlightInEditor,
      spotlightInSlideshow,
      links,
      zoom,
      pen,
      timer,
      floatingNotes,
      liveEdits,
    ]) {
      for (const part of await scene(page, context)) {
        console.log(
          `${part.name}: ${part.duration.toFixed(1)} s, ${part.streams.map((s) => s.name).join(' + ')}`,
        );
        story.push(part);
      }
    }
    story.push({
      name: 'end',
      card: {
        title: 'Free and open source',
        subtitle: 'Get Slides Companion from the Chrome Web Store',
      },
      duration: 3.5,
    });
    fs.writeFileSync(path.join(RAW, 'story.json'), JSON.stringify(story, null, 2));
  } finally {
    await context.close();
    fs.rmSync(profile, { recursive: true, force: true });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await record();

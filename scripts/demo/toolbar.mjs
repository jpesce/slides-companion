// The README's picture of the companion at work: the right end of Slides' toolbar in the real editor,
// his eyes following a pointer that wanders over the slide and comes to rest on him, as a GIF that
// loops. Chrome's screencast captures the page as it paints, so his eyes move at their own speed;
// each frame is held until the next, as in ae.mjs. Writes brand/companion-toolbar.gif.
//   node scripts/demo/toolbar.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SLIDES } from './deck.mjs';
import { drawPointer, launch, openEditor, sleep } from './record.mjs';

const OUT = path.resolve(import.meta.dirname, '../../brand/companion-toolbar.gif');
const SCALE = 2;
// The part of the editor shown, in CSS pixels: the toolbar's right end, where he sits, and the top
// of the slide under it, measured from the window's right edge and from the toolbar's top.
const CROP = { width: 380, height: 150, above: 12 };
const FPS = 30;
// Where the pointer goes, from his centre, in CSS pixels, and how long each move takes (ms). It
// starts and ends at the same place, so the loop has no jump.
const PATH = [
  [-240, 75, 0],
  [-120, 30, 800],
  [-45, 80, 700],
  [-185, 55, 700],
  [0, 0, 850],
  [0, 0, 1300],
  [-240, 75, 900],
];

// Minimum jerk: a quick start and a long, gentle arrival, as a hand moves.
const ease = (k) => k ** 3 * (10 - 15 * k + 6 * k * k);

async function main() {
  const { context, close } = await launch(SCALE);
  try {
    await context.addInitScript(drawPointer);
    const page = await context.newPage();
    await openEditor(page, SLIDES.title);
    const button = page.locator('#docs-side-toolbar > .slides-companion-button');
    await button.waitFor();
    const box = await button.boundingBox();
    const toolbar = await page.locator('#docs-side-toolbar').boundingBox();
    const [cx, cy] = [box.x + box.width / 2, box.y + box.height / 2];
    const viewport = page.viewportSize();
    const crop = {
      x: viewport.width - CROP.width,
      y: Math.max(0, toolbar.y - CROP.above),
      ...CROP,
    };

    let at = { x: cx + PATH[0][0], y: cy + PATH[0][1] };
    const pointTo = async (x, y) => {
      await page.mouse.move(x, y);
      await page.evaluate(([x, y]) => window.demoPointer?.(x, y, false), [x, y]);
    };
    await pointTo(at.x, at.y);
    await sleep(800);

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slides-companion-toolbar-'));
    const frames = [];
    const session = await context.newCDPSession(page);
    session.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
      const file = path.join(dir, `${String(frames.length).padStart(5, '0')}.png`);
      fs.writeFileSync(file, Buffer.from(data, 'base64'));
      frames.push({ file, t: metadata.timestamp });
      session.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    });
    await session.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
    const start = Date.now() / 1000;
    for (const [dx, dy, ms] of PATH.slice(1)) {
      const from = at;
      const to = { x: cx + dx, y: cy + dy };
      const began = Date.now();
      for (;;) {
        const k = Math.min(1, (Date.now() - began) / ms);
        const e = ease(k);
        await pointTo(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e);
        if (k === 1) break;
        await sleep(12);
      }
      at = to;
    }
    // Long enough for his eyes to settle where they began.
    await sleep(400);
    const end = Date.now() / 1000;
    await session.send('Page.stopScreencast');

    // Each frame lasts until the next one, as the screen showed it.
    const list = path.join(dir, 'frames.txt');
    const shown = frames.filter((f) => f.t >= start - 1).sort((a, b) => a.t - b.t);
    const lines = [];
    shown.forEach((frame, i) => {
      const from = Math.max(frame.t, start);
      const next = i + 1 < shown.length ? shown[i + 1].t : end;
      if (next > from) lines.push(`file '${frame.file}'`, `duration ${(next - from).toFixed(4)}`);
    });
    lines.push(`file '${shown.at(-1).file}'`);
    fs.writeFileSync(list, lines.join('\n'));
    const s = (n) => Math.round(n * SCALE);
    // One palette for the whole loop, so colours don't flicker from frame to frame.
    execFileSync('ffmpeg', [
      ...['-hide_banner', '-loglevel', 'error', '-y'],
      ...['-f', 'concat', '-safe', '0', '-i', list],
      ...['-t', (end - start).toFixed(3)],
      '-filter_complex',
      `fps=${FPS},crop=${s(crop.width)}:${s(crop.height)}:${s(crop.x)}:${s(crop.y)},split[a][b];[a]palettegen=stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a`,
      ...['-loop', '0'],
      OUT,
    ]);
    fs.rmSync(dir, { recursive: true, force: true });
    const size = (fs.statSync(OUT).size / 2 ** 20).toFixed(1);
    console.log(`${path.relative(process.cwd(), OUT)}: ${(end - start).toFixed(1)} s, ${size} MB`);
  } finally {
    await close();
  }
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) await main();

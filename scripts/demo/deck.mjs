// The demo deck: a PowerPoint file to upload to Google Drive, which turns it into Google Slides.
// Designed like Google's own (Material 3): Google Sans, white slides, soft blue-grey cards, Google blue.
// Pictures aren't in the file (an upload has to stay small): record.mjs adds them by address, at IMAGES.
//   node scripts/demo/deck.mjs  →  build/demo/slides-companion-demo.pptx
import PptxGenJS from 'pptxgenjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const OUT = path.resolve(import.meta.dirname, '../../build/demo/slides-companion-demo.pptx');

// Material 3's baseline, as Google's apps use it.
const C = {
  text: '1F1F1F', // on surface
  muted: '444746', // on surface variant
  primary: '0B57D0',
  primaryContainer: 'D3E3FD',
  onPrimaryContainer: '041E49',
  card: 'F0F4F9', // surface container
  white: 'FFFFFF',
};
const FONT = 'Google Sans';
const X = 0.6; // left margin, in inches (the slide is 10 x 5.625)
const W = 8.8;

// Public-domain pictures, inserted by record.mjs where these boxes are (inches).
const commons = (file, width) => {
  const name = file.replaceAll(' ', '_');
  const hash = execFileSync('node', ['-e', `process.stdout.write(require('crypto').createHash('md5').update(${JSON.stringify(name)}).digest('hex'))`]).toString();
  return width
    ? `https://upload.wikimedia.org/wikipedia/commons/thumb/${hash[0]}/${hash.slice(0, 2)}/${name}/${width}px-${name}`
    : `https://upload.wikimedia.org/wikipedia/commons/${hash[0]}/${hash.slice(0, 2)}/${name}`;
};
const SQUARE = 2.75;
const GAP = (W - 3 * SQUARE) / 2;
export const IMAGES = [
  { slide: 2, title: 'Earthrise, Apollo 8, 1968', url: commons('NASA-Apollo8-Dec24-Earthrise.jpg', 1920), x: X, y: 2.1, w: SQUARE, h: SQUARE },
  { slide: 2, title: 'The Blue Marble, Apollo 17, 1972', url: commons('The Earth seen from Apollo 17.jpg', 1920), x: X + SQUARE + GAP, y: 2.1, w: SQUARE, h: SQUARE },
  { slide: 2, title: 'Valles Marineris, Mars, Viking 1', url: commons('Mars Valles Marineris.jpeg'), x: X + 2 * (SQUARE + GAP), y: 2.1, w: SQUARE, h: SQUARE },
  { slide: 4, title: "Charles Minard's map of Napoleon's march on Moscow, 1869", url: commons('Minard.png'), x: (10 - 3.3 * (2003 / 955)) / 2, y: 1.95, w: 3.3 * (2003 / 955), h: 3.3 },
];

const text = (slide, value, options) =>
  slide.addText(value, { fontFace: FONT, color: C.text, margin: 0, valign: 'top', ...options });

// Each feature slide: the feature's name in blue, what it does as the title, and how, below.
function featureSlide(pptx, { label, title, body, notes }) {
  const slide = pptx.addSlide();
  slide.background = { color: C.white };
  text(slide, label, { x: X, y: 0.45, w: W, h: 0.3, fontSize: 14, color: C.primary });
  text(slide, title, { x: X, y: 0.75, w: W, h: 0.6, fontSize: 32 });
  if (body) text(slide, body, { x: X, y: 1.4, w: W, h: 0.4, fontSize: 16, color: C.muted });
  slide.addNotes(notes);
  return slide;
}

const card = (slide, options) =>
  slide.addShape('roundRect', { fill: { color: C.card }, line: { type: 'none' }, rectRadius: 0.16, ...options });

export async function deck() {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  pptx.title = 'Slides Companion demo';
  pptx.theme = { headFontFace: FONT, bodyFontFace: FONT };

  // 1. Title
  {
    const slide = pptx.addSlide();
    slide.background = { color: C.primaryContainer };
    text(slide, 'Slides Companion', { x: X, y: 1.55, w: W, h: 1, fontSize: 54, color: C.onPrimaryContainer });
    text(slide, 'Presenter tools for Google Slides', { x: X, y: 2.55, w: W, h: 0.5, fontSize: 24, color: C.onPrimaryContainer });
    let x = X;
    for (const chip of ['Free', 'Open source', 'No account']) {
      const w = 0.5 + chip.length * 0.105;
      slide.addShape('roundRect', { x, y: 3.45, w, h: 0.42, fill: { color: C.white }, line: { type: 'none' }, rectRadius: 0.21 });
      text(slide, chip, { x, y: 3.45, w, h: 0.42, fontSize: 14, color: C.onPrimaryContainer, align: 'center', valign: 'middle' });
      x += w + 0.15;
    }
    slide.addNotes('Welcome. Everything you will see works inside Google Slides, on top of its own slideshow.');
  }

  // 2. Spotlight (pictures added by record.mjs)
  featureSlide(pptx, {
    label: 'Spotlight',
    title: 'See any picture up close',
    body: 'Select a picture and press Space. During a slideshow, just click it.',
    notes: 'Three photos from space. Click one to see it full screen, then use the arrow keys to go through the others.',
  });

  // 3. Links
  {
    const slide = featureSlide(pptx, {
      label: 'Links',
      title: 'Open websites without leaving the slideshow',
      body: 'Links open over your slide. Press Esc to come back right where you were.',
      notes: 'Click a link: the page opens over the slide, and Esc brings you back.',
    });
    const links = [
      ['Earthrise', 'The photo, the mission and the crew', 'https://en.wikipedia.org/wiki/Earthrise'],
      ['Charles Joseph Minard', 'The engineer who drew the map on the next slide', 'https://en.wikipedia.org/wiki/Charles_Joseph_Minard'],
    ];
    links.forEach(([name, about, url], i) => {
      const y = 2.15 + i * 1.35;
      card(slide, { x: X, y, w: W, h: 1.1 });
      text(slide, [
        { text: name, options: { fontSize: 22, color: C.primary, hyperlink: { url }, breakLine: true } },
        { text: `${about} · Wikipedia`, options: { fontSize: 16, color: C.muted } },
      ], { x: X + 0.25, y: y + 0.2, w: W - 0.5, h: 0.75, paraSpaceAfter: 4 });
    });
  }

  // 4. Zoom (Minard's map added by record.mjs)
  featureSlide(pptx, {
    label: 'Zoom',
    title: 'Zoom in on the details',
    body: 'Pinch, scroll or press + to zoom into the slide, and drag to look around.',
    notes: "Minard's map: the width of the line is the size of Napoleon's army. Zoom in on the numbers along the way.",
  });

  // 5. Pen
  {
    const slide = featureSlide(pptx, {
      label: 'Pen',
      title: 'Draw on a slide, and find it there next time',
      body: "What you draw with Slides' pen stays on the slide for your next slideshow.",
      notes: 'Circle the best month with the pen. End the slideshow, start it again: the circle is still there.',
    });
    const months = [['Jan', 32], ['Feb', 41], ['Mar', 38], ['Apr', 55], ['May', 61], ['Jun', 74]];
    const top = 2.15, bottom = 4.75, bar = 0.9, step = W / months.length;
    text(slide, 'Visitors per month (example)', { x: X, y: top - 0.05, w: W, h: 0.3, fontSize: 14, color: C.muted });
    months.forEach(([month, value], i) => {
      const h = ((bottom - top - 0.6) * value) / 74;
      const x = X + i * step + (step - bar) / 2;
      const best = value === 74;
      slide.addShape('roundRect', { x, y: bottom - h, w: bar, h, fill: { color: best ? C.primary : C.primaryContainer }, line: { type: 'none' }, rectRadius: 0.08 });
      text(slide, String(value), { x, y: bottom - h - 0.32, w: bar, h: 0.28, fontSize: 14, color: best ? C.primary : C.muted, align: 'center' });
      text(slide, month, { x, y: bottom + 0.08, w: bar, h: 0.3, fontSize: 14, color: C.muted, align: 'center' });
    });
  }

  // 6. Timer
  {
    const slide = featureSlide(pptx, {
      label: 'Timer',
      title: 'A countdown only you can see',
      body: 'In presenter view, click the timer and set how long you have.',
      notes: 'Fifteen minutes in all. The bar fills as time goes by, and the timer turns orange before the end. Click + for one more minute.',
    });
    const agenda = [['Welcome', '2 min'], ['Where we are', '5 min'], ["What's next", '5 min'], ['Questions', '3 min']];
    agenda.forEach(([item, time], i) => {
      const y = 2.05 + i * 0.72;
      card(slide, { x: X, y, w: W, h: 0.58 });
      text(slide, item, { x: X + 0.25, y, w: 6, h: 0.58, fontSize: 18, valign: 'middle' });
      slide.addShape('roundRect', { x: X + W - 1.25, y: y + 0.11, w: 1, h: 0.36, fill: { color: C.primaryContainer }, line: { type: 'none' }, rectRadius: 0.18 });
      text(slide, time, { x: X + W - 1.25, y: y + 0.11, w: 1, h: 0.36, fontSize: 14, color: C.onPrimaryContainer, align: 'center', valign: 'middle' });
    });
  }

  // 7. Floating notes
  {
    const slide = featureSlide(pptx, {
      label: 'Floating notes',
      title: 'Your notes, in a window of their own',
      body: 'Keep your speaker notes on any screen while the slideshow is full screen.',
      notes: [
        'Look at the room, not at the screen.',
        'Three things to say here:',
        '1. The notes follow the slideshow.',
        '2. Zoom them so you can read from a distance.',
        '3. Put them on your laptop while the slides are on the projector.',
      ].join('\n'),
    });
    slide.addShape('roundRect', { x: X, y: 2.15, w: W, h: 2.6, fill: { color: C.primaryContainer }, line: { type: 'none' }, rectRadius: 0.24 });
    text(slide, '“Speak to the room, not to the screen.”', { x: X + 0.5, y: 2.15, w: W - 1, h: 2.6, fontSize: 36, color: C.onPrimaryContainer, valign: 'middle' });
  }

  // 8. Live edits
  {
    const slide = featureSlide(pptx, {
      label: 'Live edits',
      title: 'Edit the deck while it’s on screen',
      body: 'Changes made in the editor, by you or anyone else, reach the running slideshow.',
      notes: 'Someone changes the number in the editor on another computer, and it changes here within seconds.',
    });
    card(slide, { x: X, y: 2.15, w: 4.2, h: 2.6 });
    text(slide, 'Sign-ups so far', { x: X + 0.35, y: 2.45, w: 3.5, h: 0.4, fontSize: 18, color: C.muted });
    text(slide, '128', { x: X + 0.35, y: 2.95, w: 3.5, h: 1.5, fontSize: 96, color: C.primary, valign: 'middle' });
  }

  // 9. Closing
  {
    const slide = pptx.addSlide();
    slide.background = { color: C.primaryContainer };
    text(slide, 'Free and open source', { x: X, y: 1.55, w: W, h: 0.8, fontSize: 44, color: C.onPrimaryContainer });
    text(slide, 'No account, no servers: everything happens in your browser.', { x: X, y: 2.4, w: W, h: 0.5, fontSize: 20, color: C.onPrimaryContainer });
    text(slide, [{ text: 'github.com/jpesce/slides-companion', options: { hyperlink: { url: 'https://github.com/jpesce/slides-companion' } } }],
      { x: X, y: 3.35, w: W, h: 0.4, fontSize: 18, color: C.primary });
    slide.addNotes('Get it from the Chrome Web Store. Thank you.');
  }

  // pptxgenjs stores files uncompressed; zip again, compressed, to keep the upload small.
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'demo-deck-'));
  fs.writeFileSync(path.join(dir, 'raw.pptx'), await pptx.write({ outputType: 'nodebuffer' }));
  execFileSync('unzip', ['-q', 'raw.pptx', '-d', 'files'], { cwd: dir });
  fs.rmSync(OUT, { force: true });
  execFileSync('zip', ['-q', '-X', '-D', '-9', '-r', OUT, '[Content_Types].xml', '.'], { cwd: path.join(dir, 'files') });
  fs.rmSync(dir, { recursive: true, force: true });
  return OUT;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = await deck();
  console.log(`${path.relative(process.cwd(), out)} (${fs.statSync(out).size} bytes)`);
}
